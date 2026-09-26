import { IBooking } from './booking.schema.js';
export declare class BookingRepository {
    findOverlappingBookings(mentorId: string, startTime: Date, endTime: Date): Promise<IBooking[]>;
    countBookingsOnMentorLocalDay(mentorId: string, dayStart: Date, dayEnd: Date): Promise<number>;
    findBookingsInRange(mentorId: string, startDate: Date, endDate: Date): Promise<IBooking[]>;
    findByIdempotencyKey(key: string): Promise<IBooking | null>;
    findById(bookingId: string): Promise<IBooking | null>;
    findByMentorId(mentorId: string): Promise<IBooking[]>;
}
export declare const bookingRepository: BookingRepository;
