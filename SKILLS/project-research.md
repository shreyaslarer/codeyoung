# Codeyoung Trial-Class Booking System --- Project Research & Engineering Blueprint

> **Document purpose:** This document is the canonical research and
> engineering context for the Codeyoung Full-Stack Engineering
> Assignment. It is written so that a developer, reviewer, or coding AI
> agent can understand the product problem, decisions, assumptions,
> algorithms, data model, UI behavior, API contracts, timezone model,
> DST strategy, concurrency model, testing strategy, scope boundaries,
> risks, and implementation workflow without needing the previous
> brainstorming conversation.
>
> **Status:** Pre-implementation architecture / research baseline.
>
> **Important:** This document must not be interpreted as saying the
> system is mathematically or operationally "100% accurate." The
> architecture is designed to eliminate known classes of timezone and
> double-booking errors, but correctness still depends on
> implementation, timezone database updates, transaction handling,
> testing, and deployment configuration.

------------------------------------------------------------------------

# 1. Project Context

## 1.1 Assignment problem

Codeyoung wants a trial-class appointment booking system.

The intended journey is:

1.  A parent wants a trial class.
2.  The parent selects a comfortable date/time.
3.  The system determines which mentor is available.
4.  The system assigns an available mentor automatically.
5.  The parent receives a class link.
6.  The assigned mentor receives the class details.
7.  Parents and mentors may be in different countries/timezones.
8.  Local time must always be communicated correctly.
9.  Mentors can conduct a maximum of two demo classes per day.
10. If no mentor is available, the system must communicate an
    appropriate error state.

The assignment explicitly requires:

-   React frontend.
-   Node.js or Python backend.
-   Cross-timezone scheduling.
-   DST handling.
-   Ten available mentors.
-   Approximately twenty interested parents per day.
-   Maximum two demo classes per mentor per day.
-   Appropriate handling when no mentors are available.
-   A usable customer-facing booking flow.
-   Code architecture and design decisions that demonstrate engineering
    quality.
-   README.md and TRANSCRIPT.md as part of submission.

The submission email subject specified by the assignment is:

`Codeyoung Assignment Task - <Candidate Name> - Institute Name (ABBR)`

Recipient specified by the assignment:

`campus.ka@talentiseglobal.com`

------------------------------------------------------------------------

# 2. The Actual Product Problem

The problem is not simply:

> "Build a calendar with some time slots."

The real problem is:

> **Convert a parent's local wall-clock intent into an exact global
> instant, determine whether at least one mentor can conduct the class
> at that instant, allocate one mentor without exceeding capacity or
> causing a conflict, and communicate the same appointment correctly in
> each user's local timezone.**

There are four connected problems:

1.  **Temporal correctness**
2.  **Availability computation**
3.  **Resource allocation**
4.  **Concurrency / double-booking prevention**

A fifth concern connects all four:

5.  **Customer-friendly UI behavior**

------------------------------------------------------------------------

# 3. Product Mental Model

The most important product decision is:

## The parent chooses the time, not the mentor.

The parent should not be required to understand:

-   Indian Standard Time.
-   Mentor schedules.
-   Which mentor is available.
-   Internal mentor capacity.
-   Database allocation.
-   DST rules.

The parent should simply think:

> "I want my child's trial class at 10:00 AM in my local time."

The system handles everything behind the scenes.

### Parent controls

-   Parent name.
-   Parent email.
-   Preferred date.
-   Preferred time.
-   Preferred/display timezone.

### System controls

-   Mentor selection.
-   Mentor working hours.
-   Existing mentor bookings.
-   Maximum two classes/day.
-   Timezone conversion.
-   DST resolution.
-   Conflict prevention.
-   Class-link generation.
-   Mentor notification.
-   Parent confirmation.

This separation is fundamental to the product design.

------------------------------------------------------------------------

# 4. Confirmed Requirements vs Assumptions

A coding agent must not confuse assignment requirements with
implementation assumptions.

## 4.1 Confirmed by assignment

  Requirement                                     Status
  ----------------------------------------------- ----------
  React frontend                                  Required
  Node.js or Python backend                       Required
  10 mentors                                      Required
  Around 20 parents/day                           Required
  Parent chooses comfortable time                 Required
  Automatic mentor assignment                     Required
  Parent and mentor may use different timezones   Required
  Local time must be displayed/communicated       Required
  DST must be handled                             Required
  Mentor maximum = 2 demo classes/day             Required
  Appropriate no-availability state               Required
  Dummy class link is acceptable                  Required

## 4.2 Not specified by assignment --- therefore explicit prototype assumptions

The assignment does **not** specify:

-   Trial-class duration.
-   Slot interval.
-   Mentor working hours.
-   Mentor break periods.
-   Buffer between classes.
-   Mentor-specific schedules.
-   Holiday rules.
-   Out-of-office rules.
-   Calendar integrations.
-   Exact allocation fairness strategy.
-   Authentication requirements.
-   Real email provider.
-   Video provider.
-   Database technology.

For this implementation baseline we assume:

  Item                      Prototype decision
  ------------------------- ----------------------------------------------
  Database                  MongoDB with Mongoose ODM (MERN stack)
  Backend framework         Express.js
  Trial duration            30 minutes
  Slot interval             30 minutes
  Mentor timezone           `Asia/Kolkata`
  Mentor working hours      09:00--18:00 IST
  Mentor daily capacity     2 classes
  Daily-capacity calendar   Mentor's local `Asia/Kolkata` date
  Parent timezone           Browser auto-detection + manual override
  Mentor selection          Least-booked eligible mentor
  Tie-breaker               Stable deterministic mentor identifier/order
  Email                     Mock/console email service
  Class URL                 Generated dummy URL
  Calendar integration      Not implemented
  Authentication            Not implemented
  Admin dashboard           Not implemented

These assumptions must be stated in README.md so the evaluator knows
which behavior is intentionally designed rather than supplied by
Codeyoung.

------------------------------------------------------------------------

# 5. Research Basis

The architecture was researched against mature scheduling patterns
including:

-   Calendly
-   Cal.com
-   Google Calendar / Google Calendar API
-   Microsoft Graph / Microsoft Bookings
-   Acuity Scheduling
-   Doodle
-   HubSpot Meetings
-   TC39 Temporal
-   MongoDB transaction patterns for concurrency control
-   MERN stack best practices
-   RFC 9557 / IXDTF

The research report concluded that mature scheduling architectures
generally separate:

1.  Local display time.
2.  Absolute appointment time.
3.  Timezone identity.
4.  Availability calculation.
5.  Booking persistence.
6.  Concurrency protection.

The supplied research report recommends normalizing appointments around
absolute instants while retaining IANA timezone identifiers, and moving
critical conflict prevention into the database transaction layer with
MongoDB's atomic operations and transactions.

Source: `Edtech Scheduling Architecture Research.txt`.

------------------------------------------------------------------------

# 6. Industry Pattern: Parent-Facing Local Time

A mature scheduling product generally does not force the invitee to
calculate the host's timezone.

Instead:

``` text
Host availability
       ↓
Absolute timeline
       ↓
Invitee timezone projection
       ↓
Invitee sees local slots
```

For this project:

``` text
Mentor schedule: Asia/Kolkata
              ↓
        Availability engine
              ↓
        Absolute instant
              ↓
Parent timezone: Europe/London / America/New_York / etc.
              ↓
        Local UI slots
```

This is the core product behavior we are adopting.

------------------------------------------------------------------------

# 7. Time Is a Domain Concept, Not a Formatting Problem

A major design mistake would be to store only:

``` text
10:00 AM
```

or:

``` text
UTC+5:30
```

or:

``` text
2026-09-30 10:00
```

without timezone identity.

A local wall-clock time is incomplete without its timezone context.

For example:

``` text
2026-09-30 10:00 Europe/London
```

means something different from:

``` text
2026-09-30 10:00 America/New_York
```

The system therefore uses IANA timezone identifiers such as:

``` text
Europe/London
America/New_York
Asia/Kolkata
```

and does not use numeric offsets as the primary timezone identity.

------------------------------------------------------------------------

# 8. Why UTC Offset Alone Is Not Enough

A numeric offset such as:

``` text
UTC+5:30
UTC-4
UTC+1
```

does not fully describe a geographical timezone's rules.

DST changes offsets over time.

For example, a London user can be:

``` text
GMT
```

during part of the year and:

``` text
BST
```

during another part.

A New York user similarly changes between standard and daylight time.

India's `Asia/Kolkata` does not currently observe DST.

Therefore:

``` text
America/New_York
```

is more meaningful than:

``` text
UTC-4
```

for a future appointment.

------------------------------------------------------------------------

# 9. Canonical Time Model

The system should conceptually distinguish three things.

## 9.1 Plain local date/time

The user's wall-clock intent:

``` text
2026-09-30 10:00
```

## 9.2 IANA timezone

The context:

``` text
Europe/London
```

## 9.3 Absolute instant

The exact point on the global timeline:

``` text
2026-09-30T09:00:00Z
```

The mapping is:

``` text
Local DateTime
      +
IANA Timezone
      ↓
Zoned DateTime
      ↓
Absolute Instant
```

This is why Temporal is useful for this domain.

------------------------------------------------------------------------

# 10. Temporal API Strategy

The research recommends the modern JavaScript Temporal model through the
Temporal polyfill.

Important Temporal concepts:

-   `Temporal.PlainDate`
-   `Temporal.PlainTime`
-   `Temporal.PlainDateTime`
-   `Temporal.ZonedDateTime`
-   `Temporal.Instant`

Recommended conceptual usage:

### Working-hours definition

Use:

``` text
Temporal.PlainTime
```

because `09:00` as a recurring working-hour boundary is not itself a
global instant.

### Actual appointment

Use:

``` text
Temporal.ZonedDateTime
```

to combine local date/time and timezone.

