# Codeyoung Trial-Class Booking System

> A production-oriented trial-class scheduling platform with timezone-aware booking, automatic mentor assignment, Google Calendar integration, and role-based management dashboards.

**Prototype:** [View the complete project prototype](https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk)

---

## Overview

The system allows parents to book a trial class by selecting a convenient date and time in their own timezone.

The platform automatically:

- calculates real mentor availability
- handles timezone conversion and DST
- assigns an eligible mentor
- enforces the **2-demo-classes-per-mentor-per-day** limit
- prevents conflicting bookings
- generates the class link
- allows the appointment to be added to Google Calendar
- provides management dashboards for mentors and company/admin users

### Core product rule

> **Parent chooses WHEN → System chooses WHO → Database validates WHETHER the booking can exist.**

---

## Key Technical Features

### 1. Timezone-Aware Scheduling

The system treats timezone as scheduling data rather than simple UI formatting.

```text
Parent local date/time
        +
IANA timezone
        ↓
Exact appointment instant
        ↓
Mentor local date/time
```

Supported timezone identities use IANA identifiers such as:

```text
Europe/London
America/New_York
Asia/Kolkata
```

The browser timezone is used as the initial suggestion, while an explicitly selected timezone becomes authoritative.

---

### 2. DST-Safe Booking

The scheduling model accounts for daylight-saving transitions, including:

- nonexistent local times during spring-forward
- repeated/ambiguous local times during fall-back

This prevents a local clock value from being incorrectly treated as a universally valid appointment time.

---

### 3. Dynamic Availability Engine

Availability is calculated from the current scheduling state:

```text
Parent date + timezone
        ↓
Candidate local slots
        ↓
Exact instants
        ↓
Mentor-local time
        ↓
Working-hours check
        ↓
Booking-overlap check
        ↓
Daily-capacity check
        ↓
Available slot
```

The frontend does not decide whether a slot is truly bookable.

---

### 4. Automatic Mentor Assignment

Parents never need to select a mentor.

A mentor is eligible when:

```text
Within working hours
AND
No overlapping booking
AND
Daily bookings < 2
```

When multiple mentors are eligible, the system uses:

```text
Least-booked eligible mentor
+
Deterministic tie-breaker
```

This makes allocation predictable and avoids arbitrary mentor selection.

---

### 5. Concurrency-Safe Booking

Availability is only a snapshot.

Before creating a booking, the backend revalidates the selected slot against current database state.

```text
Availability
     ↓
User selects slot
     ↓
Backend revalidation
     ↓
Mentor allocation
     ↓
Transactional booking
     ↓
Confirmation
```

If another user claims the slot first, the booking request is handled as a conflict rather than returning a false success.

---

### 6. Idempotent Booking

Booking requests support an idempotency key so that network retries or repeated submissions do not unintentionally create duplicate bookings.

---

### 7. Google Calendar Integration

After successful booking, the appointment can be added to **Google Calendar**.

The calendar event is based on the confirmed appointment rather than the originally displayed local slot, ensuring that the scheduled event represents the correct appointment time.

---

### 8. Management Dashboards

The platform includes management interfaces beyond the parent booking flow.

#### Mentor Dashboard

Mentors can view relevant assigned trial-class information, including:

- upcoming classes
- assigned parents
- appointment details
- schedule-related information

#### Company/Admin Dashboard

The management side provides visibility into the booking system, including:

- total registered parents
- booking information
- mentor assignments
- scheduling/availability information
- overall booking activity

This turns the project from a simple booking form into a complete scheduling and management workflow.

---

## System Architecture

```text
                         ┌─────────────────────┐
                         │      Parent UI       │
                         │ Date / Time / Form   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Backend API      │
                         │ Validation / Auth   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │     Scheduling Domain       │
                    │                             │
                    │ Timezone / DST              │
                    │ Availability                │
                    │ Capacity                    │
                    │ Mentor Allocation            │
                    │ Conflict Protection         │
                    │ Idempotency                 │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │      MongoDB        │
                         │ Mentors / Bookings  │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴──────────────┐
                    ▼                              ▼
          ┌──────────────────┐          ┌──────────────────┐
          │ Google Calendar  │          │ Management       │
          │ Integration      │          │ Dashboards       │
          └──────────────────┘          └──────────────────┘
```

---

## Booking Flow

