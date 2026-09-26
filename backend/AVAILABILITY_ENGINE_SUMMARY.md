# Availability Engine Implementation Summary

## Overview
Successfully implemented the Availability Engine on top of the existing architecture using the temporal utilities. The engine generates timezone-safe availability slots by validating inputs, generating candidate slots from mentor working hours, converting to UTC instants, and verifying slots fall within working hours using half-open interval semantics.

---

## Implementation Complete ✅

### Files Modified: 1 file

**Availability Service (Complete Rewrite):**
```
src/services/availability.service.ts    # 380 lines (rewritten from scratch)
```

**Test File (Complete Rewrite):**
```
tests/availability.test.ts              # 16 focused tests (200 lines)
```

---

## Availability Engine Architecture

### Core Responsibilities

**The Availability Engine:**
1. ✅ Validates parent timezone and requested date
2. ✅ Retrieves all active mentors from repository
3. ✅ Generates candidate slots from mentor working hours
4. ✅ Converts slots to UTC instants using Temporal Utilities
5. ✅ Verifies slots fall within working hours (half-open intervals)
6. ✅ Returns slots with eligible mentor IDs

**The Engine Does NOT:**
- ❌ Allocate specific mentors (allocation service's responsibility)
- ❌ Check booking conflicts (booking service's responsibility)
- ❌ Enforce daily capacity limits (capacity service's responsibility)
- ❌ Create bookings
- ❌ Send notifications

This separation follows the single responsibility principle from coding-skill.md.

---

## Key Methods Implemented

### `getAvailableSlots(parentDate, parentTimezone, trialDurationMinutes)`

Main entry point that:
- Validates all inputs (date, timezone, duration)
- Fetches active mentors from repository
- Generates candidate slots
- Filters by mentor availability
- Returns structured availability result

**Input:**
```typescript
parentDate: '2026-09-30'
parentTimezone: 'Europe/London'
trialDurationMinutes: 30 (default)
```

**Output:**
```typescript
{
  parentDate: '2026-09-30',
  parentTimezone: 'Europe/London',
  trialDurationMinutes: 30,
  slots: [
    {
      startInstant: '2026-09-30T09:00:00Z',
      endInstant: '2026-09-30T09:30:00Z',
      parentLocalDate: '2026-09-30',
      parentLocalTime: '10:00',
      eligibleMentorIds: ['6ab7e2998513d10a0e78ce0c', '6ab7e2998513d10a0e78ce0d']
    },
    // ... more slots
  ]
}
```

### `generateCandidateSlots()`

Generates all possible time slots by:
1. Iterating through each active mentor
2. Getting mentor working hours in mentor timezone
3. Converting to UTC instants
4. Projecting back to parent timezone
5. Keeping only slots on parent's requested date
6. Deduplicating (multiple mentors may create same slot)

**Key Insight:** Parent date boundaries differ from mentor date boundaries due to timezone offsets.

### `filterSlotsByMentorAvailability()`

Filters candidate slots to include only those with at least one eligible mentor:
1. For each candidate slot, check all mentors
2. A mentor is eligible if slot falls within their working hours
3. Uses half-open interval semantics `[start, end)`
4. Returns only slots with eligibleMentorIds.length > 0

### `canMentorHandleSlot()`

Verifies a mentor can handle a specific slot:
1. Converts UTC slot to mentor's local timezone
2. Parses mentor working hours
3. Checks if slot start >= working start
4. Checks if slot end <= working end
5. Verifies slot doesn't span midnight
6. Uses half-open interval comparisons

---

## Test Coverage: 16/16 Passed ✅

### Normal Availability (3 tests)
- ✅ Return available slots for valid date/timezone
- ✅ Slots have correct structure (startInstant, endInstant, parentLocalDate, parentLocalTime, eligibleMentorIds)
- ✅ Slots sorted by start time

### Parent/Mentor Timezone Differences (2 tests)
- ✅ Generate correct slots for multiple timezones (London, New York, Tokyo)
- ✅ Show different parent local times for same instant in different timezones
- ✅ All slots fall within mentor working hours (09:00-18:00 IST)

### Working Hours Boundaries (3 tests)
- ✅ Only return slots within mentor working hours
- ✅ No slots start before working hours
- ✅ No slots end after working hours

### Date Boundary Changes (2 tests)
- ✅ Handle date boundary crossing correctly
- ✅ Only return slots for requested parent date

### Input Validation (3 tests)
- ✅ Throw error for invalid date format
- ✅ Throw error for invalid timezone
- ✅ Throw error for invalid trial duration (negative, zero, > 240 minutes)

### Inactive Mentors (1 test)
- ✅ Not include inactive mentors in availability

### No Available Slots (1 test)
- ✅ Return empty slots when no mentors exist

### Adjacent Slots (1 test)
- ✅ Generate adjacent 30-minute slots correctly

---

## All Tests Status

```
Test Files  3 passed (3)
Tests      76 passed (76)
Duration   4.16s

✓ Mentor Domain (13/13)
✓ Temporal Utilities (47/47)
✓ Availability Engine (16/16)  ← NEW
```

---

## Temporal Utilities Integration

The Availability Engine leverages these temporal utilities:

**`validateTimezone(parentTimezone, 'parentTimezone')`**
- Validates IANA timezone before processing

**`getLocalDateForInstant(instant, timezone)`**
- Determines if a mentor slot falls on the parent's requested date

**`utcInstantToLocalDateTime(instant, timezone)`**
- Converts UTC instants to parent's local time for display

**Key Benefit:** Zero manual timezone offset calculations. All DST transitions handled automatically.

---

## Architecture Decisions (Following coding-skill.md)

### ✅ Naming Conventions
- **Production-oriented:** `parentDate`, `parentTimezone`, `mentorTimezone`, `startInstant`, `endInstant`, `eligibleMentorIds`, `workingHoursStart`, `workingHoursEnd`
- **Avoided:** `data`, `item`, `result`, `temp`
- **Clear intent:** Names describe business meaning

### ✅ Layer Separation
- **Repository:** Database access (mentorRepository.findActiveMentors())
- **Service:** Business logic (availability generation, filtering)
- **No cross-contamination:** Service doesn't know about HTTP; repository doesn't know about timezones

### ✅ Half-Open Interval Semantics
- All time comparisons use `[start, end)` convention
- Start inclusive, end exclusive
- Adjacent slots don't conflict: `[09:00, 09:30)` + `[09:30, 10:00)` = no overlap
- Prevents off-by-one errors

### ✅ Pure Slot Generation
- No side effects
- Same inputs → same outputs
- Deterministic slot ordering
- Testable in isolation

### ✅ Error Handling
- Validates all inputs before processing
- Clear error messages with context
- Gracefully handles no mentors case
- Skips DST non-existent times with warning

### ✅ Slot Deduplication
- Multiple mentors may create the same UTC slot
- Uses Map with instant as key to deduplicate
- Reduces redundant processing

---

## Key Implementation Insights

### 1. Parent Date ≠ Mentor Date

When a parent in New York requests Sept 30, the mentor slots may come from Sept 30 AND Oct 1 in India due to timezone offset.

**Solution:** Project parent's full day (00:00-23:59) into mentor timezone, find overlapping mentor dates, generate slots, filter back to parent date.

### 2. Slot Timezone Projection

```
Mentor working hours (IST) → UTC instants → Parent local times
09:00-18:00 IST           → multiple instants → varies by parent timezone
```

### 3. Eligible Mentors List

Instead of picking one mentor (allocation), we return **all** eligible mentor IDs. This allows:
- Allocation service to choose using business rules
- Booking service to check conflicts
- Capacity service to enforce limits

**Separation of concerns:** Availability knows "who CAN handle it", not "who WILL handle it".

### 4. Working Hours Verification

A slot is eligible if:
```typescript
workingStart <= slotStart < slotEnd <= workingEnd
```

**Critical:** Uses `<` for slot end and working end to maintain half-open semantics.

---

## Database Integrity Verified ✅

```bash
db.mentors.countDocuments() = 10
```

All 10 production mentors remain intact after test execution.

---

## What Was NOT Implemented (As Requested)

Per requirements:
- ❌ Mentor allocation algorithm
- ❌ Booking creation
- ❌ Booking conflict checking
- ❌ Daily capacity enforcement
- ❌ Notifications
- ❌ Frontend integration

These will be built on top of the availability engine.

---

## Usage Example

### Basic Availability Query

```typescript
import { availabilityService } from './services/availability.service.js';

// Parent in London requests Sept 30
const result = await availabilityService.getAvailableSlots(
  '2026-09-30',
  'Europe/London'
);

console.log(result);
// {
//   parentDate: '2026-09-30',
//   parentTimezone: 'Europe/London',
//   trialDurationMinutes: 30,
//   slots: [
//     {
//       startInstant: '2026-09-30T09:00:00Z',
//       endInstant: '2026-09-30T09:30:00Z',
//       parentLocalDate: '2026-09-30',
//       parentLocalTime: '10:00',
//       eligibleMentorIds: ['id1', 'id2', 'id3']
//     },
//     // ... more slots
//   ]
// }
```

### Custom Trial Duration

```typescript
// 60-minute trial class
const result = await availabilityService.getAvailableSlots(
  '2026-09-30',
  'America/New_York',
  60  // 60 minutes
);
```

### Error Handling

```typescript
try {
  const result = await availabilityService.getAvailableSlots(
    'invalid-date',
    'Invalid/Zone'
  );
} catch (error) {
  // Clear error messages:
  // "Invalid date format: invalid-date. Expected YYYY-MM-DD."
  // "Invalid IANA timezone identifier for parentTimezone: Invalid/Zone"
  console.error(error.message);
}
```

---

## Code Quality Standards Met

Following coding-skill.md principles:

✅ **Clear responsibilities:** Availability generation only  
✅ **Temporal utilities integration:** Zero manual offsets  
✅ **Repository pattern:** Database access isolated  
✅ **Half-open intervals:** Consistent semantics  
✅ **Production naming:** Clear business intent  
✅ **Comprehensive validation:** All inputs checked  
✅ **Deterministic output:** Sorted, predictable slots  
✅ **Focused tests:** 16 tests cover all cases  
✅ **No unnecessary abstractions:** Simple, direct code  
✅ **Self-documenting:** JSDoc comments explain intent  

---

## Integration Points

### Inputs (Dependencies)
- `mentorRepository.findActiveMentors()` - Get active mentors
- `validateTimezone()` from temporal utils - Validate timezone
- `getLocalDateForInstant()` from temporal utils - Date projection
- `utcInstantToLocalDateTime()` from temporal utils - Timezone conversion

### Outputs (Used By)
- **Allocation Service:** Uses eligibleMentorIds to choose mentor
- **Booking Service:** Uses startInstant/endInstant to check conflicts
- **Capacity Service:** Uses eligibleMentorIds to check daily limits
- **Frontend:** Displays parentLocalTime to parent

---

## Final Summary

✅ **Engine implemented:** Complete availability generation  
✅ **Tests passed:** 16/16 availability tests  
✅ **All backend tests:** 76/76 passed  
✅ **Database integrity:** 10 mentors intact  
✅ **Code quality:** Follows coding-skill.md standards  
✅ **Temporal integration:** Uses utilities correctly  
✅ **Half-open intervals:** Consistent throughout  
✅ **Layer separation:** Clean architecture maintained  

**Files changed:** 1 modified (availability.service.ts), 1 modified (availability.test.ts)  
**Tests executed:** 76/76 passed  
**Result:** ✅ Production-ready Availability Engine implemented successfully

The Availability Engine is complete, tested, and ready to support mentor allocation, booking creation, and capacity enforcement features.
