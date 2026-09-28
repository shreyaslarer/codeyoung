# CodeYoung — Trial-Class Scheduling Feature

A timezone-aware trial-class scheduling feature built for **CodeYoung**.

This repository contains the implementation of a scheduling feature within the CodeYoung product ecosystem. Its purpose is to let a parent choose a convenient local date and time for a trial class while the system determines mentor availability, automatically assigns an eligible mentor, prevents conflicting bookings, and communicates the confirmed appointment consistently.

> **Important context:** CodeYoung is the company/product context. The scheduling system described in this repository is a feature developed for CodeYoung; it is not presented as a separate company or as the entirety of CodeYoung's product.

---

## 1. Feature Overview

The feature solves the scheduling problem behind trial-class bookings.

A parent should not need to know:

- which mentor is available,
- where the mentor is located,
- how mentor working hours are configured,
- how many trials a mentor has already handled,
- how timezone conversion works,
- how daylight-saving changes affect an appointment, or
- how concurrent booking conflicts are resolved.

The intended interaction is simple:

```text
Parent chooses WHEN
        ↓
System checks availability
        ↓
System chooses WHO
        ↓
Backend validates and creates the booking
        ↓
Parent receives confirmation
        ↓
Mentor sees the scheduled trial
```

The complexity stays in the scheduling domain rather than being exposed to the parent.

---

## 2. Core Product Model

The central product rule is:

> **Parent chooses WHEN. System chooses WHO.**

The parent selects a date and preferred time in their chosen timezone.

The backend is responsible for:

- interpreting the requested local time,
- converting it to an exact instant,
- checking eligible mentors,
- enforcing mentor working hours,
- checking existing bookings,
- enforcing the daily booking limit,
- selecting a mentor,
- preventing conflicting bookings, and
- creating the final booking.

The frontend does not independently decide which mentor should be assigned.

---

## 3. Main User Journey

### Step 1 — Time

The parent:

1. Opens the trial-class booking experience.
2. Provides or confirms their timezone.
3. Selects a date.
4. Reviews available times.
5. Selects a preferred time.

The interface can use apparent browser/network timezone detection and also supports explicit timezone selection.

The selected timezone is used as the parent's booking-session timezone.

### Step 2 — Parent Details

The parent enters the required information for the trial booking.

The previously selected scheduling information is preserved while the parent completes the form.

### Step 3 — Confirmation

After the backend successfully creates the booking, the parent receives a confirmation containing the appointment details.

The confirmation experience includes the relevant post-booking actions implemented by the feature, including calendar actions and the canonical class link.

---

## 4. Timezone Model

Timezone correctness is a core requirement of the feature.

The system uses **IANA timezone identifiers**, for example:

```text
Asia/Kolkata
Europe/London
America/New_York
```

The system does not treat a raw UTC offset as a timezone identity.

The scheduling model is:

```text
Parent local date/time
        +
Parent IANA timezone
        ↓
Exact appointment instant
        ↓
Mentor IANA timezone
        ↓
Mentor-local date/time
```

This is important because the same exact instant can correspond to different local dates and times in different timezones.

Daylight-saving transitions are also handled through timezone-aware temporal calculations rather than manually adding or subtracting fixed offsets.

### Timezone authority

Browser or network timezone detection is an initial source of information.

If the parent explicitly changes the timezone, that selected timezone takes precedence for the booking session.

The backend remains authoritative for the final booking interpretation and validation.

---

## 5. Availability

Availability answers one question:

> **Can this requested time currently be served by at least one eligible mentor?**

It considers the scheduling rules implemented by the backend, including:

- requested appointment instant,
- mentor timezone,
- mentor working hours,
- existing confirmed bookings,
- overlapping intervals,
- mentor daily booking capacity, and
- mentor eligibility.

The frontend displays the availability returned by the backend.

Availability shown to the parent is not treated as a permanent reservation. A different parent may book the same resource before the current parent submits the booking.

Therefore the booking endpoint performs authoritative validation again.

---

## 6. Mentor Allocation

Mentor allocation is deliberately separated from availability.

### Availability

```text
Can at least one mentor handle this appointment?
```

### Allocation

```text
Which eligible mentor should receive the booking?
```

The parent does not manually choose a mentor.

After validating the requested appointment, the backend determines the eligible mentors and automatically selects one.

The implemented allocation strategy is:

1. Filter mentors who can serve the requested appointment.
2. Consider their existing confirmed bookings.
3. Prefer the least-booked eligible mentor.
4. Use a deterministic stable mentor identifier as the tie-break.

