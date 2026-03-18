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
          content: `Based on this answer about Mathan Perl, generate 3 short follow-up questions a recruiter might ask. Return ONLY a valid JSON array of 3 strings. Max 8 words each. No explanation, no markdown, no other text — just the JSON array.\n\nAnswer: ${lastAnswer.slice(0, 1000)}`,
        },
      ],
    });

    const text = (response.content[0] as { type: "text"; text: string }).text.trim();
    const questions = JSON.parse(text);
    return Response.json({
      questions: Array.isArray(questions) ? questions.slice(0, 3) : [],
    });
  } catch {
    return Response.json({ questions: [] });
  }
}
