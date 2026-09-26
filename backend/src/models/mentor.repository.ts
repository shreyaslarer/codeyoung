import { Mentor, IMentor } from './mentor.schema.js';

export class MentorRepository {
  async findAllActive(): Promise<IMentor[]> {
    return Mentor.find({ active: true }).sort({ email: 1 }).exec();
  }
  
  async findById(id: string): Promise<IMentor | null> {
    return Mentor.findById(id).exec();
  }
  
  async count(): Promise<number> {
    return Mentor.countDocuments().exec();
  }
  
  async countActive(): Promise<number> {
    return Mentor.countDocuments({ active: true }).exec();
  }
}

export const mentorRepository = new MentorRepository();
