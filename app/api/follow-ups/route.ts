import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { lastAnswer } = await request.json();
    if (!lastAnswer || typeof lastAnswer !== "string") {
      return Response.json({ questions: [] });
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Based on this answer about Mathan Perl, generate 2 short follow-up questions a recruiter might ask to learn more. Return ONLY a valid JSON array of exactly 2 strings. Max 10 words each. No explanation, no markdown, no other text — just the JSON array.\n\nAnswer: ${lastAnswer.slice(0, 1000)}`,
        },
      ],
    });

    const raw = (response.content[0] as { type: "text"; text: string }).text.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const questions = start !== -1 && end !== -1 ? JSON.parse(raw.slice(start, end + 1)) : [];
    return Response.json({
      questions: Array.isArray(questions) ? questions.slice(0, 2) : [],
    });
  } catch {
    return Response.json({ questions: [] });
  }
}
