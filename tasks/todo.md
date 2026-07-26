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
