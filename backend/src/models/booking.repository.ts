import { Booking, IBooking } from './booking.schema.js';
import mongoose from 'mongoose';

export class BookingRepository {
  async findOverlappingBookings(mentorId: string, startTime: Date, endTime: Date): Promise<IBooking[]> {
    return Booking.find({
      mentorId: new mongoose.Types.ObjectId(mentorId),
      status: 'CONFIRMED',
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    }).exec();
  }

  async countBookingsOnMentorLocalDay(mentorId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    return Booking.countDocuments({
      mentorId: new mongoose.Types.ObjectId(mentorId),
      status: 'CONFIRMED',
      startTime: { $gte: dayStart, $lt: dayEnd },
    }).exec();
  }

  async findBookingsInRange(mentorId: string, startDate: Date, endDate: Date): Promise<IBooking[]> {
    return Booking.find({
      mentorId: new mongoose.Types.ObjectId(mentorId),
      status: 'CONFIRMED',
      startTime: { $gte: startDate, $lt: endDate },
    }).sort({ startTime: 1 }).exec();
  }

  async findByIdempotencyKey(key: string): Promise<IBooking | null> {
    return Booking.findOne({ idempotencyKey: key }).exec();
  }

  async findById(bookingId: string): Promise<IBooking | null> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return null;
    }
    return Booking.findById(bookingId).exec();
  }

  async findByMentorId(mentorId: string): Promise<IBooking[]> {
    return Booking.find({
      mentorId: new mongoose.Types.ObjectId(mentorId),
    }).sort({ startTime: -1 }).exec();
  }

  async findRecentBookings(limit = 50): Promise<IBooking[]> {
    return Booking.find({ status: 'CONFIRMED' })
      .populate('mentorId')
      .sort({ createdAt: -1, startTime: -1 })
      .limit(limit)
      .exec();
  }

  async findAllBookings(): Promise<IBooking[]> {
    return Booking.find({ status: 'CONFIRMED' })
      .populate('mentorId')
      .sort({ createdAt: -1, startTime: -1 })
      .exec();
  }

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
  async findConfirmedBookingsForMentorsInWindow(
    mentorIds: string[],
    windowStart: Date,
    windowEnd: Date,
  ): Promise<IBooking[]> {
    return Booking.find({
      mentorId: { $in: mentorIds.map(id => new mongoose.Types.ObjectId(id)) },
      status: 'CONFIRMED',
      startTime: { $lt: windowEnd },
      endTime: { $gt: windowStart },
    })
      .select('mentorId startTime endTime status')
      .lean()
      .exec() as unknown as Promise<IBooking[]>;
  }

}

export const bookingRepository = new BookingRepository();