### Database-normalized appointment

Use:

``` text
Temporal.Instant
```

as the canonical global moment.

------------------------------------------------------------------------

# 11. Browser Timezone Detection

When the parent opens the booking page, the browser can report its IANA
timezone using:

``` javascript
Intl.DateTimeFormat().resolvedOptions().timeZone
```

Examples:

``` text
Europe/London
America/New_York
Asia/Kolkata
Australia/Sydney
```

The UI should use this as the initial timezone.

However:

## Browser timezone is a default, not absolute truth.

A parent may:

-   Be travelling.
-   Use a VPN.
-   Use a device configured for another timezone.
-   Be booking for a child in another timezone.
-   Want to view a different timezone intentionally.

Therefore the UI must provide a manual timezone selector.

------------------------------------------------------------------------

# 12. Parent Timezone UI

The booking interface should make the timezone visible.

Example:

``` text
Choose a trial class time

Timezone
[ London — Europe/London ▼ ]

All times below are shown in your selected timezone.
```

If browser detection returns:

``` text
America/New_York
```

the UI can initially show:

``` text
Timezone
[ New York — America/New_York ▼ ]
```

The parent can change it.

Once manually changed, the selected timezone becomes authoritative for
that booking session.

The backend must trust the explicit request parameter/body rather than
assuming that the browser's physical location is the desired timezone.

------------------------------------------------------------------------

# 13. Mismatched Browser and Selected Timezone

Example:

``` text
Browser timezone:
America/New_York

Parent selects:
Europe/London
```

Expected behavior:

``` text
UI displays London times.
```

The backend receives:

``` text
timezone = Europe/London
```

and calculates availability using that timezone.

The system should not silently switch the parent back to New York.

The research specifically identifies mismatched browser and selected
timezone as an edge case.

------------------------------------------------------------------------

# 14. Parent Booking UI

Recommended journey:

``` text
Step 1
Timezone

        ↓

Step 2
Date

        ↓

Step 3
Available local time

        ↓

Step 4
Parent details

        ↓

Step 5
Confirmation
```

A single-page experience is acceptable, but the logical steps should
remain clear.

------------------------------------------------------------------------

# 15. Parent UI: Date Selection

Example:

``` text
Choose a date

<  September 2026  >

Mon  Tue  Wed  Thu  Fri  Sat  Sun

28   29   30    1    2    3    4
```

The frontend should send the selected calendar date to the availability
API together with the selected IANA timezone.

Example:

``` http
GET /api/availability?date=2026-09-30&timezone=Europe/London
```

------------------------------------------------------------------------

# 16. Parent UI: Slot Display

The parent should see local times only.

Example:

``` text
Available times

09:00 AM
09:30 AM
10:00 AM
10:30 AM
11:00 AM
```

Optionally:

``` text
Times shown in Europe/London
```

The parent should not need to calculate:

``` text
10:00 London = 14:30 India
```

That is the system's responsibility.

------------------------------------------------------------------------

# 17. Parent Should Not Choose Mentor

Do not show:

``` text
Mentor A
Mentor B
Mentor C
```

as a selection step.

The business requirement is automatic assignment.

The parent chooses:

``` text
when
```

The system chooses:

``` text
who
```

This keeps the UX simple and preserves the scheduling engine's ability
to distribute load.

------------------------------------------------------------------------

# 18. What Parent Sees After Booking

Example:

``` text
Trial class confirmed

Wednesday, September 30
10:00 AM
Your local time — Europe/London

A mentor has been assigned to your trial class.

Join class
[ Open class link ]
```

The parent does not need internal allocation details.

Optionally, the confirmation can say:

``` text
Your mentor has been assigned.
```

rather than exposing unnecessary internal mentor scheduling information.

------------------------------------------------------------------------

# 19. Mentor-Side Representation

There is no requirement to build a full mentor dashboard.

The mentor's email/mock notification should contain:

``` text
Trial Class Assigned

Date:
September 30, 2026

Time:
2:30 PM IST

Parent:
John Doe

Email:
john@example.com

Class:
https://example.com/class/abc123
```

The exact time displayed to the mentor must be based on:

``` text
Asia/Kolkata
```

not the parent's timezone.

------------------------------------------------------------------------

# 20. One Appointment, Multiple Local Representations

Example:

Parent:

``` text
Europe/London
10:00 AM
```

Mentor:

``` text
Asia/Kolkata
2:30 PM IST
```

Database:

``` text
2026-09-30T09:00:00Z
```

These are not three appointments.

They are:

> **one appointment represented in three temporal contexts.**

This distinction must be preserved throughout the implementation.

------------------------------------------------------------------------

# 21. DST Architecture

DST is one of the most important technical requirements.

## Spring-forward

A timezone may skip a local hour.

Conceptually:

``` text
01:59
↓
03:00
```

Therefore:

``` text
02:30
```

may not exist on that date.

The system must not accidentally create an invalid booking instant from
that local time.

## Fall-back

A timezone may repeat an hour.

Conceptually:

``` text
01:59
↓
01:00 again
```

Therefore:

``` text
01:30
```

may correspond to two different instants.

The application needs an explicit disambiguation policy.

Temporal provides explicit mechanisms for these situations.

------------------------------------------------------------------------

# 22. Why Dynamic Availability Is Necessary

We must not precompute a permanent UTC schedule such as:

``` text
09:00 UTC
09:30 UTC
10:00 UTC
```

for all future dates.

Why?

Because parent timezones such as:

``` text
Europe/London
America/New_York
```

change offsets according to DST rules.

Instead:

``` text
Mentor local working hours
        ↓
Date + mentor timezone
        ↓
Exact instant
        ↓
Parent timezone projection
```

Availability is therefore generated dynamically for the requested date.

------------------------------------------------------------------------

# 23. UK / US / India Timezone Interaction

The assignment specifically introduces cross-border complexity.

### UK

``` text
Europe/London
```

changes between GMT and BST.

### US

Examples:

``` text
America/New_York
America/Chicago
America/Denver
America/Los_Angeles
```

have DST rules that differ from the UK.

### India

``` text
Asia/Kolkata
```

does not currently observe DST.

Therefore the difference between parent and mentor clocks is not a
permanent constant throughout the year.

This is why timezone identifiers, not hardcoded offsets, must drive the
calculations.

------------------------------------------------------------------------

# 24. Availability Engine

The availability engine is the mathematical core of the application.

Its job is:

> Given a parent date and timezone, return the local time slots that can
> actually be served by at least one eligible mentor.

------------------------------------------------------------------------

# 25. Availability Engine Inputs

Minimum inputs:

``` text
date
parentTimezone
```

Example:

``` json
{
  "date": "2026-09-30",
  "timezone": "Europe/London"
}
```

Optional future extensions:

``` text
duration
slotInterval
```

For the assignment these remain server configuration values.

------------------------------------------------------------------------

# 26. Availability Engine Pipeline

The algorithm:

``` text
1. Validate parent timezone.
2. Validate requested date.
3. Generate candidate local slots.
4. Convert each candidate into an exact instant.
5. Convert that instant into mentor timezone.
6. Determine mentors whose working hours contain it.
7. Remove mentors with conflicting bookings.
8. Remove mentors who reached daily capacity.
9. If at least one mentor remains, expose the slot.
10. Convert the surviving instant back into parent timezone.
11. Return the available local slots.
```

------------------------------------------------------------------------

# 27. Candidate Slot Generation

Assumption:

``` text
Mentor working hours:
09:00–18:00 Asia/Kolkata

Duration:
30 minutes

Interval:
30 minutes
```

Candidate intervals:

``` text
09:00–09:30
09:30–10:00
10:00–10:30
...
17:30–18:00
```

The engine should treat the interval as:

``` text
[start, end)
```

where the start is inclusive and the end is exclusive.

This avoids adjacent classes being treated as overlapping:

``` text
09:00–09:30
09:30–10:00
```

These should be valid consecutive classes.

------------------------------------------------------------------------

# 28. Converting Parent Intent to Instant

Suppose:

``` text
Parent timezone:
Europe/London

Parent selected:
2026-09-30 10:00
```

The system constructs the timezone-aware value:

``` text
2026-09-30 10:00 Europe/London
```

and resolves it to the exact instant:

``` text
2026-09-30T09:00:00Z
```

The exact UTC result is date-dependent and must always be generated
through timezone rules rather than hardcoded offsets.

------------------------------------------------------------------------

# 29. Determine Mentor Local Time

Now take:

``` text
2026-09-30T09:00:00Z
```

and project it into:

``` text
Asia/Kolkata
```

Result:

``` text
2026-09-30 14:30 Asia/Kolkata
```

Then check:

``` text
14:30 ∈ mentor working hours?
```

If working hours are:

``` text
09:00–18:00
```

then:

``` text
YES
```

------------------------------------------------------------------------

# 30. Mentor Eligibility

A mentor is eligible only if all required conditions are true.

``` text
Eligible =
    working hours cover instant
    AND no overlapping booking
    AND daily booking count < 2
```

Potential future conditions:

``` text
AND not out-of-office
AND not on holiday
AND calendar integration says free
AND required skill matches
```

These are intentionally outside the prototype.

------------------------------------------------------------------------

# 31. "Free Right Now" Is Not the Same as "Available for Requested Slot"

This distinction is important.

A mentor can be:

``` text
currently free
```

but unavailable for:

``` text
tomorrow 4:00 PM
```

because they already have a booking then.

Therefore availability must always be evaluated against:

> **the requested future instant**

not the current clock time.

------------------------------------------------------------------------

# 32. Daily Capacity Rule

Each mentor may conduct:

``` text
maximum 2 trial classes/day
```

For the prototype, "day" means the mentor's local calendar day in:

``` text
Asia/Kolkata
```

Example:

``` text
Mentor:
Asia/Kolkata

Date:
2026-09-30
```

If the mentor already has:

