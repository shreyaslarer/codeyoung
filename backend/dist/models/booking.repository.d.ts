import { IBooking } from './booking.schema.js';
export declare class BookingRepository {
    findOverlappingBookings(mentorId: string, startTime: Date, endTime: Date): Promise<IBooking[]>;
    countBookingsOnMentorLocalDay(mentorId: string, dayStart: Date, dayEnd: Date): Promise<number>;
    findBookingsInRange(mentorId: string, startDate: Date, endDate: Date): Promise<IBooking[]>;
    findByIdempotencyKey(key: string): Promise<IBooking | null>;
    findById(bookingId: string): Promise<IBooking | null>;
    findByMentorId(mentorId: string): Promise<IBooking[]>;
    findRecentBookings(limit?: number): Promise<IBooking[]>;
    findAllBookings(): Promise<IBooking[]>;
    /**
     * Fetch all CONFIRMED bookings for a set of mentors that overlap a UTC window.
     *
     * Used by the availability service to filter eligibleMentorIds per slot in a
     * single DB round-trip rather than N+1 queries (one per mentor per slot).
     *
     * The window should span [dayStart, dayEnd) in UTC — wide enough to cover the
     * full parent-requested date even after timezone offset.  Overlap is detected
     * via the standard half-open interval test:
     *
     *   booking.startTime < windowEnd  AND  booking.endTime > windowStart
     *
     * @param mentorIds - ObjectId strings for the mentors to query
     * @param windowStart - inclusive UTC start of the window (Date)
     * @param windowEnd   - exclusive UTC end of the window (Date)
     */
    findConfirmedBookingsForMentorsInWindow(mentorIds: string[], windowStart: Date, windowEnd: Date): Promise<IBooking[]>;
}
export declare const bookingRepository: BookingRepository;
