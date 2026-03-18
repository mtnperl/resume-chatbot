import { kv } from "@/lib/kv";
import { nanoid } from "nanoid";

// 30 days TTL
const TTL = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length < 2) {
      return Response.json(
        { error: "Need at least 2 messages to share" },
        { status: 400 }
      );
    }

    const id = nanoid(8);
    await kv.set(`share:${id}`, JSON.stringify(messages), { ex: TTL });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (request.headers.get("origin") ?? "https://resume-chatbot.vercel.app");

    return Response.json({ url: `${baseUrl}/share/${id}` });
  } catch (err) {
    console.error("[api/share] Error:", err);
    return Response.json({ error: "Failed to save conversation" }, { status: 500 });
  }
}
