# Codeyoung — AI-Assisted Development Record

This document records the significant technical development prompts and resulting implementation stages used while building the Codeyoung trial-class booking system. The project is a full-stack scheduling platform where parents book 30-minute trial classes and the system automatically allocates a mentor. Original per-keystroke prompts were not logged during development; every stage below is **reconstructed from the current source code, test files, and available project records**. They represent the engineering decisions and conversations that the implementation directly reflects, written in the style they would have been given at the time.

---

## Development Flow

```
Architecture & Stack → Domain Models → Temporal Utilities → Availability Engine
  → Mentor Allocation → Booking Service → REST API → Frontend Integration
  → Timezone Detection → Preferred-Time Support → Conflict UX → Confirmation & Calendar
  → Mentor Dashboard → Slot-Capacity Regression QA 
```

---

## Stage 1 — Architecture & Project Setup


### Developer Prompt

I'm building a trial-class booking system for Codeyoung. The core product requirement is: parents pick WHEN, the system picks WHO. A parent in any timezone should be able to see available 30-minute slots in their local time, book one, and get auto-assigned to a mentor. Mentors all work 09:00–18:00 in Asia/Kolkata. Daily capacity is 2 trial classes per mentor. Up to 10 mentors means up to 20 bookings per day total, and multiple mentors can cover the same time slot — so N eligible mentors at a slot means N parents can book that exact time simultaneously.

Set up a monorepo with two independent applications:
- `backend/` — Node.js + Express + TypeScript + MongoDB (via Mongoose). Handles all business logic, availability engine, allocation, and booking.
- `frontend/` — Next.js 16 + React 19 + Tailwind CSS 4. Booking UI and admin dashboard. No business logic in the frontend.

The backend must stay timezone-safe from the start. Use `@js-temporal/polyfill` for all time math — no manual offset arithmetic anywhere. Store all times as UTC instants in MongoDB. IANA timezone identifiers only (e.g. `Asia/Kolkata`, `Europe/London`) — never abbreviations like IST.

Run tests with Vitest in both workspaces.

### Implementation Response

Both workspaces initialised with TypeScript (ESM `"type": "module"`), independent `package.json` files, and Vitest configured. Backend dependencies: `express`, `mongoose`, `@js-temporal/polyfill`, `cors`, `dotenv`, `zod`. Frontend dependencies: `next@16.3.6`, `react@19`, `tailwindcss@4`, `lucide-react`. Backend runs on port 3001; frontend on port 3000. The Next.js API routes act as a thin proxy to the Express backend — no business logic lives in Next.js route handlers.

---

## Stage 2 — Mentor Domain Model


### Developer Prompt

Model the mentor domain in `backend/src/models/mentor.schema.ts`. A mentor has: name, email (unique, lowercase), IANA timezone (default `Asia/Kolkata`), active flag, and working hours as HH:MM strings (`workingHoursStart`, `workingHoursEnd`, default `09:00`/`18:00`). Add Mongoose timestamps.

Seed 10 mentors via `backend/src/db/seed.ts`. All 10 should be in `Asia/Kolkata` working 09:00–18:00. The seed script should be idempotent — if 10 mentors already exist, skip the insert. Mentor names: Priya Sharma, Rajesh Kumar, Anita Desai, Vikram Patel, Kavita Reddy, Arjun Mehta, Sneha Iyer, Rohan Verma, Meera Singh, Aditya Nair.

Put queries in `backend/src/repositories/mentor.repository.ts` — I want a `findActiveMentors()` and a `findById()` method. Keep the Mongoose model import in the repository, not scattered through service files.

### Implementation Response

`IMentor` interface and `mentorSchema` defined with the required fields, Mongoose `timestamps: true`, and a compound index on `{ active: 1 }`. The seed script checks `Mentor.countDocuments()` before inserting — if count is already 10 it exits cleanly. `MentorRepository` wraps `Mentor.find({ active: true })` and `Mongoose.findById()`. Backend unit test in `tests/mentor.test.ts` verifies that `findActiveMentors` returns at most 10 results and that each document has the expected fields.

---

## Stage 3 — Temporal Utilities


### Developer Prompt

Before building the availability engine I need a clean, tested utility layer for all timezone math. Create `backend/src/utils/temporal.utils.ts` with these pure functions (no DB, no HTTP):

