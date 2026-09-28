# Codeyoung Trial Booking Backend

Production-grade Node.js / Express / TypeScript backend service for scheduling and booking 30-minute trial classes across global timezones.

---

## Architecture Overview

The backend follows a layered architecture with separation of concerns:

```
backend/
├── src/
│   ├── db/
│   │   ├── connection.ts          # Mongoose connection manager with lifecycle hooks
│   │   ├── seed.ts                # Idempotent seed script for 10 active mentors
│   │   └── seed-bookings.ts       # Baseline sample booking dataset for testing/demo
│   ├── models/
│   │   ├── mentor.schema.ts       # Mentor Mongoose schema & IMentor interface
│   │   ├── booking.schema.ts      # Booking Mongoose schema & IBooking interface
│   │   └── booking.repository.ts  # Booking data access layer & interval queries
│   ├── repositories/
│   │   └── mentor.repository.ts   # Mentor data access layer
│   ├── routes/
│   │   ├── mentor.routes.ts       # /api/mentors endpoints
│   │   └── scheduling.routes.ts   # /api/availability, /api/bookings, /api/dashboard/stats
│   ├── services/
│   │   ├── availability.service.ts       # Timezone-safe candidate slot generator
│   │   ├── mentor-allocation.service.ts  # Least-booked deterministic mentor allocation
│   │   ├── booking.service.ts            # Idempotent, transaction-safe booking engine
│   │   └── mentor.service.ts             # Public mentor projection service
│   ├── utils/
│   │   └── temporal.utils.ts      # Pure timezone utilities via @js-temporal/polyfill
│   └── server.ts                  # Express application entry point & graceful shutdown
├── tests/                         # Vitest automated test suite (158 tests across 8 suites)
│   ├── setup.ts                   # Database connection setup and teardown for tests
│   ├── api.test.ts                # REST API endpoint integration tests
│   ├── availability.test.ts       # Availability engine tests across timezones
│   ├── booking.test.ts            # Booking creation, idempotency, and concurrency tests
│   ├── mentor-allocation.test.ts  # Mentor allocation and load-balancing tests
│   ├── mentor.test.ts             # Mentor service and repository tests
│   ├── preferred-time.test.ts     # Preferred start time evaluation & booking regression tests
│   ├── slot-capacity.test.ts      # Multi-mentor concurrent slot capacity tests
│   └── temporal.utils.test.ts     # Temporal utility pure function unit tests
├── package.json                   # Project metadata and npm scripts
├── tsconfig.json                  # TypeScript compiler configuration (ES2022 / ESNext)
├── vitest.config.ts               # Test runner configuration
├── .env.example                   # Environment configuration template
└── .gitignore                     # Git ignore rules
```

---

## Core Domain Rules & Invariants

1. **Timezone Safety via `@js-temporal/polyfill`**:
   - Mentors work standard hours (`09:00 - 18:00`) in their local timezone (`Asia/Kolkata`).
   - Parents select dates and view slots in their own local IANA timezone (e.g., `Europe/London`, `America/New_York`).
   - All conversions use exact UTC instants via Temporal API to guarantee daylight saving time (DST) transitions are handled automatically without manual offset arithmetic.

2. **Half-Open Intervals `[start, end)`**:
   - Classes and working hours are evaluated using half-open interval semantics: start is inclusive, end is exclusive.
   - Allows adjacent classes (e.g., `09:00-09:30` and `09:30-10:00`) without collision.

