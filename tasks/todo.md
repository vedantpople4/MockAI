# Task List: MockAI Productionization Refactor

See `tasks/plan.md` for architecture rationale, checkpoints, and risks.

---

## Task 1: Stop leaking secrets to the client and to git

**Description:** Rename the two server-only env vars off the `NEXT_PUBLIC_`
prefix (which bundles them into client JS), remove the hardcoded credential
from `drizzle.config.js`, and add a `.env.example` so the required vars are
documented without exposing real values.

**Acceptance criteria:**
- [ ] `utils/db.js` reads `process.env.DATABASE_URL` (not `NEXT_PUBLIC_DRIZZLE_DB_URL`)
- [ ] `utils/GeminiAIModel.js` reads `process.env.GEMINI_API_KEY` (not `NEXT_PUBLIC_GEMINI_API_KEY`)
- [ ] `drizzle.config.js` reads `process.env.DATABASE_URL`, contains zero literal credentials
- [ ] `.env.example` created at repo root listing all required vars with placeholder values (`DATABASE_URL`, `GEMINI_API_KEY`, Clerk vars, `NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT`, `NEXT_PUBLIC_INTERVIEW_INFO`, `NEXT_PUBLIC_INFORMATION`)
- [ ] Local `.env.local` updated to match new names (not committed — already gitignored via `.env*.local`)

**Verification:**
- [ ] `npm run build` succeeds
- [ ] `grep -rn "NEXT_PUBLIC_GEMINI_API_KEY\|NEXT_PUBLIC_DRIZZLE_DB_URL" .` (excluding node_modules) returns nothing
- [ ] Manual: `npm run dev`, confirm dashboard loads and DB/Gemini calls still work with renamed vars

**Dependencies:** None

**Files likely touched:**
- `utils/db.js`
- `utils/GeminiAIModel.js`
- `drizzle.config.js`
- `.env.example` (new)

**Estimated scope:** Small (4 files)

---

## Task 2: Convert `InterviewList` to a Server Component

**Description:** Move the Drizzle query out of the client component into a
server-side data fetch, using Clerk's server-side `auth()` to get the current
user instead of the client `useUser()` hook. This removes the `db` import
from client bundle and is the template for Tasks 3–5.

**Acceptance criteria:**
- [ ] `InterviewList.jsx` no longer has `"use client"` or imports `db`/`useUser`
- [ ] Data fetched via Clerk's server `auth()` + Drizzle query scoped to the authenticated user's email, in the component itself or a small server-only helper (e.g. `utils/queries.js`)
- [ ] `InterviewItemCard.jsx` (the interactive child using `useRouter`) stays a client component, unchanged

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: sign in as user A, confirm only A's interviews show; sign in as user B, confirm B doesn't see A's

**Dependencies:** Task 1 (uses renamed `DATABASE_URL`)

**Files likely touched:**
- `app/dashboard/_components/InterviewList.jsx`
- `utils/queries.js` (new, optional shared helper)

**Estimated scope:** Small (1-2 files)

---

## Task 3: Server-side fetch + ownership check for interview detail page

**Description:** `app/dashboard/interview/[interviewId]/page.jsx` currently
fetches by `mockId` alone with no check that the record belongs to the
signed-in user. Convert to a Server Component, add the ownership filter, and
redirect/404 if the interview doesn't belong to the requester (or doesn't
exist).

**Acceptance criteria:**
- [ ] Query filters on both `mockId` AND `createdBy === current user's email`
- [ ] Non-owner or nonexistent `mockId` triggers `notFound()` (Next.js) rather than rendering empty/loading state forever
- [ ] Webcam enable/disable interactivity (currently in the same file) stays working — extract that piece into a small client child component if needed to keep the page itself server-rendered

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: visit own interview detail page — works; construct a URL with another user's real mockId (if testable with 2 accounts) or a random UUID — get a 404, not data or an infinite loading spinner

**Dependencies:** Task 2 (reuses the same auth/query pattern)

**Files likely touched:**
- `app/dashboard/interview/[interviewId]/page.jsx`
- possibly a new small client child component for the webcam toggle

**Estimated scope:** Medium (2-3 files)

---

## Task 4: Server-side loader for start-interview page

**Description:** `start/page.jsx` fetches the interview and does an
unguarded `JSON.parse(result[0].jsonMockResp)` — if Gemini's stored output
was ever malformed, this throws and the page white-screens. Move the fetch +
ownership check server-side (like Task 3), and wrap the `JSON.parse` in a
try/catch that falls back to an empty question list with an error message
rather than crashing.