``` text
2 confirmed trial classes
```

the mentor cannot receive another trial class on that local day.

------------------------------------------------------------------------

# 33. Why Daily Capacity Is Not a Rolling 24-Hour Rule

This is:

``` text
max 2 classes per calendar day
```

not:

``` text
max 2 classes in any 24-hour window
```

For example:

``` text
Sept 30:
2 classes

Oct 1:
2 classes
```

is valid even though the two calendar days may be less than 24 hours
apart.

The database/application logic must therefore calculate the mentor's
local calendar date.

------------------------------------------------------------------------

# 34. Mentor Allocation Algorithm

Recommended algorithm:

> **Least-Booked Eligible Mentor with deterministic tie-breaking.**

Pipeline:

``` text
Requested instant
       ↓
Find mentors working at that instant
       ↓
Remove mentors at daily capacity
       ↓
Remove mentors with conflicting booking
       ↓
Sort remaining mentors by booking load
       ↓
Deterministic tie-break
       ↓
Select mentor
```

The research report describes this as a Least-Booked Round-Robin style
strategy.

------------------------------------------------------------------------

# 35. Why Not "First Available"?

A naïve algorithm:

``` text
for mentor in mentors:
    if available:
        assign
        break
```

can repeatedly assign the first mentor.

Example:

``` text
M1 → 2
M2 → 0
M3 → 0
```

If M1 is always checked first, the distribution can become unnecessarily
uneven.

------------------------------------------------------------------------

# 36. Why Not Random Allocation?

Random selection creates:

-   Less predictable tests.
-   Less predictable debugging.
-   Harder reproduction of allocation behavior.
-   Potentially uneven distribution.

Deterministic selection is preferable for an engineering assignment.

------------------------------------------------------------------------

# 37. Recommended Sorting Key

Primary:

``` text
weekly booking count ascending
```

Secondary:

``` text
stable mentor ID ascending
```

Example:

``` text
M1 → 3
M2 → 1
M3 → 1
M4 → 2
```

Eligible:

``` text
M2
M3
M4
```

Choose:

``` text
M2
```

because:

``` text
1 < 2 < 3
```

If M2 and M3 are tied:

``` text
M2 < M3
```

using a stable deterministic key.

------------------------------------------------------------------------

# 38. Important Improvement: Allocation Must Be Transaction-Safe

The allocation decision cannot be treated as final merely because the
availability query said:

``` text
mentor is free
```

Between the availability query and booking insertion, another request
could reserve that mentor.

Therefore:

``` text
Availability response
```

is advisory.

The database transaction is authoritative.

------------------------------------------------------------------------

# 39. Concurrency Problem

Consider:

``` text
Parent A → London
Parent B → New York
```

Both request the same instant.

Only one mentor is eligible.

Both requests may initially observe:

``` text
Mentor M3 = available
```

If both insert independently, double-booking could happen.

This is a race condition.

------------------------------------------------------------------------

# 40. Database-Level Conflict Protection

MongoDB with Mongoose is recommended for this MERN stack implementation because it provides:

``` text
Atomic operations
Transactions
Compound indexes for overlap detection
```

Conceptual approach:

``` javascript
// Mongoose schema with validation
const bookingSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' }
});

// Compound index for overlap detection
bookingSchema.index({ mentorId: 1, startTime: 1, endTime: 1 });

// Transaction-based booking creation with overlap check
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  const overlap = await Booking.findOne({
    mentorId: mentorId,
    status: 'CONFIRMED',
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  }).session(session);
  
  if (overlap) throw new ConflictError();
  await Booking.create([newBooking], { session });
});
```

Meaning:

> Two bookings cannot exist for the same mentor if their time ranges
> overlap.

This moves the critical invariant into the database transaction logic.

------------------------------------------------------------------------

# 41. Why Frontend Validation Is Not Enough

The frontend can show:

``` text
10:00 AM — available
```

but that does not reserve it.

Another user can book the same slot milliseconds later.

Therefore:

``` text
Frontend availability
```

is informational.

``` text
Database constraint
```

is authoritative.

This is a critical system-design distinction.

------------------------------------------------------------------------

# 42. Expected Concurrent Booking Behavior

Suppose 5 users send the same booking request simultaneously.

Expected:

``` text
Request 1 → 201 Created
Request 2 → 409 Conflict
Request 3 → 409 Conflict
Request 4 → 409 Conflict
Request 5 → 409 Conflict
```

assuming only one mentor/slot is actually available.

The backend must catch the MongoDB transaction conflict or overlap detection
failure and translate it into a customer-friendly response.

------------------------------------------------------------------------

# 43. HTTP 409 Conflict

For a booking race:

``` http
409 Conflict
```

is appropriate.

Example problem response:

``` json
{
  "type": "https://example.com/problems/slot-unavailable",
  "title": "Slot no longer available",
  "status": 409,
  "detail": "This trial-class slot was just booked by another parent."
}
```

The frontend then:

1.  Shows the message.
2.  Refreshes availability.
3.  Allows the parent to select another slot.

------------------------------------------------------------------------

# 44. Daily Capacity Concurrency

The overlap check solves:

``` text
same mentor + overlapping interval
```

but the daily maximum is another invariant:

``` text
count(bookings for mentor on local day) <= 2
```

This check must also be transaction-safe.

The implementation should use MongoDB transactions with appropriate
isolation to prevent two simultaneous requests from both observing:

``` text
count = 1
```

and then creating a third and fourth class.

MongoDB's multi-document ACID transactions provide the necessary guarantees
when combined with proper locking and query ordering within the transaction.

This is one of the most important implementation risks.

------------------------------------------------------------------------

# 45. Idempotency

Network retries are another failure mode.

Example:

``` text
Parent clicks Book
        ↓
Booking succeeds
        ↓
Network response is delayed
        ↓
Browser retries
```

Without idempotency, the application may interpret the retry as a new
booking request.

Recommended:

``` http
Idempotency-Key: <unique-request-key>
```

The server should associate that key with the booking result.

Repeated requests with the same key should return the original outcome
rather than create another booking.

------------------------------------------------------------------------

# 46. Booking Transaction

Conceptual transaction using MongoDB:

``` javascript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  // 1. Validate booking request
  // 2. Resolve exact instant
  // 3. Determine target mentor local day
  // 4. Find eligible mentors
  // 5. Check for overlapping bookings (atomic query within transaction)
  // 6. Verify daily capacity
  // 7. Insert booking document
  // 8. MongoDB transaction ensures atomicity
  // Commit happens automatically if no errors
});
```

If any invariant fails:

``` text
Transaction aborts automatically
```

Then return an appropriate response.

------------------------------------------------------------------------

# 47. Booking State

Recommended booking statuses:

``` text
CONFIRMED
CANCELLED
```

The assignment does not require a cancellation workflow, so only
`CONFIRMED` may be needed initially.

If the schema includes status, the overlap logic must define whether
cancelled bookings participate in conflict checks.

Recommended:

``` text
CONFIRMED → consumes capacity
CANCELLED → does not consume capacity
```

This should be implemented carefully if cancellation is added.

------------------------------------------------------------------------

# 48. Database Architecture

Recommended:

``` text
MongoDB with Mongoose ODM
```

Main collections:

``` text
mentors
availability_rules (optional - can be embedded in mentors)
bookings
```

Potential future collections:

``` text
idempotency_keys
email_events
calendar_connections
usersntor_overrides
```

These future tables are not necessary for the initial assignment.

------------------------------------------------------------------------

# 49. Mentors Table

Conceptual fields:

``` text
id
name
email
timezone
active
created_at
```

Example:

``` text
id: UUID
name: Mentor 01
email: mentor01@example.com
timezone: Asia/Kolkata
active: true
```

All ten mentors can be seeded through migrations/seed scripts.

------------------------------------------------------------------------

# 50. Availability Rules Table

Conceptual fields:

``` text
id
mentor_id
day_of_week
start_time
end_time
```

Example:

``` text
mentor_id: M1
day_of_week: Monday
start_time: 09:00
end_time: 18:00
```

This keeps working hours separate from actual bookings.

------------------------------------------------------------------------

# 51. Bookings Table

Conceptual fields:

``` text
id
mentor_id
parent_name
parent_email
parent_timezone
start_time
end_time
status
class_link
created_at
```

The most important temporal fields are:

``` text
start_time
end_time
```

stored as timezone-aware absolute timestamps in PostgreSQL.

A range representation can be derived or persisted for exclusion
enforcement.

------------------------------------------------------------------------

# 52. Parent Timezone Persistence

Store:

``` text
parent_timezone = Europe/London
```

in the booking.

Why?

Because the booking confirmation/email and future rendering need to know
the parent's intended display timezone.

Do not rely solely on:

``` text
current browser timezone
```

because the parent may travel later.

------------------------------------------------------------------------

# 53. Mentor Timezone Persistence

Store:

``` text
mentor_timezone = Asia/Kolkata
```

or derive it from the mentor record.

For the current assignment, all mentors use:

``` text
Asia/Kolkata
```

but storing the field makes the domain model extensible.

------------------------------------------------------------------------

# 54. API Architecture

Minimal REST API:

## GET availability

``` http
GET /api/availability
```

Parameters:

``` text
date
timezone
```

Example:

``` http
GET /api/availability?date=2026-09-30&timezone=Europe/London
```

Response:

``` json
{
  "date": "2026-09-30",
  "timezone": "Europe/London",
  "slots": [
    {
      "instant": "2026-09-30T09:00:00Z",
      "localTime": "10:00 AM"
    }
  ]
}
```

------------------------------------------------------------------------

# 55. Why Return the Instant to the Frontend?

The frontend needs to display:

``` text
10:00 AM
```

but submit:

``` text
2026-09-30T09:00:00Z
```

The local display string is presentation.

The instant is the booking identity.

Therefore the frontend should keep both:

