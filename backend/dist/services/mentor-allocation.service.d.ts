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
export declare class MentorAllocationService {
    private readonly MAX_DAILY_TRIALS;
    /**
     * Allocate a mentor for a requested trial slot.
     *
     * @param slotStartInstant - UTC instant for slot start (Date or ISO string)
     * @param slotEndInstant - UTC instant for slot end (Date or ISO string)
     * @param eligibleMentorIds - Mentor IDs from availability engine (ObjectId or string)
     * @returns Allocation result with selected mentor ID or failure reason
     */
    allocateMentor(slotStartInstant: Date | string, slotEndInstant: Date | string, eligibleMentorIds: (ObjectId | string)[]): Promise<MentorAllocationResult>;
    /**
     * Retrieve mentor documents from database.
     * Preserves order for deterministic selection.
     */
    private retrieveMentors;
    /**
     * Filter mentors to exclude those with conflicts or at capacity.
     *
     * A mentor is unavailable if:
     * 1. They have an overlapping confirmed booking
     * 2. They have reached daily capacity (2 trials on that local calendar day)
     */
    private filterAvailableMentors;
    /**
     * Check if mentor has an overlapping confirmed booking.
     *
     * Uses half-open interval semantics [start, end) via doIntervalsOverlap utility.
     */
    private hasOverlappingBooking;
    /**
     * Check if mentor has reached daily capacity.
     *
     * Capacity is calculated on the mentor's local calendar day.
     * Uses getLocalDateForInstant utility to determine mentor's local date.
     */
    private isAtDailyCapacity;
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
    private selectLeastBookedMentor;
    /**
     * Get total confirmed booking count for a mentor.
     * Counts all confirmed bookings across all time.
     */
    private getTotalBookingCount;
}
export declare const mentorAllocationService: MentorAllocationService;