This makes allocation predictable and keeps the decision in the backend.

---

## 7. Mentor Capacity

Each mentor has a maximum of:

```text
2 confirmed trial classes per mentor-local calendar day
```

This daily limit is different from simultaneous time-slot capacity.

For example, if ten mentors are independently available at:

```text
10:00 → 10:30
```

multiple parents can be booked at 10:00 simultaneously, provided eligible mentors remain available.

The daily limit is evaluated using the mentor's local calendar day.

It is not interpreted as a limit of one or two parents for the entire time slot.

---

## 8. Trial Duration and Intervals

The implemented trial duration is:

```text
30 minutes
```

The scheduling model uses half-open intervals:

```text
[start, end)
```

Therefore these appointments do not overlap:

```text
10:00 → 10:30
10:30 → 11:00
```

The first appointment ends exactly when the second begins.

This makes boundary behavior explicit and avoids incorrectly treating adjacent appointments as conflicts.

---

## 9. Booking as the Source of Truth

Availability and booking are intentionally separate.

The frontend may show:

```text
10:00 AM — Available
```

but that does not reserve the time.

Between availability retrieval and booking submission, another parent could successfully book the same mentor/resource.

The backend therefore revalidates the request during booking creation.

Conceptually:

```text
Frontend availability
        ↓
Parent selects time
        ↓
Booking request
        ↓
Backend revalidation
        ↓
Mentor allocation
        ↓
Database write
        ↓
Success OR conflict
```

This is essential for concurrent scheduling.

---

## 10. Conflict Handling

A booking conflict is a normal business state, not an application crash.

A typical race condition is:

```text
Parent A sees 10:00 available
Parent B sees 10:00 available
        ↓
Parent A submits
Parent B submits
        ↓
One booking succeeds
The conflicting request receives 409
```

The frontend handles this state with a user-friendly message and allows the parent to choose another available time.

Technical database/server errors are not exposed as the primary user-facing message.

The parent's previously entered information should remain available wherever practical so the parent does not have to restart the entire process.

---

## 11. Idempotent Booking

The booking API supports an `Idempotency-Key`.

This protects the booking operation against repeated submissions such as:

- double-clicking the submit button,
- request retries,
- network retry behavior, or
- accidental duplicate requests.

The purpose is to ensure that retrying the same logical booking request does not unintentionally create multiple bookings.

---

## 12. Canonical Class Link

The class link belongs to the booking.

It is generated from the authoritative booking flow after the booking identity exists.

The same canonical class URL is used wherever the booking's class link is required, including:

- parent confirmation,
- Copy Link,
- Google Calendar event,
- `.ics` calendar output, and
- mentor-facing booking information.

The frontend must not independently reconstruct a different class URL.

This keeps parent and mentor views aligned to the same booking.

---

## 13. Parent Confirmation

After a successful booking, the confirmation page communicates that the appointment has been created.

The implemented confirmation experience provides the relevant appointment details and post-booking actions.

These include:

- Google Calendar
- `.ics` calendar download
- Copy class link
- Book another session

The class URL shown to the parent is the booking's canonical URL.

The confirmation page is designed so the important appointment information and primary actions are easy to reach without requiring unnecessary navigation.

---

## 14. Mentor Dashboard

The feature also includes a mentor-facing dashboard.

The dashboard provides the mentor-side view of scheduled trial sessions and relevant appointment information.

The dashboard can expose information required for the mentor to understand and access their scheduled trials, such as:

- scheduled appointment information,
- parent information,
- timezone-aware time,
- booking information,
- mentor information, and
- the canonical class link.

The dashboard is a consumer of the booking data. It does not replace the backend scheduling rules.

The backend remains responsible for:

- availability,
- mentor eligibility,
- mentor allocation,
- booking validation, and
- booking persistence.

---

## 15. Application Architecture

The implemented application uses a separate frontend and backend.

```text
                         CodeYoung
                            │
                            │
              Trial-Class Scheduling Feature
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        Next.js Frontend              Express Backend
             │                             │
             │ REST API                    │
             └──────────────┬──────────────┘
                            │
                            ▼
                       MongoDB
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
          Mentors                       Bookings
```

The frontend is responsible for presentation and user interaction.

The backend is responsible for scheduling correctness and persistence.

MongoDB is the persistence layer for the implemented application.

---

## 16. Frontend

The implemented frontend uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

The main booking flow is organized into:

```text
Time Selection
      ↓
Parent Details
      ↓
Confirmation
```

The frontend contains the presentation and interaction layer for:

