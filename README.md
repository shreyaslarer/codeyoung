# CodeYoung — Trial Class Scheduling

> **A production-style scheduling feature built for CodeYoung that turns a parent's local time preference into a validated booking, automatically selects an eligible mentor, and keeps the entire experience timezone-aware and conflict-safe.**

---

## What is this?

This repository contains a **trial-class scheduling feature developed within CodeYoung**.

The feature is built around a simple customer experience:

> **The parent chooses the time. The system chooses the mentor.**

What looks like a simple "pick a time and book" flow actually requires the system to solve several engineering problems at the same time:

- Different users can be in different timezones.
- Local date/time must be converted into an exact appointment instant.
- Mentor working hours must be evaluated in the mentor's timezone.
- Each mentor has a daily trial-class limit.
- Multiple mentors may be able to conduct the same time slot.
- Two parents may attempt to book the same limited resource simultaneously.
- Availability shown to the browser can become stale before booking.
- The parent should never have to understand any of this complexity.

This project implements that scheduling flow end-to-end, including the **parent booking experience, backend scheduling domain, MongoDB persistence, automatic mentor allocation, booking conflict handling, confirmation experience, calendar actions, canonical class links, and mentor dashboard**.

---

## Why this project is technically interesting

The difficult part of a scheduling product is not rendering a calendar.

The difficult part is maintaining one consistent appointment when:

```text
Parent local time
        ↓
IANA timezone
        ↓
Exact instant
        ↓
Mentor-local time
        ↓
Availability
        ↓
Mentor allocation
        ↓
Concurrent booking validation
        ↓
Persistent booking
        ↓
Confirmation / mentor view
```

A booking can be correct from the parent's perspective and still be wrong from the mentor's perspective if the temporal model is incorrect.

Likewise, a slot can appear available in the UI and still become unavailable a few milliseconds later because another booking was created first.

The implementation therefore treats **time, availability, allocation, and booking consistency as separate but connected domains**.

---

# Feature at a Glance

| Area | Implementation |
|---|---|
| Product context | CodeYoung |
| Feature | Trial-class scheduling |
| Parent experience | Date → time → details → confirmation |
| Timezone model | IANA timezone identifiers |
| Time handling | Exact appointment instants |
| Trial duration | 30 minutes |
| Mentor pool | 10 production mentors |
| Mentor selection | Automatic |
| Allocation strategy | Least-booked eligible mentor + deterministic tie-break |
| Mentor daily limit | 2 confirmed trials per mentor-local calendar day |
| Availability | Backend-driven |
| Booking authority | Backend + database |
| Conflict response | HTTP 409 |
| Duplicate protection | Idempotency-Key |
| Persistence | MongoDB + Mongoose |
| Backend | Node.js + Express + TypeScript |
| Frontend | Next.js + React + TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Testing | Vitest / project test suite |
| Mentor interface | Mentor dashboard |
| Class link | Canonical booking class URL |
| Calendar actions | Google Calendar + `.ics` |
| Development documentation | Research, design, coding, prompt, transcript, setup |

---

# 1. The Product Problem

CodeYoung's trial-class journey needs to answer a deceptively difficult question:

> **"If a parent asks for a trial class at a particular local time, can the system safely provide that appointment, which mentor should handle it, and what exact time should everyone see?"**

The parent should only need to think about their own preferred time.

The system handles:

- timezone conversion,
- mentor working hours,
- mentor capacity,
- existing bookings,
- mentor eligibility,
- automatic allocation,
- booking conflicts,
- idempotent retries, and
- consistent appointment communication.

### Parent controls

```text
Date
Time
Timezone
Parent details
```

### System controls

```text
Mentor eligibility
Mentor selection
Working hours
Existing bookings
Daily capacity
Conflict validation
Booking persistence
Class-link generation
```

This separation is one of the central design decisions of the feature.

---

# 2. The Booking Journey

The complete parent-facing flow is:

```text
┌───────────────────────┐
│  1. CHOOSE TIME       │
│                       │
│  Timezone             │
│  Date                 │
│  Available times      │
│  Preferred time       │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│  2. PARENT DETAILS    │
│                       │
│  Required information │
│  Validation           │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│  3. CONFIRMATION      │
│                       │
│  Appointment details  │
│  Google Calendar      │
│  .ics file             │
│  Copy class link      │
│  Book another         │
└───────────────────────┘
```