- `isValidTimezone(tz)` / `validateTimezone(tz, fieldName)` — validate IANA identifiers using the Temporal API (throw on invalid)
- `localDateTimeToUtcInstant(date, time, tz)` — convert a parent's local date+time string to a UTC instant string; must handle DST correctly
- `utcInstantToLocalDateTime(instant, tz)` — reverse conversion, return `{ localDate, localTime }`
- `getLocalDateForInstant(instant, tz)` — which calendar date does a UTC instant fall on in a given timezone? This matters because a slot at 23:30 UTC is still Sep 30 in New York but already Oct 1 in India.
- `doIntervalsOverlap(start1, end1, start2, end2)` — half-open `[start, end)` semantics: adjacent intervals like `[09:00, 09:30)` and `[09:30, 10:00)` must NOT overlap
- `getLocalDayBoundaries(date, tz)` — return `{ startInstant, endInstant }` for a full calendar day in a timezone; used for the per-mentor daily capacity check

Every function should throw clearly on bad input. Write thorough tests in `tests/temporal.utils.test.ts` covering: London BST↔UTC, India IST↔UTC, NY EDT↔UTC, midnight crossing, half-open boundary exactly at end, DST transition robustness, and leap year.

### Implementation Response

All six functions implemented using `@js-temporal/polyfill`. `doIntervalsOverlap` uses `start1 < end2 AND start2 < end1` which is the correct half-open formula — adjacent slots correctly return `false`. `getLocalDayBoundaries` uses `PlainDate.toZonedDateTime` at `'00:00'` then adds one day for the end boundary, so DST-length days are handled correctly by the Temporal API rather than adding 86400 seconds. Tests verified all timezone conversions (e.g. `2026-09-30T09:00:00Z` → `10:00` BST, `14:30` IST, `05:00` EDT), the half-open end boundary returning `false`, and midnight crossing returning next-day date in IST. The utility file has no imports except `@js-temporal/polyfill` — no coupling to Mongoose or Express.

---

## Stage 4 — Availability Engine


### Developer Prompt

Build `backend/src/services/availability.service.ts`. The engine must answer: "which 30-minute slots are available on a given parent date in a given parent timezone, and which mentor IDs are eligible for each?"

Algorithm:
1. Validate parent date and IANA timezone using the temporal utils.
2. Fetch all active mentors.
3. For each mentor, find what calendar dates in the mentor's timezone overlap with the parent's requested date, then generate 30-minute slots at 30-minute intervals within the mentor's 09:00–18:00 working hours.
4. For each generated slot, check if its UTC instant falls on the parent's requested date — if yes, add to the candidate set (deduplicated by start instant).
5. Filter: a mentor is eligible for a slot only if (a) the slot fully fits within their working hours (half-open), (b) they have no confirmed overlapping booking, and (c) they haven't hit the daily cap of 2 bookings on their local calendar day.
6. Only include slots with at least one eligible mentor.
7. Sort slots by start instant.

One important performance detail: don't do N+1 DB queries. Load all confirmed bookings for all active mentors that touch the window in a single query, then filter in memory per slot per mentor.

Also support an optional `preferredStartTime` parameter. If provided, evaluate that exact time (in 12h or 24h format) as a slot and return it in a `preferredSlot` field — separate from the regular 30-minute grid. Return `null` for `preferredSlot` if no mentor can cover it.

### Implementation Response

`AvailabilityService.getAvailableSlots()` implements the full pipeline. Candidate slot generation converts the parent day's UTC boundaries into the mentor's timezone to determine which mentor calendar dates overlap — covering cases where a parent's day spans two mentor calendar dates. Bulk booking load uses `bookingRepository.findConfirmedBookingsForMentorsInWindow()` (a new method on `BookingRepository`) with a window widened by ±1 day in UTC to cover all timezone offsets in a single query. Per-slot per-mentor filtering checks working hours using `Temporal.PlainTime.compare`, overlap using `doIntervalsOverlap`, and daily capacity using `getLocalDayBoundaries` + a count of the mentor's bookings within that day.

`preferredStartTime` handling normalises both 12h (`10:15 AM`) and 24h (`10:15`) formats, adds the preferred instant to the candidate map, and looks it up in the final `availableSlots` array to populate `preferredSlot`. If omitted, `preferredSlot` is absent from the response. Tests in `tests/availability.test.ts` verify: multiple parent timezones return slots, all returned slots fall on the requested parent date, slots are sorted by start time, inactive mentors are excluded, and invalid inputs throw.

---

## Stage 5 — Mentor Allocation


### Developer Prompt

The availability engine returns `eligibleMentorIds` per slot. Now I need `backend/src/services/mentor-allocation.service.ts` to pick one mentor from that list.

