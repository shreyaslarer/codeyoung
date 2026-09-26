import { mentorRepository } from '../repositories/mentor.repository.js';
import { IMentor } from '../models/mentor.schema.js';

/**
 * Public mentor information returned to clients.
 * Excludes internal fields such as createdAt, updatedAt, and __v.
 */
export interface PublicMentorInfo {
  id: string;
  name: string;
  email: string;
  timezone: string;
  isActive: boolean;
}

export class MentorService {
  /**
   * Get all active mentors.
   * Active mentors are available for trial class bookings.
   */
  async getActiveMentors(): Promise<PublicMentorInfo[]> {
    const mentors = await mentorRepository.findActiveMentors();
    return mentors.map(this.toPublicMentorInfo);
  }

  /**
   * Get a mentor by ID.
   * Returns null if the mentor does not exist.
   */
  async getMentorById(mentorId: string): Promise<PublicMentorInfo | null> {
    const mentor = await mentorRepository.findById(mentorId);
    if (!mentor) {
      return null;
    }
    return this.toPublicMentorInfo(mentor);
  }

  /**
   * Convert internal mentor document to public mentor information.
   * Removes database-specific fields and renames properties for API consistency.
   */
  private toPublicMentorInfo(mentor: IMentor): PublicMentorInfo {
    return {
      id: mentor._id.toString(),
      name: mentor.name,
      email: mentor.email,
      timezone: mentor.timezone,
      isActive: mentor.active,
    };
  }
}

export const mentorService = new MentorService();
