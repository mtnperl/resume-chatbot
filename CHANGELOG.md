# Changelog

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
