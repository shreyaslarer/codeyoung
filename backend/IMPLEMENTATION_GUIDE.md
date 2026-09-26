# Availability Engine Implementation Guide

## Overview
This guide documents the availability engine implementation for the Codeyoung trial booking system.

## Architecture

### 1. Database Layer
- **Booking Schema** (`src/models/booking.schema.ts`): MongoDB schema with compound indexes for overlap detection
- **Booking Repository** (`src/models/booking.repository.ts`): Query methods for bookings
- **Mentor Schema & Repository**: Already implemented

### 2. Service Layer
- **Timezone Service** (`src/services/timezone.service.ts`): Temporal API wrapper for timezone conversions
- **Availability Engine** (`src/services/availability.engine.ts`): Core slot generation and eligibility logic

### 3. API Layer
- **Availability Routes** (`src/routes/availability.routes.ts`): Express router for GET /api/availability
- **Server** (`src/server.ts`): Express app with CORS and JSON middleware

## Key Algorithms

### Slot Generation
1. Extract mentor working hours (09:00-18:00 IST)
2. Generate 30-minute intervals
3. For each candidate slot:
   - Convert parent local time → exact instant
   - Convert instant → mentor local time  
   - Check working hours
   - Check daily capacity (max 2/day)
   - Check booking conflicts
   - Include if at least one mentor eligible

### Timezone Handling
- Use Temporal.Instant for exact moments
- Use Temporal.ZonedDateTime for timezone-aware times
- Never use manual UTC offset calculations
- Daily capacity calculated on mentor's local date

### Eligibility Rules
A mentor is eligible if ALL true:
- Slot falls within working hours in mentor timezone
- < 2 confirmed bookings on mentor's local calendar day
- No overlapping confirmed bookings

## API Contract

### GET /api/availability
Query Parameters:
- `date`: YYYY-MM-DD format
- `timezone`: IANA timezone (e.g., Europe/London)

Response:
```json
{
  "date": "2026-09-30",
  "timezone": "Europe/London",
  "slots": [
    {
      "startTime": "10:00",
      "instant": "2026-09-30T09:00:00Z",
      "displayTime": "10:00"
    }
  ]
}
```

## Testing Requirements

### Unit Tests
- Timezone conversions (Europe/London, America/New_York, Asia/Kolkata)
- Slot generation from working hours
- Working hour boundary checks
- Daily capacity enforcement
- Overlap detection

### Integration Tests
- Empty booking collection handling
- Multiple timezone requests
- DST boundary dates
- Concurrent availability requests

## Dependencies
- `@js-temporal/polyfill`: Temporal API for timezone handling
- `express`: Web framework
- `cors`: Cross-origin support  
- `zod`: Runtime validation
- `mongoose`: MongoDB ODM

## Implementation Status
- [x] Dependencies defined in package.json
- [ ] Directory structure created
- [ ] Database schemas implemented
- [ ] Timezone service implemented
- [ ] Availability engine implemented
- [ ] Express routes implemented
- [ ] Server configured
- [ ] Tests written
- [ ] Local verification complete

## Next Steps
1. Run `npm install` to install dependencies
2. Create src directory structure
3. Implement all service files
4. Implement route handlers
5. Update server.ts with Express
6. Write comprehensive tests
7. Test with multiple timezones
8. Verify with seeded mentors

## Design Decisions
- **No booking creation**: This milestone only implements availability
- **Deterministic slots**: Same request always returns same slots (reproducible)
- **Separation of concerns**: Engine, service, and route layers clearly separated
- **Database as truth**: Availability calculated from actual booking data
- **Timezone-first**: All temporal logic uses Temporal API, not Date objects