3. **Daily Mentor Capacity Cap**:
   - Each mentor is capped at a maximum of **2 trial classes per local calendar day** (evaluated in the mentor's timezone: `Asia/Kolkata`).

4. **Multi-Mentor Slot Capacity**:
   - A time slot with $N$ eligible mentors can accept $N$ simultaneous bookings.
   - The slot only disappears from availability once all $N$ mentors are fully booked or have reached daily capacity.

5. **Deterministic Least-Booked Allocation**:
   - When a slot is booked, the system allocates the eligible mentor with the lowest total booking count across all time.
   - Ties are broken deterministically by mentor ID in ascending lexicographical order.

6. **Idempotent Booking Creation**:
   - Every booking request requires a client-generated `Idempotency-Key` header.
   - Duplicate submissions with the same key safely return the original booking without re-allocating or creating duplicate records.

7. **Preferred Start Time Support**:
   - Parents can request an arbitrary start time (e.g., `10:15`) via query parameter `preferredStartTime=HH:MM` on `/api/availability` and book it.
   - The engine validates working hours and capacity for the requested interval and confirms slot availability.

---

## API Reference

### Health Check
- `GET /health`
  - Returns `200 OK` with status and timestamp:
    ```json
    { "status": "ok", "timestamp": "2026-09-28T05:30:00.000Z" }
    ```

### Mentors
- `GET /api/mentors`
  - Returns all active mentors with public profile fields (`_id`, `name`, `timezone`, `workingHours`, `totalBookingsCount`).
- `GET /api/mentors/:id`
  - Returns details for a specific mentor or `404 Not Found` with RFC 7807 problem details.

### Scheduling & Availability
- `GET /api/availability?parentDate=YYYY-MM-DD&parentTimezone=Zone&trialDurationMinutes=30&preferredStartTime=HH:MM`
  - Returns available 30-minute slots projected in the parent's timezone, with eligible mentor IDs and optional preferred slot evaluation:
    ```json
    {
      "parentDate": "2026-09-29",
      "parentTimezone": "Europe/London",
      "trialDurationMinutes": 30,
      "slots": [
        {
          "startInstant": "2026-09-29T04:30:00.000Z",
          "endInstant": "2026-09-29T05:00:00.000Z",
          "parentLocalDate": "2026-09-29",
          "parentLocalTime": "05:30",
          "eligibleMentorIds": ["64a..."]
        }
      ],
      "preferredSlot": null
    }
    ```
- `POST /api/bookings`
  - Header: `Idempotency-Key: <unique-uuid>`
  - Body:
    ```json
    {
      "parentName": "John Doe",
      "parentEmail": "john.doe@example.com",
      "parentLocalDate": "2026-09-29",
      "parentLocalTime": "10:00",
      "parentTimezone": "Europe/London",
      "trialDurationMinutes": 30
    }
    ```
  - Returns `201 Created` with booking details and unique class URL, or `409 Conflict` (with RFC 7807 problem details) if slot is full.
- `GET /api/bookings`
  - Returns recent confirmed trial bookings with populated mentor details.
- `GET /api/dashboard/stats?date=YYYY-MM-DD`
  - Returns real-time scheduling metrics, mentor allocation counts, capacity usage, and recent activities.

---

## Database & Transaction Safety

The application connects to MongoDB using Mongoose.

- **Standalone Mode (Development)**:
  - Operates on standalone MongoDB (`mongodb://localhost:27017/codeyoung_trial_booking`).
  - Pre-flight checks and unique index constraints on `idempotencyKey` prevent duplicate creation.
- **Replica Set Mode (Production)**:
  - When connected to a replica set (e.g., MongoDB Atlas or a clustered deployment), the system automatically detects replica set support and wraps booking creation inside an ACID multi-document transaction (`session.startTransaction()`), providing strict serializability.

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB running locally or on Atlas

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/codeyoung_trial_booking
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Installation
```bash
npm install
```

### Database Seeding
Seed the 10 active mentors:
```bash
npm run seed
```

### Development
Start the dev server with hot reload:
```bash
npm run dev
```

### Production Build
Compile TypeScript to `dist/`:
```bash
npm run build
npm start
```

### Running Tests
Execute the Vitest test suite (8 test suites, 158 tests):
```bash
npm test
```
Run tests in watch mode:
```bash
npm run test:watch
```
