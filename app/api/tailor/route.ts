import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert CV/resume editor. Your job is to tailor a CV to a specific job description.

You will receive:
1. The candidate's CV text (plain text extracted from their document)
2. A job description

Your task: Return a JSON array of segments representing the entire CV, where each segment is either unchanged or improved to better match the job description.

Rules:
- Cover the ENTIRE CV text — do not skip any part. Every word of the original must appear in exactly one segment's "original" field.
- Only change things that genuinely improve the match: keywords, phrasing, role descriptions, skill emphasis.
- Do NOT invent experience, credentials, or achievements the person doesn't have.
- Keep changes concise and professional — this is a real CV, not marketing copy.
- Aim for 8-15 targeted edits. Do not change everything.
- Unchanged segments: set "changed": false, "edited" equals "original", "reason" is empty string.
- Changed segments: set "changed": true, "edited" has the improved text, "reason" explains in one short sentence WHY this specific change was made (what it matches in the job description or why it's stronger phrasing).
- Break the CV into logical segments (sentences, bullet points, short paragraphs). Do not make segments longer than 3 sentences.

Return ONLY a valid JSON array. No markdown, no explanation, no backticks. Start with [ and end with ].

Format:
[
  {"original": "...", "edited": "...", "changed": false, "reason": ""},
  {"original": "...", "edited": "...", "changed": true, "reason": "Matches the job's emphasis on enterprise partnerships."},
  ...
]`;

export async function POST(req: NextRequest) {
  try {
    const { cvText, jobDescription } = await req.json();

    if (!cvText || !jobDescription) {
      return NextResponse.json(
        { error: "CV text and job description are required" },
        { status: 400 }
      );
    }

    if (cvText.trim().length < 50) {
      return NextResponse.json(
        { error: "CV text is too short — make sure the file was parsed correctly" },
        { status: 400 }
      );
    }

    if (jobDescription.trim().length < 20) {
      return NextResponse.json(
        { error: "Job description is too short" },
        { status: 400 }
      );
    }

    const userMessage = `CV TEXT:\n${cvText.slice(0, 6000)}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2000)}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: "[" }, // prefill to force JSON array
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const text = "[" + raw;
    const end = text.lastIndexOf("]");
    if (end === -1) throw new SyntaxError("No closing bracket in response");
    const cleaned = text.slice(0, end + 1);

    const segments = JSON.parse(cleaned);

    if (!Array.isArray(segments)) {
      throw new SyntaxError("Response is not an array");
    }

    return NextResponse.json({ segments });
  } catch (err) {
    console.error("[api/tailor] Error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response — please try again" },
        { status: 500 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