Selection algorithm (deterministic, no randomness):
1. From the eligible list, exclude mentors with any confirmed overlapping booking at the requested interval.
2. Exclude mentors who have already hit 2 confirmed bookings on their local calendar day.
3. From the remaining candidates, select the one with the fewest total confirmed bookings across all time (least-loaded strategy).
4. Tie-break: ascending mentor ID string comparison (lexicographic). This makes results reproducible in tests.

The service should not create bookings — it only returns `{ success, allocatedMentorId }` or `{ success: false, reason }`.

Add tests in `tests/mentor-allocation.test.ts` covering: least-booked selection, counting only confirmed (not cancelled) bookings, deterministic tie-breaking by ID, exclusion for exact overlap, partial overlap at start, partial overlap at end, adjacent non-overlapping booking does NOT exclude a mentor, cancelled booking does NOT exclude, daily capacity exclusion at 2 confirmed bookings, and the failure path when the entire eligible list is exhausted.

### Implementation Response

`MentorAllocationService.allocateMentor()` accepts `(slotStartInstant, slotEndInstant, eligibleMentorIds)`. Filtering calls `bookingRepository.findOverlappingBookings()` and `bookingRepository.findBookingsInRange()` per mentor, applies `doIntervalsOverlap` for conflict detection, and uses `getLocalDateForInstant` to count daily bookings in the mentor's own timezone. Tie-breaking sorts by `count ASC, id.localeCompare(id) ASC` — the first element after sort is returned. All test cases in `mentor-allocation.test.ts` pass, including the critical adjacent-interval case (a booking ending at 10:00 UTC does not block a slot starting at 10:00 UTC).

---

## Stage 6 — Booking Service & Transaction Safety


### Developer Prompt

The mentor domain, temporal utils, availability engine, and allocation service are all working. Now build `backend/src/services/booking.service.ts` — the part that actually creates a booking in MongoDB.

Flow:
1. Check idempotency key first. If a booking with that key already exists, return it immediately without re-processing. The key comes from the `Idempotency-Key` request header.
2. Validate: name, email, YYYY-MM-DD date, HH:MM time, valid IANA timezone, duration 1–240 minutes.
3. Convert the parent's local date+time to UTC instants using the temporal utils.
4. Re-call the availability service to confirm the slot is still available. The database is the final authority — don't trust whatever the frontend passed.
5. Allocate a mentor via the allocation service.
6. Inside a MongoDB transaction (if replica set is available, else fall back to careful ordering with idempotency key as the write guard): re-check for overlapping CONFIRMED bookings against the allocated mentor, re-check daily capacity, then create the booking.
7. On conflict return `{ success: false, conflict: { reason, type } }` where type is one of `SLOT_UNAVAILABLE`, `CAPACITY_REACHED`, `NO_MENTORS_AVAILABLE`.

Generate class URL as: `https://meet.codeyoung.dev/${Buffer.from(`${mentorId}-${timestamp}`).toString('base64url')}` — deterministic per mentor+time, unique, URL-safe.

Add the `IBooking` schema in `backend/src/models/booking.schema.ts` with fields: `mentorId`, `parentName`, `parentEmail`, `startTime` (Date), `endTime` (Date), `parentTimezone`, `status` (CONFIRMED|CANCELLED), `classUrl`, and `idempotencyKey` (unique sparse index).

### Implementation Response

`BookingService.createBooking()` implements the 7-step flow. Transaction support is detected at runtime by checking `serverStatus().repl.setName` — if the MongoDB deployment is a standalone (no replica set), transactions are disabled and the idempotency key's unique index constraint acts as the primary write guard. The duplicate-key (11000) catch path handles the race condition where two concurrent requests with the same idempotency key both pass the pre-check and race to insert. `generateClassUrl` uses `Buffer.from().toString('base64url')` producing a collision-free, URL-safe hash tied to both mentor ID and slot time. Tests in `tests/booking.test.ts` verify: successful creation, correct UTC times stored (London 10:00 → 09:00 UTC), unique class URLs, adjacent-slot booking allowed, idempotency returning the same booking ID on three repeated requests, and concurrent requests completing without crashing the server.

---

## Stage 7 — REST API Layer


### Developer Prompt

Wire the services to Express in `backend/src/routes/scheduling.routes.ts`. I need three endpoints:

