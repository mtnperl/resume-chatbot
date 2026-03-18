import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Only initialize rate limiter if KV is configured
// Fail open if KV env vars are missing (e.g., local dev without Vercel KV)
let ratelimit: Ratelimit | null = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: false,
    prefix: "resume-chatbot:rl",
  });
}

export async function middleware(request: NextRequest) {
  // Only rate limit the chat API
  if (!request.nextUrl.pathname.startsWith("/api/chat")) {
    return NextResponse.next();
  }

  // Fail open if rate limiter not configured
  if (!ratelimit) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return NextResponse.next();
  } catch {
    // KV error — fail open rather than blocking all requests
    console.warn("[middleware] Rate limit check failed — failing open");
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/api/chat",
};