- timezone selection/detection,
- date selection,
- availability display,
- preferred time selection,
- parent details,
- booking submission,
- loading states,
- validation states,
- conflict states,
- confirmation, and
- post-booking actions.

### Frontend API boundary

The frontend uses a typed API integration layer rather than duplicating scheduling logic.

Conceptually:

```text
React Components
        ↓
API Client
        ↓
API Types / Configuration
        ↓
Backend REST API
```

Business decisions such as mentor allocation and final booking validation remain in the backend.

---

## 17. Backend

The implemented backend uses:

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose

The backend contains the scheduling domain and API layers for:

- temporal calculations,
- mentor logic,
- availability,
- mentor allocation,
- booking creation,
- validation,
- conflict handling, and
- persistence.

The backend is the authoritative layer for scheduling decisions.

---

## 18. Database

MongoDB is used as the application's persistence layer.

The relevant scheduling state includes mentor and booking data.

The booking flow is designed around authoritative database state rather than treating the frontend availability response as a reservation.

The implementation also supports conditional transaction behavior based on the MongoDB deployment environment. A MongoDB replica-set deployment is the appropriate production configuration when full transaction semantics are required.

The repository's actual database models, indexes, and booking service are the source of truth for the final implementation.

---

## 19. Production Mentor Dataset

The implementation contains the required production mentor dataset.

The current project state has:

```text
10 production mentors
```

Mentors are stored in the database and participate in the backend allocation process.

The parent-facing UI does not require the parent to choose from these mentors.

When changing seed data, mentor configuration, or booking logic, the complete mentor dataset should be verified to ensure the scheduling pool remains intact.

---

## 20. Notifications and Communication

Booking state and notification are separate concerns.

The booking must first be successfully created.

Communication is then based on the confirmed booking.

The project research specifies mock/simulated communication rather than requiring a production email provider.

The important consistency rule is that communication must use the same booking identity and canonical class link.

Where local time is communicated, the relevant timezone context must be used rather than applying a hardcoded offset.

---

## 21. UI and Design System

The interface follows the project's design system defined in `design-skill.md`.

The design goal is a calm, trustworthy, production-quality scheduling experience rather than a decorative or dashboard-heavy interface.

The design principles include:

- clear hierarchy,
- restrained visual treatment,
- readable typography,
- purposeful spacing,
- accessible interaction,
- responsive behavior,
- clear system states,
- purposeful motion,
- reduced-motion support, and
- minimal unnecessary decoration.

The UI is intended to make the scheduling complexity invisible to the parent.

The design system specifically emphasizes the principle:

```text
PARENT CHOOSES WHEN
SYSTEM CHOOSES WHO
```

---

## 22. Motion and Interaction

Motion is used to communicate state rather than to decorate the interface.

Examples include:

- selection feedback,
- transitions between booking states,
- confirmation transitions,
- loading feedback,
- dropdown/popover transitions, and
- other existing interaction states.

Animations should remain subtle and purposeful.

The interface also respects reduced-motion preferences.

---

## 23. Error and Empty States

The feature explicitly handles important non-success states.

### No availability

The parent is told that the selected time cannot currently be served and is guided toward another available time.

### Booking conflict

A 409 conflict is handled as a scheduling state rather than displayed as a raw technical error.

### Validation

Invalid or incomplete parent details are surfaced clearly.

### Loading

The interface communicates when availability or booking operations are being processed.

### Server/network failure

Unexpected failures are represented as understandable user-facing states without exposing implementation details unnecessarily.

---

## 24. Testing

The implementation has been tested across the major scheduling domains.

The backend QA record reports:

```text
137 / 137 tests passing
```

The tested areas include:

- temporal utilities,
- mentor domain,
- availability,
- mentor allocation,
- booking,
- API routes, and
- relevant integration behavior.

The QA record also reports approximately:

```text
99.5% overall coverage
```

with the remaining gaps concentrated around exceptional infrastructure failure scenarios that are difficult to reproduce as ordinary unit-test cases.

The test suite covers important scheduling behavior such as:

- IANA timezone handling,
- timezone conversion,
- daylight-saving behavior,
- mentor working hours,
- overlapping bookings,
- adjacent booking intervals,
- mentor daily capacity,
- multiple mentors at the same requested time,
- deterministic mentor allocation,
- idempotent booking requests,
- concurrent booking attempts,
- validation,
- conflict responses, and
- rollback/error behavior supported by the implementation.

Test results should always be re-run from the current repository before submission rather than relying solely on an older QA report.

---

## 25. Important Scheduling Invariants

The following rules are central to the implementation:

