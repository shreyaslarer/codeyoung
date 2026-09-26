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
export declare class MentorService {
    /**
     * Get all active mentors.
     * Active mentors are available for trial class bookings.
     */
    getActiveMentors(): Promise<PublicMentorInfo[]>;
    /**
     * Get a mentor by ID.
     * Returns null if the mentor does not exist.
     */
    getMentorById(mentorId: string): Promise<PublicMentorInfo | null>;
    /**
     * Convert internal mentor document to public mentor information.
     * Removes database-specific fields and renames properties for API consistency.
     */
    private toPublicMentorInfo;
}
export declare const mentorService: MentorService;
