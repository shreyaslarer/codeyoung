import { Router } from 'express';
import { mentorService } from '../services/mentor.service.js';
const router = Router();
/**
 * GET /api/mentors
 * Returns active mentors available for trial class bookings.
 */
router.get('/', async (_req, res) => {
    try {
        const mentors = await mentorService.getActiveMentors();
        res.json({
            mentors,
            count: mentors.length,
        });
    }
    catch (error) {
        console.error('Error fetching active mentors:', error);
        res.status(500).json({
            type: 'https://codeyoung.dev/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred while fetching mentors.',
        });
    }
});
/**
 * GET /api/mentors/:id
 * Returns a specific mentor by ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mentor = await mentorService.getMentorById(id);
        if (!mentor) {
            return res.status(404).json({
                type: 'https://codeyoung.dev/problems/mentor-not-found',
                title: 'Mentor Not Found',
                status: 404,
                detail: `Mentor with ID ${id} does not exist.`,
            });
        }
        res.json(mentor);
    }
    catch (error) {
        console.error('Error fetching mentor:', error);
        res.status(500).json({
            type: 'https://codeyoung.dev/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred while fetching the mentor.',
        });
    }
});
export default router;