```text
Parent opens booking page
        ↓
Timezone detected
        ↓
Parent confirms timezone
        ↓
Select date
        ↓
Fetch availability
        ↓
Select local time
        ↓
Enter parent details
        ↓
Submit booking
        ↓
Backend revalidates
        ↓
Assign mentor
        ↓
Create booking
        ↓
Generate class link
        ↓
Google Calendar option
        ↓
Confirmation
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js + Express.js |
| Language | TypeScript |
| Database | MongoDB |
| ODM | Mongoose |
| Validation | Zod |
| Scheduling | IANA timezone model / Temporal-oriented approach |
| Calendar | Google Calendar integration |
| Architecture | MERN-style full-stack application |

---

## Data Model

The core scheduling domain revolves around:

### Mentors

Stores mentor scheduling and assignment information, including timezone and availability-related data.

### Bookings

A booking represents the authoritative appointment:

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

Indexes support efficient mentor/time-based booking queries and conflict detection.

---

## API Design

### Availability

```http
GET /api/availability?date=2026-09-30&timezone=Europe/London
```

Returns bookable appointment instants represented in the parent's selected timezone.

### Booking

```http
POST /api/bookings
```

The backend validates:

- parent information
- timezone
- selected instant
- mentor availability
- booking overlap
- daily capacity
- idempotency

Only after these checks is the booking committed.

---

## Error Handling

The system distinguishes technical failures from normal scheduling states.

| Status | Meaning |
|---|---|
| `400` | Invalid request |
| `422` | Validation/business input error |
| `409` | Slot/resource conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected server failure |

For example, if a slot was booked moments before the parent submitted the form:

```text
409 Conflict
      ↓
Refresh availability
      ↓
Parent selects another slot
```

---

## Cross-Timezone Validation

The scheduling behavior was also validated using a UK VPN environment to simulate a different geographic context.

The booking flow, timezone conversion, availability calculation, mentor assignment, and booking behavior were tested under the UK-region environment and operated correctly.

This provided an additional real-world validation layer beyond local development testing.

---

## Engineering Decisions

### Parent chooses time

The system hides mentor allocation complexity from the customer.

### Exact instants are authoritative

Local times are representations. The booking itself is tied to an exact point in time.

### Backend is authoritative

Frontend availability is never treated as a reservation.

### Deterministic allocation

Mentor selection is predictable and testable.

### Explicit timezone identity

IANA timezone identifiers are used instead of hardcoded UTC offsets.

### Capacity is local-day based

The maximum of two demo classes is evaluated against the mentor's relevant local calendar day rather than a rolling 24-hour period.

### Idempotency

Repeated requests do not unintentionally create duplicate bookings.

---

## Security & Reliability

The system is designed with:

- server-side input validation
- controlled API errors
- public-endpoint rate limiting considerations
- idempotent booking requests
- conflict revalidation
- controlled logging
- minimal required parent information
- database-backed booking state

The database remains the final consistency boundary.

---

## Testing Focus

Critical scheduling scenarios include:

```text
✓ Multiple timezones
✓ DST transitions
✓ Available / unavailable slots
✓ 0 / 1 / 2 mentor bookings
✓ Mentor allocation
✓ Overlapping bookings
✓ Adjacent slots
✓ Concurrent booking attempts
✓ Repeated booking requests
✓ Invalid timezone/input
✓ Parent-local confirmation
✓ Mentor-local appointment representation
✓ Google Calendar event creation
```

---

## Scope

### Implemented

- Parent trial-class booking
- Timezone-aware availability
- DST-aware scheduling
- Automatic mentor assignment
- Mentor daily capacity
- Conflict protection
- Idempotent booking
- Google Calendar integration
- Dummy/generated class link
- Mentor dashboard
- Company/admin management dashboard
- Booking and parent visibility
- Cross-region testing

### Prototype / Future Extensions

Possible future extensions include:

- real calendar synchronization in both directions
- mentor leave and holiday management
- booking cancellation/rescheduling
- advanced analytics
- notification queues
- authentication/role expansion
- additional calendar providers

---

## Project Differentiation

This project is intentionally designed as a **scheduling system**, not just a booking form.

The core engineering model is:

```text
Local user intent
       ↓
Timezone normalization
       ↓
Exact appointment instant
       ↓
Dynamic availability
       ↓
Automatic mentor allocation
       ↓
Concurrency-safe booking
       ↓
Calendar + class-link confirmation
       ↓
Management visibility
```

This keeps the user experience simple while moving the scheduling complexity into a controlled backend domain.

---

## Prototype

**[Open the complete project prototype →](https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk)**

---

## License

Created as part of the Codeyoung full-stack engineering assignment/prototype.
