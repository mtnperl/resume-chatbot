import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import professional from "@/data/professional";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const prompt = `Score Mathan Perl's fit for this role. Be his advocate — emphasize transferable strengths, reframe gaps constructively. Err optimistic: partial matches count.

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

MATHAN'S BACKGROUND:
${professional}

Scoring: 85-100 strong fit, 70-84 good fit, 55-69 worth exploring, <55 unlikely fit.

Return ONLY raw JSON, no markdown, no backticks:
{"score":<0-100>,"summary":"<2 sentences>","matches":["<match>","<match>"],"gaps":["<gap reframed>"],"talkingPoints":["<lead with this>","<strong angle>"],"suggestedQuestion":"<one question>","verdict":"<STRONG FIT|GOOD FIT|WORTH EXPLORING|UNLIKELY FIT>"}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: "You are a JSON API. Respond with raw JSON only — no markdown, no backticks, no explanation, no text before or after the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Extract JSON object robustly — find first { and last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new SyntaxError("No JSON object found in response");
    const cleaned = text.slice(start, end + 1);

    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/rolefit] Error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
