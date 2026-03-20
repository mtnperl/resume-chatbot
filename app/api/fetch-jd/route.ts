import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http and https URLs are supported" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch page (${response.status}). Try pasting the text directly.` },
        { status: 422 }
      );
    }

    const html = await response.text();

    // Strip scripts, styles, navigation cruft — keep body text
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (cleaned.length < 100) {
      return NextResponse.json(
        { error: "Could not extract text from this page. Try pasting the job description directly." },
        { status: 422 }
      );
    }

    // Trim to a reasonable size — most JDs are under 3000 chars
    return NextResponse.json({ text: cleaned.slice(0, 6000) });
  } catch (err) {
    console.error("[api/fetch-jd] Error:", err);
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Page took too long to load. Try pasting the text directly." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch page. Try pasting the job description directly." },
      { status: 500 }
    );
  }
}
