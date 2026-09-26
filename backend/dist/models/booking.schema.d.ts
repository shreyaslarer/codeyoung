import mongoose, { Document } from 'mongoose';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export interface IBooking extends Document {
    mentorId: mongoose.Types.ObjectId;
    parentName: string;
    parentEmail: string;
    startTime: Date;
    endTime: Date;
    parentTimezone: string;
    status: BookingStatus;
    classUrl: string;
    idempotencyKey?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Booking: mongoose.Model<any, {}, {}, {}, any, any>;
export { Booking };