The parent never has to select a mentor.

---

# 3. Timezone-Aware Scheduling

Timezone handling is a first-class part of the feature.

The system uses **IANA timezone identifiers** rather than treating an offset such as `+05:30` as the timezone itself.

Examples:

```text
Asia/Kolkata
Europe/London
America/New_York
```

The core temporal model is:

```text
Parent local date/time
        +
Parent IANA timezone
        ↓
Exact appointment instant
        ↓
Mentor IANA timezone
        ↓
Mentor local date/time
```

This matters around:

- timezone boundaries,
- midnight crossings,
- daylight-saving transitions, and
- different local calendar dates representing the same instant.

The application can detect an apparent timezone and allows the parent to explicitly select a timezone when required. An explicit parent selection takes precedence for the booking session.

The backend performs the authoritative scheduling calculations.

---

# 4. Availability Is Not Booking

One of the important architectural boundaries is:

> **Availability tells us what appears bookable. Booking decides what can actually be committed.**

The frontend may request availability and display:

```text
10:00 AM
Available
```

Another parent can book that resource before the first parent submits.

Therefore:

```text
Availability response
        ↓
Parent selects time
        ↓
Booking request
        ↓
Backend revalidates
        ↓
Allocate mentor
        ↓
Persist booking
```

The browser never gets final authority over whether the booking exists.

---

# 5. Automatic Mentor Allocation

The parent chooses a time, not a mentor.

For a requested appointment, the backend determines which mentors are eligible based on the scheduling rules.

Allocation considers:

- mentor working hours,
- mentor timezone,
- existing overlapping bookings,
- mentor-local daily capacity, and
- the requested appointment instant.

Among eligible mentors, the implementation uses:

```text
Least-booked eligible mentor
        ↓
Deterministic stable-ID tie-break
```

This makes allocation predictable and keeps mentor selection out of the frontend.

---

# 6. Mentor Capacity

The feature supports **10 production mentors**.

Each mentor can conduct a maximum of:

```text
2 confirmed trial classes
per mentor-local calendar day
```

This is a **daily mentor limit**, not a limit on how many parents can book the same time.

For example, if ten mentors can independently handle:

```text
10:00 → 10:30
```

multiple parents can be booked at 10:00, with different mentors, until the eligible mentor pool is exhausted.

This distinction is important:

```text
Daily capacity
≠
Simultaneous slot capacity
```

---

# 7. Exact Intervals

The trial duration is:

```text
30 minutes
```

Booking intervals use the half-open convention:

```text
[start, end)
```

Therefore:

```text
10:00 → 10:30
10:30 → 11:00
```

are adjacent but not overlapping.

This removes ambiguity around exact boundary times and is important for reliable availability calculations.

---

# 8. Concurrent Booking Safety

A scheduling system must assume that availability can change between reading and writing.

For example:

```text
Parent A                         Parent B
   │                                │
   │  sees 10:00 available          │
   │                                │
   ├──────────────┐                 │
   │              │                 │
   │              │          sees 10:00 available
   │              │                 │
   ▼              ▼                 ▼
              Submit booking requests
                       │
                       ▼
               Backend validation
                       │
                 ┌─────┴─────┐
                 │           │
              Success      Conflict
                 │           │
                 ▼           ▼
              Booking      HTTP 409
```

The feature therefore does not assume that the availability response is a reservation.

A conflict is treated as a normal business state and communicated to the parent without exposing raw technical errors.

---

# 9. Idempotent Booking

The booking API supports an `Idempotency-Key`.

This protects against accidental duplicate booking attempts caused by:

- double-clicks,
- network retries,
- repeated client requests, and
- transient request failures.

The objective is simple:

> **Retrying the same logical booking request should not unintentionally create another booking.**

---

# 10. Canonical Class Link

The class link belongs to the booking.

Once the booking is created, its canonical class URL is reused by the relevant consumers:

