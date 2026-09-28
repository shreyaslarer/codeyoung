# Codeyoung Trial-Class Booking System

> Production-oriented trial-class scheduling system focused on timezone correctness, automatic mentor allocation, capacity enforcement, and concurrency-safe booking.

[![Frontend](https://img.shields.io/badge/Frontend-React-blue)](#technology-stack)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](#technology-stack)
[![Language](https://img.shields.io/badge/Language-TypeScript-blue)](#technology-stack)
[![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen)](#technology-stack)
[![Scheduling](https://img.shields.io/badge/Scheduling-IANA%20Timezones-purple)](#timezone-and-dst-correctness)

## Prototype

**Complete project prototype:**  
[View the Codeyoung Trial-Class Booking System Prototype](https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk)

---

## 1. Project Overview

The Codeyoung Trial-Class Booking System is a customer-facing scheduling application for booking trial classes without requiring a parent to understand mentor schedules, timezone offsets, or internal capacity constraints.

The central product rule is:

> **The parent chooses WHEN. The system chooses WHO.**

A parent selects a preferred date and time in their own timezone. The system determines whether an eligible mentor can conduct the class, automatically assigns a mentor, enforces the mentor's daily capacity, creates the booking, and communicates the appointment in the correct local time for each participant.

The engineering problem is therefore larger than rendering a calendar. The system must preserve scheduling invariants while translating between local wall-clock times and a single globally meaningful appointment instant.

### Core engineering concerns

1. **Temporal correctness**
2. **Availability computation**
3. **Automatic resource allocation**
4. **Concurrency and double-booking prevention**
5. **Customer-friendly scheduling UX**

---

## 2. Assignment Requirements

The implementation is designed around the stated assignment requirements:

| Requirement | System behavior |
|---|---|
| React frontend | Customer-facing booking experience |
| Node.js backend | API and scheduling domain |
| TypeScript | Typed application code |
| 10 mentors | Mentor pool |
| ~20 parents/day | Low-volume booking workload |
| Parent selects time | Parent controls preferred appointment time |
| Automatic mentor assignment | Backend selects an eligible mentor |
| Different timezones | IANA timezone-aware scheduling |
| Local-time communication | Parent and mentor see their respective local times |
| DST handling | Timezone rules are treated as scheduling logic |
| Maximum 2 demos/mentor/day | Local-calendar-day capacity |
| No availability | Explicit business-state handling |
| Dummy class link | Generated booking/class URL |
| Production-quality design | Validation, revalidation, idempotency, concurrency handling, testing and observability |

---

## 3. Why This Is More Than a Calendar

A basic calendar answers:

> "What times can I display?"

A scheduling system must answer:

> "Can this exact appointment safely exist, and which mentor should own it?"

The system follows this temporal model:

```text
Parent local date/time
        +
Parent IANA timezone
        |
        v
Exact appointment instant
        |
        v
Mentor-local date/time
```

For example, a parent may select:

```text
10:00 AM — Europe/London
```

while the assigned mentor sees the same appointment as:

```text
2:30 PM — Asia/Kolkata
```

These are not two appointments. They are two local representations of the same instant.

The exact instant is therefore the authoritative scheduling identity.

---

## 4. Key Differentiators

### 4.1 Parent chooses WHEN, system chooses WHO

The parent is not asked to understand:

- mentor availability
- mentor capacity
- mentor timezone
- internal allocation rules
- UTC offsets
- database state

The customer journey remains:

```text
Choose date
   ↓
Choose time
   ↓
Enter details
   ↓
Book
```

The backend handles mentor selection and scheduling constraints.

### 4.2 IANA timezone model

Timezone identity is represented using IANA identifiers such as:

```text
Europe/London
America/New_York
Asia/Kolkata
```

Fixed offsets are not used as the domain identity because offsets alone cannot represent daylight-saving rules.

### 4.3 Exact-instant booking model

The scheduling domain distinguishes between:

- recurring/local schedule information
- user-local appointment representation
- exact appointment instant

Conceptually:

```text
Local time + timezone
        ↓
Zoned date/time
        ↓
Exact instant
```

This prevents formatted local strings from becoming the source of truth.

### 4.4 DST-aware scheduling

The design explicitly accounts for:

**Nonexistent local times**

A spring-forward transition can remove a range of local times.

**Ambiguous local times**

A fall-back transition can repeat a range of local times.

These cases must be resolved deliberately rather than assuming every local clock value maps to exactly one instant.

### 4.5 Deterministic mentor allocation

Mentor eligibility is based on:

```text
Within working hours
AND
No overlapping booking
AND
Daily booking count < 2
```

When multiple mentors are eligible:

```text
Least-booked eligible mentor
        +
Deterministic tie-breaker
```

This avoids random or arbitrary assignment.

### 4.6 Availability is not reservation

A slot returned by the availability API is not a reservation.

The booking endpoint must:

```text
Validate
   ↓
Revalidate
   ↓
Allocate
   ↓
Commit atomically
```

This distinction is critical because another user can book a slot after it was displayed.

### 4.7 Idempotent booking

Booking requests can be retried because of:

- network failures
- browser retries
- client-side retries
- proxy retries

An idempotency key is therefore used by the design to prevent the same logical booking request from creating duplicate state.

### 4.8 Graceful conflict recovery

If a selected slot becomes unavailable between availability lookup and booking, the system treats this as a business conflict rather than a generic server failure.

The expected behavior is:

```text
409 Conflict
      ↓
Refresh availability
      ↓
Preserve recoverable user input
      ↓
Let the parent select another slot
```

---

## 5. Booking Architecture

```text
                    ┌──────────────────────┐
                    │      React UI        │
                    │ Date / Time / Form   │
                    └──────────┬───────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌──────────────────────┐
                    │   Express API        │
                    │ Validation / Errors  │
                    └──────────┬───────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │ Scheduling / Domain Logic│
                 │                          │
                 │ • Timezone conversion    │
                 │ • Availability           │
                 │ • Capacity               │
                 │ • Mentor allocation      │
                 │ • Conflict checks        │
                 └────────────┬─────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │      MongoDB         │
                    │ Mentors / Bookings   │
                    │ Indexes / Invariants │
                    └──────────────────────┘
```

### Responsibility boundaries

**Frontend**

- collect user intent
- detect/display timezone
- request availability
- display local slots
- validate form input for UX
- submit the selected exact instant
- handle loading, success, conflict and empty states

**Backend**

- authoritative validation
- timezone normalization
- availability calculation
- mentor eligibility
- capacity enforcement
- mentor allocation
- booking transaction
- idempotency
- class-link generation
- notifications

**Database**

- persistent state
- booking records
- mentor records
- indexes
- consistency boundary

---

## 6. Availability Engine

The availability algorithm follows a single authoritative pipeline:

```text
Parent date + timezone
        ↓
Generate candidate local slots
        ↓
Convert each candidate to exact instant
        ↓
Convert instant into mentor timezone
        ↓
Check mentor working hours
        ↓
Check booking overlap
        ↓
Check daily capacity
        ↓
Keep slot if an eligible mentor exists
        ↓
Return parent-local slot representation
```

### Slot interval semantics

The system uses half-open intervals:

```text
[start, end)
```

Therefore:

```text
09:00 ───── 09:30
09:30 ───── 10:00
```

are adjacent rather than overlapping.

---

## 7. Mentor Allocation

The system does not simply choose the first mentor and then check whether the mentor is usable.

Eligibility is calculated first.

```text
                 Candidate Mentor
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Working hours   No overlap   < 2/day
          │            │            │
          └────────────┼────────────┘
                       ▼
                Eligible mentor
                       │
                       ▼
             Least-booked mentor
                       │
                       ▼
             Deterministic tie-break
```

This makes allocation predictable and testable.

### Daily capacity

The assignment rule is:

> Maximum two demo classes per mentor per local calendar day.

This is **not** implemented as a rolling 24-hour window.

For the prototype assumptions, the mentor timezone is `Asia/Kolkata`.

---

## 8. Timezone and DST Correctness

Timezone handling is treated as domain logic.

### Parent timezone

The browser timezone can be detected initially using the browser's IANA timezone information.

However:

> **Browser detection is a default, not an absolute source of truth.**

The parent can explicitly select a timezone, and the explicitly selected timezone becomes authoritative.

### Mentor timezone

Each mentor has a configured timezone.

The prototype uses:

```text
Asia/Kolkata
```

### Conversion model

```text
Parent wall-clock intent
        ↓
Parent timezone
        ↓
Exact instant
        ↓
Mentor timezone
        ↓
Mentor local appointment time
```

### DST cases

The design explicitly considers:

- spring-forward gaps
- fall-back repeated times
- timezone database changes
- local-day boundaries

The system should never hardcode a timezone offset as a substitute for timezone rules.

---

## 9. Concurrency and Double-Booking Protection

Availability is inherently race-prone.

Example:

```text
User A requests availability ──┐
                               │
User B requests availability ──┤
                               ▼
                         Same slot shown
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
              User A books              User B books
                  │                         │
                  ▼                         ▼
              Revalidate                 Revalidate
                  │                         │
                  ▼                         ▼
               Success                  Conflict
```

The authoritative booking operation must therefore re-check current database state.

The design uses:

- server-side revalidation
- transactional booking behavior
- database-level constraints/indexing where applicable
- deterministic mentor selection
- conflict status handling
- idempotency keys

The important invariant is:

> **The UI can suggest availability; only the authoritative booking operation can create a reservation.**

---

## 10. Idempotency

A booking request can contain an idempotency key representing the logical operation.

Conceptually:

```text
POST /api/bookings
Idempotency-Key: <unique-request-key>
```

If the same request is retried, the system should recognize it instead of creating duplicate booking state.

This protects against duplicate submissions caused by unreliable networks or repeated client requests.

---

## 11. API Surface

### Get availability

```http
GET /api/availability?date=2026-09-30&timezone=Europe/London
```

Conceptual response:

```json
{
  "date": "2026-09-30",
  "timezone": "Europe/London",
  "slots": [
    {
      "instant": "2026-09-30T09:00:00Z",
      "localTime": "10:00"
    }
  ]
}
```

### Create booking

```http
POST /api/bookings
```

Conceptual request:

```json
{
  "parentName": "John Doe",
  "parentEmail": "john@example.com",
  "parentTimezone": "Europe/London",
  "slotInstant": "2026-09-30T09:00:00Z",
  "idempotencyKey": "unique-request-key"
}
```

The backend then:

1. validates the request
2. resolves the appointment instant
3. finds eligible mentors
4. checks current conflicts
5. checks daily capacity
6. assigns a mentor
7. commits the booking
8. generates a dummy class link
9. triggers confirmation/assignment notification behavior

---

## 12. Error Model

The API distinguishes validation errors from business conflicts.

| Status | Meaning |
|---|---|
| `400` | Invalid request |
| `422` | Semantically invalid input |
| `409` | Slot/resource conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected server failure |

### Important distinction

"No mentors are available" is a normal scheduling business state.

It should not be presented to the parent as:

```text
500 Internal Server Error
```

Likewise, a slot that was booked moments earlier should be represented as a conflict and handled by refreshing availability.

---

## 13. Data Model

The design centers on two primary domain entities:

### Mentor

Typical responsibilities/data include:

- mentor identity
- timezone
- working schedule
- active/inactive state
- booking relationships

### Booking

A booking contains information such as:

```text
mentorId
parentName
parentEmail
startTime
endTime
parentTimezone
status
idempotencyKey
createdAt
updatedAt
```

The booking model should support indexes for mentor/time-based lookup and idempotency.

Conceptual MongoDB index:

```text
mentorId + startTime + endTime
```

This supports efficient conflict-oriented queries.

---

## 14. Frontend Experience

The intended customer journey is deliberately minimal:

```text
Timezone
   ↓
Date
   ↓
Available local times
   ↓
Parent details
   ↓
Confirmation
```

### UI states

The interface explicitly accounts for:

**Initial**

```text
Loading booking options...
```

**Availability loading**

```text
Finding available trial times...
```

**Available**

```text
09:00 AM
09:30 AM
10:00 AM
```

**No availability**

```text
No trial slots available for this date.
Try another date.
```

**Booking**

```text
Confirming your trial class...
```

**Success**

```text
Trial class confirmed.
```

**Conflict**

```text
That slot was just booked.
Available times have been refreshed.
```

**Validation**

```text
Please enter a valid email address.
```

**Unexpected failure**

```text
We couldn't complete the booking right now.
Please try again.
```

### UX principles

The design intentionally avoids:

- mentor selection
- UTC exposure
- unnecessary configuration
- dashboard-heavy layouts
- decorative UI without purpose
- technical backend errors
- false success states

The parent should understand the scheduling task immediately.

---

## 15. Notifications and Class Link

The prototype architecture separates notification behavior behind an email-service abstraction.

A mock email service can demonstrate:

### Parent confirmation

```text
Subject:
Your Codeyoung Trial Class is Confirmed

Date:
September 30, 2026

Time:
10:00 AM
Europe/London

Class:
https://example.com/class/<booking-id>
```

### Mentor assignment

```text
Subject:
New Trial Class Assigned

Date:
September 30, 2026

Time:
2:30 PM
Asia/Kolkata

Parent:
John Doe

Parent Email:
john@example.com

Class:
https://example.com/class/<booking-id>
```

No external video provider is required for the prototype.

---

## 16. Technology Stack

The engineering specifications define the following implementation direction:

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js |
| API | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| ODM | Mongoose |
| Validation | Zod |
| Scheduling | IANA timezone model / Temporal-oriented approach |
| Testing | Vitest/Jest-oriented test strategy |
| Architecture | MERN-style full-stack application |

The implementation should keep domain logic independent from presentation concerns wherever practical.

---

## 17. Engineering Principles

### Single source of truth for scheduling logic

Availability logic should not be duplicated across React, routes, repositories and notification code.

### Thin route handlers

Routes should primarily:

```text
validate input
→ call domain/service logic
→ map result to HTTP response
```

### Server is authoritative

Client-side validation improves UX.

It does not establish booking correctness.

### Deterministic behavior

Given the same scheduling state and inputs, allocation should behave predictably.

### Explicit business rules

Important rules should be visible in domain logic rather than hidden inside UI conditions.

### Test invariants, not implementation details

Tests should prove rules such as:

```text
A mentor cannot exceed 2 bookings/day.
An overlapping booking is rejected.
Adjacent slots do not overlap.
The selected timezone overrides browser timezone.
A lower-load eligible mentor is preferred.
A concurrent booking produces a conflict.
The same idempotency key does not create duplicate state.
```

---

## 18. Security and Privacy

The booking endpoint is public-facing, so input validation and abuse protection are relevant.

The design calls for:

- server-side schema validation
- controlled error responses
- rate limiting for public booking requests
- no secret exposure
- controlled logging
- minimal personal data collection

The core parent data is limited to what the booking flow needs:

```text
Parent name
Parent email
Timezone
Booking information
```

Technical logs should avoid unnecessary PII.

---

## 19. Testing Strategy

The critical test matrix includes:

| Area | Cases |
|---|---|
| Timezone | London, New York, Kolkata |
| DST | Spring-forward, fall-back |
| Availability | Available, unavailable |
| Capacity | 0, 1, 2 bookings |
| Allocation | Unequal loads, ties |
| Conflict | Overlapping, adjacent |
| Concurrency | Simultaneous booking attempts |
| Retry | Same idempotency key |
| Validation | Invalid inputs |
| API | Success, conflict, validation, rate-limit and server-error paths |
| Notifications | Parent-local and mentor-local time |

Example test names should describe the business rule:

```text
does not expose a slot when all mentors reached daily capacity

assigns a lower-load mentor when multiple mentors are eligible

uses the explicitly selected timezone over the browser timezone

returns 409 when the selected slot is booked concurrently
```

---

## 20. Production-Oriented Engineering Loop

The engineering approach for this project follows:

```text
Understand
   ↓
Model
   ↓
Challenge assumptions
   ↓
Design
   ↓
Implement
   ↓
Test
   ↓
Review
   ↓
Simplify
```

The goal is not maximum code volume.

The goal is:

- correctness
- clarity
- maintainability
- observability
- security
- testability
- appropriate simplicity

---

## 21. Prototype Assumptions

Some values are implementation assumptions rather than confirmed business policy.

| Item | Prototype assumption |
|---|---|
| Database | MongoDB + Mongoose |
| Backend | Express.js + Node.js |
| Trial duration | 30 minutes |
| Slot interval | 30 minutes |
| Mentor timezone | Asia/Kolkata |
| Mentor working hours | 09:00–18:00 IST |
| Daily capacity | 2 demos/mentor/day |
| Parent timezone | Browser detection + manual override |
| Allocation | Least-booked eligible mentor |
| Tie-breaking | Stable deterministic ordering |
| Email | Mock/console notification |
| Class provider | Dummy URL |
| Authentication | Not required for prototype |
| Calendar integration | Not required |
| Admin dashboard | Not required |

These assumptions should not be interpreted as permanent Codeyoung product policy.

---

## 22. Scope Boundaries

The prototype intentionally focuses on the core scheduling problem.

### Included

- Parent booking flow
- Timezone-aware availability
- DST-aware scheduling model
- Mentor availability
- Mentor capacity
- Automatic mentor assignment
- Booking conflict protection
- Idempotent booking design
- Dummy class link
- Confirmation/notification abstraction
- Validation and error handling

### Outside prototype scope

- Real payment processing
- Real Zoom/Google Meet integration
- Full authentication/authorization system
- Calendar provider synchronization
- Admin scheduling dashboard
- Complex holiday/leave management
- Mentor self-service schedule management
- Production email provider credentials

Keeping these boundaries explicit prevents unnecessary complexity from entering the assignment implementation.

---

## 23. Future Extensions

The architecture can be extended with:

- Google Calendar/Microsoft Calendar integration
- Real email provider
- Real video-meeting provider
- Mentor-specific schedules
- Holidays and exceptions
- Mentor leave/overrides
- Authentication and role-based access
- Admin dashboard
- Booking cancellation/rescheduling
- Audit history
- Analytics
- Notification retry queues
- Distributed locking/stronger reservation infrastructure for higher scale

These are extensions rather than requirements for the core prototype.

---

## 24. Engineering Trade-offs

### MongoDB

MongoDB fits the prototype's document-oriented data model and the JavaScript/TypeScript ecosystem.

The application still needs explicit application-level conflict logic and appropriate indexes because MongoDB does not automatically turn a basic document model into a complete scheduling constraint system.

### Mock notifications

A mock email service keeps local evaluation deterministic and avoids requiring third-party API credentials.

The abstraction allows a real provider to be added later.

### Automatic allocation

Automatic mentor assignment reduces customer decision-making and centralizes fairness/capacity logic in the backend.

### Dynamic availability

Availability is calculated from current scheduling state rather than treating a pre-generated static slot list as authoritative.

---

## 25. Definition of Done

The system should be considered complete only when:

- the complete parent booking journey works
- parent-local time is clear
- timezone selection is understandable
- available slots are easy to scan
- selected state is obvious
- contact validation works
- booking success is shown only after server confirmation
- no-availability is handled gracefully
- conflict recovery refreshes availability
- mentor allocation follows the documented rule
- daily capacity is enforced
- overlapping bookings are prevented
- timezone conversions are correct
- DST cases are covered by tests
- retry/idempotency behavior is handled
- sensitive information is not exposed in logs
- the application can be tested deterministically

---

## 26. Project Documentation

The project was designed from dedicated engineering and product research covering:

- scheduling architecture
- timezone and DST behavior
- availability algorithms
- mentor allocation
- concurrency
- idempotency
- API contracts
- data modeling
- UX states
- testing strategy
- security/privacy considerations
- production engineering standards

The repository's implementation should remain aligned with those documented decisions, and any deliberate deviation should be documented with its reason.

---

## 27. Quick Evaluation Checklist

An evaluator can inspect the project through these questions:

### Product

- Can a parent book without choosing a mentor?
- Does the parent see local time?
- Is the timezone visible and controllable?
- Is no-availability handled cleanly?

### Scheduling

- Is the selected local time converted to an exact instant?
- Is the mentor's timezone respected?
- Are DST edge cases considered?
- Is the daily capacity based on the correct local day?

### Backend

- Is availability calculated on the server?
- Is booking revalidated?
- Is mentor allocation deterministic?
- Are validation and errors structured?

### Reliability

- Can two users safely compete for the same slot?
- Can a network retry create a duplicate booking?
- Does a stale slot return a conflict rather than false success?

### Engineering

- Is the scheduling logic centralized?
- Are domain rules testable?
- Are responsibilities separated?
- Are assumptions documented?
- Is unnecessary complexity avoided?

---

## 28. Submission Prototype

The complete visual/functional prototype is available here:

**[Open Project Prototype](https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk)**

---

## 29. Final Architecture Summary

```text
                    PARENT
                      │
                      │ local date/time
                      ▼
             ┌─────────────────┐
             │  React Client   │
             └────────┬────────┘
                      │
                      │ availability
                      ▼
             ┌─────────────────┐
             │  Express API    │
             └────────┬────────┘
                      │
                      ▼
          ┌─────────────────────────┐
          │ Scheduling Domain       │
          │                         │
          │ Timezone → Instant      │
          │ Availability            │
          │ Capacity                │
          │ Allocation              │
          │ Revalidation            │
          │ Idempotency             │
          └────────────┬────────────┘
                       │
                       ▼
              ┌────────────────┐
              │    MongoDB     │
              │                │
              │ Mentors        │
              │ Bookings       │
              │ Indexes        │
              └────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Confirmation   │
              │ + Class Link   │
              └────────────────┘
```

### Core invariant

> **Parent chooses WHEN → system determines WHO → database determines WHETHER the booking can safely exist.**

---

## License

This project was created as part of the Codeyoung full-stack engineering assignment/prototype. Add the repository's intended license here if one is required for submission.