**Acceptance criteria:**
- [ ] Ownership check added (same pattern as Task 3)
- [ ] `JSON.parse` wrapped in try/catch; on failure, render a clear "this interview's questions couldn't be loaded" state instead of throwing
- [ ] `QuestionsSection` and `RecordAnswerSection` (interactive, need client state for `activeQuestionIndex`) stay client components, now receiving server-fetched data as props from a thin client wrapper if needed for the index state

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: start an existing interview, step through questions, confirm still works
- [ ] Manual: manually corrupt one row's `jsonMockResp` in the DB (or stub the parse to throw) and confirm the page shows a graceful error, not a crash

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `app/dashboard/interview/[interviewId]/start/page.jsx`

**Estimated scope:** Medium (1-2 files, some restructuring for the client/server split)

---

## Task 5: Convert feedback page to Server Component with ownership check

**Description:** Same treatment as Task 3, applied to
`app/dashboard/interview/[interviewId]/feedback/page.jsx`, which currently
queries `UserAnswer` by `mockIdRef` alone.

**Acceptance criteria:**
- [ ] Query joins/filters so only rows belonging to the requesting user's interview are returned (check via the parent `MockInterview.createdBy`, since `UserAnswer` doesn't reliably store `userEmail` today — see Task 7 bug fix)
- [ ] Non-owner access returns `notFound()`
- [ ] Collapsible feedback UI (`Collapsible`/`CollapsibleTrigger`) has no interactivity dependency on fetching, so it can take server-fetched data as props directly, no client wrapper needed

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: complete an interview, view feedback, confirm data displays correctly and is scoped to the right user

**Dependencies:** Task 2, Task 3, Task 7 (for reliable `userEmail` on `UserAnswer` rows)

**Files likely touched:**
- `app/dashboard/interview/[interviewId]/feedback/page.jsx`

**Estimated scope:** Small (1 file)

---

## Task 6: Server Action for interview creation

**Description:** Move the Gemini question-generation call and the
`MockInterview` insert out of `AddNewInterview.jsx` into a `"use server"`
Server Action. The client component keeps only the form state and calls the
action on submit.

**Acceptance criteria:**
- [ ] New server action (e.g. `app/dashboard/_actions/createInterview.js`, `"use server"`) does: build prompt, call Gemini, strip markdown fences, insert row, return the new `mockId`
- [ ] `AddNewInterview.jsx` no longer imports `chatSession` or `db`
- [ ] Gemini call wrapped in try/catch; on failure, action returns an error the client shows via `toast` instead of leaving the button stuck on "Generating Questions"
- [ ] Malformed/non-JSON Gemini response is caught before insert (validate with `JSON.parse` in a try/catch server-side, not just string-replace) — insert only proceeds on valid JSON

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: create a new interview end to end, land on the interview detail page with the new `mockId`
- [ ] Manual: temporarily break the Gemini call (bad API key) and confirm the UI shows an error toast, not an infinite spinner

**Dependencies:** Task 1

**Files likely touched:**
- `app/dashboard/_actions/createInterview.js` (new)
- `app/dashboard/_components/AddNewInterview.jsx`

**Estimated scope:** Medium (2 files)

---

## Task 7: Server Action for answer submission + bug fixes

**Description:** Move the feedback-generation Gemini call and `UserAnswer`
insert into a Server Action. Along the way, fix a real bug:
`RecordAnswerSection.jsx` line 82 inserts `user: currUserEmail` but the schema
column is `userEmail` (`utils/schema.js` line 21) — this field is silently
dropped on every insert today, meaning **no `UserAnswer` row has ever had a
`userEmail` value**. Also add try/catch around the `JSON.parse` of Gemini's
feedback response (currently unguarded — malformed output throws and leaves
the UI stuck in `loading: true` forever).

**Acceptance criteria:**
- [ ] New server action (e.g. `app/dashboard/_actions/submitAnswer.js`) does: build feedback prompt, call Gemini, parse JSON safely, insert `UserAnswer` row with correct `userEmail` field name
- [ ] `RecordAnswerSection.jsx` no longer imports `chatSession` or `db`
- [ ] Malformed Gemini JSON response caught server-side; action returns an error, client shows a toast and resets `loading` to `false` (currently there's a commented-out block for this exact case — replace it with real handling, don't leave it commented)
- [ ] New rows in `UserAnswer` have a populated `userEmail` column (verify via `db:studio`)

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: record an answer, confirm it saves and `userEmail` is populated in the DB
- [ ] Manual: simulate a Gemini failure/malformed response, confirm the recording button becomes usable again with an error toast rather than staying stuck

**Dependencies:** Task 1