```text
Booking response
      ↓
Parent confirmation
      ↓
Copy Link
      ↓
Google Calendar
      ↓
.ics file
      ↓
Mentor dashboard
```

The frontend does not independently generate a different class URL.

This prevents a subtle but serious consistency problem where the parent and mentor could receive different links for the same booking.

---

# 11. Parent Confirmation

The confirmation screen is designed around the question:

> **"What do I need after successfully booking?"**

It provides the confirmed appointment information and practical next actions:

- Add to Google Calendar
- Download `.ics`
- Copy class link
- Book another session

The confirmation UI was refined so important actions remain close to the primary confirmation information rather than being hidden below a long page.

---

# 12. Mentor Dashboard

The feature also contains a mentor-facing dashboard.

Its purpose is different from the parent booking experience.

The parent needs to answer:

```text
When can I book?
```

The mentor needs to answer:

```text
What trials are assigned to me?
When are they happening?
How do I access the class?
```

The dashboard provides the relevant scheduled booking information and the canonical class link while keeping mentor allocation as a backend concern.

---

# 13. Architecture

```text
                           CodeYoung
                               │
                               │
                 Trial-Class Scheduling Feature
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
          ▼                                         ▼
┌─────────────────────┐                  ┌─────────────────────┐
│  Parent Experience  │                  │  Mentor Dashboard   │
│                     │                  │                     │
│  Timezone           │                  │  Scheduled trials   │
│  Date               │                  │  Booking details    │
│  Availability       │                  │  Appointment time   │
│  Preferred time     │                  │  Class link         │
│  Parent details     │                  │                     │
│  Confirmation       │                  │                     │
└──────────┬──────────┘                  └──────────┬──────────┘
           │                                        │
           └────────────────┬───────────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │   Express REST API  │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Scheduling Domain   │
                  │                     │
                  │ Temporal logic      │
                  │ Availability        │
                  │ Mentor allocation   │
                  │ Booking validation  │
                  │ Idempotency         │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │       MongoDB       │
                  │                     │
                  │ Mentors             │
                  │ Bookings            │
                  │ Scheduling state    │
                  └─────────────────────┘
```

---

# 14. Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
Lucide React
```

## Backend

```text
Node.js
Express
TypeScript
```

## Database

```text
MongoDB
Mongoose
```

## Testing

```text
Vitest
Frontend/API tests
Backend domain/API tests
Integration-oriented scheduling tests
```

The repository's package manifests are authoritative for the exact installed dependency versions.

---

# 15. Frontend Architecture

The frontend follows a clear separation between UI and the backend scheduling domain.

The API boundary is structured around:

```text
React Components
        ↓
API Client
        ↓
API Configuration / Types
        ↓
Backend REST API
```

The frontend is responsible for:

- collecting parent input,
- displaying availability,
- handling UI state,
- submitting booking requests,
- presenting validation/conflict states, and
- displaying confirmation information.

The frontend does **not** become a second copy of the scheduling engine.

It does not decide:

- which mentor should be assigned,
- whether the final booking is valid,
- whether another booking won the race,
- or whether mentor daily capacity has been exceeded.

---

# 16. Backend Architecture

The backend is responsible for the scheduling domain.

Major areas include:

```text
Temporal utilities
        ↓
Mentor domain
        ↓
Availability engine
        ↓
Mentor allocation
        ↓
Booking service
        ↓
REST API
        ↓
MongoDB
```

This separation allows the availability logic, allocation logic, and booking logic to remain independently testable.

---

# 17. Important Domain Boundaries

The implementation deliberately separates concepts that are easy to accidentally combine.

### Availability vs Allocation

```text
Availability:
Can someone serve this appointment?

Allocation:
Which eligible mentor should receive it?
```

### Booking vs Notification

```text
Booking:
State correctness

Notification:
Communication
```

A communication failure should not turn an already-created booking into a fake booking failure.

### Local Time vs Exact Instant

```text
Local time:
What the user means

Exact instant:
What the system books
```

### UI Availability vs Authoritative Booking

```text
UI:
What was available when we checked

