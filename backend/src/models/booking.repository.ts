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
}

export const bookingRepository = new BookingRepository();
