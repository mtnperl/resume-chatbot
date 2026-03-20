import { kv } from "@/lib/kv";
import { nanoid } from "nanoid";

const SESSION_TTL = 60 * 60 * 24 * 90; // 90 days

type SessionMessage = { role: string; content: string; timestamp: number };
type Session = {
  sessionId: string;
  persona: string;
  startedAt: number;
  lastActiveAt?: number;
  referrer: string | null;
  userAgent: string | null;
  messages: SessionMessage[];
  active: boolean;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, sessionId, persona } = body;

    // ── New event-based tracking ───────────────────────────────────────
    if (event === "session_start" && sessionId) {
      await kv.set(
        `session:${sessionId}`,
        {
          sessionId,
          persona: persona ?? "unknown",
          startedAt: Date.now(),
          referrer: body.referrer ?? null,
          userAgent: body.userAgent ?? null,
          messages: [],
          active: true,
        },
        { ex: SESSION_TTL }
      );
      await kv.lpush("sessions:all", sessionId);
      if (persona === "recruiter") {
        await kv.lpush("sessions:recruiters", sessionId);
      }
      await kv.incr(`stats:persona:${persona}`);
      return Response.json({ ok: true });
    }

    if (event === "message" && sessionId) {
      const session = await kv.get<Session>(`session:${sessionId}`);
      if (session) {
        session.messages.push({
          role: body.role,
          content: String(body.content ?? "").slice(0, 2000),
          timestamp: Date.now(),
        });
        session.lastActiveAt = Date.now();
        await kv.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
      }
      return Response.json({ ok: true });
    }

    if (event === "persona_click" && persona) {
      await kv.incr(`stats:persona:${persona}`);
      return Response.json({ ok: true });
    }

    // ── CV Adaptor events ──────────────────────────────────────────────
    if (event && (event as string).startsWith("cv_adaptor_")) {
      await kv.incr(`stats:${event}`);
      await kv.lpush("cv_adaptor:events", JSON.stringify({ event, timestamp: Date.now() }));
      await kv.ltrim("cv_adaptor:events", 0, 199);
      return Response.json({ ok: true });
    }

    // ── Legacy: question-based analytics (backward compat) ────────────
    if (!event && body.question) {
      const legacyEvent = {
        id: nanoid(8),
        question: String(body.question).slice(0, 500),
        sessionId: body.sessionId ?? null,
        referrer: body.referrer ?? null,
        messageCount: body.messageCount ?? null,
        timestamp: Date.now(),
      };
      await kv.lpush("analytics:events", JSON.stringify(legacyEvent));
      await kv.ltrim("analytics:events", 0, 499);
      const dayKey = `analytics:day:${new Date().toISOString().slice(0, 10)}`;
      await kv.incr(dayKey);
      await kv.expire(dayKey, 60 * 60 * 24 * 90);
      await kv.incr("analytics:total");
    }

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
    const sessionIds = await kv.lrange<string>("sessions:recruiters", 0, 49);
    const sessions = await Promise.all(
      sessionIds.map((id) => kv.get<Session>(`session:${id}`))
    );
    const validSessions = sessions.filter((s): s is Session => Boolean(s));

    const [
      recruiterCount, friendCount, lukeCount, chrisCount,
      cvTailored, cvCoverLetters, cvDownloadsCv, cvDownloadsCl,
    ] = await Promise.all([
      kv.get<number>("stats:persona:recruiter"),
      kv.get<number>("stats:persona:friend"),
      kv.get<number>("stats:persona:luke"),
      kv.get<number>("stats:persona:chris"),
      kv.get<number>("stats:cv_adaptor_tailored"),
      kv.get<number>("stats:cv_adaptor_cover_letter"),
      kv.get<number>("stats:cv_adaptor_download_cv"),
      kv.get<number>("stats:cv_adaptor_download_cover_letter"),
    ]);

    const cvAdaptorRaw = await kv.lrange<string>("cv_adaptor:events", 0, 49);
    const cvAdaptorEvents = cvAdaptorRaw
      .map((e) => { try { return typeof e === "string" ? JSON.parse(e) : e; } catch { return null; } })
      .filter(Boolean) as { event: string; timestamp: number }[];

    const allUserMessages = validSessions.flatMap((s) =>
      s.messages.filter((m) => m.role === "user")
    );

    return Response.json({
      totalSessions: sessionIds.length,
      sessions: validSessions,
      personaStats: {
        recruiter: recruiterCount ?? 0,
        friend: friendCount ?? 0,
        luke: lukeCount ?? 0,
        chris: chrisCount ?? 0,
      },
      totalMessages: allUserMessages.length,
      recentQuestions: allUserMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map((m) => m.content),
      cvAdaptor: {
        tailored: cvTailored ?? 0,
        coverLetters: cvCoverLetters ?? 0,
        downloadsCv: cvDownloadsCv ?? 0,
        downloadsCoverLetter: cvDownloadsCl ?? 0,
        recentEvents: cvAdaptorEvents,
      },
    });
  } catch (err) {
    console.error("[api/analytics] GET error:", err);
    return Response.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
