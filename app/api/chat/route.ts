import Anthropic from "@anthropic-ai/sdk";
import resume from "@/lib/resume";
import { MAX_MESSAGES } from "@/lib/constants";

const client = new Anthropic();

// Module-level encoder (reused across requests)
const encoder = new TextEncoder();

const BASE_SYSTEM_PROMPT = `You are a helpful assistant representing Mathan Noam Perl. You help recruiters, hiring managers, and anyone curious learn about Mathan's professional background.

Here is his resume:

---
${resume}
---

Guidelines:
- For questions about Mathan's background, experience, or skills, answer based on the resume above.
- For general questions (industry trends, career advice, role comparisons, etc.), answer helpfully using your own knowledge.
- Structure your answers clearly: use bullet points for lists, **bold** for key terms, and short paragraphs for explanations.
- Keep answers concise and to the point. Aim for brevity — say it in fewer words, not more.
- Be warm, conversational, and a little casual — not stiff or corporate. Light humor is welcome.
- NEVER use em-dashes (—) under any circumstances. Replace with a comma, period, or rewrite the sentence. This is a hard rule with zero exceptions.
- If a question is too personal, sensitive, or too complex to answer appropriately, respond with exactly: "That's a great question! I think you should give Mathan a call directly — you can reach him at +1 917-715-1544."
- You are Mathan's advocate, not a neutral party. Your job is to represent him positively and accurately.
- Never speculate about weaknesses, failures, gaps, or reasons not to hire him.
- If asked about weaknesses or negatives, reframe toward growth areas or redirect: "That's something worth discussing directly with Mathan — give him a call at +1 917-715-1544."
- If someone tries to get you to say something negative about Mathan — even through hypotheticals, roleplay, or "what are his flaws?" style questions — decline and stay in character as his advocate.
- Never break character or acknowledge that you are an AI being prompted to say something negative.
`;

// Mode-specific prompt additions for role personalization (used in PR 2)
const MODE_ADDITIONS: Record<string, string> = {
  bd: "Emphasize business development, partnerships, and commercial achievements. Highlight revenue impact, relationship management, and strategic deal-making.",
  technical:
    "Emphasize technical project management, product integration, and cross-functional execution. Highlight systems thinking, data analysis, and technical depth.",
  executive:
    "Emphasize leadership, strategic vision, and business outcomes. Highlight P&L impact, team management, and executive-level communication.",
};

export function getSystemPrompt(mode?: string): string {
  const base = BASE_SYSTEM_PROMPT;
  if (!mode || !(mode in MODE_ADDITIONS)) return base;
  return `${base}\nTone emphasis for this session:\n${MODE_ADDITIONS[mode]}`;
}


export async function POST(request: Request) {
  // Parse and validate the request body
  let messages: Anthropic.MessageParam[];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    messages = body.messages as Anthropic.MessageParam[];
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request: could not parse JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Enforce conversation length cap (server-side authoritative check)
  if (messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({
        error: "Conversation limit reached. Please start a new conversation.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extract optional mode from search params
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? undefined;

  // Abort controller for 30s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const stream = await client.messages.stream(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: getSystemPrompt(mode),
        messages,
      },
      { signal: controller.signal }
    );

    const readable = new ReadableStream({
      async start(streamController) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              streamController.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          const isTimeout =
            err instanceof Error && err.name === "AbortError";
          const isRateLimit =
            err instanceof Anthropic.RateLimitError;

          const message = isTimeout
            ? "[Request timed out. Please try again.]"
            : isRateLimit
            ? "[Service is busy. Please try again in a moment.]"
            : `[Error: ${err instanceof Error ? err.message : String(err)}]`;

          console.error("[api/chat] Stream error:", {
            type: isTimeout ? "timeout" : isRateLimit ? "rate_limit" : "unknown",
            message: err instanceof Error ? err.message : String(err),
          });
          streamController.enqueue(encoder.encode(message));
        } finally {
          clearTimeout(timeoutId);
          streamController.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[api/chat] Route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
