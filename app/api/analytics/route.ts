import { kv } from "@/lib/kv";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const { question, sessionId, referrer, messageCount } = await request.json();
    if (!question) return Response.json({ ok: true });

    const event = {
      id: nanoid(8),
      question: String(question).slice(0, 500),
      sessionId: sessionId ?? null,
      referrer: referrer ?? null,
      messageCount: messageCount ?? null,
      timestamp: Date.now(),
    };

    // Store individual event (keep last 500)
    await kv.lpush("analytics:events", JSON.stringify(event));
    await kv.ltrim("analytics:events", 0, 499);

    // Increment daily counter
    const dayKey = `analytics:day:${new Date().toISOString().slice(0, 10)}`;
    await kv.incr(dayKey);
    await kv.expire(dayKey, 60 * 60 * 24 * 90); // 90 day retention

    // Increment total counter
    await kv.incr("analytics:total");

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/analytics] Error:", err);
    return Response.json({ ok: false });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || key !== process.env.DASHBOARD_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rawEvents, total] = await Promise.all([
      kv.lrange("analytics:events", 0, 499),
      kv.get<number>("analytics:total"),
    ]);

    const events = rawEvents.map((e) =>
      typeof e === "string" ? JSON.parse(e) : e
    );

    // Build daily traffic for last 14 days
    const days: Record<string, number> = {};
    const today = new Date();
    const dayKeys: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days[dateStr] = 0;
      dayKeys.push(`analytics:day:${dateStr}`);
    }

    const dayCounts = await Promise.all(dayKeys.map((k) => kv.get<number>(k)));
    dayKeys.forEach((k, i) => {
      const dateStr = k.replace("analytics:day:", "");
      days[dateStr] = dayCounts[i] ?? 0;
    });

    // Top questions by frequency
    const freq: Record<string, number> = {};
    for (const e of events) {
      const q = e.question?.toLowerCase().trim();
      if (q) freq[q] = (freq[q] ?? 0) + 1;
    }
    const topQuestions = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([question, count]) => ({ question, count }));

    // Average messages per session
    const sessionMsgCounts: Record<string, number[]> = {};
    for (const e of events) {
      if (e.sessionId && e.messageCount != null) {
        if (!sessionMsgCounts[e.sessionId]) sessionMsgCounts[e.sessionId] = [];
        sessionMsgCounts[e.sessionId].push(e.messageCount);
      }
    }
    const sessionMaxes = Object.values(sessionMsgCounts).map((arr) =>
      Math.max(...arr)
    );
    const avgMessages =
      sessionMaxes.length > 0
        ? Math.round(
            sessionMaxes.reduce((a, b) => a + b, 0) / sessionMaxes.length
          )
        : 0;

    return Response.json({
      total: total ?? 0,
      avgMessages,
      topQuestions,
      dailyTraffic: Object.entries(days).map(([date, count]) => ({ date, count })),
      recentQuestions: events.slice(0, 20).map((e) => ({
        question: e.question,
        timestamp: e.timestamp,
        messageCount: e.messageCount,
      })),
    });
  } catch (err) {
    console.error("[api/analytics] GET error:", err);
    return Response.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
