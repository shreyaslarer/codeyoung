import mongoose, { Document, Schema } from 'mongoose';

export interface IMentor extends Document {
  name: string;
  email: string;
  timezone: string;
  active: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  createdAt: Date;
  updatedAt: Date;
}

const mentorSchema = new Schema<IMentor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    workingHoursStart: {
      type: String,
      required: true,
      default: '09:00',
    },
    workingHoursEnd: {
      type: String,
      required: true,
      default: '18:00',
    },
  },
  {
    timestamps: true,
  }
);

// Index for active mentor queries
mentorSchema.index({ active: 1 });

export const Mentor = mongoose.model<IMentor>('Mentor', mentorSchema);