```text
1. Parent chooses the requested time.

2. System chooses the mentor.

3. Timezones are represented using IANA identifiers.

4. Exact appointment instants are authoritative.

5. Mentor availability is evaluated in the mentor's timezone.

6. Trial duration is 30 minutes.

7. Intervals use [start, end).

8. A mentor cannot have overlapping confirmed trials.

9. A mentor can conduct at most 2 confirmed trials
   during their mentor-local calendar day.

10. Multiple mentors can serve the same time simultaneously.

11. Mentor allocation is deterministic.

12. Frontend availability is advisory.

13. Backend booking validation is authoritative.

14. Booking conflicts are represented as 409 Conflict.

15. Booking requests support idempotency.

16. The class URL belongs to the booking.

17. Parent and mentor references use the same canonical class URL.
```

These invariants are more important than any particular UI implementation.

---

## 26. Feature Flow in One View

```text
                         PARENT
                           │
                           ▼
                  Open scheduling feature
                           │
                           ▼
                  Detect/select timezone
                           │
                           ▼
                     Select date
                           │
                           ▼
                 Request availability
                           │
                           ▼
                  Select preferred time
                           │
                           ▼
                 Enter parent details
                           │
                           ▼
                   Submit booking
                           │
                           ▼
                    EXPRESS API
                           │
                           ▼
                 Validate request
                           │
                           ▼
              Resolve exact time instant
                           │
                           ▼
              Evaluate eligible mentors
                           │
                           ▼
                Allocate mentor
                           │
                           ▼
             Revalidate booking state
                           │
                    ┌──────┴──────┐
                    │             │
                 Conflict       Success
                    │             │
                    ▼             ▼
                 HTTP 409      Persist booking
                    │             │
                    │             ▼
                    │       Generate canonical
                    │          class URL
                    │             │
                    │             ▼
                    │        Confirmation
                    │             │
                    ▼             ▼
              Choose another   Calendar /
                   time        class-link actions
```

---

## 27. Repository Documentation

The repository contains supporting engineering documentation.

### `README.md`

This document provides the concise project/feature-level explanation needed to understand and evaluate the repository.

### `SETUP.md`

Contains practical instructions for installing dependencies, configuring the environment, starting required services, running the frontend/backend, seeding required data, and executing tests.

### `project-research.md`

Contains the detailed architecture research and reasoning behind the scheduling model.

It is intentionally more detailed than this README.

### `coding-skill.md`

Contains engineering guidance used during implementation, including principles around architecture, business invariants, testing, documentation, and maintainability.

### `design-skill.md`

Contains the UI/UX and design-engineering system used for the frontend.

### `prompt.md`

Documents meaningful AI-assisted development prompts used during implementation.

### `TRANSCRIPT.md`

Preserves the required AI-assisted development record for the assignment.

These documents serve different purposes and should not be treated as interchangeable.

---

## 28. Setup

For practical installation and execution instructions, follow:

```text
SETUP.md
```

The setup process should be verified from a clean environment before submission.

The setup documentation is intentionally kept separate so this README remains focused on understanding the feature and its engineering design.

---

## 29. Technology Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| UI | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend | Node.js + Express |
| Database | MongoDB |
| ODM | Mongoose |
| Testing | Vitest / project test suite |
| Scheduling | Timezone-aware temporal logic |
| Timezone format | IANA timezone identifiers |

The repository's package manifests are authoritative for exact dependency versions.

---

## 30. Project Structure

The implementation is organized into separate frontend and backend areas.

A simplified representation is:

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

The exact repository structure may contain additional implementation-specific files.

---

## 31. Design and Architecture References

The feature was developed using the project's supplied research and engineering documentation.

The main conceptual references are:

- `project-research.md`
- `Edtech Scheduling Architecture Research.txt`
- `coding-skill.md`
- `design-skill.md`

The research document contains broader architecture proposals and industry research.

Where the research baseline differs from the implemented repository, the actual implementation is authoritative for what is currently shipped in this feature.

For example, the research document contains an earlier proposed PostgreSQL/Fastify architecture, while the implemented project uses MongoDB/Mongoose and Express. The README therefore describes the implementation that exists rather than presenting an unimplemented research proposal as the final system.

---

## 32. Prototype Reference

The original prototype is available as an additional visual reference:

https://drive.google.com/file/d/1gv5-xCCyO4xnB1QaqRDJS8fqktmNCdE8/view?usp=drivesdk

The prototype is supplementary reference material.

The repository itself is the source of truth for the implemented feature, its behavior, and its architecture.

---

## 33. Scope

This repository focuses on the trial-class scheduling feature.

