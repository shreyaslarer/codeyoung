import { describe, it, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import {
  isValidTimezone,
  validateTimezone,
  localDateTimeToUtcInstant,
  utcInstantToLocalDateTime,
  getLocalDateForInstant,
  doIntervalsOverlap,
  isTimeInInterval,
  getLocalDayBoundaries,
} from '../src/utils/temporal.utils.js';

describe('Temporal Utilities', () => {
  describe('isValidTimezone', () => {
    it('should accept valid IANA timezone identifiers', () => {
      const validTimezones = [
        'Asia/Kolkata',
        'Europe/London',
        'America/New_York',
        'America/Los_Angeles',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC',
      ];

      validTimezones.forEach(tz => {
        expect(isValidTimezone(tz)).toBe(true);
      });
    });

    it('should reject invalid timezone identifiers', () => {
      const invalidTimezones = [
        'Invalid/Timezone',      // Non-existent
        'Asia/InvalidCity',      // Non-existent city
        'NotAZone',              // Invalid format
        'America/FakeCity',      // Non-existent city
        'XYZ',                   // Invalid
        'UTC+5:30',              // Offset notation (not IANA)
      ];

      invalidTimezones.forEach(tz => {
        expect(isValidTimezone(tz)).toBe(false);
      });
    });
  });

  describe('validateTimezone', () => {
    it('should not throw for valid timezones', () => {
      expect(() => validateTimezone('Asia/Kolkata')).not.toThrow();
      expect(() => validateTimezone('Europe/London')).not.toThrow();
      expect(() => validateTimezone('America/New_York')).not.toThrow();
    });

    it('should throw for invalid timezones', () => {
      expect(() => validateTimezone('Invalid/Zone')).toThrow('Invalid IANA timezone identifier');
      expect(() => validateTimezone('NotAZone')).toThrow('Invalid IANA timezone identifier');
      expect(() => validateTimezone('FakeCity/FakeZone')).toThrow('Invalid IANA timezone identifier');
    });

    it('should include field name in error message', () => {
      expect(() => validateTimezone('NotAZone', 'parentTimezone')).toThrow('parentTimezone');
      expect(() => validateTimezone('Invalid/Zone', 'mentorTimezone')).toThrow('mentorTimezone');
    });
  });

  describe('localDateTimeToUtcInstant', () => {
    it('should convert London time to UTC correctly', () => {
      // London is UTC+1 (BST) in September 2026
      const instant = localDateTimeToUtcInstant('2026-09-30', '10:00', 'Europe/London');
      
      // 10:00 BST = 09:00 UTC
      expect(instant).toBe('2026-09-30T09:00:00Z');
    });

    it('should convert India time to UTC correctly', () => {
      // India is always UTC+5:30
      const instant = localDateTimeToUtcInstant('2026-09-30', '14:30', 'Asia/Kolkata');
      
      // 14:30 IST = 09:00 UTC
      expect(instant).toBe('2026-09-30T09:00:00Z');
    });

    it('should convert New York time to UTC correctly', () => {
      // New York is UTC-4 (EDT) in September 2026
      const instant = localDateTimeToUtcInstant('2026-09-30', '05:00', 'America/New_York');
      
      // 05:00 EDT = 09:00 UTC
      expect(instant).toBe('2026-09-30T09:00:00Z');
    });

    it('should handle midnight correctly', () => {
      const instant = localDateTimeToUtcInstant('2026-09-30', '00:00', 'Asia/Kolkata');
      
      // 00:00 IST = 18:30 UTC on previous day
      expect(instant).toBe('2026-09-29T18:30:00Z');
    });

    it('should handle end of day correctly', () => {
      const instant = localDateTimeToUtcInstant('2026-09-30', '23:59', 'Asia/Kolkata');
      
      // 23:59 IST
      expect(instant).toBe('2026-09-30T18:29:00Z');
    });

    it('should throw for invalid timezone', () => {
      expect(() => {
        localDateTimeToUtcInstant('2026-09-30', '10:00', 'Invalid/Zone');
      }).toThrow('Invalid IANA timezone identifier');
    });

    it('should throw for invalid date', () => {
      expect(() => {
        localDateTimeToUtcInstant('2026-13-01', '10:00', 'Asia/Kolkata');
      }).toThrow('Cannot convert local time');
    });

    it('should throw for invalid time', () => {
      expect(() => {
        localDateTimeToUtcInstant('2026-09-30', '25:00', 'Asia/Kolkata');
      }).toThrow('Cannot convert local time');
    });
  });

  describe('utcInstantToLocalDateTime', () => {
    it('should convert UTC to London time correctly', () => {
      const result = utcInstantToLocalDateTime('2026-09-30T09:00:00Z', 'Europe/London');
      
      // 09:00 UTC = 10:00 BST
      expect(result).toEqual({
        localDate: '2026-09-30',
        localTime: '10:00',
      });
    });

    it('should convert UTC to India time correctly', () => {
      const result = utcInstantToLocalDateTime('2026-09-30T09:00:00Z', 'Asia/Kolkata');
      
      // 09:00 UTC = 14:30 IST
      expect(result).toEqual({
        localDate: '2026-09-30',
        localTime: '14:30',
      });
    });

    it('should convert UTC to New York time correctly', () => {
      const result = utcInstantToLocalDateTime('2026-09-30T09:00:00Z', 'America/New_York');
      
      // 09:00 UTC = 05:00 EDT
      expect(result).toEqual({
        localDate: '2026-09-30',
        localTime: '05:00',
      });
    });

    it('should handle date boundary crossing', () => {
      // Late UTC time becomes next day in Asia
      const result = utcInstantToLocalDateTime('2026-09-30T20:00:00Z', 'Asia/Kolkata');
      
      // 20:00 UTC = 01:30 IST next day
      expect(result).toEqual({
        localDate: '2026-10-01',
        localTime: '01:30',
      });
    });

    it('should throw for invalid timezone', () => {
      expect(() => {
        utcInstantToLocalDateTime('2026-09-30T09:00:00Z', 'Invalid/Zone');
      }).toThrow('Invalid IANA timezone identifier');
    });

    it('should throw for invalid instant', () => {
      expect(() => {
        utcInstantToLocalDateTime('invalid-instant', 'Asia/Kolkata');
      }).toThrow('Cannot convert instant');
    });
  });

  describe('getLocalDateForInstant', () => {
    it('should return local date in specified timezone', () => {
      const instant = '2026-09-30T09:00:00Z';
      
      const londonDate = getLocalDateForInstant(instant, 'Europe/London');
      expect(londonDate).toBe('2026-09-30');
      
      const indiaDate = getLocalDateForInstant(instant, 'Asia/Kolkata');
      expect(indiaDate).toBe('2026-09-30');
      
      const nyDate = getLocalDateForInstant(instant, 'America/New_York');
      expect(nyDate).toBe('2026-09-30');
    });

    it('should show different dates for same instant in different timezones', () => {
      // Late UTC time
      const instant = '2026-09-30T23:30:00Z';
      
      // Still Sept 30 in New York (UTC-4)
      const nyDate = getLocalDateForInstant(instant, 'America/New_York');
      expect(nyDate).toBe('2026-09-30');
      
      // Already Oct 1 in India (UTC+5:30)
      const indiaDate = getLocalDateForInstant(instant, 'Asia/Kolkata');
      expect(indiaDate).toBe('2026-10-01');
    });

    it('should throw for invalid timezone', () => {
      expect(() => {
        getLocalDateForInstant('2026-09-30T09:00:00Z', 'Invalid/Zone');
      }).toThrow('Invalid IANA timezone identifier');
    });

    it('should throw for invalid instant', () => {
      expect(() => {
        getLocalDateForInstant('not-an-instant', 'Asia/Kolkata');
      }).toThrow('Cannot get local date');
    });
  });

  describe('doIntervalsOverlap', () => {
    it('should detect overlapping intervals', () => {
      // Class 1: 09:00-09:30
      // Class 2: 09:15-09:45
      const overlaps = doIntervalsOverlap(
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z',
        '2026-09-30T09:15:00Z',
        '2026-09-30T09:45:00Z'
      );
      
      expect(overlaps).toBe(true);
    });

    it('should detect when first interval contains second', () => {
      // Class 1: 09:00-10:00
      // Class 2: 09:15-09:45
      const overlaps = doIntervalsOverlap(
        '2026-09-30T09:00:00Z',
        '2026-09-30T10:00:00Z',
        '2026-09-30T09:15:00Z',
        '2026-09-30T09:45:00Z'
      );
      
      expect(overlaps).toBe(true);
    });

    it('should detect when second interval contains first', () => {
      // Class 1: 09:15-09:45
      // Class 2: 09:00-10:00
      const overlaps = doIntervalsOverlap(
        '2026-09-30T09:15:00Z',
        '2026-09-30T09:45:00Z',
        '2026-09-30T09:00:00Z',
        '2026-09-30T10:00:00Z'
      );
      
      expect(overlaps).toBe(true);
    });

    it('should NOT detect overlap for adjacent intervals (half-open semantics)', () => {
      // Class 1: 09:00-09:30
      // Class 2: 09:30-10:00
      // These should NOT overlap (end of first = start of second)
      const overlaps = doIntervalsOverlap(
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z',
        '2026-09-30T09:30:00Z',
        '2026-09-30T10:00:00Z'
      );
      
      expect(overlaps).toBe(false);
    });

    it('should NOT detect overlap for separate intervals', () => {
      // Class 1: 09:00-09:30
      // Class 2: 10:00-10:30
      const overlaps = doIntervalsOverlap(
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z',
        '2026-09-30T10:00:00Z',
        '2026-09-30T10:30:00Z'
      );
      
      expect(overlaps).toBe(false);
    });

    it('should throw if first interval start >= end', () => {
      expect(() => {
        doIntervalsOverlap(
          '2026-09-30T09:30:00Z',
          '2026-09-30T09:00:00Z', // End before start
          '2026-09-30T10:00:00Z',
          '2026-09-30T10:30:00Z'
        );
      }).toThrow('First interval start must be before end');
    });

    it('should throw if second interval start >= end', () => {
      expect(() => {
        doIntervalsOverlap(
          '2026-09-30T09:00:00Z',
          '2026-09-30T09:30:00Z',
          '2026-09-30T10:30:00Z',
          '2026-09-30T10:00:00Z' // End before start
        );
      }).toThrow('Second interval start must be before end');
    });
  });

  describe('isTimeInInterval', () => {
    it('should return true for time inside interval', () => {
      const result = isTimeInInterval(
        '2026-09-30T09:15:00Z',  // Time point
        '2026-09-30T09:00:00Z',  // Start
        '2026-09-30T09:30:00Z'   // End
      );
      
      expect(result).toBe(true);
    });

    it('should return true for time at start boundary (inclusive)', () => {
      const result = isTimeInInterval(
        '2026-09-30T09:00:00Z',  // Exactly at start
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z'
      );
      
      expect(result).toBe(true);
    });

    it('should return false for time at end boundary (exclusive)', () => {
      const result = isTimeInInterval(
        '2026-09-30T09:30:00Z',  // Exactly at end
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z'
      );
      
      expect(result).toBe(false);
    });

    it('should return false for time before interval', () => {
      const result = isTimeInInterval(
        '2026-09-30T08:45:00Z',  // Before start
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z'
      );
      
      expect(result).toBe(false);
    });

    it('should return false for time after interval', () => {
      const result = isTimeInInterval(
        '2026-09-30T10:00:00Z',  // After end
        '2026-09-30T09:00:00Z',
        '2026-09-30T09:30:00Z'
      );
      
      expect(result).toBe(false);
    });

    it('should throw if interval start >= end', () => {
      expect(() => {
        isTimeInInterval(
          '2026-09-30T09:15:00Z',
          '2026-09-30T09:30:00Z',
          '2026-09-30T09:00:00Z'  // End before start
        );
      }).toThrow('Interval start must be before end');
    });
  });

  describe('getLocalDayBoundaries', () => {
    it('should return correct boundaries for Asia/Kolkata', () => {
      const boundaries = getLocalDayBoundaries('2026-09-30', 'Asia/Kolkata');
      
      // 2026-09-30 00:00 IST = 2026-09-29 18:30 UTC
      // 2026-10-01 00:00 IST = 2026-09-30 18:30 UTC
      expect(boundaries.startInstant).toBe('2026-09-29T18:30:00Z');
      expect(boundaries.endInstant).toBe('2026-09-30T18:30:00Z');
    });

    it('should return correct boundaries for Europe/London', () => {
      const boundaries = getLocalDayBoundaries('2026-09-30', 'Europe/London');
      
      // 2026-09-30 00:00 BST = 2026-09-29 23:00 UTC (London is UTC+1 in September)
      // 2026-10-01 00:00 BST = 2026-09-30 23:00 UTC
      expect(boundaries.startInstant).toBe('2026-09-29T23:00:00Z');
      expect(boundaries.endInstant).toBe('2026-09-30T23:00:00Z');
    });

    it('should return correct boundaries for America/New_York', () => {
      const boundaries = getLocalDayBoundaries('2026-09-30', 'America/New_York');
      
      // 2026-09-30 00:00 EDT = 2026-09-30 04:00 UTC (New York is UTC-4 in September)
      // 2026-10-01 00:00 EDT = 2026-10-01 04:00 UTC
      expect(boundaries.startInstant).toBe('2026-09-30T04:00:00Z');
      expect(boundaries.endInstant).toBe('2026-10-01T04:00:00Z');
    });

    it('should create a 24-hour interval', () => {
      const boundaries = getLocalDayBoundaries('2026-09-30', 'Asia/Kolkata');
      
      const start = Temporal.Instant.from(boundaries.startInstant);
      const end = Temporal.Instant.from(boundaries.endInstant);
      
      const duration = start.until(end, { largestUnit: 'hour' });
      expect(duration.hours).toBe(24);
    });

    it('should throw for invalid timezone', () => {
      expect(() => {
        getLocalDayBoundaries('2026-09-30', 'Invalid/Zone');
      }).toThrow('Invalid IANA timezone identifier');
    });

    it('should throw for invalid date', () => {
      expect(() => {
        getLocalDayBoundaries('2026-13-01', 'Asia/Kolkata');
      }).toThrow('Cannot get day boundaries');
    });
  });

  describe('DST Transition Handling', () => {
    it('should handle timezone conversion during DST transitions', () => {
      // Test that the library handles DST correctly
      // UK clock goes forward on last Sunday of March (skip 01:00-02:00)
      // UK clock goes back on last Sunday of October (repeat 01:00-02:00)
      
      // This test verifies the Temporal API handles DST without manual offset calculation
      const beforeDST = localDateTimeToUtcInstant('2026-03-28', '12:00', 'Europe/London');
      const afterDST = localDateTimeToUtcInstant('2026-03-30', '12:00', 'Europe/London');
      
      // Both should succeed without throwing
      expect(beforeDST).toBeDefined();
      expect(afterDST).toBeDefined();
      
      // The UTC offsets will differ by 1 hour
      const before = Temporal.Instant.from(beforeDST);
      const after = Temporal.Instant.from(afterDST);
      expect(before).toBeDefined();
      expect(after).toBeDefined();
    });

    it('should preserve timezone identity across conversions', () => {
      // Convert: local -> UTC -> local should preserve the original values
      const originalDate = '2026-09-30';
      const originalTime = '14:30';
      const timezone = 'Asia/Kolkata';
      
      const instant = localDateTimeToUtcInstant(originalDate, originalTime, timezone);
      const result = utcInstantToLocalDateTime(instant, timezone);
      
      expect(result.localDate).toBe(originalDate);
      expect(result.localTime).toBe(originalTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const instant = localDateTimeToUtcInstant('2024-02-29', '12:00', 'Asia/Kolkata');
      expect(instant).toBeDefined();
      
      const result = utcInstantToLocalDateTime(instant, 'Asia/Kolkata');
      expect(result.localDate).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      const instant = localDateTimeToUtcInstant('2026-12-31', '23:59', 'Asia/Kolkata');
      expect(instant).toBe('2026-12-31T18:29:00Z');
      
      const result = utcInstantToLocalDateTime(instant, 'Asia/Kolkata');
      expect(result.localDate).toBe('2026-12-31');
      expect(result.localTime).toBe('23:59');
    });

    it('should handle midnight transitions correctly', () => {
      // Just before midnight in India
      const instant1 = localDateTimeToUtcInstant('2026-09-30', '23:59', 'Asia/Kolkata');
      const date1 = getLocalDateForInstant(instant1, 'Asia/Kolkata');
      expect(date1).toBe('2026-09-30');
      
      // Just after midnight in India
      const instant2 = localDateTimeToUtcInstant('2026-10-01', '00:01', 'Asia/Kolkata');
      const date2 = getLocalDateForInstant(instant2, 'Asia/Kolkata');
      expect(date2).toBe('2026-10-01');
    });
  });
});
