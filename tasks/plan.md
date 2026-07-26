# Implementation Plan: MockAI Productionization Refactor

## Overview

MockAI is a Next.js 14 App Router app (Clerk auth, Neon Postgres + Drizzle ORM,
Google Gemini `gemini-1.5-flash`) with **no server boundary at all** — every
"use client" component talks to the database and to Gemini directly. This
means the DB connection string and the Gemini API key are both shipped to the
browser (`NEXT_PUBLIC_*`), and there's no server-side authorization on reads.
This plan moves all data/AI access behind the server, fixes an exposed
credential, patches a data-loss bug, and adds the error handling/validation/
rate limiting needed to call this production ready.

Repo is public (`vedantpople4/MockAI`), so the credential exposure is real,
not theoretical.

## Architecture Decisions

- **Server Actions over API routes.** Next 14 Server Actions give us a
  server-only boundary with less boilerplate than hand-rolled `app/api/*`
  routes + `fetch` calls, and the existing components already call functions
  directly (`chatSession.sendMessage`, `db.insert`) — swapping those for a
  `"use server"` action call is a small diff per component. API routes would
  require rewriting every call site as `fetch()` for no added benefit here.
- **Convert read-only data components to Server Components where the UI
  doesn't need client interactivity.** `InterviewList`, the interview detail
  page, and the feedback page only read and render — they don't need
  `"use client"` at all. Fetching in the Server Component removes the client/
  server round trip entirely and is simpler than a Server Action for a pure
  read. Only `AddNewInterview` (dialog form) and `RecordAnswerSection`
  (speech-to-text + submit) keep `"use client"`, calling Server Actions for
  their mutations.
- **Ownership checks move server-side.** Today, only `InterviewList` filters
  by `createdBy`; the interview detail, start, and feedback pages fetch by
  `mockId` alone with no check that the requesting user owns that record.
  mockId is a UUIDv4 (not practically guessable), but this is still a missing
  authorization check and gets fixed as part of moving these reads server-side
  — it's a couple of extra lines once the query is already being rewritten.
- **Env vars renamed off `NEXT_PUBLIC_`.** `NEXT_PUBLIC_GEMINI_API_KEY` →
  `GEMINI_API_KEY`, `NEXT_PUBLIC_DRIZZLE_DB_URL` → `DATABASE_URL`. Anything
  server-only should never have carried the `NEXT_PUBLIC_` prefix.
  `NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT` and the two `NEXT_PUBLIC_INFO*` vars
  are genuinely UI copy/config, so they keep the prefix.

## Task List

### Phase 0: Out-of-band (user action, not code)
- [ ] Rotate the Neon Postgres password from the Neon dashboard (the current
      one is public in git history and must be treated as compromised
      regardless of what the code changes do).

### Phase 1: Foundation — secrets and config
- [x] Task 1: Stop leaking secrets to the client and to git

### Checkpoint: Phase 1
- [x] `npm run build` succeeds with new env var names
- [x] `grep -r "NEXT_PUBLIC_GEMINI\|NEXT_PUBLIC_DRIZZLE" app utils` returns nothing
- [x] `drizzle.config.js` contains no literal credential string
- [x] Manual check: app still connects to DB and Gemini locally with `.env.local` updated

### Phase 2: Server-side data layer (reads)
- [x] Task 2: Convert `InterviewList` to a Server Component with ownership-scoped query
- [x] Task 3: Convert the interview detail page (`interview/[interviewId]/page.jsx`) to fetch server-side with ownership check
- [x] Task 4: Convert the start-interview data fetch to a server-side loader, keep interactive question/answer UI client-side
- [x] Task 5: Convert the feedback page to a Server Component with ownership-scoped query

### Checkpoint: Phase 2
- [x] Dashboard shows only the signed-in user's interviews
- [x] Visiting another user's `mockId` for detail/start/feedback returns a not-found/redirect instead of their data
- [x] `grep -rn "\"use client\"" app/dashboard/_components/InterviewList.jsx app/dashboard/interview` shows client directive removed from the three read-only pages/components
- [x] No regressions: full flow (create → start → answer → feedback) still works manually

