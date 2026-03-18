# Changelog

## [0.2.0.0] - 2026-03-18

### Added
- **Dynamic follow-up chips** — after each assistant response, 3 contextual follow-up questions are generated and rendered as clickable chips below the reply; chips reset on each new turn
- **"Ask Mathan directly" link** — subtle mailto link below each completed assistant response; pre-fills recruiter's question in the email body
- **Download PDF** — "↓ PDF" button appears in the header after 2+ messages; generates a clean A4 PDF client-side (jsPDF) with the full conversation, labeled RECRUITER / MATHAN.AI, with contact footer
- **Share conversation** — "↗ Share" button stores the conversation in Vercel KV (30-day TTL) and copies a unique URL to clipboard; `/share/[id]` renders a read-only transcript page
- **Analytics dashboard** — every question logged to Vercel KV (capped at 500); private dashboard at `/dashboard?key=DASHBOARD_SECRET` shows total questions, avg messages/session, top questions, 14-day traffic chart, and recent question feed (uses Recharts)
- **Session memory** — system prompt updated to instruct Claude not to repeat information already covered; references earlier answers and adds new detail
- **`app/api/follow-ups/route.ts`** — lightweight Claude Haiku call returning 3 JSON follow-up questions
- **`app/api/share/route.ts`** — stores serialized conversation in KV with nanoid(8) ID
- **`app/api/analytics/route.ts`** — POST logs events; GET (auth-gated) returns aggregated stats
- **`app/share/[id]/page.tsx`** — server-rendered read-only conversation transcript
- **`app/dashboard/page.tsx`** — client-side analytics dashboard with Recharts bar chart
- **`lib/kv.ts`** — thin re-export of `@vercel/kv` for consistent import path
- **`recharts`** and **`nanoid`** added as dependencies

### Changed
- **`MessageBubble`** restructured to `flex-col items-start/end` to accommodate the "Ask Mathan directly" link below assistant bubbles
- **`handleSend`** now fires analytics POST and clears follow-up chips on each new message; accumulates full stream content in a local variable for the follow-ups API call
- **Test updated** — chip auto-send test now asserts `toHaveBeenCalledWith("/api/chat", ...)` instead of `toHaveBeenCalledTimes(1)` to account for analytics and follow-up background fetches

### Removed
- **Slack notification TODO** removed from TODOS.md (feature not wanted)

## [0.1.1] - 2026-03-17

### Added
- **Rate limiting** via Vercel KV + Upstash ratelimit: 20 requests/hour per IP, fail-open when KV unavailable
- **Vitest test suite** (24 tests): API route, middleware, and React component coverage
- **Contact modal** with mailto form — recruiter fills name/email/message, opens their email client pre-filled
- **`getSystemPrompt(mode?)`** function laying groundwork for role personalization in PR 2
- **`.env.example`** documenting all required environment variables
- **TODOS.md** tracking deferred work (sliding window history, Slack notifications, E2E tests, response caching)

### Changed
- **Model switched from `claude-opus-4-6` to `claude-haiku-4-5-20251001`** — 20x cost reduction, same UX quality for resume Q&A
- **Error handling hardened**: bad JSON body → 400, missing messages → 400, messages > 20 → 429, Anthropic timeout → user-friendly stream message, Anthropic 429 → "Service is busy" message
- **20-message conversation cap** enforced server-side (prevents unbounded token costs) and client-side (disables input with notice)
- **Page title** changed from "Resume Chatbot" to "Chat with Mathan Perl"
- **Favicon** updated to 💼 emoji SVG
- **iOS viewport** fixed with `interactive-widget=resizes-content` (keyboard no longer covers input)
- **`min-h-screen`** replaced with `h-dvh` for correct mobile viewport handling
- **Suggested question chips auto-send** on click (no extra tap needed)
- **Typing indicator** (three animated dots) shown before first streaming token arrives
- **Welcome message** pre-loaded on page open
- **"Get in touch" button** added to header, opens contact modal
- **`MAX_MESSAGES`** extracted to `lib/constants.ts` (shared between route and UI)
- **`TextEncoder`** moved to module scope (reused across requests)
- **`MessageBubble`** wrapped in `React.memo` — only the actively-streaming message re-renders on each chunk
- **`sendMessage`** refactored to `handleSend(text: string)` for programmatic calls from chip clicks

## [0.1.0] - 2026-03-17

### Added
- Initial Next.js 16 resume chatbot scaffold
- Streaming chat UI with suggested questions
- Anthropic SDK integration with `claude-opus-4-6`
- Resume content in `lib/resume.ts`
