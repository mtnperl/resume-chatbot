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
You are Mathan Perl's advocate helping recruiters see why he is a strong fit for a role.
Your job is to make the strongest honest case for hiring Mathan — highlight transferable strengths,
reframe gaps as manageable, and surface the aspects of his background that directly address the role's needs.
Err on the side of optimism: if a requirement is partially met, count it as a match with context.
Scores should reflect genuine potential, not a strict checklist — a candidate with strong fundamentals
and a learning track record should score higher than a rigid keyword match would suggest.

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

MATHAN'S BACKGROUND:
${character}

${professional}

${timeline}

Scoring guidance:
- 85-100: Strong alignment — major requirements met, clear compelling narrative
- 70-84: Good fit — core requirements met, minor gaps that Mathan can address
- 55-69: Worth exploring — meaningful overlap, some gaps but strong transferable strengths
- Below 55: Unlikely fit — only if the role fundamentally requires something Mathan has no exposure to

Return ONLY a valid JSON object with NO markdown, NO backticks, NO explanation. Just raw JSON:
{
  "score": <number 0-100>,
  "summary": "<2 sentence overall assessment that leads with Mathan's strongest relevant quality>",
  "matches": ["<requirement he meets — be specific and confident>", "<requirement he meets>", "<requirement he meets>"],
  "gaps": ["<gap reframed constructively — note what partially addresses it or how quickly he can close it>"],
  "talkingPoints": ["<compelling thing Mathan should lead with>", "<strong angle to emphasize>", "<differentiator vs typical candidates>"],
  "suggestedQuestion": "<one great interview question that lets Mathan showcase his strongest relevant experience>",
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