Backend:
What can actually be committed now
```

These boundaries are central to the architecture.

---

# 18. User Experience

The frontend was designed as a real scheduling experience rather than a generic CRUD interface.

The design system emphasizes:

- clear hierarchy,
- restrained visual language,
- purposeful spacing,
- readable typography,
- accessible controls,
- responsive behavior,
- clear loading states,
- clear conflict states,
- clear confirmation,
- purposeful animation, and
- reduced-motion support.

The design principle is:

> **Hide system complexity from the parent without hiding useful information.**

The interface does not expose unnecessary internal details such as mentor allocation decisions or internal capacity calculations.

---

# 19. Error Handling

The feature treats errors as part of the product experience.

### No availability

The parent is told that the requested time cannot currently be served and is guided toward another time.

### Booking conflict

The backend returns `409 Conflict` when the requested booking can no longer be created because the relevant availability changed.

### Validation

Invalid or incomplete parent details are presented clearly.

### Loading

Availability and booking operations communicate their processing state.

### Unexpected failure

Technical failures are presented through user-oriented error states rather than raw stack traces or internal implementation messages.

---

# 20. Testing and Verification

The backend QA record for the implemented system reports:

```text
137 / 137 tests passing
```

The reported test coverage was approximately:

```text
99.5% overall
```

The test suite covers the scheduling domain and important edge cases, including:

- timezone conversion,
- IANA timezone handling,
- daylight-saving behavior,
- mentor working hours,
- availability,
- mentor allocation,
- daily capacity,
- overlapping bookings,
- adjacent bookings,
- simultaneous bookings across multiple mentors,
- deterministic allocation,
- idempotency,
- concurrent requests,
- validation,
- HTTP 409 conflicts,
- booking persistence, and
- API behavior.

The project also includes frontend/API integration tests.

### Important note

These figures come from the project's QA/development record. Before a final submission or deployment, the current repository should be tested again from the current code state rather than treating an older report as a permanent guarantee.

---

# 21. Production Mentor Data

The current implementation contains:

```text
10 production mentors
```

The mentors are persisted in MongoDB and participate in the allocation system.

The parent does not select from the mentor list.

Mentor data is an internal scheduling resource used by the backend and mentor-facing dashboard.

---

# 22. What the System Does End-to-End

A successful booking looks like this:

```text
1. Parent opens the scheduling feature
              ↓
2. Timezone is detected / selected
              ↓
3. Parent selects a date
              ↓
4. Backend provides availability
              ↓
5. Parent selects a preferred time
              ↓
6. Parent enters required details
              ↓
7. Frontend submits booking request
              ↓
8. Backend validates the request
              ↓
9. Requested local time becomes an exact instant
              ↓
10. Eligible mentors are determined
              ↓
11. Mentor is allocated automatically
              ↓
12. Booking is persisted
              ↓
13. Canonical class URL is associated with booking
              ↓
14. Confirmation is returned
              ↓
15. Parent can use calendar / class-link actions
              ↓
