import { mentorRepository } from '../repositories/mentor.repository.js';
import { IMentor } from '../models/mentor.schema.js';
import {
  validateTimezone,
  utcInstantToLocalDateTime,
  getLocalDateForInstant,
} from '../utils/temporal.utils.js';
import { Temporal } from '@js-temporal/polyfill';

const DEFAULT_TRIAL_DURATION_MINUTES = 30;
const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

/**
 * Represents a single available time slot.
 * Contains UTC instants and the mentor IDs that can handle this slot.
 */
export interface AvailableSlot {
  startInstant: string;
  endInstant: string;
  parentLocalDate: string;
  parentLocalTime: string;
  eligibleMentorIds: string[];
}

/**
 * Result of an availability query.
 */
export interface AvailabilityResult {
  parentDate: string;
  parentTimezone: string;
  trialDurationMinutes: number;
  slots: AvailableSlot[];
}

/**
 * Availability Engine
 * 
 * Generates available trial class slots by:
 * 1. Validating parent timezone and requested date
 * 2. Getting all active mentors
 * 3. Generating candidate slots from mentor working hours
 * 4. Converting to UTC instants using Temporal Utilities
 * 5. Verifying slots fall within working hours using half-open intervals
 * 6. Returning slots with eligible mentor IDs
 * 
 * Does NOT:
 * - Allocate mentors (that's the allocation service's responsibility)
 * - Check booking conflicts (that's the booking service's responsibility)
 * - Enforce daily capacity (that's the capacity service's responsibility)
 */
export class AvailabilityService {
  /**
   * Get available trial class slots for a parent's requested date.
   * 
   * @param parentDate - The date in YYYY-MM-DD format
   * @param parentTimezone - IANA timezone identifier (e.g., 'Europe/London')
   * @param trialDurationMinutes - Duration of trial class in minutes (default: 30)
   * @returns Availability result with slots and eligible mentor IDs
   */
  async getAvailableSlots(
    parentDate: string,
    parentTimezone: string,
    trialDurationMinutes: number = DEFAULT_TRIAL_DURATION_MINUTES
  ): Promise<AvailabilityResult> {
    // Validate inputs
    this.validateDate(parentDate);
    validateTimezone(parentTimezone, 'parentTimezone');
    this.validateDuration(trialDurationMinutes);

    // Get active mentors
    const activeMentors = await mentorRepository.findActiveMentors();

    // Handle no active mentors case
    if (activeMentors.length === 0) {
      return {
        parentDate,
        parentTimezone,
        trialDurationMinutes,
        slots: [],
      };
    }

    // Generate candidate slots for the parent's requested date
    const candidateSlots = this.generateCandidateSlots(
      parentDate,
      parentTimezone,
      trialDurationMinutes,
      activeMentors
    );

    // Filter slots by checking which mentors can handle each slot
    const availableSlots = this.filterSlotsByMentorAvailability(
      candidateSlots,
      parentDate,
      parentTimezone,
      activeMentors
    );

    return {
      parentDate,
      parentTimezone,
      trialDurationMinutes,
      slots: availableSlots,
    };
  }

  /**
   * Generate candidate time slots based on mentor working hours.
   * 
   * Strategy:
   * 1. For each active mentor, get their working hours in their timezone
   * 2. Convert working hours to UTC instants
   * 3. Project those instants back into parent timezone
   * 4. Keep only slots that fall on the parent's requested date
   * 5. Deduplicate slots (multiple mentors may create same slot)
   */
  private generateCandidateSlots(
    parentDate: string,
    parentTimezone: string,
    trialDurationMinutes: number,
    mentors: IMentor[]
  ): Map<string, { startInstant: string; endInstant: string }> {
    const slotsMap = new Map<string, { startInstant: string; endInstant: string }>();

    for (const mentor of mentors) {
      const mentorTimezone = mentor.timezone;
      const workingHoursStart = mentor.workingHoursStart;
      const workingHoursEnd = mentor.workingHoursEnd;

      // Get the parent's day boundaries in UTC
      const parentPlainDate = Temporal.PlainDate.from(parentDate);
      const parentDayStart = parentPlainDate.toZonedDateTime({
        timeZone: parentTimezone,
        plainTime: '00:00',
      });
      const parentDayEnd = parentPlainDate.add({ days: 1 }).toZonedDateTime({
        timeZone: parentTimezone,
        plainTime: '00:00',
      });

      // Convert to mentor's timezone to find which mentor calendar days overlap
      const mentorDayStart = parentDayStart.withTimeZone(mentorTimezone);
      const mentorDayEnd = parentDayEnd.withTimeZone(mentorTimezone);

      const mentorStartDate = mentorDayStart.toPlainDate();
      const mentorEndDate = mentorDayEnd.toPlainDate();

      // Collect all mentor dates that overlap with the parent's requested date
      const mentorDatesToCheck: Temporal.PlainDate[] = [mentorStartDate];
      if (Temporal.PlainDate.compare(mentorStartDate, mentorEndDate) !== 0) {
        mentorDatesToCheck.push(mentorEndDate);
      }

      // Generate slots for each mentor date
      for (const mentorDate of mentorDatesToCheck) {
        this.generateSlotsForMentorDate(
          mentorDate,
          mentorTimezone,
          workingHoursStart,
          workingHoursEnd,
          parentDate,
          parentTimezone,
          trialDurationMinutes,
          slotsMap
        );
      }
    }

    return slotsMap;
  }

