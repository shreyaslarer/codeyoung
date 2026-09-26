import mongoose, { Schema, Document } from 'mongoose';

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

const bookingSchema = new Schema<IBooking>(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'Mentor', required: true, index: true },
    parentName: { type: String, required: true, trim: true },
    parentEmail: { type: String, required: true, lowercase: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    parentTimezone: { type: String, required: true },
    status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED', index: true },
    classUrl: { type: String, required: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

bookingSchema.index({ mentorId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ mentorId: 1, status: 1, startTime: 1 });

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);
export { Booking };
