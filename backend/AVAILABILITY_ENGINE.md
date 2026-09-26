# Availability Engine Implementation

## Overview

The availability engine is the core component that determines which trial-class slots are available for booking. It implements timezone-aware slot generation, mentor eligibility checking, and proper handling of working hours, booking conflicts, and daily capacity limits.

## Architecture

### Core Components

1. **AvailabilityService** (`src/services/availability.service.ts`)
   - Main service that orchestrates the availability calculation
   - Handles timezone conversion using Temporal API
   - Evaluates mentor eligibility for each candidate slot

2. **MentorRepository** (`src/models/mentor.repository.ts`)
   - Database operations for mentor queries
   - Retrieves active mentors with their working hours

3. **BookingRepository** (`src/models/booking.repository.ts`)
   - Handles booking-related database queries
   - Checks for overlapping bookings
   - Counts daily bookings per mentor

## Key Features

### 1. Timezone-Aware Slot Generation

The engine generates slots based on:
- Parent's selected timezone (e.g., Europe/London, America/New_York)
- Mentor's working hours in Asia/Kolkata timezone (09:00-18:00 IST)
- 30-minute slot intervals
- 30-minute trial duration

**Process:**
```
1. Parent selects date in their timezone
2. System determines mentor's working hours on that date
3. Generates candidate 30-minute slots
4. Converts each slot to exact UTC instant
5. Projects instant back to parent's timezone for display
```

### 2. Mentor Eligibility Rules

A mentor is eligible for a slot if ALL conditions are met:

✓ **Working Hours**: Slot falls within mentor's 09:00-18:00 IST working hours
✓ **No Conflicts**: No overlapping CONFIRMED bookings exist
✓ **Capacity**: Mentor has conducted fewer than 2 trial classes that day (Asia/Kolkata calendar day)

### 3. Temporal API Integration

Uses `@js-temporal/polyfill` for robust timezone handling:

- **Temporal.PlainDate**: Represents calendar dates (2026-09-30)
- **Temporal.PlainTime**: Represents wall-clock times (10:00)
- **Temporal.ZonedDateTime**: Combines date, time, and timezone
- **Temporal.Instant**: Exact moment on global timeline (UTC)

This approach correctly handles:
- DST transitions (spring forward, fall back)
- Cross-timezone calculations
- Ambiguous and non-existent local times

### 4. Database Queries

**Overlap Detection:**
```mongodb
{
  mentorId: ObjectId,
  status: 'CONFIRMED',
  $or: [
    { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
  ]
}
```

**Daily Capacity:**
```mongodb
{
  mentorId: ObjectId,
  status: 'CONFIRMED',
  startTime: { $gte: dayStart, $lt: dayEnd }
}
```

## API Response Format

```typescript
{
  date: "2026-09-30",
  timezone: "Europe/London",
  slots: [
    {
      instant: "2026-09-30T09:00:00Z",      // Exact UTC instant
      parentLocalTime: "10:00",               // Display time (HH:MM)
      parentLocalDateTime: "2026-09-30T10:00:00"  // Full local datetime
    },
    // ... more slots
  ]
}
```

## Implementation Details

### Candidate Slot Generation

The system generates slots by:

1. **Parsing Input**: Convert parent's date and timezone to ZonedDateTime
2. **Find Overlap**: Determine which mentor dates overlap with parent's requested date
3. **Generate Intervals**: Create 30-minute slots within mentor working hours
4. **Filter**: Include only slots that fall on parent's requested calendar date
5. **Sort**: Return chronologically ordered instants

### Edge Cases Handled

✓ **Empty Database**: Returns empty slots array (no crash)
✓ **No Available Mentors**: Returns empty slots array
✓ **All Mentors Busy**: Only returns slots where at least one mentor is eligible
✓ **Different Timezones**: Correctly projects across any IANA timezone
✓ **DST Transitions**: Skips non-existent times, handles ambiguous times
✓ **Cancelled Bookings**: Does not count towards conflicts or capacity

### Performance Considerations

- **Compound Indexes**: MongoDB indexes on `{mentorId, startTime, endTime}` for fast overlap queries
- **Status Filtering**: Only queries CONFIRMED bookings
- **Efficient Queries**: Separate queries for overlap and daily capacity
- **In-Memory Filtering**: Mentor eligibility checked after fetching mentor list once