``` text
display:
10:00 AM

instant:
2026-09-30T09:00:00Z
```

The booking request should submit the instant rather than reconstructing
it from the display string.

This avoids frontend timezone reconstruction errors.

------------------------------------------------------------------------

# 56. POST Booking

``` http
POST /api/bookings
```

Request:

``` json
{
  "parentName": "John Doe",
  "parentEmail": "john@example.com",
  "parentTimezone": "Europe/London",
  "slotInstant": "2026-09-30T09:00:00Z",
  "idempotencyKey": "..."
}
```

Server:

1.  Validates data.
2.  Validates timezone.
3.  Validates instant.
4.  Re-checks availability.
5.  Allocates mentor.
6.  Applies transaction.
7.  Inserts booking.
8.  Generates dummy class link.
9.  Sends mock notifications.
10. Returns confirmation.

------------------------------------------------------------------------

# 57. Never Trust the Availability Response

A parent might keep an old browser tab open.

Example:

``` text
10:00 AM was available at 12:00 PM
```

At:

``` text
12:05 PM
```

another parent books it.

Therefore the booking API must always revalidate.

The system must not accept:

``` text
“the frontend showed it as available”
```

as proof.

------------------------------------------------------------------------

# 58. Frontend Architecture

Recommended:

``` text
React
Vite
TypeScript
Tailwind CSS
React Hook Form
Zod
```

The frontend should primarily handle:

-   User interaction.
-   Timezone selection.
-   Date selection.
-   Availability display.
-   Form validation.
-   Loading states.
-   Error states.
-   Booking confirmation.

The frontend should **not** be the authority for:

-   Mentor availability.
-   Mentor allocation.
-   Daily capacity.
-   Booking conflict.
-   Final timezone resolution.
-   Database state.

------------------------------------------------------------------------

# 59. Backend Architecture

Recommended:

``` text
Node.js
TypeScript
Fastify
Zod
Temporal polyfill
Prisma
PostgreSQL
```

Backend responsibilities:

-   Input validation.
-   Timezone validation.
-   Temporal conversion.
-   Availability computation.
-   Mentor allocation.
-   Capacity enforcement.
-   Transaction management.
-   Database conflict handling.
-   Idempotency.
-   Mock email generation.
-   API errors.

------------------------------------------------------------------------

# 60. Why Fastify

The research selected Fastify over Express because it fits a
TypeScript-focused, schema-driven API architecture and has low overhead.

The assignment does not require a particular backend framework.

Express would still be technically valid.

The choice should be documented as an engineering decision, not a
requirement.

------------------------------------------------------------------------

# 61. Why PostgreSQL Instead of MongoDB

PostgreSQL provides:

-   ACID transactions.
-   Strong relational integrity.
-   Foreign keys.
-   Native timestamp-with-time-zone types.
-   Range types.
-   GiST indexes.
-   Exclusion constraints.

MongoDB can implement concurrency safely, but it requires more
application-layer transaction/concurrency logic for this specific
domain.

The assignment's most interesting technical problem is exactly the type
of invariant PostgreSQL can enforce directly.

Therefore PostgreSQL is preferred.

------------------------------------------------------------------------

# 62. Prisma Boundary

Prisma can be used for:

-   Models.
-   Relations.
-   Type-safe queries.
-   Migrations.

However, PostgreSQL-specific exclusion constraints may require raw SQL
migrations.

Therefore:

``` text
Prisma
+
custom SQL migration
```

is intentional.

The README must explain this clearly so the evaluator does not interpret
the SQL migration as accidental inconsistency.

------------------------------------------------------------------------

# 63. Frontend ↔ Backend Flow

Full flow:

``` text
Browser
  │
  │ detect timezone
  ▼
React UI
  │
  │ GET availability
  ▼
Fastify API
  │
  ▼
Temporal
  │
  ▼
Availability Engine
  │
  ▼
PostgreSQL
  │
  ▼
Available Instants
  │
  ▼
Parent Timezone Projection
  │
  ▼
React Slots
```

When the parent books:

``` text
React
  │
  │ POST booking
  ▼
Fastify
  │
  ▼
Validate
  │
  ▼
Temporal conversion
  │
  ▼
Mentor allocation
  │
  ▼
PostgreSQL transaction
  │
  ├── success → 201
  │
  └── conflict → 409
```

------------------------------------------------------------------------

# 64. Error Taxonomy

The application should distinguish errors by meaning.

## 400 Bad Request

Malformed request.

Example:

``` text
Invalid date.
```

## 422 Unprocessable Entity

Valid request shape but invalid business/input value.

Example:

``` text
Invalid IANA timezone.
```

## 409 Conflict

Booking conflict.

Examples:

``` text
Slot just booked.
Daily capacity changed.
Idempotency conflict.
```

## 429 Too Many Requests

Rate limiting.

Example:

``` text
Too many booking attempts.
```

## 500 Internal Server Error

Unexpected server failure.

Do not expose internal database errors to the parent.

------------------------------------------------------------------------

# 65. No Availability Is Not a Server Error

If no mentor can handle a slot:

``` text
This is a normal business state.
```

Not:

``` text
500 Internal Server Error
```

Recommended response:

``` text
No trial slots are available for this time.
Please choose another time or date.
```

The UI should offer alternatives.

------------------------------------------------------------------------

# 66. Slot Just Taken

If a slot was available when displayed but is booked before submission:

Backend:

``` http
409 Conflict
```

Frontend:

``` text
This slot was just booked by another parent.
We've refreshed the available times.
```

Then:

``` text
GET /api/availability
```

again.

This is better than forcing the user to refresh the browser manually.

------------------------------------------------------------------------

# 67. Validation Errors

Parent name:

``` text
Required
```

Email:

``` text
Valid email required
```

Timezone:

``` text
Must be a supported IANA timezone
```

Date:

``` text
Must be valid ISO date
```

Slot:

``` text
Must correspond to a valid bookable instant
```

Use Zod consistently.

------------------------------------------------------------------------

# 68. Rate Limiting

The assignment does not require authentication.

A public booking endpoint can be abused.

Therefore a lightweight IP rate limit is appropriate.

Example conceptual rule:

``` text
Limit repeated POST /api/bookings requests.
```

Exact production rate values can be tuned later.

Do not build a full authentication system merely to solve this
assignment.

------------------------------------------------------------------------

# 69. Privacy / PII

Collect only what is necessary:

``` text
Parent name
Parent email
Timezone
Booking information
```

Do not collect unnecessary:

-   Home address.
-   Phone number.
-   Date of birth.
-   Child medical information.
-   Unrelated profile information.

The research recommends data minimization and UK GDPR awareness.

Important implementation note:

> Do not rely on stripping SQL/HTML characters as the main security
> strategy.

Use:

-   Parameterized queries/ORM.
-   Schema validation.
-   Correct output encoding.
-   Controlled logging.
-   Data minimization.

------------------------------------------------------------------------

# 70. Email Architecture

Create an abstraction:

``` text
EmailService
```

with implementation:

``` text
MockEmailService
```

Example:

``` typescript
interface EmailService {
  sendParentConfirmation(...): Promise<void>;
  sendMentorAssignment(...): Promise<void>;
}
```

The mock implementation can print structured emails to the server
console.

This proves the notification architecture without requiring API keys.

------------------------------------------------------------------------

# 71. Parent Email

Example:

``` text
Subject:
Your Codeyoung Trial Class is Confirmed

Date:
September 30, 2026

Time:
10:00 AM
Europe/London

Class:
https://example.com/class/abc123
```

The parent's email uses the stored parent timezone.

------------------------------------------------------------------------

# 72. Mentor Email

Example:

``` text
Subject:
New Trial Class Assigned

Date:
September 30, 2026

Time:
2:30 PM IST

Parent:
John Doe

Parent Email:
john@example.com

Class:
https://example.com/class/abc123
```

The mentor email uses the mentor's timezone.

------------------------------------------------------------------------

# 73. Dummy Class Link

A generated link is sufficient.

Example:

``` text
https://example.com/class/<booking-id>
```

No real Zoom/Google Meet integration is required.

Do not introduce third-party credentials that could make local
evaluation fail.

------------------------------------------------------------------------

# 74. UI States

The frontend should explicitly support:

## Initial

``` text
Loading booking options...
```

## Loading availability

``` text
Finding available trial times...
```

## Available

``` text
09:00 AM
09:30 AM
10:00 AM
```

## No availability

``` text
No trial slots available for this date.
Try another date.
```

## Booking

``` text
Confirming your trial class...
```

## Success

``` text
Trial class confirmed.
```

## Conflict

``` text
That slot was just booked.
Available times have been refreshed.
```

## Validation error

``` text
Please enter a valid email address.
```

## Server error

``` text
We couldn't complete the booking right now.
Please try again.
```

------------------------------------------------------------------------

# 75. Disabled / Hidden Slots

The research identifies an unresolved UX choice:

Should unavailable times be:

1.  Hidden entirely.
2.  Displayed disabled.

For this assignment, the recommended default is:

> **Return only actually bookable slots and avoid cluttering the
> interface with unavailable times.**

If the evaluator values transparency, disabled slots can be introduced
later.

This is a UX decision rather than a backend correctness requirement.

------------------------------------------------------------------------

# 76. Parent Booking Journey --- Complete

``` text
Parent opens website
        ↓
Browser timezone detected
        ↓
Timezone displayed
        ↓
Parent confirms/changes timezone
        ↓
Parent selects date
        ↓
Frontend requests availability
        ↓
Backend calculates bookable instants
        ↓
Backend converts instants into parent timezone
        ↓
Parent sees local times
        ↓
Parent selects slot
        ↓
Parent enters name + email
        ↓
Frontend submits exact slot instant
        ↓
Backend revalidates
        ↓
Backend selects mentor
        ↓
Database transaction
        ↓
Conflict protection
        ↓
Booking created
        ↓
Dummy class link generated
        ↓
Parent confirmation
        ↓
Mentor assignment notification
        ↓
Success screen
```

