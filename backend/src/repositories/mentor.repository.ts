import { Mentor, IMentor } from '../models/mentor.schema.js';
import { Types } from 'mongoose';

export class MentorRepository {
  /**
   * Find all active mentors.
   * Active mentors are available for booking assignments.
   */
  async findActiveMentors(): Promise<IMentor[]> {
    return await Mentor.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Find a mentor by MongoDB ObjectId.
   * Returns null if the mentor does not exist.
   */
  async findById(mentorId: string | Types.ObjectId): Promise<IMentor | null> {
    if (!Types.ObjectId.isValid(mentorId)) {
      return null;
    }
    return await Mentor.findById(mentorId).exec();
  }

  /**
   * Find all mentors (both active and inactive).
   * Used for administrative purposes only.
   */
  async findAll(): Promise<IMentor[]> {
    return await Mentor.find().sort({ name: 1 }).exec();
  }

  /**
   * Count all active mentors.
   */
  async countActiveMentors(): Promise<number> {
    return await Mentor.countDocuments({ active: true }).exec();
  }
}

export const mentorRepository = new MentorRepository();