**Files likely touched:**
- `app/dashboard/_actions/submitAnswer.js` (new)
- `app/dashboard/interview/[interviewId]/start/_components/RecordAnswerSection.jsx`

**Estimated scope:** Medium (2 files)

---

## Task 8: Input validation on Server Actions

**Description:** Add zod schemas validating the inputs to both Server
Actions (job position/description/experience for creation; question/answer
length for submission) so malformed or empty input from a bypassed client
form can't reach Gemini or the DB.

**Acceptance criteria:**
- [ ] `zod` added as a dependency
- [ ] Both Server Actions validate their input against a schema before doing any work, returning a structured error on failure
- [ ] Client components surface validation errors via existing `toast` pattern

**Verification:**
- [ ] `npm run build` succeeds
- [ ] Manual: call the action with empty/oversized input (e.g. via devtools bypassing the `required` HTML attribute) and confirm a clean rejection, not a Gemini call with garbage input

**Dependencies:** Task 6, Task 7

**Files likely touched:**
- `app/dashboard/_actions/createInterview.js`
- `app/dashboard/_actions/submitAnswer.js`
- `package.json`

**Estimated scope:** Small (2-3 files)

---

## Task 9: Per-user rate limiting on AI-calling actions

**Description:** Add a lightweight rate limit (e.g. max N interview
creations or answer submissions per user per minute) to the two Server
Actions, since each one makes a paid Gemini call and there's currently
nothing stopping rapid repeated submissions (accidental double-clicks or
deliberate abuse). Keep this simple — a DB-backed timestamp check or an
in-memory-per-instance limiter is enough at current scale; don't add
Upstash/Redis infra for a single-user side project unless traffic justifies
it (call this out as a documented future upgrade, per the plan's risk table).

**Acceptance criteria:**
- [ ] Both Server Actions check a rate limit keyed on the user's email before calling Gemini
- [ ] Exceeding the limit returns a clear "please wait" error surfaced via toast, not a silent failure

**Verification:**
- [ ] Manual: submit the create-interview form more than the limit allows within a minute, confirm the (N+1)th request is rejected with a clear message instead of hitting Gemini

**Dependencies:** Task 6, Task 7

**Files likely touched:**
- `app/dashboard/_actions/createInterview.js`
- `app/dashboard/_actions/submitAnswer.js`
- possibly a small new `utils/rateLimit.js` helper

**Estimated scope:** Small (2-3 files)

---

## Task 10: Fix cosmetic/UX bugs found during the refactor

**Description:** While touching these files, fix small pre-existing bugs
that are cheap to fix now and otherwise ship to "production":
`AddNewInterview.jsx` line 108 renders literal quote marks around
"Generating Questions" text (`<LoaderCircle/>'Generating Qustions'` — also
misspelled "Questions"), and `RecordAnswerSection.jsx` line 116 similarly
renders literal quotes around "Stop Recording" (`<Mic/> 'Stop Recording'`) —
both are plain JSX text nodes that happen to include stray `'` characters,
not actual string interpolation, so users currently see literal apostrophes
on screen.

**Acceptance criteria:**
- [ ] "Generating Questions" (spelling fixed) renders without stray quote characters
- [ ] "Stop Recording" renders without stray quote characters

**Verification:**
- [ ] Manual: trigger both loading states, visually confirm no stray `'` characters around the text

**Dependencies:** Task 6, Task 7 (touching the same files)

**Files likely touched:**
- `app/dashboard/_components/AddNewInterview.jsx`
- `app/dashboard/interview/[interviewId]/start/_components/RecordAnswerSection.jsx`

**Estimated scope:** XS (2 files, one-line changes)

---

## Task 11: Add loading/error boundaries for interview routes

**Description:** Now that detail/start/feedback pages are Server Components
(Tasks 3–5), add Next.js `loading.jsx` and `error.jsx` files per route so
navigation shows a proper loading state and unexpected errors show a
recoverable UI instead of Next's default error screen.

**Acceptance criteria:**
- [ ] `loading.jsx` added for `interview/[interviewId]`, `.../start`, `.../feedback`
- [ ] `error.jsx` added for the same routes with a "try again"/"back to dashboard" action

**Verification:**
- [ ] Manual: throttle network in devtools, navigate between routes, confirm loading UI shows
- [ ] Manual: temporarily force an error in one of the server fetches, confirm the error boundary renders instead of a blank/crashed page

**Dependencies:** Tasks 3, 4, 5

**Files likely touched:**
- `app/dashboard/interview/[interviewId]/loading.jsx` (new)
- `app/dashboard/interview/[interviewId]/error.jsx` (new)
- equivalents under `start/` and `feedback/`

**Estimated scope:** Small (up to 6 small new files)

---

## Task 12: Add tests for the Server Actions

**Description:** `createInterview` and `submitAnswer` (`app/dashboard/_actions/`)
are now the entire business-logic layer — validation, the Gemini call, and the
DB write all happen there — with zero automated coverage. A future edit could
silently reintroduce the `userEmail` field bug or break the JSON-parse guard
and nobody would notice until production. Set up Vitest (lighter weight than
Jest, native ESM support, which matters since this project already uses ESM
config files) and write unit tests against both actions, mocking
`@clerk/nextjs/server`, `@/utils/db`, and `@/utils/GeminiAIModel`.

**Acceptance criteria:**
- [x] Vitest configured and runnable via `npm test`
- [x] `createInterview`: tests cover valid input → success path, zod validation rejection, unauthenticated user, Gemini throwing, Gemini returning malformed JSON, DB insert throwing
- [x] `submitAnswer`: same coverage, plus a regression test asserting the inserted row has a `userEmail` field populated (guards against the bug fixed earlier reappearing)
- [x] Rate limiter (`utils/rateLimit.js`) has a direct unit test (allow under limit, reject over limit, window reset)

**Verification:**
- [x] `npm test` passes
- [x] `npm run build` still succeeds

**Dependencies:** None (can start immediately)

**Files likely touched:**
- `vitest.config.js` (new)
- `app/dashboard/_actions/__tests__/createInterview.test.js` (new)
- `app/dashboard/_actions/__tests__/submitAnswer.test.js` (new)
- `utils/__tests__/rateLimit.test.js` (new)
- `package.json`

**Estimated scope:** Medium (5 files)

---

## Task 13: Set up CI to run build/lint/tests on every PR

**Description:** Nothing currently catches a broken build before it lands —
today's session hit exactly this (a missing `zod` install broke the build
silently until the next local run). Add a GitHub Actions workflow that runs
on every push/PR: install deps, `npm run build`, `npm run lint`, and `npm test`
(once Task 12 exists).

