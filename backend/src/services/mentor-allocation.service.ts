import { mentorRepository } from '../repositories/mentor.repository.js';
import { bookingRepository } from '../models/booking.repository.js';
import { IMentor } from '../models/mentor.schema.js';
import { getLocalDateForInstant, doIntervalsOverlap } from '../utils/temporal.utils.js';
import { ObjectId } from 'mongodb';

/**
 * Result of a mentor allocation attempt.
 */
export interface MentorAllocationResult {
  success: boolean;
  allocatedMentorId?: string;
  reason?: string;
}

/**
 * Mentor Allocation Service
 * 
 * Selects the best mentor for a trial class slot using least-booked strategy.
 * 
 * Selection Algorithm:
 * 1. Start with eligible mentor IDs from Availability Engine
 * 2. Exclude mentors with overlapping confirmed bookings
 * 3. Exclude mentors at daily capacity (2 trials per mentor per local day)
 * 4. Select least-booked mentor (total booking count)
 * 5. Deterministic tie-breaking: booking count ASC, mentorId ASC
 * 
 * Does NOT:
 * - Create bookings (booking service's responsibility)
 * - Generate availability (availability service's responsibility)
 * - Send notifications (notification service's responsibility)
 * 
 * This service only determines WHICH mentor should be assigned.
 */
export class MentorAllocationService {
  private readonly MAX_DAILY_TRIALS = 2;

  /**
   * Allocate a mentor for a requested trial slot.
   * 
   * @param slotStartInstant - UTC instant for slot start (Date or ISO string)
   * @param slotEndInstant - UTC instant for slot end (Date or ISO string)
   * @param eligibleMentorIds - Mentor IDs from availability engine (ObjectId or string)
   * @returns Allocation result with selected mentor ID or failure reason
   */
  async allocateMentor(
    slotStartInstant: Date | string,
    slotEndInstant: Date | string,
    eligibleMentorIds: (ObjectId | string)[]
  ): Promise<MentorAllocationResult> {
    // Convert to ISO strings for consistent handling
    const startISO = slotStartInstant instanceof Date ? slotStartInstant.toISOString() : slotStartInstant;
    const endISO = slotEndInstant instanceof Date ? slotEndInstant.toISOString() : slotEndInstant;
    const mentorIdStrings = eligibleMentorIds.map(id => id.toString());

    // Validate inputs
    if (!mentorIdStrings || mentorIdStrings.length === 0) {
      return {
        success: false,
        reason: 'No eligible mentors provided',
      };
    }

    // Retrieve all eligible mentors
    const mentors = await this.retrieveMentors(mentorIdStrings);

    if (mentors.length === 0) {
      return {
        success: false,
        reason: 'No eligible mentors found in database',
      };
    }

    // Filter out mentors with conflicts
    const availableMentors = await this.filterAvailableMentors(
      mentors,
      startISO,
      endISO
    );

    if (availableMentors.length === 0) {
      return {
        success: false,
        reason: 'No available mentors for this slot (conflicts or capacity reached)',
      };
    }

    // Select least-booked mentor with deterministic tie-breaking
    const selectedMentor = await this.selectLeastBookedMentor(availableMentors);

    return {
      success: true,
      allocatedMentorId: selectedMentor._id.toString(),
    };
  }

  /**
   * Retrieve mentor documents from database.
   * Preserves order for deterministic selection.
   */
  private async retrieveMentors(mentorIds: string[]): Promise<IMentor[]> {
    const mentors: IMentor[] = [];

    for (const mentorId of mentorIds) {
      const mentor = await mentorRepository.findById(mentorId);
      if (mentor && mentor.active) {
        mentors.push(mentor);
      }
    }

    return mentors;
  }

  /**
   * Filter mentors to exclude those with conflicts or at capacity.
   * 
   * A mentor is unavailable if:
   * 1. They have an overlapping confirmed booking
   * 2. They have reached daily capacity (2 trials on that local calendar day)
   */
  private async filterAvailableMentors(
    mentors: IMentor[],
    slotStartInstant: string,
    slotEndInstant: string
  ): Promise<IMentor[]> {
    const availableMentors: IMentor[] = [];

    for (const mentor of mentors) {
      const hasOverlap = await this.hasOverlappingBooking(
        mentor,
        slotStartInstant,
        slotEndInstant
      );

      if (hasOverlap) {
        continue; // Skip this mentor
      }

      const atCapacity = await this.isAtDailyCapacity(mentor, slotStartInstant);

      if (atCapacity) {
        continue; // Skip this mentor
      }

      availableMentors.push(mentor);
    }

    return availableMentors;
  }

