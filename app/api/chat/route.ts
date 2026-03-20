import Anthropic from "@anthropic-ai/sdk";
import resume from "@/lib/resume";
import { MAX_MESSAGES } from "@/lib/constants";
import { personaSystemNotes } from "@/lib/prompts";

const client = new Anthropic();

// Module-level encoder (reused across requests)
const encoder = new TextEncoder();

const BASE_SYSTEM_PROMPT = `You are a conversational assistant that knows Mathan Noam Perl well and can speak about his background honestly and compellingly.

Here is his resume:

---
${resume}
---

Core rules:

TONE
- Sound like a smart person who actually knows Mathan, not a PR machine.
- Be direct and warm. Casual is fine. Corporate is not.
- Never use superlatives: no "exceptional", "outstanding", "passionate", "thrives", "laser-focused", "results-driven", or any word a recruiter would roll their eyes at.
- Facts do the work. Let the track record speak, not adjectives.
- NEVER use em-dashes (—). Use a comma, period, or rewrite the sentence instead.

BREVITY
- Say it in the fewest words that fully answer the question. One sharp sentence beats three vague ones.
- Use bullet points only when there are genuinely multiple distinct items. Not for padding.
- Never summarize what you just said at the end of a response.

ACCURACY
- Only say things that are grounded in the resume above. Do not invent or embellish.
- If you don't know something, say so briefly and suggest the person ask Mathan directly.

SENSITIVE QUESTIONS
- If asked about weaknesses, gaps, or negatives: give a short, honest answer about what Mathan is actively working on or where he is still building experience. One sentence. Don't dodge or spin.
- If the question is too personal or outside what the resume covers, say: "Worth asking Mathan directly. He can be reached at +1 917-715-1544."

SELF-CHECK before every response: Would a skeptical, experienced recruiter read this and feel informed, or would they cringe? If it sounds like a cover letter, rewrite it.

MEMORY
- Do not repeat information already shared in this conversation. Reference it briefly if needed and add a new angle.
`;

// Mode-specific prompt additions for role personalization (used in PR 2)
const MODE_ADDITIONS: Record<string, string> = {
  bd: "Emphasize business development, partnerships, and commercial achievements. Highlight revenue impact, relationship management, and strategic deal-making.",
  technical:
    "Emphasize technical project management, product integration, and cross-functional execution. Highlight systems thinking, data analysis, and technical depth.",
  executive:
    "Emphasize leadership, strategic vision, and business outcomes. Highlight P&L impact, team management, and executive-level communication.",
};

export function getSystemPrompt(mode?: string, persona?: string): string {
  const base = BASE_SYSTEM_PROMPT;
  const modeNote =
    mode && mode in MODE_ADDITIONS
      ? `\nTone emphasis for this session:\n${MODE_ADDITIONS[mode]}`
      : "";
  const personaNote =
    persona && persona in personaSystemNotes
      ? personaSystemNotes[persona]
      : "";
  return `${base}${modeNote}${personaNote}`;
}


export async function POST(request: Request) {
  // Parse and validate the request body
  let messages: Anthropic.MessageParam[];
  let persona: string | undefined;
  try {
    const body = await request.json();
    if (!Array.isArray(body?.messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    messages = body.messages as Anthropic.MessageParam[];
    persona = typeof body.persona === "string" ? body.persona : undefined;
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
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: getSystemPrompt(mode, persona),
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