- `GET /api/availability` — params: `parentDate`, `parentTimezone`, optional `trialDurationMinutes`, optional `preferredStartTime`. Delegate entirely to availability service. Return 400 with RFC 7807 Problem Details on bad input.
- `POST /api/bookings` — body fields as listed. Require `Idempotency-Key` header (400 if missing). Return 201 on success, 409 with `conflictType` on conflict, 400 on validation failure. Keep all business logic in the service, not in the route.
- `GET /api/dashboard/stats` — accepts optional `?date=YYYY-MM-DD` query param. Returns real-time metrics from MongoDB: total bookings, mentor allocation status, per-mentor assignment count for the given date, next-available mentor queue, and recent booking activity list with parent-local times and IST equivalents.

Also need `backend/src/routes/mentor.routes.ts` for `GET /api/mentors`.

Use RFC 7807 Problem Details (`type`, `title`, `status`, `detail`) for all error responses.

### Implementation Response

All routes implemented. The booking route passes `Idempotency-Key` from the request header directly to `bookingService.createBooking()`. Conflict responses return HTTP 409 with a `conflictType` field in the body — the frontend uses this to distinguish between `SLOT_UNAVAILABLE`, `CAPACITY_REACHED`, and `NO_MENTORS_AVAILABLE` and show appropriate UX. The dashboard stats route uses `utcInstantToLocalDateTime` to format all booking times both in the parent's recorded timezone and in `Asia/Kolkata` (IST). The date context for the dashboard is resolved by priority: query param → latest booking date → default `2026-09-29`. Integration tests in `tests/api.test.ts` hit the live endpoints (with the server running against a test DB) and verify response shapes and status codes.

---

## Stage 8 — Frontend API Integration & Booking Flow Hook


### Developer Prompt

Now build the frontend side. The booking is a 3-step wizard: step 1 is date+time selection, step 2 is parent details form, step 3 is confirmation. All state lives in a single `useBookingFlow` hook in `frontend/hooks/use-booking-flow.ts`. The page component `frontend/app/page.tsx` just renders whichever step is active.

The API client in `frontend/lib/api-client.ts` should be purely a communication layer — no business logic. It wraps `fetch` and throws typed error classes (`ValidationError`, `ConflictError`, `ServerError`, `NetworkError`) for each HTTP status code. `ConflictError` should carry the `conflictType` string from the backend's 409 response.

The frontend proxy routes in `frontend/app/api/` forward requests to the Express backend at `BACKEND_URL` env var, preserving the `Idempotency-Key` header on the booking POST.

Make sure the parent name and email state initialises to empty strings — no hardcoded test values as defaults.

### Implementation Response

`api-client.ts` exports `getAvailability()` and `createBooking()`, both using `AbortSignal.timeout()` for request timeouts. Error class hierarchy: `ApiError` (base) → `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409, carries `conflictType`), `ServerError` (500), `NetworkError` (fetch failure). `ConflictError` is the only class where `conflictType` is meaningful — the `useBookingFlow` hook checks `instanceof ConflictError` to decide whether to set `submitConflict` (calendar-style slot notice) vs `submitError` (generic error alert). `generateIdempotencyKey()` uses `booking-${Date.now()}-${Math.random().toString(36).substring(2)}`. Parent name and email initialise to `""`. (A bug during development had hardcoded `"Alex Johnson"` as the default, causing spurious test bookings — fixed by clearing those defaults, documented in `ISSUE_FIXED_AUTO_BOOKING.md`.)

---

## Stage 9 — Timezone Detection


### Developer Prompt

The booking page needs to auto-detect the parent's timezone. Build `frontend/lib/timezone-detection.ts`.

Strategy:
1. Try IP geolocation via `ipapi.co/json/` (free, no key needed, 5-second timeout, AbortController).
2. Fall back to `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser.
3. If both fail, return `{ timezone: null, source: 'failed' }` explicitly — never invent a fallback timezone. The UI must handle the null case by opening the timezone selection modal.

Validate all detected timezones using `new Intl.DateTimeFormat(undefined, { timeZone: tz })` before accepting them. If the detected IANA identifier matches one of the popular timezone options (stored in `constants/timezones.constants.ts`), return the full `TimezoneOption` object; otherwise construct a minimal one from the IANA string.

The `TimezoneModal` component should be a searchable dropdown with a list of common timezones. The navbar shows the current timezone and has a "Change" button that opens the modal.

Tests in `frontend/__tests__/timezone-detection.test.ts` should cover: valid IANA accepted, abbreviations like `IST` rejected, browser fallback when IP fails, and explicit failure state when both fail.

### Implementation Response