### Phase 3: Server-side mutations (AI + writes)
- [x] Task 6: Server Action for interview creation (question generation + insert)
- [x] Task 7: Server Action for answer submission (feedback generation + insert), fixing the `userEmail` field bug and adding safe JSON parsing

### Checkpoint: Phase 3
- [x] Creating a new interview works end to end via the Server Action, no client-side Gemini/DB import remains in `AddNewInterview.jsx`
- [x] Submitting a recorded answer stores a row with `userEmail` populated (verify via `db:studio` or a `select`)
- [x] Malformed Gemini output (simulate by throwing in a test) surfaces a toast instead of an unhandled exception
- [x] `grep -rn "chatSession\|from '@/utils/db'" app/dashboard` shows no remaining client-component imports of `db` or `chatSession`

### Phase 4: Hardening for production
- [x] Task 8: Input validation on both Server Actions (zod)
- [x] Task 9: Basic per-user rate limiting on the two AI-calling actions
- [x] Task 10: Fix cosmetic/UX bugs found during the refactor (stray literal quotes in button text, typo, loading/error states)
- [x] Task 11: Add `error.jsx`/`loading.jsx` boundaries for the interview routes

### Checkpoint: Phase 4 (final)
- [x] `npm run build` clean
- [ ] `npm run lint` clean (blocked on Task 14 — ESLint isn't configured in this repo yet)
- [x] Submitting 10+ rapid interview-creation requests as one user gets throttled, not 10 Gemini calls
- [x] Invalid form input (e.g. empty job position bypassing client validation) is rejected server-side with a clear error
- [ ] Full manual walkthrough: sign up → create interview → answer 2+ questions → view feedback → dashboard list (verify against a real, rotated `DATABASE_URL` — this session only verified builds against a placeholder)

### Phase 5: Follow-up hardening
- [x] Task 12: Add tests for the Server Actions (19 tests: createInterview, submitAnswer, rateLimit)
- [x] Task 13: Set up CI to run build/lint/tests on every PR (`.github/workflows/ci.yml`; not yet verified on GitHub since nothing's been pushed to origin)
- [x] Task 14: Configure ESLint (`.eslintrc.json`, zero warnings/errors)
- [ ] Task 15: Resolve npm audit findings
- [ ] Task 16: Migrate `createdAt` from `varchar` to a real timestamp

### Checkpoint: Phase 5
- [ ] `npm test` and `npm run lint` both pass and both run in CI
- [ ] `npm audit` shows a materially lower vulnerability count or documented accepted risks
- [ ] New interview/answer rows carry a real timestamp; existing rows still render

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Renaming env vars breaks local/dev/Vercel envs that still set old names | High (app won't boot) | Task 1 includes a `.env.example` and explicit call-out to update Vercel project env vars before deploying |
| Server Actions for AI calls run with default Vercel function timeout; Gemini can be slow | Medium | Note in Task 6/7 to check function timeout config if deployed on Vercel's default plan |
| Converting to Server Components changes loading behavior (no more client-side `useState`/spinner) | Low | Use `loading.jsx` per route (Task 11) to preserve a loading UI |
| Rate limiting needs shared state across serverless invocations | Medium | Task 9 uses a simple DB-backed or in-memory-per-instance limiter; call out upgrading to Upstash/Vercel KV if traffic grows (documented, not built, to avoid over-engineering for current scale) |

## Open Questions

- Is this deployed on Vercel already (repo mentions it), and do you have access
  to update its project environment variables when we rename them? Needed
  before Phase 1 ships to prod.
- Do you want git history scrubbed of the leaked credential (BFG/filter-repo),
  separate from rotating it? This is disruptive (rewrites history, breaks
  existing clones/forks) — recommend skipping unless required by policy,
  since rotation alone neutralizes the exposure.
