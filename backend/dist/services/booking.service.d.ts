/**
 * Request to create a booking.
 */
export interface CreateBookingRequest {
    parentName: string;
    parentEmail: string;
    parentLocalDate: string;
    parentLocalTime: string;
    parentTimezone: string;
    trialDurationMinutes: number;
    idempotencyKey: string;
}
/**
 * Result of a booking creation attempt.
 */
export interface BookingResult {
    success: boolean;
    booking?: {
        id: string;
        mentorId: string;
        parentName: string;
        parentEmail: string;
        startTime: Date;
        endTime: Date;
        parentTimezone: string;
        status: string;
        classUrl: string;
    };
    conflict?: {
        reason: string;
        type: 'SLOT_UNAVAILABLE' | 'CAPACITY_REACHED' | 'NO_MENTORS_AVAILABLE';
    };
    error?: string;
}
/**
 * Booking Creation Service
 *
 * Creates trial class bookings with transaction-safe, idempotent booking flow.
 *
 * Flow:
 * 1. Check idempotency key (return existing booking if duplicate)
 * 2. Validate parent input (name, email, date/time, timezone, duration)
 * 3. Convert parent local time to UTC instants using Temporal Utilities
 * 4. Revalidate availability (database is final authority)
 * 5. Allocate mentor using Mentor Allocation Service
 * 6. Inside MongoDB transaction:
 *    a. Check for overlapping CONFIRMED bookings (half-open intervals)
 *    b. Check daily capacity (2 trials per mentor per local day)
 *    c. Create booking atomically
 * 7. Return booking confirmation or conflict result
 *
 * Database Integrity:
 * - Uses MongoDB transactions for atomicity
 * - Idempotency key prevents duplicate bookings
 * - Concurrent requests properly handled
 * - Rollback on any failure
 */
export declare class BookingService {
    private mentorAllocationService;
    private transactionsSupported;
    constructor();
    /**
     * Check if MongoDB transactions are supported (requires replica set).
     * Caches result after first check.
     */
    private checkTransactionSupport;
    /**
     * Create a trial class booking with transaction safety.
     *
     * @param request - Booking creation request
     * @returns Booking result with confirmation or conflict
     */
    createBooking(request: CreateBookingRequest): Promise<BookingResult>;
    /**
     * Create booking inside a MongoDB transaction (if supported) or with careful ordering (if not).
     * This ensures atomicity when possible and correctness always.
     */
    private createBookingInTransaction;
    /**
     * Create booking WITH MongoDB transaction (replica set or sharded cluster).
     */
    private createBookingWithTransaction;
    /**
     * Create booking WITHOUT MongoDB transaction (standalone mode).
     * Uses careful ordering and idempotency key uniqueness for safety.
     */
    private createBookingWithoutTransaction;
    /**
     * Perform the actual booking creation logic.
     * Works with or without a transaction session.
     */
    private performBookingCreation;
    /**
     * Validate booking request parameters.
     */
    private validateBookingRequest;
    /**
     * Generate a unique class URL for the booking.
     * Uses mentorId and timestamp to ensure uniqueness.
     */
    private generateClassUrl;
    /**
     * Transform booking document to response format.
     */
    private toBookingResponse;
}
export declare const bookingService: BookingService;
