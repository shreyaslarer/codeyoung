import { describe, it, expect } from 'vitest';
import {
  parseTo24Hour,
  localTimeToUtcIsoInstant,
  generateSlotsForDate,
} from '@/lib/slot-service';

describe('Slot Service & Timezone Calculation', () => {
  describe('parseTo24Hour', () => {
    it('should correctly parse AM hours', () => {
      expect(parseTo24Hour('09:00 AM')).toBe('09:00');
      expect(parseTo24Hour('11:30 AM')).toBe('11:30');
    });

    it('should handle 12:00 AM (midnight)', () => {
      expect(parseTo24Hour('12:00 AM')).toBe('00:00');
      expect(parseTo24Hour('12:30 AM')).toBe('00:30');
    });

    it('should handle 12:00 PM (noon)', () => {
      expect(parseTo24Hour('12:00 PM')).toBe('12:00');
      expect(parseTo24Hour('12:30 PM')).toBe('12:30');
    });

    it('should correctly parse PM hours', () => {
      expect(parseTo24Hour('01:00 PM')).toBe('13:00');
      expect(parseTo24Hour('03:30 PM')).toBe('15:30');
      expect(parseTo24Hour('11:00 PM')).toBe('23:00');
    });
  });

  describe('localTimeToUtcIsoInstant', () => {
    it('should correctly calculate UTC instant for London (BST: UTC+1 in September)', () => {
      const instant = localTimeToUtcIsoInstant('2026-09-29', '10:00 AM', 'Europe/London');
      // 10:00 BST -> 09:00 UTC
      expect(instant).toBe('2026-09-29T09:00:00.000Z');
    });

    it('should correctly calculate UTC instant for Kolkata (IST: UTC+5:30)', () => {
      const instant = localTimeToUtcIsoInstant('2026-09-29', '10:00 AM', 'Asia/Kolkata');
      // 10:00 IST -> 04:30 UTC
      expect(instant).toBe('2026-09-29T04:30:00.000Z');
    });

    it('should correctly calculate UTC instant for New York (EDT: UTC-4 in September)', () => {
      const instant = localTimeToUtcIsoInstant('2026-09-29', '10:00 AM', 'America/New_York');
      // 10:00 EDT -> 14:00 UTC
      expect(instant).toBe('2026-09-29T14:00:00.000Z');
    });

    it('should handle afternoon slots accurately across timezones', () => {
      const instant = localTimeToUtcIsoInstant('2026-09-29', '02:00 PM', 'Europe/London');
      expect(instant).toBe('2026-09-29T13:00:00.000Z');
    });
  });

  describe('generateSlotsForDate', () => {
    it('should return empty slots array for Sunday (no classes on Sundays)', () => {
      // 2026-10-04 is a Sunday
      const slots = generateSlotsForDate('2026-10-04', 'Europe/London');
      expect(slots).toEqual([]);
    });

    it('should generate morning and afternoon slots for weekdays', () => {
      // 2026-09-29 is a Tuesday
      const slots = generateSlotsForDate('2026-09-29', 'Europe/London');
      expect(slots.length).toBeGreaterThan(0);

      const morningSlots = slots.filter((s) => s.period === 'MORNING');
      const afternoonSlots = slots.filter((s) => s.period === 'AFTERNOON');

      expect(morningSlots.length).toBe(6); // 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
      expect(afternoonSlots.length).toBe(6); // 01:00, 01:30, 02:00, 02:30, 03:00, 03:30
    });

    it('should generate valid UTC ISO instants for every slot matching target timezone', () => {
      const slots = generateSlotsForDate('2026-09-29', 'Asia/Kolkata');
      const tenAmSlot = slots.find((s) => s.time === '10:00 AM');

      expect(tenAmSlot).toBeDefined();
      expect(tenAmSlot?.isoInstant).toBe('2026-09-29T04:30:00.000Z');
      expect(tenAmSlot?.available).toBe(true);
    });
  });
});
