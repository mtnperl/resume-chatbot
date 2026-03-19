import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import character from "@/data/character";
import professional from "@/data/professional";
import timeline from "@/data/timeline";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const prompt = `
You are evaluating Mathan Perl as a candidate for a role.

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

MATHAN'S BACKGROUND:
${character}

${professional}

${timeline}

Return ONLY a valid JSON object with NO markdown, NO backticks, NO explanation. Just raw JSON:
{
  "score": <number 0-100>,
  "summary": "<2 sentence overall assessment>",
  "matches": ["<requirement he meets>", "<requirement he meets>", "<requirement he meets>"],
  "gaps": ["<gap with brief honest context>"],
  "talkingPoints": ["<thing Mathan should emphasize>", "<thing Mathan should emphasize>", "<thing Mathan should emphasize>"],
  "suggestedQuestion": "<one great interview question for this specific role>",
  "verdict": "<STRONG FIT | GOOD FIT | WORTH EXPLORING | UNLIKELY FIT>"
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

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