The implemented scope includes:

- parent-facing scheduling,
- timezone selection/detection,
- date selection,
- availability,
- preferred time selection,
- parent details,
- automatic mentor allocation,
- booking creation,
- conflict handling,
- idempotency,
- canonical class-link generation,
- booking confirmation,
- calendar actions,
- mentor-facing dashboard functionality, and
- scheduling-related tests.

The feature is designed around the requirements and assumptions documented in the project research.

---

## 34. Non-Goals

The assignment/research does not require every production capability of a full commercial scheduling platform.

The following are outside the core feature scope unless explicitly implemented elsewhere in the repository:

- full production authentication/authorization,
- production video-conferencing infrastructure,
- a production email delivery provider,
- enterprise calendar synchronization,
- complex holiday management,
- mentor leave-management workflows,
- a full CodeYoung-wide admin platform,
- distributed microservice infrastructure.

The repository should not be evaluated as an attempt to reproduce an entire commercial scheduling platform.

It implements the required trial-class scheduling feature and the supporting engineering needed for that feature.

---

## 35. Engineering Principles

The implementation follows several principles from the project engineering guidance:

### Keep business logic out of the UI

The frontend should not become a second scheduling engine.

### Separate availability from allocation

Knowing that a time can be served is different from deciding which mentor receives it.

### Treat booking as authoritative

Displayed availability can become stale.

### Make non-obvious business rules explicit

Timezone and daily-capacity rules should remain understandable to future developers.

### Keep booking and notification concerns separate

A notification failure should not create a false booking failure after the booking has already been committed.

### Keep the class URL attached to the booking

Different consumers should not independently construct different URLs.

### Prefer minimum necessary complexity

The system should remain understandable without introducing infrastructure or abstractions that the feature does not require.

---

## 36. Final Feature Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                       CodeYoung                            │
│                                                           │
│             Trial-Class Scheduling Feature                │
│                                                           │
│  ┌─────────────────────┐      ┌────────────────────────┐  │
│  │ Parent Experience   │      │ Mentor Dashboard       │  │
│  │                     │      │                        │  │
│  │ Timezone            │      │ Scheduled trials       │  │
│  │ Date                │      │ Booking details        │  │
│  │ Availability        │      │ Mentor-local time      │  │
│  │ Preferred time      │      │ Class link             │  │
│  │ Parent details      │      │                        │  │
│  │ Confirmation        │      │                        │  │
│  └──────────┬──────────┘      └───────────┬────────────┘  │
│             │                             │               │
│             └──────────────┬──────────────┘               │
│                            │                              │
│                            ▼                              │
│                 ┌────────────────────┐                    │
│                 │ Express REST API    │                    │
│                 └─────────┬──────────┘                    │
│                           │                               │
│                           ▼                               │
│                 ┌────────────────────┐                    │
│                 │ Scheduling Domain  │                    │
│                 │                    │                    │
│                 │ Temporal logic     │                    │
│                 │ Availability       │                    │
│                 │ Allocation         │                    │
│                 │ Booking validation │                    │
│                 │ Idempotency        │                    │
│                 └─────────┬──────────┘                    │
│                           │                               │
│                           ▼                               │
│                 ┌────────────────────┐                    │
│                 │      MongoDB       │                    │
│                 │                    │                    │
│                 │ Mentors            │                    │
│                 │ Bookings           │                    │
│                 │ Scheduling state   │                    │
│                 └────────────────────┘                    │
└───────────────────────────────────────────────────────────┘
```

---

## 37. Final Summary

This feature provides CodeYoung with a focused trial-class scheduling workflow in which the parent chooses a convenient local time and the system handles the scheduling complexity behind the scenes.

The key engineering model is:

```text
Parent chooses WHEN
        ↓
Timezone-aware exact instant
        ↓
Availability evaluation
        ↓
Eligible mentor selection
        ↓
Deterministic allocation
        ↓
Authoritative booking validation
        ↓
Database persistence
        ↓
Canonical class URL
        ↓
Parent confirmation + mentor view
```

The feature is designed to keep the parent experience simple while maintaining correctness around:

- timezones,
- daylight-saving transitions,
- mentor working hours,
- mentor capacity,
- overlapping bookings,
- simultaneous booking attempts,
- deterministic allocation,
- idempotent requests,
- booking conflicts, and
- consistent appointment communication.

The detailed research, implementation guidance, design system, setup instructions, and development record are retained in the supporting repository documentation.

**CodeYoung is the company/product context. This repository documents and implements the trial-class scheduling feature built within that context.**
