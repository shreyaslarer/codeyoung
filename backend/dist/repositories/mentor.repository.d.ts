import { IMentor } from '../models/mentor.schema.js';
import { Types } from 'mongoose';
export declare class MentorRepository {
    /**
     * Find all active mentors.
     * Active mentors are available for booking assignments.
     */
    findActiveMentors(): Promise<IMentor[]>;
    /**
     * Find a mentor by MongoDB ObjectId.
     * Returns null if the mentor does not exist.
     */
    findById(mentorId: string | Types.ObjectId): Promise<IMentor | null>;
    /**
     * Find all mentors (both active and inactive).
     * Used for administrative purposes only.
     */
    findAll(): Promise<IMentor[]>;
    /**
     * Count all active mentors.
     */
    countActiveMentors(): Promise<number>;
}
export declare const mentorRepository: MentorRepository;
