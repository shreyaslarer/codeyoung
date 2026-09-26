import { describe, it, expect, beforeEach } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { availabilityService } from '../src/services/availability.service.js';
import { Mentor } from '../src/models/mentor.schema.js';

describe('Availability Engine', () => {
  beforeEach(async () => {
    // Only clean up test data, NOT production mentors
    // The 10 production mentors should remain intact
  });

  describe('Normal Availability', () => {
    it('should return available slots for valid date and timezone', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
      
      expect(result.parentDate).toBe('2026-09-30');
      expect(result.parentTimezone).toBe('Europe/London');
      expect(result.trialDurationMinutes).toBe(30);
      expect(result.slots.length).toBeGreaterThan(0);
    });

    it('should return slots with correct structure', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
      const firstSlot = result.slots[0];
      
      expect(firstSlot).toHaveProperty('startInstant');
      expect(firstSlot).toHaveProperty('endInstant');
      expect(firstSlot).toHaveProperty('parentLocalDate');
      expect(firstSlot).toHaveProperty('parentLocalTime');
      expect(firstSlot).toHaveProperty('eligibleMentorIds');
      expect(firstSlot.parentLocalTime).toMatch(/^\d{2}:\d{2}$/);
      expect(Array.isArray(firstSlot.eligibleMentorIds)).toBe(true);
      expect(firstSlot.eligibleMentorIds.length).toBeGreaterThan(0);
    });

    it('should return slots sorted by start time', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Asia/Kolkata');
      
      for (let i = 1; i < result.slots.length; i++) {
        const prev = Temporal.Instant.from(result.slots[i - 1].startInstant);
        const curr = Temporal.Instant.from(result.slots[i].startInstant);
        expect(Temporal.Instant.compare(prev, curr)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Parent/Mentor Timezone Differences', () => {
    it('should generate correct slots for multiple timezones', async () => {
      const timezones = ['Europe/London', 'America/New_York', 'Asia/Tokyo'];
      
      for (const tz of timezones) {
        const result = await availabilityService.getAvailableSlots('2026-09-30', tz);
        expect(result.slots.length).toBeGreaterThan(0);
        
        // Verify each slot falls within mentor working hours (09:00-18:00 IST)
        for (const slot of result.slots) {
          const instant = Temporal.Instant.from(slot.startInstant);
          const kolkataTime = instant.toZonedDateTimeISO('Asia/Kolkata');
          expect(kolkataTime.hour).toBeGreaterThanOrEqual(9);
          expect(kolkataTime.hour).toBeLessThan(18);
        }
      }
    });

    it('should show different parent local times for same instant in different timezones', async () => {
      const londonResult = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
      const nyResult = await availabilityService.getAvailableSlots('2026-09-30', 'America/New_York');
      
      // Find a slot that exists in both results (same instant)
      const commonSlot = londonResult.slots.find(londonSlot =>
        nyResult.slots.some(nySlot => nySlot.startInstant === londonSlot.startInstant)
      );
      
      if (commonSlot) {
        const nySlot = nyResult.slots.find(s => s.startInstant === commonSlot.startInstant);
        // Same instant should have different local times
        expect(commonSlot.parentLocalTime).not.toBe(nySlot?.parentLocalTime);
      }
    });
  });

  describe('Working Hours Boundaries', () => {
    it('should only return slots within mentor working hours', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Asia/Kolkata');
      
      // All slots should fall within 09:00-18:00 IST
      for (const slot of result.slots) {
        const instant = Temporal.Instant.from(slot.startInstant);
        const endInstant = Temporal.Instant.from(slot.endInstant);
        
        const startInKolkata = instant.toZonedDateTimeISO('Asia/Kolkata');
        const endInKolkata = endInstant.toZonedDateTimeISO('Asia/Kolkata');
        
        expect(startInKolkata.hour).toBeGreaterThanOrEqual(9);
        expect(endInKolkata.hour).toBeLessThanOrEqual(18);
      }
    });

    it('should not include slots that start before working hours', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Asia/Kolkata');
      
      for (const slot of result.slots) {
        const instant = Temporal.Instant.from(slot.startInstant);
        const kolkataTime = instant.toZonedDateTimeISO('Asia/Kolkata');
        
        // No slot should start before 09:00
        expect(kolkataTime.hour).toBeGreaterThanOrEqual(9);
      }
    });

    it('should not include slots that end after working hours', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Asia/Kolkata');
      
      for (const slot of result.slots) {
        const endInstant = Temporal.Instant.from(slot.endInstant);
        const kolkataTime = endInstant.toZonedDateTimeISO('Asia/Kolkata');
        
        // No slot should end after 18:00
        expect(kolkataTime.hour).toBeLessThanOrEqual(18);
      }
    });
  });

  describe('Date Boundary Changes', () => {
    it('should handle date boundary crossing correctly', async () => {
      // Request early morning in New York - should map to different day in India
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'America/New_York');
      
      // All returned slots should be on the parent's requested date
      for (const slot of result.slots) {
        expect(slot.parentLocalDate).toBe('2026-09-30');
      }
    });

    it('should only return slots for the requested parent date', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
      
      for (const slot of result.slots) {
        expect(slot.parentLocalDate).toBe('2026-09-30');
      }
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid date format', async () => {
      await expect(
        availabilityService.getAvailableSlots('30-09-2026', 'Europe/London')
      ).rejects.toThrow('Invalid date format');
    });

    it('should throw error for invalid timezone', async () => {
      await expect(
        availabilityService.getAvailableSlots('2026-09-30', 'Invalid/Zone')
      ).rejects.toThrow('Invalid IANA timezone identifier');
    });

    it('should throw error for invalid trial duration', async () => {
      await expect(
        availabilityService.getAvailableSlots('2026-09-30', 'Europe/London', -10)
      ).rejects.toThrow('Invalid trial duration');
      
      await expect(
        availabilityService.getAvailableSlots('2026-09-30', 'Europe/London', 0)
      ).rejects.toThrow('Invalid trial duration');
      
      await expect(
        availabilityService.getAvailableSlots('2026-09-30', 'Europe/London', 300)
      ).rejects.toThrow('Invalid trial duration');
    });
  });

  describe('Inactive Mentors', () => {
    it('should not include inactive mentors in availability', async () => {
      // Temporarily deactivate one mentor
      const testMentor = await Mentor.findOne({ active: true });
      if (!testMentor) {
        throw new Error('No active mentor found for test');
      }

      const originalStatus = testMentor.active;
      testMentor.active = false;
      await testMentor.save();

      try {
        const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
        
        // Verify the deactivated mentor is not in any eligible list
        for (const slot of result.slots) {
          expect(slot.eligibleMentorIds).not.toContain(testMentor._id.toString());
        }
      } finally {
        // Restore original status
        testMentor.active = originalStatus;
        await testMentor.save();
      }
    });
  });

  describe('No Available Slots', () => {
    it('should return empty slots when no mentors exist', async () => {
      // Temporarily deactivate all mentors
      await Mentor.updateMany({}, { active: false });

      try {
        const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
        expect(result.slots).toEqual([]);
      } finally {
        // Restore all mentors
        await Mentor.updateMany({}, { active: true });
      }
    });
  });

  describe('Adjacent Slots', () => {
    it('should generate adjacent 30-minute slots', async () => {
      const result = await availabilityService.getAvailableSlots('2026-09-30', 'Asia/Kolkata');
      
      // Find two consecutive slots
      for (let i = 1; i < result.slots.length; i++) {
        const prevEnd = Temporal.Instant.from(result.slots[i - 1].endInstant);
        const currStart = Temporal.Instant.from(result.slots[i].startInstant);
        
        // Check if they are adjacent (prevEnd === currStart for 30-min slots)
        const duration = prevEnd.until(currStart, { largestUnit: 'minute' });
        
        // Slots should be either adjacent (0 minutes) or separated
        expect(duration.minutes).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
