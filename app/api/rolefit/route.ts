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
      max_tokens: 1500,
      system: "You are a JSON API. Output only the JSON object — no markdown, no backticks, no explanation.",
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" }, // prefill forces response to start with {
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Prepend the prefilled "{" and find closing "}"
    const text = "{" + raw;
    const end = text.lastIndexOf("}");
    if (end === -1) throw new SyntaxError("No closing brace in response");
    const cleaned = text.slice(0, end + 1);

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