`autoDetectTimezone()` is async and runs IP detection first with a 5-second `AbortController` timeout. On abort or non-200 response it falls through to browser detection, then returns `{ timezone: null, source: 'failed' }` if that also fails. `isValidIanaTimezone()` is a synchronous helper using `Intl.DateTimeFormat` — it's also exported for use in form validation. `detectBrowserTimezone()` is a synchronous version returning `TimezoneOption | null`, used by the booking hook on initial render before the async IP detection resolves. The popular timezones list covers Europe/London, America/New_York, Asia/Dubai, Asia/Singapore, Asia/Kolkata, America/Chicago, Europe/Dublin, Asia/Riyadh, America/Los_Angeles, Asia/Tokyo, Australia/Sydney.

---

## Stage 10 — Booking UI (Step 1 & Step 2)


### Developer Prompt

Step 1 needs: a date strip (`DatePickerStrip`) showing a sliding window of dates, a `TimeSlotGrid` that shows available slots fetched from the API grouped roughly by morning/afternoon, a `PreferredTimePicker` for entering a custom time, and a `SelectedAppointmentCard` that shows what's been picked. The timezone selector is shown with an "Auto-detected" badge and a "Change" link.

Step 2 is a two-column layout: left is the parent details form (`ParentDetailsForm`) with name, email, a booking conflict notice area, and the confirm button; right is the `TrialClassSummaryCard`.

Slot fetching: whenever the selected date or timezone changes, call `GET /api/availability`. Show a loading state while fetching. Show an error state if the API fails. The `preferredTime` field from the `useBookingFlow` hook feeds into `preferredStartTime` query param.

Step 2 must show the `BookingConflictNotice` component when a 409 comes back from the booking attempt. The conflict notice should:
- Use role="status" and aria-live="polite" (calm, not alarming)
- Show amber styling (not red)
- Not leak internal terms like `SLOT_UNAVAILABLE`, `CAPACITY_REACHED`, or 409 to the user
- Offer a "Choose another time" action that goes back to step 1 and refreshes availability

A separate role="alert" red component should be used for true server/network errors.

### Implementation Response

`TimeSlotGrid` renders slots in a responsive grid, marks the selected slot, and shows the "Continue" button only when a slot is selected. Fetching triggers in a `useEffect` on `[selectedDate, timezone]` changes. The `PreferredTimePicker` shows inside `TimeSlotGrid` and passes the entered time to `handleSelectPreferredTime` in the hook, which sets `preferredTime` state and triggers a new fetch with that value as `preferredStartTime`. `BookingConflictNotice` renders nothing when both `conflictType` and `errorMessage` are null; renders amber `role="status"` for 409 conflicts; renders red `role="alert"` for network/server errors. Parent name and email values are preserved in state across the conflict — the form does not reset. Tests in `frontend/__tests__/booking-conflict.test.tsx` verify the exact copy ("That time is no longer available" / "All available mentors are booked for this time. Please choose another time."), the ARIA roles, and that internal type names never appear in the rendered HTML.

---

## Stage 11 — Confirmation Page, Calendar Export & Class Link


### Developer Prompt

Step 3 is the confirmation screen. It shows `ConfirmationHeader`, `ConfirmedAppointmentCard`, and `PostBookingActions`. The confirmed booking data (including `classUrl` and `startTime`) comes from the API response stored in `confirmedBooking` state.

`PostBookingActions` needs three action areas in a horizontal three-column grid:
1. **Google Calendar** (primary, amber `btn-primary-shimmer`): opens a Google Calendar template URL with the class URL embedded in title, details, and location.
2. **Calendar file** (secondary): downloads a valid RFC 5545 `.ics` file with DTSTART, DTEND, LOCATION set to the class URL, STATUS:CONFIRMED.
3. **Copy class link** (tertiary): copies the class URL to clipboard using `navigator.clipboard.writeText`, falling back to `document.execCommand('copy')`. Show "Link copied" with a green check on success; "Copy failed" on failure; reset after 3 seconds.

The class URL must be used exactly as returned by the backend — no truncation, no re-hashing, no alternative path. The confirmation screen should not have a "Join trial class" navigation link to the dummy URL.

Email reassurance: if `parentEmail` is provided, show "A confirmation has been sent to {email}." Below the actions, include a "Book another session" button.

Write tests for the entire confirmation surface in `frontend/__tests__/post-booking-actions.test.tsx` and the cross-surface URL identity test in `frontend/__tests__/class-link-consistency.test.tsx`.

### Implementation Response

