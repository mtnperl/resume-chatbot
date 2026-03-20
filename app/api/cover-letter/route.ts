import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert cover letter writer. Your job is to write a compelling, honest cover letter tailored to a specific job description.

You will receive:
1. The candidate's CV text (plain text)
2. A job description
3. The tailored CV segments (showing what was changed and why)

Your task: Write a cover letter that:
- Opens with a direct, confident statement of why this candidate fits this role (not "I am writing to apply for...")
- Highlights 2-3 specific achievements from the CV that are most relevant to the JD
- Addresses the key requirements from the JD using the candidate's actual experience
- Closes with a clear, simple call to action
- Reads like a smart person wrote it, not a template

Rules:
- 3-4 paragraphs max. One page. Every sentence earns its place.
- Never use: "I am passionate about", "thrives in", "results-driven", "dynamic", "synergy", "leverage", "paradigm"
- No em-dashes. No hollow adjectives. Facts over adjectives.
- Do not invent experience or credentials not in the CV.
- First person is fine. Formal but human.
- Do NOT include date, address headers, or "Sincerely, [Name]" — just the body paragraphs.

Return ONLY the cover letter text. No markdown, no explanation, no headers.`;

export async function POST(req: NextRequest) {
  try {
    const { cvText, jobDescription, segments } = await req.json();

    if (!cvText || !jobDescription) {
      return NextResponse.json(
        { error: "CV text and job description are required" },
        { status: 400 }
      );
    }

    if (cvText.trim().length < 50) {
      return NextResponse.json(
        { error: "CV text is too short" },
        { status: 400 }
      );
    }

    // Build a summary of what was tailored to help inform the cover letter
    const tailoredSummary =
      segments && Array.isArray(segments)
        ? segments
            .filter((s: { changed: boolean; reason: string; edited: string }) => s.changed && s.reason)
            .slice(0, 8)
            .map((s: { edited: string; reason: string }) => `- ${s.edited.slice(0, 100)} (${s.reason})`)
            .join("\n")
        : "";

    const userMessage = [
      `CV TEXT:\n${cvText.slice(0, 5000)}`,
      `\nJOB DESCRIPTION:\n${jobDescription.slice(0, 2000)}`,
      tailoredSummary
        ? `\nKEY TAILORED HIGHLIGHTS (use these as anchors):\n${tailoredSummary}`
        : "",
    ].join("");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from AI — please try again" },
        { status: 500 }
      );
    }

    return NextResponse.json({ coverLetter: text });
  } catch (err) {
    console.error("[api/cover-letter] Error:", err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