------------------------------------------------------------------------

# 77. Mentor Assignment Journey

``` text
Booking instant
      ↓
Convert to mentor timezone
      ↓
Find mentors within working hours
      ↓
Check existing bookings
      ↓
Check daily capacity
      ↓
Sort eligible mentors
      ↓
Select least-booked mentor
      ↓
Attempt atomic booking
      ↓
Success → assign mentor
      ↓
Conflict → retry/choose next valid candidate as appropriate
```

The exact retry behavior must be implemented carefully so a failed
mentor does not create inconsistent capacity state.

------------------------------------------------------------------------

# 78. Failure Modes We Are Solving

## Failure 1 --- Wrong timezone

Naïve system:

``` text
Parent says 10 AM
System assumes IST
```

Result:

``` text
Parent gets the wrong class time.
```

Solution:

``` text
IANA timezone + exact instant
```

------------------------------------------------------------------------

## Failure 2 --- Hardcoded UTC offset

Naïve:

``` text
London = UTC+1
```

all year.

Result:

``` text
DST errors.
```

Solution:

``` text
Europe/London
```

and timezone-aware conversion.

------------------------------------------------------------------------

## Failure 3 --- Frontend-only availability

Naïve:

``` text
UI says available
→ POST directly
```

Result:

``` text
Race condition.
```

Solution:

``` text
Database-level conflict protection.
```

------------------------------------------------------------------------

## Failure 4 --- First mentor wins

Naïve:

``` text
Always assign M1 first.
```

Result:

``` text
Unbalanced workload.
```

Solution:

``` text
Least-booked eligible mentor.
```

------------------------------------------------------------------------

## Failure 5 --- Check current mentor status

Naïve:

``` text
Mentor is free now.
```

Result:

``` text
Doesn't prove availability at requested time.
```

Solution:

``` text
Evaluate exact requested instant.
```

------------------------------------------------------------------------

## Failure 6 --- Third class in one day

Naïve:

``` text
Check overlap only.
```

Result:

``` text
Mentor could receive multiple non-overlapping classes beyond daily capacity.
```

Solution:

``` text
Transaction-safe daily capacity check.
```

------------------------------------------------------------------------

## Failure 7 --- Browser timezone treated as absolute truth

Naïve:

``` text
Browser = America/New_York
therefore booking must be New York time.
```

Result:

``` text
Travelling users cannot book in their desired timezone.
```

Solution:

``` text
Auto-detect + manual timezone override.
```

------------------------------------------------------------------------

## Failure 8 --- Retry creates duplicate booking

Naïve:

``` text
POST again = new booking.
```

Solution:

``` text
Idempotency key.
```

------------------------------------------------------------------------

# 79. Industry-Informed Architecture

The supplied research examined several scheduling systems.

## Calendly

Relevant observed pattern:

-   Browser timezone detection.
-   Local projection for invitees.
-   Timezone-aware scheduling behavior.

Some deeper claims about Calendly's internal infrastructure are
architectural inference rather than publicly documented facts. They must
not be represented in our README as confirmed internal implementation
details.

## Cal.com

Relevant patterns:

-   TypeScript/Next.js ecosystem.
-   PostgreSQL.
-   Prisma.
-   Zod.
-   Availability/booking domain separation.
-   PostgreSQL locking patterns.
-   IANA timezone usage.

## Google Calendar

Relevant pattern:

-   Free/busy queries use time boundaries and timezone context.
-   Timezone is explicitly part of temporal API interactions.

## Microsoft

Relevant pattern:

-   Calendar availability is based on working hours, calendar state, and
    timezone-aware availability concepts.

## Acuity / Doodle / HubSpot

These reinforce the broader industry pattern:

> Cross-timezone scheduling requires explicit timezone information and
> server-side normalization.

------------------------------------------------------------------------

# 80. RFC 9557 / IXDTF

The research also examined IXDTF / RFC 9557.

Conceptually, a timestamp can preserve:

``` text
2026-09-28T10:30:00+01:00[Europe/London]
```

This preserves both:

-   Offset.
-   IANA timezone identity.

For the assignment, the database can remain simpler:

``` text
absolute timestamp
+
timezone identifier
```

The important architectural principle is preservation of both the exact
instant and timezone context.

------------------------------------------------------------------------

# 81. Why We Should Not Build a Microservice Architecture

Scale:

``` text
10 mentors
~20 parents/day
```

does not justify:

``` text
booking service
availability service
notification service
allocation service
timezone service
Kafka
Redis
Kubernetes
```

This would increase:

-   Deployment complexity.
-   Debugging difficulty.
-   Failure points.
-   Development time.
-   Evaluation friction.

A modular monolith is sufficient.

------------------------------------------------------------------------

# 82. Recommended System Architecture

``` text
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │       + Vite        │
                    └──────────┬──────────┘
                               │ REST
                               ▼
                    ┌─────────────────────┐
                    │    Fastify API      │
                    │     TypeScript      │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       Temporal Engine   Availability       Booking/
                         Engine              Allocation
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │  Range + GiST       │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Mock Email        │
                    │      Service        │
                    └─────────────────────┘
```

------------------------------------------------------------------------

# 83. Recommended Repository Structure

``` text
codeyoung-trial-booking/
│
├── apps/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── timezone/
│   │   │   └── types/
│   │   └── package.json
│   │
│   └── backend/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── availability/
│       │   │   ├── bookings/
│       │   │   ├── mentors/
│       │   │   └── notifications/
│       │   ├── lib/
│       │   ├── plugins/
│       │   ├── db/
│       │   └── server.ts
│       └── package.json
│
├── packages/
│   └── shared-types/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│
├── docker-compose.yml
├── package.json
├── README.md
├── TRANSCRIPT.md
└── project-research.md
```

The exact folder organization can change during implementation, but
domain boundaries should remain clear.

------------------------------------------------------------------------

# 84. Domain Modules

## Availability

Responsible for:

``` text
candidate slots
timezone projection
working hours
booking conflict lookup
capacity filtering
```

## Bookings

Responsible for:

``` text
create booking
transaction
idempotency
booking state
```

## Mentors

Responsible for:

``` text
mentor records
mentor timezone
mentor working hours
```

## Notifications

Responsible for:

``` text
parent email
mentor email
```

## Timezone

Centralize:

``` text
IANA validation
Temporal conversion
DST handling
local display
```

Do not scatter timezone calculations throughout React components.

------------------------------------------------------------------------

# 85. Critical Architectural Rule

Do not do this:

``` text
BookingComponent.tsx
    ↓
manual timezone math
    ↓
API
```

Instead:

``` text
UI
 ↓
selected timezone + instant
 ↓
API
 ↓
domain temporal service
```

Timezone logic should have one clearly owned domain boundary.

------------------------------------------------------------------------

# 86. API Validation

Use Zod schemas for:

``` text
availability query
booking request
timezone
email
name
date
instant
```

Example conceptual schema:

``` text
AvailabilityQuery:
    date = ISO date
    timezone = IANA timezone

BookingRequest:
    parentName = non-empty string
    parentEmail = valid email
    parentTimezone = IANA timezone
    slotInstant = valid ISO instant
    idempotencyKey = valid identifier
```

------------------------------------------------------------------------

# 87. Timezone Validation

An arbitrary string such as:

``` text
"London"
```

should not be accepted.

Use:

``` text
Europe/London
```

Likewise:

``` text
"IST"
```

should not be used as the canonical timezone identifier.

Use:

``` text
Asia/Kolkata
```

IANA identifiers are unambiguous and machine-oriented.

------------------------------------------------------------------------

# 88. Availability Response Design

Recommended:

``` json
{
  "date": "2026-09-30",
  "timezone": "Europe/London",
  "slots": [
    {
      "instant": "2026-09-30T09:00:00Z",
      "label": "10:00 AM"
    },
    {
      "instant": "2026-09-30T09:30:00Z",
      "label": "10:30 AM"
    }
  ]
}
```

Potentially include:

``` text
offset
```

for display/debugging if needed.

The frontend should never infer the booking instant by parsing:

``` text
"10:00 AM"
```

------------------------------------------------------------------------

# 89. API Error Format

Use a consistent Problem Details style.

Example:

``` json
{
  "type": "https://example.com/problems/slot-unavailable",
  "title": "Slot unavailable",
  "status": 409,
  "detail": "The selected trial-class time is no longer available."
}
```

Possible types:

``` text
invalid-timezone
invalid-date
slot-unavailable
mentor-capacity-reached
duplicate-request
rate-limit
internal-error
```

------------------------------------------------------------------------

# 90. Booking Success Response

Example:

``` json
{
  "bookingId": "booking_123",
  "status": "CONFIRMED",
  "startTime": "2026-09-30T09:00:00Z",
  "endTime": "2026-09-30T09:30:00Z",
  "parentTimezone": "Europe/London",
  "mentorTimezone": "Asia/Kolkata",
  "classLink": "https://example.com/class/booking_123"
}
```

The frontend can format the exact instant in the parent timezone.

------------------------------------------------------------------------

# 91. Testing Strategy

Testing must focus on the actual domain risks.

A basic:

``` text
renders button
```

test is insufficient.

The critical tests are:

1.  Timezone conversion.
2.  DST.
3.  Availability.
4.  Daily capacity.
5.  Mentor allocation.
6.  Concurrent booking.
7.  Database exclusion constraint.
8.  Idempotency.
9.  API validation.
10. Error handling.

------------------------------------------------------------------------

# 92. Timezone Tests

Test at least:

``` text
Europe/London
America/New_York
Asia/Kolkata
```

Also include a fractional-offset timezone such as:

``` text
Asia/Kolkata
```

to ensure the implementation does not assume offsets are whole hours.

