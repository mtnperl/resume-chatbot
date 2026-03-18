# TODOS

## P1

### Smart conversation history (sliding window)
**What:** Instead of hard-capping at 20 messages, implement a sliding window that always includes the first user message (context anchor) + the last N messages. Improves quality for long sessions.
**Why:** Hard cap (20 messages) works for v1, but a long conversation that gets truncated loses context abruptly. A sliding window preserves coherence.
**Pros:** Better UX for engaged users; more natural conversation flow.
**Cons:** Slightly more complex token accounting; needs testing to confirm behavior at boundaries.
**Context:** Current v1 uses a hard 20-message cap server-side. The sliding window would replace this cap in v2. Start in `app/api/chat/route.ts` where messages are read from the request.
**Effort:** S (human: ~2 hours) → with CC+gstack: S (~10 min)
**Depends on:** v1 shipped with hard cap first

### Slack notification on contact form submit
**What:** When a recruiter submits the contact form, send Mathan a Slack DM with their name, email, message, and the last question they asked the bot.
**Why:** The whole point of lead capture is awareness in real-time. Email notifications can be missed; Slack is where Mathan works.
**Pros:** Immediate awareness of warm leads; includes conversation context.
**Cons:** Requires a Slack workspace + incoming webhook URL.
**Context:** Contact form will be implemented in v1 (sends email/mailto). This upgrades the notification channel to Slack. Use Slack incoming webhooks API — no Slack SDK needed. Add `SLACK_WEBHOOK_URL` to env vars.
**Effort:** S (human: ~1 hour) → with CC+gstack: S (~15 min)
**Depends on:** Contact form shipped in v1

## P2

### E2E tests with Playwright
**What:** Full browser end-to-end tests: launch browser, type a question, verify streaming response, test rate limit flow.
**Why:** Unit tests cover logic in isolation but can't catch integration bugs (e.g., streaming protocol mismatches, middleware + route interaction, mobile layout breaks).
**Pros:** Catches bugs unit tests miss; can be run against staging/production URL; documents the critical user flows as executable specs.
**Cons:** Requires a deployed URL; flakier than unit tests; Playwright adds ~80MB to dev dependencies.
**Context:** Add after PR 1 is deployed to Vercel. Use `https://{vercel-url}` as the test base URL. Critical paths: send message → see stream, chip auto-send, rate limit hit (429 shown in UI), contact CTA modal open/send. Start with `playwright.config.ts` + `e2e/chat.spec.ts`.
**Effort:** M (human: ~1 day) → with CC+gstack: S (~20 min)
**Depends on:** PR 1 deployed to Vercel with a stable URL

### Response caching for top suggested questions
**What:** Cache Anthropic responses for the top 10 suggested questions in Vercel KV with a 24h TTL. Eliminates 60-80% of API calls for common visitors.
**Why:** Analytics (once shipped) will confirm that most visitors ask the same 6-10 questions. Caching these is nearly free cost reduction.
**Pros:** Near-zero Anthropic cost for most visits; faster response for cached questions.
**Cons:** Cached answers may feel slightly stale if resume changes (clear cache on resume update).
**Context:** Implement as a lookup in `app/api/chat/route.ts` before calling Anthropic. Key: `cache:{sha256(messages[-1].content)}`. Clear all cache keys when admin updates resume. Use Vercel KV with EX 86400 (24h TTL).
**Effort:** M (human: ~4 hours) → with CC+gstack: S (~20 min)
**Depends on:** Analytics dashboard shipped (to know which questions to prioritize); admin resume editor (to know when to clear cache)
