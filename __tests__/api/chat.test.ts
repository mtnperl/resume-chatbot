import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock references so they're available inside vi.mock factories
const mockStreamFn = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  class MockRateLimitError extends Error {
    constructor() {
      super("Rate limit exceeded");
      this.name = "RateLimitError";
    }
  }

  class MockAnthropic {
    static RateLimitError = MockRateLimitError;
    messages = { stream: mockStreamFn };
  }

  return { default: MockAnthropic };
});

vi.mock("@/lib/resume", () => ({ default: "Test resume content" }));
vi.mock("@/lib/constants", () => ({ MAX_MESSAGES: 20 }));

// Import AFTER mocks are registered
const { POST, getSystemPrompt } = await import("@/app/api/chat/route");

function makeStreamIterable(texts: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of texts) {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text },
        };
      }
    },
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("getSystemPrompt", () => {
  it("[N] returns base prompt when mode is undefined", () => {
    const prompt = getSystemPrompt();
    expect(prompt).toContain("Mathan Noam Perl");
    expect(prompt).not.toContain("Tone emphasis");
  });

  it("[N] returns BD-enhanced prompt for mode=bd", () => {
    const prompt = getSystemPrompt("bd");
    expect(prompt).toContain("Tone emphasis");
    expect(prompt).toContain("business development");
  });

  it("[N] returns base prompt for unknown mode", () => {
    const prompt = getSystemPrompt("unknown");
    expect(prompt).not.toContain("Tone emphasis");
  });
});

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[H] streams response for valid messages array", async () => {
    mockStreamFn.mockReturnValue(makeStreamIterable(["Hello", " world"]));

    const req = makeRequest({
      messages: [{ role: "user", content: "What is your name?" }],
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8"
    );

    const text = await response.text();
    expect(text).toBe("Hello world");
  });

  it("[I] returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json }",
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("parse JSON");
  });

  it("[J] returns 400 when messages field is missing", async () => {
    const req = makeRequest({ other: "field" });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("array");
  });

  it("[J] returns 400 when messages is not an array", async () => {
    const req = makeRequest({ messages: "not an array" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("[K] returns 429 when messages.length exceeds 20", async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    }));
    const req = makeRequest({ messages });
    const response = await POST(req);
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain("limit");
  });

  it("[K] allows exactly 20 messages", async () => {
    mockStreamFn.mockReturnValue(makeStreamIterable(["OK"]));

    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    }));
    const req = makeRequest({ messages });
    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it("[L] streams timeout error when Anthropic times out", async () => {
    const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });
    mockStreamFn.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        throw abortError;
      },
    });

    const req = makeRequest({
      messages: [{ role: "user", content: "test" }],
    });
    const response = await POST(req);
    expect(response.status).toBe(200); // stream started OK

    const text = await response.text();
    expect(text).toContain("timed out");
  });
});