------------------------------------------------------------------------

# 93. DST Spring-Forward Test

Use a known DST transition date.

Test:

``` text
A local time that does not exist
```

Expected:

``` text
No invalid appointment instant is silently created.
```

The Temporal API's disambiguation behavior must be deliberately selected
and documented.

------------------------------------------------------------------------

# 94. DST Fall-Back Test

Test a timezone/date where a local hour repeats.

Expected:

``` text
The two possible instants are not accidentally treated as the same instant.
```

The application must have a documented disambiguation policy.

For normal user-facing availability, the simplest safe policy may be to
avoid exposing ambiguous duplicate labels unless the product explicitly
wants both occurrences.

------------------------------------------------------------------------

# 95. Mismatched Browser Timezone Test

Simulate:

``` text
Browser:
America/New_York

Selected timezone:
Europe/London
```

Expected:

``` text
API and UI use Europe/London.
```

The browser timezone must not override the explicit selection.

------------------------------------------------------------------------

# 96. Daily Capacity Test

Seed:

``` text
Mentor M1:
2 bookings
```

Then request another slot on the same mentor-local day.

Expected:

``` text
M1 is excluded.
```

If all ten mentors have two bookings:

``` text
No slot is returned.
```

------------------------------------------------------------------------

# 97. Concurrent Booking Test

Fire:

``` text
Promise.all(
    10 identical POST /api/bookings
)
```

Expected:

``` text
1 × 201
9 × 409
```

assuming one eligible mentor and one bookable slot.

This test demonstrates that the database constraint is actually active.

------------------------------------------------------------------------

# 98. Direct Database Constraint Test

Attempt:

``` text
Booking A:
Mentor M1
10:00–10:30

Booking B:
Mentor M1
10:15–10:45
```

Expected:

``` text
Database rejects Booking B.
```

Then test:

``` text
Booking B:
Mentor M1
10:30–11:00
```

Expected:

``` text
Database accepts Booking B.
```

This validates the `[start, end)` interval model.

------------------------------------------------------------------------

# 99. Allocation Tests

Example:

``` text
M1 → 2 classes
M2 → 1 class
M3 → 0 classes
```

All available.

Expected:

``` text
M3
```

Then:

``` text
M3 → 1
M2 → 1
```

Tie behavior must be deterministic.

------------------------------------------------------------------------

# 100. API Integration Tests

Test:

``` text
GET availability
POST booking
409 conflict
400 malformed request
422 invalid timezone
429 rate limit
```

The test suite should verify both status code and response shape.

------------------------------------------------------------------------

# 101. What We Build

## Required build scope

-   React booking interface.
-   Timezone auto-detection.
-   Manual timezone selector.
-   Date picker.
-   Available slot display.
-   Parent details form.
-   Booking confirmation.
-   Fastify REST API.
-   Temporal timezone handling.
-   PostgreSQL persistence.
-   Mentor seed data.
-   Mentor availability rules.
-   Daily capacity enforcement.
-   Automatic mentor allocation.
-   Database overlap protection.
-   Mock email service.
-   Dummy class links.
-   Error states.
-   Tests.
-   Docker Compose.
-   README.
-   TRANSCRIPT.

------------------------------------------------------------------------

# 102. What We Do Not Build

Intentionally excluded:

-   OAuth.
-   JWT authentication.
-   Parent accounts.
-   Mentor accounts.
-   Admin portal.
-   Real payment.
-   Real Zoom/Meet integration.
-   Google Calendar integration.
-   Microsoft Calendar integration.
-   Full calendar synchronization.
-   Complex OOO engine.
-   Holiday management.
-   Redis.
-   Kafka.
-   Kubernetes.
-   Microservices.
-   Production email provider.

These are not necessary to prove the assignment's core engineering
capabilities.

------------------------------------------------------------------------

# 103. Success Criteria

The project is successful if all of the following are true.

## Product

A parent can:

``` text
open page
→ see timezone
→ change timezone
→ choose date
→ see available local slots
→ choose slot
→ enter details
→ book
→ receive confirmation
```

## Scheduling

The system:

``` text
correctly converts timezones
correctly handles DST
never intentionally books unavailable mentors
never exceeds two classes per mentor/day
automatically assigns mentor
```

## Concurrency

The system:

``` text
allows one winner
rejects simultaneous conflicting bookings
```

## UX

The system:

``` text
clearly communicates loading
clearly communicates no availability
clearly communicates conflicts
does not expose unnecessary technical complexity
```

## Engineering

The code demonstrates:

``` text
modular architecture
strong validation
transactional booking
database-level invariants
test coverage of critical domain logic
clear documentation
```

------------------------------------------------------------------------

# 104. Failure Criteria

The project should be considered technically unsafe if it:

-   Stores only local time.
-   Stores only UTC offsets.
-   Hardcodes UK/US timezone offsets.
-   Uses `Date` arithmetic for core cross-timezone scheduling without a
    clear timezone model.
-   Trusts frontend availability during booking.
-   Allows two bookings for the same mentor/time.
-   Allows a mentor's third daily class.
-   Uses browser timezone as the only source of timezone truth.
-   Does not revalidate at booking time.
-   Does not handle 409 conflicts.
-   Does not test DST.
-   Does not test concurrency.
-   Assigns mentors randomly without a reason.
-   Exposes internal database errors to users.
-   Requires third-party credentials just to run locally.

------------------------------------------------------------------------

# 105. Important Accuracy Statement

No scheduling implementation should claim:

> "100% accurate under all possible circumstances."

A defensible engineering statement is:

> The design explicitly addresses the known failure modes in the
> assignment: IANA timezone identity, DST transitions, cross-border
> local-time projection, mentor working-hour constraints, daily
> capacity, concurrent booking races, and retry/idempotency behavior.
> Correctness is then validated through deterministic unit, integration,
> and database tests.

This is stronger and more technically credible than an absolute accuracy
claim.

------------------------------------------------------------------------

# 106. Known Technical Risks

## Risk 1 --- DST disambiguation

Wrong policy can produce a one-hour booking error.

Mitigation:

``` text
Temporal + explicit tests
```

## Risk 2 --- Daily capacity race

Two requests may both observe:

``` text
count = 1
```

and both attempt to create another class.

Mitigation:

``` text
transaction + appropriate isolation/locking
```

## Risk 3 --- Frontend timezone leakage

Frontend may accidentally send a local display string.

Mitigation:

``` text
frontend receives/stores exact instant
```

## Risk 4 --- Prisma migration

Custom GiST constraint could be lost or ignored by ORM workflows.

Mitigation:

``` text
document custom migration
add database constraint test
```

## Risk 5 --- Polyfill size

Temporal polyfill adds frontend bundle weight.

Mitigation:

``` text
use it deliberately and document trade-off
```

## Risk 6 --- Non-deterministic allocation

Mitigation:

``` text
stable sorting and tie-breaker
```

## Risk 7 --- Fractional offsets

Mitigation:

``` text
Temporal timezone engine + Asia/Kolkata tests
```

## Risk 8 --- Retry duplication

Mitigation:

``` text
idempotency key
```

## Risk 9 --- Concurrent booking

Mitigation:

``` text
PostgreSQL exclusion constraint
```

## Risk 10 --- External provider dependency

Mitigation:

``` text
mock email + dummy class link
```

------------------------------------------------------------------------

# 107. Potential Future Enhancements

If this were converted into a production platform after the assignment:

## Calendar integration

``` text
Google Calendar
Microsoft 365
```

## Mentor overrides

``` text
OOO
holiday
leave
custom availability
```

## Parent account

``` text
login
booking history
reschedule
cancel
```

## Mentor dashboard

``` text
schedule
upcoming classes
availability management
```

## Notification provider

``` text
Resend
SendGrid
Postmark
```

## Video provider

``` text
Google Meet
Zoom
Microsoft Teams
```

## Distributed architecture

Only after actual scale/operational requirements justify it.

------------------------------------------------------------------------

# 108. Important Non-Goals

Do not allow future feature ideas to contaminate the assignment's core
architecture.

The assignment is primarily testing:

``` text
time
state
availability
allocation
concurrency
UX
architecture
```

It is not primarily testing:

``` text
authentication
payments
video conferencing
microservices
DevOps complexity
```

------------------------------------------------------------------------

# 109. Complete Algorithm --- Parent Side

``` text
PARENT OPENS APP

1. Browser returns IANA timezone.
2. UI initializes selected timezone.
3. Parent can override timezone.
4. Parent selects date.
5. UI calls:
       GET /api/availability
6. Backend validates date/timezone.
7. Backend generates candidate local slots.
8. Backend converts candidate slots to exact instants.
9. Backend evaluates every mentor.
10. Remove mentors outside working hours.
11. Remove mentors with conflicts.
12. Remove mentors at daily capacity.
13. If any eligible mentor exists:
       return slot.
14. Convert instant to parent timezone for label.
15. UI displays local slots.
16. Parent selects slot.
17. UI stores exact instant.
18. Parent submits name/email.
19. POST /api/bookings.
```

------------------------------------------------------------------------

# 110. Complete Algorithm --- Backend Booking

``` text
POST /api/bookings

1. Validate payload.
2. Validate IANA timezone.
3. Validate exact instant.
4. Check idempotency key.
5. Convert requested instant to each mentor's timezone.
6. Determine eligible mentors.
7. Remove mentors outside working hours.
8. Remove mentors with overlapping bookings.
9. Remove mentors with >= 2 bookings on mentor-local date.
10. Sort by booking load.
11. Apply deterministic tie-break.
12. Start transaction.
13. Re-check critical availability/capacity.
14. Attempt booking insertion.
15. PostgreSQL exclusion constraint protects overlap.
16. Enforce daily capacity transactionally.
17. Commit.
18. Generate class URL.
19. Send mock parent email.
20. Send mock mentor email.
21. Return 201.
```