**Acceptance criteria:**
- [x] `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`
- [x] Workflow installs deps, runs build, lint, and test steps
- [x] Placeholder env vars provided in the workflow (matching `.env.example`) so the build step doesn't fail on missing `DATABASE_URL`/`GEMINI_API_KEY` the way it did locally in this session

**Verification:**
- [x] Simulated locally: `npm ci` + `npm run lint` + `npm test` + `npm run build`, same commands/order as the workflow, all exit 0
- [ ] Push a branch with a deliberately broken build/lint/test and confirm the workflow fails on GitHub (not yet done — nothing has been pushed to origin this session)
- [ ] Push a clean branch and confirm it passes on GitHub (blocked on the same)

**Dependencies:** Task 14 (lint must be configured for the lint step to mean anything), Task 12 (for the test step)

**Files likely touched:**
- `.github/workflows/ci.yml` (new)

**Estimated scope:** Small (1 file)

---

## Task 14: Configure ESLint

**Description:** `npm run lint` currently just prompts to configure ESLint
interactively — there's no config in the repo at all, so nothing is actually
linted today. Run through Next's setup (Strict/recommended), commit the
resulting config, and fix whatever it flags.

**Acceptance criteria:**
- [x] ESLint config committed (`.eslintrc.json` or `eslint.config.js`)
- [x] `npm run lint` runs non-interactively and passes (or documented exceptions are explicitly disabled with a reason)

**Verification:**
- [x] `npm run lint` exits 0 with no prompts

**Dependencies:** None

**Files likely touched:**
- `.eslintrc.json` (new)
- possibly minor fixes across `app/`, `utils/`, `components/` for whatever the linter flags

**Estimated scope:** Small–Medium (depends on how much the linter flags)

---

## Task 15: Resolve npm audit findings