`PostBookingActions` exports all calendar utility functions as named exports so they can be tested independently (`generateGoogleCalendarUrl`, `generateIcsData`, `calculateDateRange`, `copyTextToClipboard`, `formatUtcToCalendarString`). `calculateDateRange` derives the 30-minute end time by adding 30 × 60 × 1000 ms to the `startIsoInstant` — no Temporal dependency in the frontend confirmation component. The three-column grid uses `grid-cols-1 sm:grid-cols-3`. The class URL is accepted as `meetingUrl` prop and used verbatim with a prototype fallback only when `meetingUrl` is undefined. Tests in `class-link-consistency.test.tsx` verify that the exact base64url URL from the booking response (`https://meet.codeyoung.dev/NjhkODNh...`) survives unchanged through all five consumer paths: `PostBookingActions` display, clipboard copy, Google Calendar `location` param, `.ics` LOCATION field, and `MentorScheduleModal` "Join class" href.

---

## Stage 12 — Mentor Dashboard


### Developer Prompt

Build the admin dashboard at `frontend/app/dashboard/page.tsx`. It should poll `GET /api/dashboard/stats` every 5 seconds and show live data from MongoDB. The Next.js proxy route `frontend/app/api/dashboard/stats/route.ts` forwards to the Express endpoint.

Three tabs:
1. **Overview**: metrics grid (total bookings, mentors assigned today, classes scheduled, available capacity), an invariant status strip, mentor allocation section with a "next available" queue, and the scheduling activity table.
2. **Mentors**: full fleet view with a dual-bar capacity visual (slot 1 / slot 2), track filter pills (CODING, MATH, SCIENCE), and click-to-open schedule modal.
3. **Bookings**: booking registry with parent details, mentor assignments, and a 0-conflicts concurrency indicator.

The `MentorScheduleModal` opens when a mentor card is clicked and shows their scheduled classes for the selected date, plus their shared class URL as a "Join class" link (using the canonical URL from the booking record — not a reconstructed URL).

Date context: default to the date of the most recent booking, fallback to `2026-09-29`. Quick date switcher tabs for Sep 27–30.

Fall back gracefully to local constants if the backend is unreachable — don't crash, just show stale/cached data.

### Implementation Response

`DashboardPage` uses `useCallback` + `useEffect` for polling with a 5-second `setInterval`. The `source` state (`mongodb_live` | `local_cache`) is set based on whether the fetch succeeds. On first load, a skeleton animation replaces the content grid. Mentor fleet cards display a dual-bar progress indicator: first bar fills amber on `assignedCount >= 1`, second bar on `assignedCount >= 2`; both turn `#D97706` orange when capacity is reached. `MentorScheduleModal` receives `scheduledBookings` filtered from the activities array by mentor code/name match and renders the canonical `classUrl` from the activity record as `href` on the "Join class" link. The invariant status strip shows collisions (0), max delta (1), DB mutex state, and load balancer strategy — sourced directly from the backend stats response.

---

## Stage 13 — Slot Capacity & Concurrent Booking Regression Tests


### Developer Prompt

I need a regression test suite specifically for the multi-mentor slot capacity invariant. The rule is: if N mentors are eligible for a slot, exactly N parents can book that slot simultaneously, each getting a different mentor. The daily cap of 2 per mentor is a *per-mentor* limit, not a per-slot limit.

Write `backend/tests/slot-capacity.test.ts` covering:
1. With 0 bookings, the 10:00 slot shows all 10 mentors eligible.
2. Book mentor[0] at 10:00 → slot still visible with 9 eligible mentors.
3. Book first 5 mentors at 10:00 → slot still visible with 5 remaining.
4. Book all 10 mentors at 10:00 → slot disappears (0 eligible).
5. 10 sequential bookings at 10:00 each succeed and use a distinct mentor.
6. 11th booking at 10:00 fails with `SLOT_UNAVAILABLE`.
7. Adjacent non-overlapping slots remain independently available after booking mentor[0].
8. Per-mentor daily limit of 2 is enforced (mentor with 2 bookings disappears from all slots).
9. 20 bookings in a day (10 mentors × 2 slots) all succeed.
10. 21st booking on a fully-saturated day fails.

Also write `backend/tests/preferred-time.test.ts` covering: preferred time evaluated against working hours, unavailable preferred times return `preferredSlot: null`, multi-mentor allocation at a preferred time, half-open overlap enforced for preferred times, daily capacity respected, and unchanged behaviour for the standard 30-minute slot flow.

### Implementation Response