On conflict:

``` text
ROLLBACK
→ 409
→ frontend refresh
```

------------------------------------------------------------------------

# 111. Complete Algorithm --- Availability

``` text
FOR each candidate local slot:

    parentLocalDateTime
        +
    parentTimezone
        ↓
    exactInstant

    FOR each mentor:

        exactInstant
            ↓
        mentorTimezone
            ↓
        mentorLocalDateTime

        IF outside working hours:
            exclude

        IF booking overlaps:
            exclude

        IF daily count >= 2:
            exclude

    IF at least one mentor remains:
        return exactInstant
```

The frontend then renders:

``` text
exactInstant
      ↓
parentTimezone
      ↓
"10:00 AM"
```

------------------------------------------------------------------------

# 112. Database Query Responsibilities

The database should answer:

### Mentor lookup

``` text
Which active mentors exist?
```

### Availability lookup

``` text
Which bookings overlap this interval?
```

### Daily capacity

``` text
How many relevant bookings does this mentor have on the mentor-local date?
```

### Booking insert

``` text
Can this booking be committed without violating constraints?
```

The database should not be responsible for UI formatting.

------------------------------------------------------------------------

# 113. Frontend Responsibilities

The frontend should answer:

``` text
What does the user see?
```

It should:

-   Detect initial timezone.
-   Let user select timezone.
-   Select date.
-   Fetch slots.
-   Display local times.
-   Collect parent details.
-   Submit exact instant.
-   Handle loading.
-   Handle errors.
-   Show confirmation.

It should not determine:

``` text
which mentor
whether mentor is truly available
whether daily capacity is exceeded
whether booking is valid
```

------------------------------------------------------------------------

# 114. Backend Responsibilities

The backend answers:

``` text
Can this booking actually happen?
```

It owns:

-   Temporal conversion.
-   Availability.
-   Allocation.
-   Capacity.
-   Transactions.
-   Idempotency.
-   Database conflict handling.
-   Notifications.

------------------------------------------------------------------------

# 115. Database Responsibilities

The database is the final consistency boundary.

It owns:

-   Persistence.
-   Referential integrity.
-   Atomic transactions.
-   Overlap exclusion.
-   Durable booking state.

------------------------------------------------------------------------

# 116. Single Source of Truth

The system should follow:

``` text
Browser
    ↓
User intent

Backend
    ↓
Business rules

Database
    ↓
Final consistency
```

Do not invert this hierarchy.

------------------------------------------------------------------------

# 117. Example End-to-End Scenario

Parent in London.

Browser:

``` text
Europe/London
```

Parent selects:

``` text
September 30, 2026
10:00 AM
```

Frontend requests:

``` text
date=2026-09-30
timezone=Europe/London
```

Backend resolves:

``` text
10:00 Europe/London
↓
exact instant
```

Then converts to mentor timezone:

``` text
exact instant
↓
Asia/Kolkata
↓
2:30 PM IST
```

Mentor eligibility:

``` text
Working hours:
09:00–18:00
✓

No overlap:
✓

Daily bookings:
1
✓
```

Mentor is eligible.

Booking inserted:

``` text
start = exact instant
end = exact instant + 30 minutes
```

Parent receives:

``` text
10:00 AM London
```

Mentor receives:

``` text
2:30 PM IST
```

Both receive:

``` text
same class URL
```

There is still only:

``` text
one booking
```

------------------------------------------------------------------------

# 118. Example: No Mentor Available

Parent requests:

``` text
10:00 AM London
```

All mentors:

``` text
outside working hours
OR
already booked
OR
daily capacity = 2
```

Availability engine returns:

``` json
{
  "slots": []
}
```

UI:

``` text
No trial slots are available for this date.

Try another date to find an available mentor.
```

This is a normal business outcome.

------------------------------------------------------------------------

# 119. Example: Simultaneous Booking

Parent A:

``` text
10:00 London
```

Parent B:

``` text
2:30 PM New York
```

Both may resolve to the same exact instant.

Both target the same final mentor.

Database:

``` text
A → INSERT succeeds
B → exclusion constraint fails
```

Result:

``` text
A → 201
B → 409
```

B's UI:

``` text
This slot was just booked by another parent.
Available times have been refreshed.
```

------------------------------------------------------------------------

# 120. Example: Browser/Selected Timezone Difference

Browser:

``` text
America/New_York
```

Parent chooses:

``` text
Europe/London
```

UI:

``` text
Times shown in Europe/London
```

API:

``` text
timezone=Europe/London
```

Backend uses:

``` text
Europe/London
```

The browser's original timezone is irrelevant after explicit selection.

------------------------------------------------------------------------

# 121. Example: Mentor Capacity

Suppose:

``` text
M1 = 2 classes
M2 = 2 classes
M3 = 1 class
M4 = 0 classes
```

All working at requested instant.

Eligible:

``` text
M3
M4
```

Allocation:

``` text
M4
```

because:

``` text
0 < 1
```

This distributes load rather than repeatedly using M1.

------------------------------------------------------------------------

# 122. Example: Mentor Working-Hour Failure

Requested instant converts to:

``` text
21:00 Asia/Kolkata
```

Mentor working hours:

``` text
09:00–18:00
```

Result:

``` text
mentor excluded
```

No special timezone error is shown to the parent.

The parent simply sees that this slot is not bookable.

------------------------------------------------------------------------

# 123. UX Principle

Complexity should be absorbed by the system.

Parent should see:

``` text
Choose a time
```

not:

``` text
Choose an instant
```

Mentor should receive:

``` text
2:30 PM IST
```

not:

``` text
2026-09-30T09:00:00Z
```

Developer/debugging tools can expose the exact instant.

Customer UI should remain human-readable.

------------------------------------------------------------------------

# 124. Design Principle: Store Precision, Display Simplicity

Internally:

``` text
Instant
IANA timezone
range
mentor ID
status
```

Externally:

``` text
10:00 AM
September 30
```

This is the desired separation.

------------------------------------------------------------------------

# 125. Design Principle: Calculate, Don't Guess

Do not:

``` text
London = IST - 4.5
```

Do:

``` text
Temporal timezone conversion
```

Do not:

``` text
slot appears available
→ assume it is available
```

Do:

``` text
transaction + database constraint
```

Do not:

``` text
browser timezone = booking timezone
```

Do:

``` text
browser timezone = initial suggestion
selected timezone = user intent
```

------------------------------------------------------------------------

# 126. Design Principle: Availability Is a Derived View

The database stores:

``` text
working rules
bookings
mentors
```

Availability is calculated from these.

Conceptually:

``` text
Availability =
    Working Hours
    − Existing Bookings
    − Daily Capacity
    − Other Future Overrides
```

For this assignment, only the first three are implemented.

------------------------------------------------------------------------

# 127. Design Principle: Booking Is a State Transition

A booking is not simply:

``` text
INSERT row
```

It is:

``` text
requested
   ↓
validated
   ↓
eligible
   ↓
reserved
   ↓
confirmed
```

Concurrency can cause the state transition to fail.

Therefore the API must treat booking as an atomic operation.

------------------------------------------------------------------------

# 128. Production-Oriented Decisions

Even though the scale is small, the architecture intentionally
demonstrates production principles:

-   Strong temporal model.
-   IANA timezone identifiers.
-   Absolute instants.
-   Database-level conflict protection.
-   Transactional booking.
-   Deterministic allocation.
-   Idempotency.
-   Validation.
-   Error contracts.
-   Testable domain modules.
-   Clear scope boundaries.

The goal is not to overbuild.

The goal is to put complexity exactly where the domain requires it.

------------------------------------------------------------------------

# 129. Why This Architecture Fits the Assignment

The assignment's interesting challenges are:

``` text
Global time
+
Mentor availability
+
Capacity
+
Concurrency
+
UX
```

This architecture directly addresses each:

  Problem                       Solution
  ----------------------------- -----------------------------------
  Parent in different country   IANA timezone
  DST                           Temporal
  Local UI                      timezone projection
  Mentor working hours          availability engine
  Daily max 2                   transaction-safe capacity
  Mentor selection              least-booked eligible
  Double booking                PostgreSQL exclusion constraint
  Retry                         idempotency
  User conflict                 HTTP 409
  No availability               empty availability + alternatives
  Notifications                 EmailService abstraction
  Evaluation simplicity         modular monolith

------------------------------------------------------------------------

# 130. Source-Derived vs Inferred Claims

The research document contains both documented vendor behavior and
architectural inference.

A coding agent must distinguish them.

## Documented/research-backed patterns

-   IANA timezone identifiers are appropriate for cross-border
    scheduling.
-   DST creates nonexistent and ambiguous local times.
-   Temporal provides timezone-aware primitives and disambiguation
    concepts.
-   PostgreSQL supports range types and exclusion constraints.
-   Cal.com uses PostgreSQL/Prisma/Zod-related technologies.
-   Google Calendar APIs explicitly use timezone context in availability
    queries.

## Architectural inference

Statements such as:

> "Calendly internally uses Redis locks in exactly this way"

must not be treated as confirmed unless publicly documented.

The research report itself identifies some Calendly concurrency claims
as reasonable inference.

Therefore this project should say:

> "This architecture is inspired by documented industry patterns and
> adapted for the assignment."

It should not claim:

> "This is exactly how Calendly internally works."

------------------------------------------------------------------------

# 131. Research Sources

The supplied research report references:

-   Calendly timezone documentation.
-   Calendly technology research.
-   Cal.com code/research.
-   Google Calendar FreeBusy documentation.
-   Microsoft Graph/Bookings concepts.
-   Acuity Scheduling documentation.
-   Doodle comparisons.
-   HubSpot timezone references.
-   TC39 Temporal documentation.
-   RFC 9557.
-   PostgreSQL range type documentation.
-   PostgreSQL exclusion constraint material.
-   Vitest timer documentation.
-   Fastify documentation/benchmarks.