**Description:** `npm audit` currently reports 23 vulnerabilities (1 low, 8
moderate, 12 high, 2 critical) in transitive dependencies — confirmed
pre-existing (present with or without this session's changes), not introduced
by the refactor. Start with `npm audit fix` (non-breaking); evaluate anything
left over that needs `--force` case by case rather than forcing it blindly,
since major transitive bumps can break Next.js/Clerk/Drizzle compatibility.

**Acceptance criteria:**
- [x] `npm audit fix` run, resulting diff reviewed (not blindly force-pushed)
- [x] Any remaining high/critical findings either resolved or explicitly documented as accepted risk with rationale (e.g. dev-only dependency, no reachable path)
- [x] `npm run build` still succeeds after any dependency bumps

**Verification:**
- [x] `npm audit` shows a materially lower count (35 → 27), or a documented reason for each remaining finding
- [ ] Full manual walkthrough still works after dependency updates — not yet done, requires a real (rotated) `DATABASE_URL`/Clerk keys, same blocker noted throughout this session

**Resolved this session (35 → 27 findings):**
- `npm audit fix` (non-breaking): `@clerk/nextjs` middleware-bypass, `cookie`/`js-cookie`/`path-to-regexp` (transitive via Clerk), `cross-spawn`, `micromatch`, `picomatch`, `yaml`, and `@clerk/clerk-react` (authorization bypass, became fixable after the Clerk bump)
- `next` 14.2.5 → 14.2.35 (patch, same minor) — done for general hygiene, but **did not** actually resolve the Next.js CVEs or the vendored `postcss` finding; npm's own suggested fix for those is `next@16.2.12`, a major version (see below)

**Remaining findings — documented as accepted risk, not fixed this session:**
- **`next` core CVEs + vendored `postcss` (many, several high)** — real fix requires Next.js 16 (major version). This is a framework migration, not a dependency bump — deserves its own dedicated task with real regression testing, not something to force through a hygiene pass. Recommend scheduling separately.
- **`drizzle-orm` SQL injection via improperly escaped identifiers (high, GHSA-gpj5-g38j-94v9)** — fix requires 0.33 → 0.45.2 (breaking). User decision (asked directly): skip for now rather than bump without a live DB to verify query-builder behavior against. Revisit if/when Task 16 (which needs a real DB anyway) happens.
- **`drizzle-kit`/`esbuild` chain** — dev-only tooling (`db:push`/`db:studio`), not shipped to production, tied to the same drizzle-orm version decision above.
- **ESLint toolchain (`brace-expansion`/`minimatch`/etc.)** — dev-only, fix requires `eslint@10.x` (major), which would likely break `eslint-config-next@14.2.5`'s peer compatibility (pinned to Next 14's ESLint 8 line) — not worth risking the lint setup just established in Task 14 for a dev-only, non-shipped dependency.
- **`uuid` buffer bounds check (moderate, GHSA-w5hq-g745-h8pq)** — confirmed not reachable: the codebase only calls `uuidv4()` with no arguments (`app/dashboard/_actions/createInterview.js`); the advisory only affects v3/v5/v6 functions when a caller manually supplies a `buf` parameter, which never happens here. No upgrade needed.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `package-lock.json`

**Estimated scope:** Small–Medium (mostly dependency bumps, but requires manual regression testing)

---

## Task 16: Migrate `createdAt` from `varchar` to a real timestamp

**Description:** `MockInterview.createdAt` and `UserAnswer.createdAt` are
stored as `varchar` strings formatted `DD-MM-yyyy` (day precision only) via
`moment().format(...)`, instead of a proper timestamp column. This makes
correct sorting/filtering fragile (lexicographic string sort on `DD-MM-yyyy`
does not sort chronologically across month/year boundaries) and blocks
anything that needs real time precision (e.g. a DB-backed rate-limit window,
if `utils/rateLimit.js`'s in-memory approach is ever upgraded). This is a
schema migration touching production data — existing rows have
non-timestamp-parseable strings, so this needs an additive, data-safe
migration, not a naive column type change.

**Acceptance criteria:**
- [ ] New `timestamp` column added alongside the existing `createdAt` varchar (additive, not a destructive rename)
- [ ] Both Server Actions (`createInterview`, `submitAnswer`) write the new timestamp column going forward
- [ ] `InterviewItemCard.jsx` and any other display of `createdAt` updated to use the new column, formatted for display
- [ ] Existing varchar column left in place (or backfilled/dropped in a clearly separate follow-up) rather than dropped in the same migration that introduces the new column
- [ ] Drizzle migration generated via `npm run db:push` and verified against a real (non-placeholder) database

**Verification:**
- [ ] `npm run db:push` succeeds against a real Neon instance
- [ ] New interviews/answers show a correctly sorted, real-time-precision timestamp
- [ ] Existing rows still render without error (their old varchar `createdAt` still displays if the new column is null for pre-migration rows)

**Dependencies:** Requires a real (rotated) `DATABASE_URL`, not the placeholder used during this session's build verification

**Files likely touched:**
- `utils/schema.js`
- `app/dashboard/_actions/createInterview.js`
- `app/dashboard/_actions/submitAnswer.js`
- `app/dashboard/_components/InterviewItemCard.jsx`
- generated Drizzle migration file(s)

**Estimated scope:** Medium (schema change + call-site updates + requires a live DB to verify, unlike every prior task in this list)