  /**
   * Generate slots for a specific mentor date.
   */
  private generateSlotsForMentorDate(
    mentorDate: Temporal.PlainDate,
    mentorTimezone: string,
    workingHoursStart: string,
    workingHoursEnd: string,
    parentDate: string,
    parentTimezone: string,
    trialDurationMinutes: number,
    slotsMap: Map<string, { startInstant: string; endInstant: string }>
  ): void {
    const startTime = Temporal.PlainTime.from(workingHoursStart);
    const endTime = Temporal.PlainTime.from(workingHoursEnd);

    let currentTime = startTime;

    // Generate slots at DEFAULT_SLOT_INTERVAL_MINUTES intervals
    while (Temporal.PlainTime.compare(currentTime, endTime) < 0) {
      try {
        // Create zoned date time in mentor timezone
        const mentorSlotStart = mentorDate.toZonedDateTime({
          timeZone: mentorTimezone,
          plainTime: currentTime,
        });

        const mentorSlotInstant = mentorSlotStart.toInstant();
        const mentorSlotEndInstant = mentorSlotInstant.add({ minutes: trialDurationMinutes });

        // Check if this slot falls on the parent's requested date
        const slotDateInParentTz = getLocalDateForInstant(
          mentorSlotInstant.toString(),
          parentTimezone
        );

        if (slotDateInParentTz === parentDate) {
          // Use start instant as key to deduplicate slots
          const slotKey = mentorSlotInstant.toString();

          if (!slotsMap.has(slotKey)) {
            slotsMap.set(slotKey, {
              startInstant: mentorSlotInstant.toString(),
              endInstant: mentorSlotEndInstant.toString(),
            });
          }
        }
      } catch (error) {
        // Skip slots that fall during DST transitions
        console.warn(
          `Skipping slot ${mentorDate.toString()} ${currentTime.toString()} in ${mentorTimezone}:`,
          error
        );
      }

      currentTime = currentTime.add({ minutes: DEFAULT_SLOT_INTERVAL_MINUTES });
    }
  }

  /**
   * Filter candidate slots by checking which mentors can handle each slot.
   * 
   * A mentor can handle a slot if:
   * 1. The slot falls completely within the mentor's working hours
   * 2. Using half-open interval semantics [start, end)
   */
  private filterSlotsByMentorAvailability(
    candidateSlots: Map<string, { startInstant: string; endInstant: string }>,
    parentDate: string,
    parentTimezone: string,
    mentors: IMentor[]
  ): AvailableSlot[] {
    const availableSlots: AvailableSlot[] = [];

    for (const [slotKey, slotData] of candidateSlots.entries()) {
      const eligibleMentorIds: string[] = [];

      for (const mentor of mentors) {
        if (this.canMentorHandleSlot(slotData.startInstant, slotData.endInstant, mentor)) {
          eligibleMentorIds.push(mentor._id.toString());
        }
      }

      // Only include slots that have at least one eligible mentor
      if (eligibleMentorIds.length > 0) {
        const parentLocal = utcInstantToLocalDateTime(slotData.startInstant, parentTimezone);

        availableSlots.push({
          startInstant: slotData.startInstant,
          endInstant: slotData.endInstant,
          parentLocalDate: parentLocal.localDate,
          parentLocalTime: parentLocal.localTime,
          eligibleMentorIds,
        });
      }
    }

    // Sort slots by start time
    availableSlots.sort((a, b) => {
      const instantA = Temporal.Instant.from(a.startInstant);
      const instantB = Temporal.Instant.from(b.startInstant);
      return Temporal.Instant.compare(instantA, instantB);
    });

    return availableSlots;
  }

  /**
   * Check if a mentor can handle a specific time slot.
   * 
   * The slot must fall completely within the mentor's working hours
   * in the mentor's local timezone.
   * 
   * Uses half-open interval [start, end) semantics.
   */
  private canMentorHandleSlot(
    slotStartInstant: string,
    slotEndInstant: string,
    mentor: IMentor
  ): boolean {
    const mentorTimezone = mentor.timezone;

    // Convert slot to mentor's local time
    const slotStartLocal = utcInstantToLocalDateTime(slotStartInstant, mentorTimezone);
    const slotEndLocal = utcInstantToLocalDateTime(slotEndInstant, mentorTimezone);

    // Parse mentor's working hours
    const workingStart = Temporal.PlainTime.from(mentor.workingHoursStart);
    const workingEnd = Temporal.PlainTime.from(mentor.workingHoursEnd);

    const slotStartTime = Temporal.PlainTime.from(slotStartLocal.localTime);
    const slotEndTime = Temporal.PlainTime.from(slotEndLocal.localTime);

    // Check if slot falls on the same calendar day
    // (slots that span midnight are not supported in this version)
    if (slotStartLocal.localDate !== slotEndLocal.localDate) {
      return false;
    }

    // Check if slot start is within working hours: workingStart <= slotStart
    if (Temporal.PlainTime.compare(slotStartTime, workingStart) < 0) {
      return false;
    }

    // Check if slot end is within working hours: slotEnd <= workingEnd
    // Using <= because working hours end is exclusive boundary
    if (Temporal.PlainTime.compare(slotEndTime, workingEnd) > 0) {
      return false;
    }

    return true;
  }

  /**
   * Validate date format (YYYY-MM-DD).
   */
  private validateDate(date: string): void {
    try {
      Temporal.PlainDate.from(date);
    } catch (error) {
      throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
    }
  }

  /**
   * Validate trial duration.
   */
  private validateDuration(durationMinutes: number): void {
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new Error(
        `Invalid trial duration: ${durationMinutes}. Must be a positive integer.`
      );
    }

    if (durationMinutes > 240) {
      throw new Error(
        `Invalid trial duration: ${durationMinutes}. Maximum duration is 240 minutes.`
      );
    }
  }
}

export const availabilityService = new AvailabilityService();