Both test suites are in place. `slot-capacity.test.ts` uses `insertBooking` helper to directly write confirmed bookings to MongoDB (bypassing the service) for setup, and calls the real `bookingService` and `availabilityService` for assertions. Test 5 (10 sequential bookings, each to a different mentor) uses 30-second timeout as each call goes through full availability + allocation + booking logic. Test 9 (20 total bookings) uses 60-second timeout. `preferred-time.test.ts` verifies that 10:15 AM London returns a non-null `preferredSlot` with eligible mentors, that 02:00 AM London (outside IST working hours) returns `null`, that a booking at 10:15 succeeds end-to-end, and that a preferred-time booking at 10:15 correctly marks the adjacent standard slots (10:00 and 10:30) as conflicted for that mentor while the non-overlapping 11:00 slot remains eligible.

---

## Stage 14 — Frontend QA Tests


### Developer Prompt

The backend tests cover scheduling logic well. Now add frontend unit tests for the pieces that have non-trivial logic:

- `frontend/__tests__/timezone-detection.test.ts` — test `isValidIanaTimezone` with valid IANA zones and invalid strings like `UTC+5:30`, `IST`, `NotAZone`; test the IP detection fallback chain; test explicit failure state.
- `frontend/__tests__/booking-conflict.test.tsx` — already done in Stage 10.
- `frontend/__tests__/post-booking-actions.test.tsx` — already done in Stage 11.
- `frontend/__tests__/class-link-consistency.test.tsx` — already done in Stage 11.
- `frontend/__tests__/api-client.test.ts` — verify that `ConflictError` is thrown for 409, that `conflictType` is extracted from the body, that `NetworkError` wraps fetch failures, and that `generateIdempotencyKey` produces unique strings.
- `frontend/__tests__/dashboard.test.ts` — verify `DashboardStatsApiResponse` type contracts and that the fallback-to-constants path works.

Use `renderToStaticMarkup` for pure component rendering tests (no React Testing Library dependency needed for stateless component assertions).

### Implementation Response

All frontend test files are in `frontend/__tests__/`. The component tests use `renderToStaticMarkup` from `react-dom/server` to test rendered HTML strings, keeping tests fast and dependency-light. `copyTextToClipboard` is tested by mocking `global.navigator.clipboard.writeText` and verifying the exact URL is passed; the `execCommand` fallback is tested by removing `navigator.clipboard` and mocking `document.createElement`. Calendar tests verify RFC 5545 format fields (`BEGIN:VCALENDAR`, `DTSTART`, `LOCATION`, `STATUS:CONFIRMED`). The `ConflictError` class test confirms `.status === 409` and `.conflictType === 'SLOT_UNAVAILABLE'` are properly set. `generateIdempotencyKey` uniqueness is verified by generating two keys in rapid succession and asserting they differ.

---

## Stage 15 — Codebase Cleanup & Hardcoded Test Data Fix


### Developer Prompt

Before final submission, audit the codebase for issues. In particular:

1. The booking form was observed creating bookings automatically on page refresh — track down why.
2. Check that all environment-sensitive configuration (MongoDB URI, backend URL) uses env vars, not hardcoded values. No secrets in source.
3. Remove any temporary debug scripts from the repo root. If `count-alex-johnson-bookings.js` exists, it can stay as an audit trail artifact but should not contain credentials.
4. Verify the `ISSUE_FIXED_AUTO_BOOKING.md` accurately describes the fix.

### Implementation Response

Root cause of the auto-booking issue: `useBookingFlow` initialised `parentName` and `parentEmail` with hardcoded test values `"Alex Johnson"` / `"alex.johnson@example.com"`. Users who didn't clear the pre-filled form were inadvertently creating bookings with test data. Fixed by changing both `useState` defaults to `""`. The fix is documented in `ISSUE_FIXED_AUTO_BOOKING.md`. Backend `MONGODB_URI` is read from `.env` via `dotenv`; frontend `BACKEND_URL` from `process.env.BACKEND_URL` in the Next.js proxy routes. `.env` and `.env.local` are listed in `.gitignore`. The root `count-alex-johnson-bookings.js` is a standalone diagnostic script (no credentials) left as a development audit artifact.

---

## Final Engineering State

### Architecture

Two independent applications sharing no code:

| Layer | Technology |
|---|---|
| Backend API | Node.js + Express + TypeScript (ESM), port 3001 |
| Database | MongoDB + Mongoose (UTC timestamps, sparse unique index on idempotency key) |
| Temporal math | `@js-temporal/polyfill` — all timezone operations |
| Frontend | Next.js 16.3 + React 19 + Tailwind CSS 4, port 3000 |
| Frontend proxy | Next.js API routes forward to Express backend |
| Testing | Vitest in both workspaces |

