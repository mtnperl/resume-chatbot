import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Only initialize rate limiters if KV is configured
// Fail open if KV env vars are missing (e.g., local dev without Vercel KV)
let chatRatelimit: Ratelimit | null = null;
let tailorRatelimit: Ratelimit | null = null;
let rolefitRatelimit: Ratelimit | null = null;
let loginRatelimit: Ratelimit | null = null;

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
  loginRatelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: false,
    prefix: "resume-chatbot:rl:login",
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
  if (pathname.startsWith("/api/auth/login")) {
    return loginRatelimit;
  }
  return null;
}

const PROTECTED_PREFIXES = [
  "/hub",
  "/jobchat",
  "/cvtailor",
  "/share",
  "/luniastudio",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

async function applyRateLimit(
  ratelimit: Ratelimit,
  ip: string,
): Promise<NextResponse | null> {
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    if (success) return null;
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
      },
    );
  } catch {
    // KV error — fail open rather than blocking all requests
    console.warn("[middleware] Rate limit check failed — failing open");
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API rate limiting (existing behavior + login)
  const ratelimit = getRatelimiter(pathname);
  if (ratelimit) {
    const limited = await applyRateLimit(ratelimit, getIp(request));
    if (limited) return limited;
  }

  // 2. Auth gate for protected pages
  if (isProtectedPath(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const ok = await verifySession(token);
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/chat",
    "/api/tailor",
    "/api/cover-letter",
    "/api/rolefit",
    "/api/auth/login",
    "/hub/:path*",
    "/jobchat/:path*",
    "/cvtailor/:path*",
    "/share/:path*",
    "/luniastudio/:path*",
  ],
};
