import { mentorRepository } from '../repositories/mentor.repository.js';
export class MentorService {
    /**
     * Get all active mentors.
     * Active mentors are available for trial class bookings.
     */
    async getActiveMentors() {
        const mentors = await mentorRepository.findActiveMentors();
        return mentors.map(this.toPublicMentorInfo);
    }
    /**
     * Get a mentor by ID.
     * Returns null if the mentor does not exist.
     */
    async getMentorById(mentorId) {
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
    toPublicMentorInfo(mentor) {
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
