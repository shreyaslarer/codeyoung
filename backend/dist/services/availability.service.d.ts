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
export declare class AvailabilityService {
    /**
     * Get available trial class slots for a parent's requested date.
     *
     * @param parentDate - The date in YYYY-MM-DD format
     * @param parentTimezone - IANA timezone identifier (e.g., 'Europe/London')
     * @param trialDurationMinutes - Duration of trial class in minutes (default: 30)
     * @returns Availability result with slots and eligible mentor IDs
     */
    getAvailableSlots(parentDate: string, parentTimezone: string, trialDurationMinutes?: number): Promise<AvailabilityResult>;
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
    private generateCandidateSlots;
    /**
     * Generate slots for a specific mentor date.
     */
    private generateSlotsForMentorDate;
    /**
     * Filter candidate slots by checking which mentors can handle each slot.
     *
     * A mentor can handle a slot if:
     * 1. The slot falls completely within the mentor's working hours
     * 2. Using half-open interval semantics [start, end)
     */
    private filterSlotsByMentorAvailability;
    /**
     * Check if a mentor can handle a specific time slot.
     *
     * The slot must fall completely within the mentor's working hours
     * in the mentor's local timezone.
     *
     * Uses half-open interval [start, end) semantics.
     */
    private canMentorHandleSlot;
    /**
     * Validate date format (YYYY-MM-DD).
     */
    private validateDate;
    /**
     * Validate trial duration.
     */
    private validateDuration;
}
export declare const availabilityService: AvailabilityService;
