/**
 * Domain types for the Codeyoung Trial Class Scheduling Platform.
 * Follows strict TypeScript typing and domain-driven design principles.
 */

export type BookingStep = 1 | 2 | 3;

export interface TimezoneOption {
  readonly iana: string;
  readonly label: string;
  readonly city: string;
  readonly region: string;
  readonly utcOffset: string;
}

export type SlotPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';

/**
 * Frontend slot derived from backend AvailabilitySlot.
 * The backend is the authoritative source for slot data.
 */
export interface Slot {
  readonly id: string;
  readonly time: string;           // Display time (e.g., "10:00 AM")
  readonly period: SlotPeriod;     // UI grouping (morning/afternoon)
  readonly startInstant: string;   // Backend authoritative UTC instant
  readonly endInstant: string;     // Backend authoritative UTC instant
  readonly parentLocalDate: string; // Backend-provided local date
  readonly parentLocalTime: string; // Backend-provided local time (24h format)
  readonly eligibleMentorIds: string[]; // Backend-provided eligible mentors
  readonly isoInstant?: string;
  readonly available?: boolean;
}

export interface DateItem {
  readonly dateStr: string;       // "YYYY-MM-DD"
  readonly dayName: string;       // "MON", "TUE", etc.
  readonly dayNumber: string;     // "28", "29", "01", etc.
  readonly fullFormatted: string; // "Tuesday, September 29"
  readonly monthYear: string;     // "September 2026"
}

export interface BookingState {
  step: BookingStep;
  timezone: TimezoneOption;
  selectedDate: string;
  selectedTime: string;
  dateFormatted: string;
  parentName: string;
  parentEmail: string;
}

/**
 * Confirmed booking data from backend.
 * Contains the real booking response after successful creation.
 */
export interface ConfirmedBooking {
  readonly id: string;
  readonly mentorId: string;
  readonly parentName: string;
  readonly parentEmail: string;
  readonly startTime: string;      // ISO 8601 UTC instant
  readonly endTime: string;        // ISO 8601 UTC instant
  readonly parentTimezone: string;
  readonly status: 'CONFIRMED' | 'CANCELLED';
  readonly classUrl: string;
}