16. Mentor can view the scheduled trial
```

---

# 23. Repository Structure

A simplified repository structure is:

```text
project-root/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── ...
│
├── backend/
│   ├── src/
│   ├── tests/
│   └── ...
│
├── README.md
├── SETUP.md
├── prompt.md
├── TRANSCRIPT.md
├── project-research.md
├── coding-skill.md
├── design-skill.md
└── ...
```

The exact source tree in the repository is authoritative.

---

# 24. Documentation Included

### `README.md`

High-level project and engineering overview for evaluators and developers.

### `SETUP.md`

Practical instructions for cloning, installing dependencies, configuring the environment, starting required services, running the application, seeding data, and executing tests.

### `project-research.md`

Detailed scheduling research and architecture reasoning.

### `coding-skill.md`

Engineering standards and implementation principles used during development.

### `design-skill.md`

The frontend UI/UX and design-engineering system used for the feature.

### `prompt.md`

Meaningful AI-assisted development prompts used throughout the implementation.

### `TRANSCRIPT.md`

The AI-assisted development record required as part of the assignment context.

The supporting documents provide deeper implementation context without making this README read like a research paper.

---

# 25. Assumptions and Scope

Some scheduling rules were not explicitly defined by the assignment and therefore became implementation assumptions.

The implemented baseline uses:

| Rule | Implementation |
|---|---|
| Trial duration | 30 minutes |
| Scheduling interval | 30 minutes |
| Mentor daily limit | 2 confirmed trials |
| Mentor capacity day | Mentor-local calendar day |
| Mentor allocation | Least-booked eligible mentor |
| Tie-break | Stable deterministic mentor identifier |
| Parent timezone | Automatic detection + explicit selection |
| Class URL | Dummy/canonical booking URL |
| Database | MongoDB |
| Backend | Express |
| Frontend | Next.js |

These assumptions are documented so that an evaluator can distinguish assignment requirements from implementation decisions.

---

# 26. What Is Deliberately Not Being Claimed

This repository is a focused scheduling feature, not a claim to reproduce the complete infrastructure of a commercial scheduling platform.

The feature does not attempt to introduce unnecessary:

- microservices,
- distributed infrastructure,
- production video-conferencing infrastructure,
- enterprise calendar synchronization,
- complex mentor leave management,
- or unrelated CodeYoung platform functionality.

The goal is to implement the required scheduling problem correctly and demonstrate sound engineering decisions around the difficult parts.

---

# 27. Engineering Decisions Worth Reviewing

If you are reviewing this repository from an engineering perspective, the most important areas to inspect are:

### Temporal correctness

Look at how local date/time and IANA timezone information become an exact appointment instant.

### Availability

Look at how mentor eligibility and existing bookings are evaluated.

### Allocation

Look at how the system chooses an eligible mentor without exposing that decision to the parent.

### Booking

Look at how the backend revalidates availability before persistence.

### Conflict handling

Look at how races become `409 Conflict` rather than invalid bookings or generic server errors.

### Idempotency

Look at how repeated booking requests are prevented from creating duplicates.

### Class URL consistency

Look at how one booking produces one canonical class URL used by parent and mentor surfaces.

### Testing

Look at the timezone, capacity, overlap, allocation, idempotency, and concurrency tests.

These are the areas where the scheduling feature moves beyond a basic form-plus-database implementation.

---

# 28. Prototype

The original product prototype is available as an additional visual reference:

**Prototype:**  
https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk

The prototype is supplementary.

The source code is the authoritative representation of the implemented feature.

---

# 29. Setup

Start with:

**[`SETUP.md`](SETUP.md)**

The setup guide contains the practical instructions required to run the repository.

Before submitting the project, the setup procedure should be verified from a clean environment so an evaluator can reproduce the application without relying on the developer's local machine.

---

# 30. A Short Technical Summary

If you only have one minute to understand the project:

```text
CodeYoung
   │
   └── Trial-Class Scheduling Feature
           │
           ├── Parent chooses local date/time
           │
           ├── IANA timezone-aware scheduling
           │
           ├── Backend calculates availability
           │
           ├── System automatically selects mentor
           │
           ├── 2-trial daily mentor limit
           │
           ├── 30-minute half-open intervals
           │
           ├── Backend revalidates before booking
           │
           ├── 409 conflict handling
           │
           ├── Idempotent booking requests
           │
           ├── MongoDB persistence
           │
           ├── Canonical class URL
           │
           ├── Parent confirmation + calendar actions
           │
           ├── Mentor dashboard
           │
           └── Comprehensive scheduling tests
```

---

# 31. Final Perspective

The feature intentionally keeps the user-facing experience simple while putting the complexity where it belongs: inside the scheduling domain.

The core idea is:

```text
                SIMPLE FOR THE PARENT
                         │
                         ▼
              "I want this time."
                         │
                         ▼
              ┌─────────────────┐
              │ Scheduling      │
              │ Domain          │
              │                 │
              │ Timezones       │
              │ Availability    │
              │ Capacity        │
              │ Allocation      │
              │ Conflicts       │
              │ Idempotency     │
              └────────┬────────┘
                       │
                       ▼
              CORRECT BOOKING
```

That is the main engineering objective of this feature:

> **Make global scheduling complexity invisible to the parent while keeping the underlying system deterministic, testable, timezone-aware, and safe against conflicting bookings.**

---

## Built for CodeYoung

**CodeYoung** is the company/product context for this work.

**This repository implements the trial-class scheduling feature within that context.**
