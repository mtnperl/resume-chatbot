import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoist mock references so they're available inside vi.mock factories
const mockLimitFn = vi.hoisted(() => vi.fn());

vi.mock("@vercel/kv", () => ({ kv: {} }));

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimitFn;
    static slidingWindow = vi.fn().mockReturnValue({ type: "slidingWindow" });
  }
  return { Ratelimit: MockRatelimit };
});

// Set KV env vars so the middleware initializes the ratelimiter
vi.stubEnv("KV_REST_API_URL", "https://fake-kv.upstash.io");
vi.stubEnv("KV_REST_API_TOKEN", "fake-token");

// Import AFTER env vars are set and mocks are in place
const { middleware } = await import("@/middleware");

function makeReq(path = "/api/chat", ip = "1.2.3.4"): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rate limit middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[O] allows request when under rate limit", async () => {
    mockLimitFn.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 15,
      reset: Date.now() + 3600_000,
    });

    const res = await middleware(makeReq());
    expect(res.status).not.toBe(429);
  });

  it("[P] returns 429 when rate limit exceeded", async () => {
    mockLimitFn.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 3600_000,
    });

    const res = await middleware(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many requests");
  });

  it("[Q] fails open when KV throws an error", async () => {
    mockLimitFn.mockRejectedValue(new Error("KV connection refused"));

    const res = await middleware(makeReq());
    // Should allow the request rather than block it
    expect(res.status).not.toBe(429);
    expect(res.status).not.toBe(500);
  });

  it("[O] skips rate limiting for non-chat routes", async () => {
    const res = await middleware(makeReq("/api/other"));
    // mockLimitFn should NOT have been called
    expect(mockLimitFn).not.toHaveBeenCalled();
  });
});