  /**
   * Check if mentor has an overlapping confirmed booking.
   * 
   * Uses half-open interval semantics [start, end) via doIntervalsOverlap utility.
   */
  private async hasOverlappingBooking(
    mentor: IMentor,
    slotStartInstant: string,
    slotEndInstant: string
  ): Promise<boolean> {
    const overlappingBookings = await bookingRepository.findOverlappingBookings(
      mentor._id.toString(),
      new Date(slotStartInstant),
      new Date(slotEndInstant)
    );

    // Check if any confirmed bookings overlap using temporal utility
    for (const booking of overlappingBookings) {
      if (booking.status === 'CONFIRMED') {
        const bookingStart = booking.startTime.toISOString();
        const bookingEnd = booking.endTime.toISOString();

        // Use temporal utility for half-open interval overlap check
        const overlaps = doIntervalsOverlap(
          slotStartInstant,
          slotEndInstant,
          bookingStart,
          bookingEnd
        );

        if (overlaps) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if mentor has reached daily capacity.
   * 
   * Capacity is calculated on the mentor's local calendar day.
   * Uses getLocalDateForInstant utility to determine mentor's local date.
   */
  private async isAtDailyCapacity(
    mentor: IMentor,
    slotStartInstant: string
  ): Promise<boolean> {
    // Get the mentor's local calendar date for this slot
    const mentorLocalDate = getLocalDateForInstant(slotStartInstant, mentor.timezone);

    // Calculate day boundaries in mentor's timezone
    // The slot falls on mentorLocalDate, so we need to count all confirmed bookings
    // that start on that same local date in the mentor's timezone
    
    // Get all bookings for this mentor
    // We'll check each booking to see if it falls on the same mentor local date
    const startOfYear = new Date('2026-01-01');
    const endOfYear = new Date('2027-01-01');
    
    const allBookings = await bookingRepository.findBookingsInRange(
      mentor._id.toString(),
      startOfYear,
      endOfYear
    );

    // Count confirmed bookings that fall on the same mentor local date
    let bookingCountOnDay = 0;

    for (const booking of allBookings) {
      if (booking.status === 'CONFIRMED') {
        const bookingLocalDate = getLocalDateForInstant(
          booking.startTime.toISOString(),
          mentor.timezone
        );

        if (bookingLocalDate === mentorLocalDate) {
          bookingCountOnDay++;
        }
      }
    }

    return bookingCountOnDay >= this.MAX_DAILY_TRIALS;
  }

  /**
   * Select the least-booked mentor with deterministic tie-breaking.
   * 
   * Selection criteria:
   * 1. Primary: Total confirmed booking count (ascending)
   * 2. Tie-breaker: Mentor ID (ascending, lexicographic)
   * 
   * This ensures:
   * - Load balancing across mentors
   * - Deterministic selection (no randomness)
   * - Reproducible behavior (tests always pass)
   */
  private async selectLeastBookedMentor(mentors: IMentor[]): Promise<IMentor> {
    // Calculate booking counts for each mentor
    const mentorCounts = await Promise.all(
      mentors.map(async (mentor) => {
        const count = await this.getTotalBookingCount(mentor);
        return { mentor, count };
      })
    );

    // Sort by booking count ascending, then by mentorId ascending
    mentorCounts.sort((a, b) => {
      // Primary: booking count ascending
      if (a.count !== b.count) {
        return a.count - b.count;
      }

      // Tie-breaker: mentorId ascending (lexicographic)
      const idA = a.mentor._id.toString();
      const idB = b.mentor._id.toString();
      return idA.localeCompare(idB);
    });

    // Return the first mentor (least booked with stable tie-breaking)
    return mentorCounts[0].mentor;
  }

  /**
   * Get total confirmed booking count for a mentor.
   * Counts all confirmed bookings across all time.
   */
  private async getTotalBookingCount(mentor: IMentor): Promise<number> {
    // Get all bookings for this mentor from beginning of time
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2030-12-31');

    const bookings = await bookingRepository.findBookingsInRange(
      mentor._id.toString(),
      startDate,
      endDate
    );

    // Count only confirmed bookings
    return bookings.filter((booking) => booking.status === 'CONFIRMED').length;
  }
}

export const mentorAllocationService = new MentorAllocationService();
