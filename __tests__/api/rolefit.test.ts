import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

vi.mock("@/data/professional", () => ({ default: "Mathan Perl professional background" }));

const { POST } = await import("@/app/api/rolefit/route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/rolefit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function mockHaikuResponse(json: Record<string, unknown>) {
  const inner = JSON.stringify(json).slice(1); // strip leading "{"
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: inner }],
  });
}

describe("POST /api/rolefit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when jobDescription is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when jobDescription is empty string", async () => {
    const res = await POST(makeRequest({ jobDescription: "   " }));
    expect(res.status).toBe(400);
  });

  it("non-CS role: passes through model score unchanged", async () => {
    mockHaikuResponse({ score: 72, verdict: "GOOD FIT", summary: "ok", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Software Engineer at Acme, building backend systems" }));
    const data = await res.json();
    expect(data.score).toBe(72);
    expect(data.verdict).toBe("GOOD FIT");
  });

  it("CS role: clamps score to 91 when model returns lower", async () => {
    mockHaikuResponse({ score: 78, verdict: "GOOD FIT", summary: "ok", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Customer Success Manager at SaaS company" }));
    const data = await res.json();
    expect(data.score).toBe(91);
    expect(data.verdict).toBe("STRONG FIT");
  });

  it("CS role: leaves score alone when model returns ≥91", async () => {
    mockHaikuResponse({ score: 95, verdict: "STRONG FIT", summary: "great", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Customer Success Manager at SaaS company" }));
    const data = await res.json();
    expect(data.score).toBe(95);
  });

  it("CS role: triggers on 'csm' keyword", async () => {
    mockHaikuResponse({ score: 70, verdict: "GOOD FIT", summary: "ok", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Looking for a CSM to join our team" }));
    const data = await res.json();
    expect(data.score).toBe(91);
  });

  it("CS role: triggers on 'account manager' keyword", async () => {
    mockHaikuResponse({ score: 68, verdict: "GOOD FIT", summary: "ok", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Account Manager, enterprise SaaS" }));
    const data = await res.json();
    expect(data.score).toBe(91);
    expect(data.verdict).toBe("STRONG FIT");
  });

  it("CS role: clamps when model returns null score", async () => {
    mockHaikuResponse({ score: null, verdict: "GOOD FIT", summary: "ok", matches: [], gaps: [], talkingPoints: [], suggestedQuestion: "q" });
    const res = await POST(makeRequest({ jobDescription: "Customer Success role" }));
    const data = await res.json();
    expect(data.score).toBe(91);
  });

  it("returns 500 on malformed JSON from model", async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "not json at all" }] });
    const res = await POST(makeRequest({ jobDescription: "Some job" }));
    expect(res.status).toBe(500);
  });
});