## Testing

Comprehensive test suite covers:

- ✓ Basic slot generation
- ✓ Timezone conversion (Europe/London, America/New_York, Asia/Tokyo)
- ✓ Working hours boundaries
- ✓ Booking conflict detection
- ✓ Daily capacity limits
- ✓ Cancelled booking handling
- ✓ Empty database scenario
- ✓ Input validation (invalid date/timezone)

Run tests:
```bash
npm test availability
```

All 10 availability tests pass successfully.

## Configuration

Current configuration (hardcoded constants):

```typescript
const TRIAL_DURATION_MINUTES = 30;
const SLOT_INTERVAL_MINUTES = 30;
const MAX_DAILY_TRIALS = 2;
```

Mentor configuration (from database):
- Timezone: Asia/Kolkata
- Working hours: 09:00-18:00
- All mentors share same schedule

## Usage Example

```typescript
import { availabilityService } from './services/availability.service.js';

// Get available slots for parent in London on Sept 30, 2026
const result = await availabilityService.getAvailableSlots(
  '2026-09-30',
  'Europe/London'
);

console.log(`Found ${result.slots.length} available slots`);

result.slots.forEach(slot => {
  console.log(`${slot.parentLocalTime} - ${slot.instant}`);
});
```

## Error Handling

The service throws descriptive errors for:

- **Invalid Date Format**: "Invalid date format: {date}. Expected ISO 8601 date (e.g., 2026-09-30)"
- **Invalid Timezone**: "Invalid timezone: {timezone}. Expected IANA timezone (e.g., Europe/London)"

Unexpected errors are caught and logged with context for debugging.

## Future Enhancements (Out of Scope)

The following features are NOT implemented in this milestone:

- ❌ Booking creation endpoint
- ❌ Mentor allocation during booking
- ❌ Authentication/authorization
- ❌ Email notifications
- ❌ Frontend React components
- ❌ Real-time availability updates
- ❌ Mentor-specific schedules
- ❌ Holiday/vacation handling
- ❌ Calendar integration

## Verification

To verify the implementation:

1. **Run Tests**:
   ```bash
   npm test
   ```
   All 10 availability tests should pass.

2. **Seed Database**:
   ```bash
   npm run seed
   ```
   Creates 10 mentors in Asia/Kolkata timezone.

3. **Manual Test**:
   ```bash
   tsx src/verify-availability.ts
   ```
   Queries availability for a sample date and timezone.

## Dependencies

- **@js-temporal/polyfill**: ^0.4.4 - Temporal API polyfill for timezone handling
- **mongoose**: ^8.0.0 - MongoDB ODM
- **zod**: ^3.22.4 - Runtime validation

## Database Schema

### Mentors Collection
```typescript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  timezone: String (IANA),
  active: Boolean,
  workingHoursStart: String (HH:MM),
  workingHoursEnd: String (HH:MM),
  createdAt: Date,
  updatedAt: Date
}
```

### Bookings Collection
```typescript
{
  _id: ObjectId,
  mentorId: ObjectId (indexed),
  parentName: String,
  parentEmail: String,
  startTime: Date (indexed),
  endTime: Date (indexed),
  parentTimezone: String (IANA),
  status: 'CONFIRMED' | 'CANCELLED' (indexed),
  classUrl: String,
  idempotencyKey: String (unique, sparse),
  createdAt: Date,
  updatedAt: Date
}
```

## Key Design Decisions

1. **Temporal over moment/date-fns**: Proper timezone handling with DST support
2. **Exact instants**: Store absolute UTC times, display in local timezones
3. **MongoDB with Mongoose**: Full MERN stack, flexible document model
4. **Separation of concerns**: Service layer separate from repository layer
5. **Deterministic behavior**: Same input always produces same output
6. **No fake data**: Handles empty booking collection correctly
7. **Reusable**: Service can be called from API routes, CLI tools, tests

## Status

✅ **Complete and Tested**

The availability engine is fully implemented, tested, and ready for use. All core functionality works correctly:

- Timezone conversion
- Slot generation
- Mentor eligibility evaluation
- Working hours enforcement
- Booking conflict detection
- Daily capacity limits
- Error handling and validation

Next milestone: Implement booking creation with transaction safety and mentor allocation.
