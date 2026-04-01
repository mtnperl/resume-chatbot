import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

// Only initialize rate limiters if KV is configured
// Fail open if KV env vars are missing (e.g., local dev without Vercel KV)
let chatRatelimit: Ratelimit | null = null;
let tailorRatelimit: Ratelimit | null = null;
let rolefitRatelimit: Ratelimit | null = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  chatRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: false,
    prefix: "resume-chatbot:rl:chat",
  });
  // Tighter limit for tailor — each call uses ~4000 tokens of Sonnet
  tailorRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: false,
    prefix: "resume-chatbot:rl:tailor",
  });
  rolefitRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: false,
    prefix: "resume-chatbot:rl:rolefit",
  });
}

function getRatelimiter(pathname: string): Ratelimit | null {
  if (pathname.startsWith("/api/tailor") || pathname.startsWith("/api/cover-letter")) {
    return tailorRatelimit;
  }
  if (pathname.startsWith("/api/chat")) {
    return chatRatelimit;
  }
  if (pathname.startsWith("/api/rolefit")) {
    return rolefitRatelimit;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const ratelimit = getRatelimiter(request.nextUrl.pathname);

  // Fail open if route not rate-limited or rate limiter not configured
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
  matcher: ["/api/chat", "/api/tailor", "/api/cover-letter", "/api/rolefit"],
};