### Core Scheduling Guarantees

- **Parent chooses WHEN, system chooses WHO.** No mentor preference is accepted from the booking request.
- **IANA timezones only.** All timezone identifiers are validated via `Temporal` (backend) and `Intl.DateTimeFormat` (frontend). Abbreviations and offset strings are rejected.
- **UTC instants in DB.** `startTime` and `endTime` stored as `Date` (UTC). Never localised before storage.
- **Half-open intervals `[start, end)`.** Adjacent 30-minute slots like `[09:00, 09:30)` and `[09:30, 10:00)` do not overlap. Both can be booked by the same mentor sequentially.
- **Mentor-local daily capacity.** The 2-trial limit is evaluated against the mentor's own local calendar day (`Asia/Kolkata`), not the parent's date or UTC date.
- **Multi-mentor slot capacity.** A slot with N eligible mentors can absorb N simultaneous bookings. The slot disappears only when all mentors are occupied or at capacity.
- **Database-authoritative booking.** The availability service is re-called inside the booking flow to revalidate the slot before any write. Conflicts return HTTP 409.
- **Idempotency.** The `Idempotency-Key` header prevents duplicate bookings on retried requests. Duplicate-key (11000) errors are caught and resolved to the existing booking.
- **Deterministic allocation.** Mentor selection is: least total confirmed bookings ASC, then mentor ID ASC. No randomness.
- **Canonical class URL.** `https://meet.codeyoung.dev/{base64url(mentorId-timestamp)}`. Generated once at booking creation, stored in the booking document, and propagated unchanged to the confirmation screen, clipboard copy, Google Calendar link, `.ics` export, and mentor dashboard modal.

### Backend Source Layout

```
backend/src/
  db/          connection.ts, seed.ts, seed-bookings.ts
  models/      booking.schema.ts, booking.repository.ts, mentor.schema.ts
  repositories/ mentor.repository.ts
  routes/      scheduling.routes.ts, mentor.routes.ts
  services/    availability.service.ts, booking.service.ts, mentor-allocation.service.ts, mentor.service.ts
  utils/       temporal.utils.ts
  server.ts
backend/tests/
  temporal.utils.test.ts, availability.test.ts, mentor-allocation.test.ts,
  booking.test.ts, slot-capacity.test.ts, preferred-time.test.ts,
  mentor.test.ts, api.test.ts, setup.ts
```

### Frontend Source Layout

```
frontend/
  app/
    page.tsx              (3-step booking wizard)
    dashboard/page.tsx    (admin dashboard)
    api/                  (Next.js proxy routes → Express backend)
  components/
    step1/  DatePickerStrip, TimeSlotGrid, PreferredTimePicker, SelectedAppointmentCard, CalendarDatePickerPopover
    step2/  ParentDetailsForm, BookingConflictNotice, Step2Progress, TrialClassSummaryCard
    step3/  ConfirmationHeader, ConfirmedAppointmentCard, PostBookingActions, ConfirmationStepper
    dashboard/  MetricsGrid, MentorAllocationSection, SchedulingActivityTable, InvariantStatusStrip,
                MentorScheduleModal, DashboardHeader, DashboardSidebar, VerificationFootnote
    Navbar, Footer, TimezoneModal, PageBackground
  hooks/   use-booking-flow.ts
  lib/     api-client.ts, api-config.ts, slot-service.ts, timezone-detection.ts, timezone-utils.ts, validation.ts
  types/   api.types.ts, booking.types.ts, dashboard.types.ts
  __tests__/  (11 test files covering API client, timezone detection, booking conflicts, post-booking actions,
               class-link consistency, calendar popover, dashboard, slot service, preferred-time picker,
               admin auth, validation)
```

### Testing State

Backend test suites (Vitest): `temporal.utils`, `availability`, `mentor-allocation`, `booking`, `slot-capacity`, `preferred-time`, `mentor`, `api`.  
Frontend test suites (Vitest): `api-client`, `timezone-detection`, `timezone-utils`, `booking-conflict`, `post-booking-actions`, `class-link-consistency`, `calendar-popover`, `dashboard`, `slot-service`, `preferred-time-picker`, `admin-auth`, `validation`.

Tests require a running MongoDB instance pointed to by `MONGODB_URI`. Backend tests use the live database with test-specific date ranges isolated in `beforeEach` / `afterEach` cleanup to avoid corrupting the seeded mentor fleet.
