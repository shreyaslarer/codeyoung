/**
 * Temporal Utilities for timezone-safe scheduling.
 *
 * This module provides pure utility functions for working with IANA timezones,
 * converting between local times and UTC instants, and handling time intervals.
 *
 * All functions use IANA timezone identifiers (e.g., 'Asia/Kolkata', 'Europe/London')
 * and never manually calculate timezone offsets. DST transitions are handled
 * automatically by the Temporal API.
 *
 * These utilities are independent from database, HTTP, and business logic.
 */
/**
 * Validates whether a string is a valid IANA timezone identifier.
 *
 * Examples of valid timezones:
 * - 'Asia/Kolkata'
 * - 'Europe/London'
 * - 'America/New_York'
 *
 * Examples of invalid timezones:
 * - 'IST' (abbreviation, not IANA identifier)
 * - 'UTC+5:30' (offset, not timezone)
 * - 'Invalid/Zone'
 *
 * @param timezone - The timezone string to validate
 * @returns true if the timezone is valid, false otherwise
 */
export declare function isValidTimezone(timezone: string): boolean;
/**
 * Validates a timezone and throws an error if invalid.
 * Use this for required timezone parameters where validation failure should stop execution.
 *
 * @param timezone - The timezone to validate
 * @param fieldName - Optional field name for better error messages
 * @throws Error if the timezone is invalid
 */
export declare function validateTimezone(timezone: string, fieldName?: string): void;
/**
 * Converts a local date and time in a specific timezone into an exact UTC instant.
 *
 * This handles DST transitions correctly:
 * - During spring-forward, a non-existent local time will throw an error
 * - During fall-back, an ambiguous local time uses the first occurrence (before the clock goes back)
 *
 * @param localDate - ISO date string (YYYY-MM-DD)
 * @param localTime - Time string (HH:MM or HH:MM:SS)
 * @param timezone - IANA timezone identifier
 * @returns UTC instant as an ISO string
 *
 * @example
 * // Parent in London books for 10:00 AM their time
 * const instant = localDateTimeToUtcInstant('2026-09-30', '10:00', 'Europe/London');
 * // Returns '2026-09-30T09:00:00Z' (London is UTC+1 in September)
 */
export declare function localDateTimeToUtcInstant(localDate: string, localTime: string, timezone: string): string;
/**
 * Converts a UTC instant to local date and time in a specific timezone.
 *
 * @param utcInstant - UTC instant as an ISO string
 * @param timezone - IANA timezone identifier
 * @returns Object containing local date (YYYY-MM-DD) and time (HH:MM)
 *
 * @example
 * // Convert a UTC instant to mentor's local time in India
 * const local = utcInstantToLocalDateTime('2026-09-30T09:00:00Z', 'Asia/Kolkata');
 * // Returns { localDate: '2026-09-30', localTime: '14:30' }
 * // (India is UTC+5:30)
 */
export declare function utcInstantToLocalDateTime(utcInstant: string, timezone: string): {
    localDate: string;
    localTime: string;
};
/**
 * Determines the local calendar date for a UTC instant in a specific timezone.
 *
 * Important: The same UTC instant corresponds to different calendar dates
 * in different timezones.
 *
 * @param utcInstant - UTC instant as an ISO string
 * @param timezone - IANA timezone identifier
 * @returns Local date string (YYYY-MM-DD)
 *
 * @example
 * // A booking at 2026-09-30T23:30:00Z
 * const mentorDate = getLocalDateForInstant('2026-09-30T23:30:00Z', 'Asia/Kolkata');
 * // Returns '2026-10-01' (next day in India due to +5:30 offset)
 *
 * const parentDate = getLocalDateForInstant('2026-09-30T23:30:00Z', 'America/New_York');
 * // Returns '2026-09-30' (still same day in New York due to negative offset)
 */
export declare function getLocalDateForInstant(utcInstant: string, timezone: string): string;
/**
 * Checks if two time intervals overlap using half-open interval semantics [start, end).
 *
 * Half-open interval means:
 * - Start is inclusive
 * - End is exclusive
 *
 * This allows adjacent intervals without overlap:
 * [09:00, 09:30) and [09:30, 10:00) do NOT overlap.
 *
 * Two intervals overlap if:
 * startTime1 < endTime2 AND startTime2 < endTime1
 *
 * @param startTime1 - Start of first interval (UTC instant string)
 * @param endTime1 - End of first interval (UTC instant string)
 * @param startTime2 - Start of second interval (UTC instant string)
 * @param endTime2 - End of second interval (UTC instant string)
 * @returns true if the intervals overlap, false otherwise
 *
 * @example
 * // Class 1: 09:00-09:30
 * // Class 2: 09:30-10:00
 * const overlap = doIntervalsOverlap(
 *   '2026-09-30T09:00:00Z', '2026-09-30T09:30:00Z',
 *   '2026-09-30T09:30:00Z', '2026-09-30T10:00:00Z'
 * );
 * // Returns false (adjacent classes don't overlap)
 *
 * @example
 * // Class 1: 09:00-09:30
 * // Class 2: 09:15-09:45
 * const overlap = doIntervalsOverlap(
 *   '2026-09-30T09:00:00Z', '2026-09-30T09:30:00Z',
 *   '2026-09-30T09:15:00Z', '2026-09-30T09:45:00Z'
 * );
 * // Returns true (15 minute overlap)
 */
export declare function doIntervalsOverlap(startTime1: string, endTime1: string, startTime2: string, endTime2: string): boolean;
/**
 * Checks if a time point falls within a half-open interval [start, end).
 *
 * The time point is considered inside if:
 * start <= timePoint < end
 *
 * @param timePoint - The time point to check (UTC instant string)
 * @param startTime - Start of interval (UTC instant string)
 * @param endTime - End of interval (UTC instant string)
 * @returns true if timePoint is in [startTime, endTime), false otherwise
 *
 * @example
 * const isInside = isTimeInInterval(
 *   '2026-09-30T09:15:00Z',
 *   '2026-09-30T09:00:00Z',
 *   '2026-09-30T09:30:00Z'
 * );
 * // Returns true (09:15 is between 09:00 and 09:30)
 *
 * @example
 * const isInside = isTimeInInterval(
 *   '2026-09-30T09:30:00Z',
 *   '2026-09-30T09:00:00Z',
 *   '2026-09-30T09:30:00Z'
 * );
 * // Returns false (end boundary is exclusive)
 */
export declare function isTimeInInterval(timePoint: string, startTime: string, endTime: string): boolean;
/**
 * Creates the start and end instants for a full calendar day in a specific timezone.
 * Returns [dayStart, dayEnd) as a half-open interval.
 *
 * @param localDate - Local date string (YYYY-MM-DD)
 * @param timezone - IANA timezone identifier
 * @returns Object with startInstant (00:00:00 on the date) and endInstant (00:00:00 next day)
 *
 * @example
 * // Get the full day 2026-09-30 in Asia/Kolkata timezone
 * const day = getLocalDayBoundaries('2026-09-30', 'Asia/Kolkata');
 * // Returns:
 * // {
 * //   startInstant: '2026-09-29T18:30:00Z', // 00:00 IST = 18:30 UTC previous day
 * //   endInstant: '2026-09-30T18:30:00Z'    // 00:00 IST next day
 * // }
 */
export declare function getLocalDayBoundaries(localDate: string, timezone: string): {
    startInstant: string;
    endInstant: string;
};
