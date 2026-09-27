import { Booking } from './booking.schema.js';
import mongoose from 'mongoose';
export class BookingRepository {
    async findOverlappingBookings(mentorId, startTime, endTime) {
        return Booking.find({
            mentorId: new mongoose.Types.ObjectId(mentorId),
            status: 'CONFIRMED',
            $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
        }).exec();
    }
    async countBookingsOnMentorLocalDay(mentorId, dayStart, dayEnd) {
        return Booking.countDocuments({
            mentorId: new mongoose.Types.ObjectId(mentorId),
            status: 'CONFIRMED',
            startTime: { $gte: dayStart, $lt: dayEnd },
        }).exec();
    }
    async findBookingsInRange(mentorId, startDate, endDate) {
        return Booking.find({
            mentorId: new mongoose.Types.ObjectId(mentorId),
            status: 'CONFIRMED',
            startTime: { $gte: startDate, $lt: endDate },
        }).sort({ startTime: 1 }).exec();
    }
    async findByIdempotencyKey(key) {
        return Booking.findOne({ idempotencyKey: key }).exec();
    }
    async findById(bookingId) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return null;
        }
        return Booking.findById(bookingId).exec();
    }
    async findByMentorId(mentorId) {
        return Booking.find({
            mentorId: new mongoose.Types.ObjectId(mentorId),
        }).sort({ startTime: -1 }).exec();
    }
    async findRecentBookings(limit = 50) {
        return Booking.find({ status: 'CONFIRMED' })
            .populate('mentorId')
            .sort({ createdAt: -1, startTime: -1 })
            .limit(limit)
            .exec();
    }
    async findAllBookings() {
        return Booking.find({ status: 'CONFIRMED' })
            .populate('mentorId')
            .sort({ createdAt: -1, startTime: -1 })
            .exec();
    }
}
export const bookingRepository = new BookingRepository();