Primary technical sources should be preferred whenever implementation
details are being verified.

------------------------------------------------------------------------

# 132. Recommended Technology Stack

## Frontend

``` text
React
Vite
TypeScript
Tailwind CSS
React Hook Form
Zod
```

## Backend

``` text
Node.js
Fastify
TypeScript
Zod
@js-temporal/polyfill
```

## Database

``` text
PostgreSQL 16+
```

## ORM

``` text
Prisma
+
raw SQL migrations where PostgreSQL-specific constraints are required
```

## Testing

``` text
Vitest
API integration tests
Database integration tests
```

## Local execution

``` text
Docker Compose
```

------------------------------------------------------------------------

# 133. Implementation Order

Do not start by building UI components randomly.

Recommended order:

## Phase 1 --- Domain specification

Finalize:

-   Duration.
-   Slot interval.
-   Working hours.
-   Timezone rules.
-   Capacity.
-   Allocation.
-   Error behavior.

## Phase 2 --- Database

Build:

``` text
mentors
availability_rules
bookings
```

Seed ten mentors.

Add:

``` text
tstzrange
GiST
exclusion constraint
```

## Phase 3 --- Temporal utilities

Implement and test:

``` text
local → instant
instant → timezone
DST handling
```

## Phase 4 --- Availability engine

Implement:

``` text
candidate generation
mentor filtering
capacity filtering
conflict filtering
```

## Phase 5 --- Booking transaction

Implement:

``` text
allocation
capacity
insert
conflict handling
idempotency
```

## Phase 6 --- API

Implement:

``` text
GET /api/availability
POST /api/bookings
```

## Phase 7 --- Frontend

Build:

``` text
timezone
date
slots
form
confirmation
errors
```

## Phase 8 --- Notifications

Mock email service.

## Phase 9 --- Testing

Run:

``` text
timezone
DST
capacity
concurrency
database
API
```

## Phase 10 --- Documentation

Complete:

``` text
README.md
TRANSCRIPT.md
```

------------------------------------------------------------------------

# 134. Definition of Done

The project is ready for submission only when:

### Booking

-   [ ] Parent can choose timezone.
-   [ ] Parent can choose date.
-   [ ] Parent sees local available slots.
-   [ ] Parent can submit details.
-   [ ] Booking succeeds.

### Time

-   [ ] IANA timezone identifiers are used.
-   [ ] Exact instants are persisted.
-   [ ] Parent timezone is persisted.
-   [ ] Mentor timezone is represented.
-   [ ] DST tests pass.

### Mentors

-   [ ] Ten mentors are seeded.
-   [ ] Mentor working hours exist.
-   [ ] Mentor automatically assigned.
-   [ ] Daily capacity enforced.
-   [ ] Allocation is deterministic.

### Database

-   [ ] PostgreSQL is used.
-   [ ] Overlap exclusion constraint exists.
-   [ ] Transaction tests pass.
-   [ ] Concurrent booking test passes.

### UX

-   [ ] Loading state.
-   [ ] No availability state.
-   [ ] Booking conflict state.
-   [ ] Validation errors.
-   [ ] Success confirmation.
-   [ ] Parent sees local time.
-   [ ] Mentor receives mentor-local time.

### Notifications

-   [ ] Parent mock email.
-   [ ] Mentor mock email.
-   [ ] Same class link.

### Engineering

-   [ ] TypeScript.
-   [ ] Zod.
-   [ ] Temporal.
-   [ ] Tests.
-   [ ] Docker Compose.
-   [ ] README.
-   [ ] TRANSCRIPT.

------------------------------------------------------------------------

# 135. Final Canonical Workflow

This is the workflow a coding agent should treat as authoritative unless
a later project decision explicitly changes it.

``` text
PARENT
  │
  ├── Browser timezone detected
  │
  ├── Parent confirms/changes timezone
  │
  ├── Parent selects date
  │
  ▼
GET /api/availability
  │
  ▼
BACKEND
  │
  ├── Validate IANA timezone
  ├── Generate candidate local slots
  ├── Resolve local slots to exact instants
  ├── Convert instants to Asia/Kolkata
  ├── Check mentor working hours
  ├── Check booking conflicts
  ├── Check max 2/day
  ├── Keep slots with ≥1 eligible mentor
  └── Return exact instants + parent-local labels
  │
  ▼
PARENT UI
  │
  ├── Displays local times
  ├── Parent selects slot
  └── Enters name/email
  │
  ▼
POST /api/bookings
  │
  ▼
BACKEND TRANSACTION
  │
  ├── Validate request
  ├── Check idempotency
  ├── Recalculate eligibility
  ├── Rank mentors
  ├── Select least-booked eligible mentor
  ├── Check daily capacity transactionally
  ├── Insert booking
  ├── PostgreSQL exclusion constraint prevents overlap
  │
  ├────────────── SUCCESS ──────────────┐
  │                                     │
  ▼                                     ▼
201 Created                         409 Conflict
  │                                     │
  ├── Generate class link               ├── Return slot conflict
  ├── Parent notification               └── Frontend refreshes
  └── Mentor notification
  │
  ▼
CONFIRMATION
  │
  ├── Parent: local timezone
  └── Mentor: Asia/Kolkata
```

------------------------------------------------------------------------

# 136. Canonical Engineering Principles for the Coding Agent

A coding agent implementing this repository should follow these rules:

1.  **Never treat a timezone offset as the timezone identity.**
2.  **Use IANA timezone identifiers.**
3.  **Never hardcode UK/US/India offset arithmetic.**
4.  **Use Temporal semantics for cross-timezone calculations.**
5.  **Treat an appointment as an exact instant plus timezone context.**
6.  **Parent chooses the time; system chooses the mentor.**
7.  **Availability must be calculated for the requested future
    instant.**
8.  **Browser timezone is an initial suggestion, not the final
    authority.**
9.  **Explicit parent timezone selection overrides browser detection.**
10. **Frontend availability is never the final booking authority.**
11. **Booking must revalidate availability.**
12. **Database constraints are part of the booking correctness model.**
13. **Overlapping bookings for the same mentor must be impossible at the
    database layer.**
14. **Daily capacity must be transaction-safe.**
15. **Mentor allocation must be deterministic.**
16. **No availability is a business state, not a 500 error.**
17. **A booking race should produce 409 Conflict.**
18. **Retries should be protected by idempotency.**
19. **Parent-facing UI should not expose unnecessary mentor/timezone
    complexity.**
20. **Mentor communication must use mentor-local time.**
21. **Every critical timezone/DST rule must have tests.**
22. **Every critical concurrency invariant must have
    integration/database tests.**
23. **Do not introduce microservices or infrastructure without a
    requirement.**
24. **Do not introduce third-party credentials that prevent local
    evaluation.**
25. **Document every assumption that the assignment itself did not
    specify.**
26. **Never claim vendor internals as fact when the research only
    supports an inference.**
27. **Do not claim mathematical or operational 100% accuracy;
    demonstrate correctness through architecture and tests.**

------------------------------------------------------------------------

# 137. Final Architecture Summary

The project should be understood as:

> **A parent-centric, timezone-aware trial-class scheduling system where
> parents choose a local time, the backend converts that intent into an
> exact global instant, dynamically determines which India-based mentors
> can serve that instant, automatically allocates an eligible mentor
> under a two-class daily capacity constraint, and uses PostgreSQL
> transaction/concurrency controls to prevent double booking.**

The essential architecture is:

``` text
React/Vite
    ↓
Timezone-aware parent UX
    ↓
Fastify REST API
    ↓
Temporal domain logic
    ↓
Availability engine
    ↓
Mentor allocation engine
    ↓
Transactional booking service
    ↓
PostgreSQL + tstzrange + GiST
    ↓
Mock notification service
```

The essential temporal model is:

``` text
Parent local date/time
        +
Parent IANA timezone
        ↓
Exact instant
        ↓
Mentor IANA timezone
        ↓
Mentor local date/time
```

The essential consistency model is:

``` text
Frontend availability
        ↓
Backend revalidation
        ↓
Transactional booking
        ↓
Database exclusion constraint
```

The essential customer model is:

``` text
Parent chooses WHEN
System chooses WHO
Database decides WHETHER the booking can safely exist
```

The essential engineering goal is:

> **Make the complicated global scheduling logic invisible to the parent
> while making the underlying system deterministic, testable,
> timezone-correct, and concurrency-safe.**

------------------------------------------------------------------------

# 138. Documents This Research Should Feed

This file should be treated as the research/architecture source for:

``` text
README.md
TRANSCRIPT.md
database schema
API specification
frontend implementation
backend implementation
test plan
deployment configuration
```

The coding agent should read this document before implementing the
booking domain.

If a later implementation decision contradicts this document, the
developer should explicitly document the change and its reason rather
than silently diverging.

------------------------------------------------------------------------

# 139. Research References

The original research file supplied for this project contains the
detailed source list. Key references include:

-   TC39 Temporal documentation.
-   RFC 9557 / IXDTF.
-   PostgreSQL Range Types documentation.
-   Google Calendar FreeBusy API documentation.
-   Calendly timezone documentation.
-   Cal.com public repository/research.
-   Vitest timer documentation.
-   Fastify documentation.
-   Acuity scheduling documentation.
-   Related scheduling-platform research.

The original source report should remain available alongside this
project research document for detailed citation and verification.

------------------------------------------------------------------------

# 140. End State

The implementation should ultimately demonstrate that the system can
answer the following question correctly:

> **"A parent in any supported timezone asks for a trial class at a
> particular local time. Can Codeyoung safely provide that class, which
> mentor should conduct it, what exact moment will it occur globally,
> what will each participant see locally, and what happens if another
> parent tries to book the same limited resource at the same moment?"**

The architecture defined in this document provides the complete
engineering model for answering that question.
