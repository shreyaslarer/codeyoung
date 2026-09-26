import { Router } from 'express';
import { availabilityService } from '../services/availability.service.js';
import { bookingService } from '../services/booking.service.js';
const router = Router();
/**
 * GET /api/availability
 * Returns available trial class slots for a given parent timezone and date.
 *
 * Query Parameters:
 * - parentDate: YYYY-MM-DD format (required)
 * - parentTimezone: IANA timezone identifier (required)
 * - trialDurationMinutes: Duration in minutes (optional, default: 30)
 */
router.get('/availability', async (req, res) => {
    try {
        const { parentDate, parentTimezone, trialDurationMinutes } = req.query;
        // Validate required parameters
        if (!parentDate || typeof parentDate !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentDate is required and must be a string in YYYY-MM-DD format.',
            });
        }
        if (!parentTimezone || typeof parentTimezone !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentTimezone is required and must be a valid IANA timezone identifier.',
            });
        }
        // Parse and validate optional duration
        let duration = 30; // Default
        if (trialDurationMinutes) {
            if (typeof trialDurationMinutes !== 'string') {
                return res.status(400).json({
                    type: 'https://codeyoung.dev/problems/invalid-parameter',
                    title: 'Invalid Parameter',
                    status: 400,
                    detail: 'trialDurationMinutes must be a number.',
                });
            }
            duration = parseInt(trialDurationMinutes, 10);
            if (isNaN(duration)) {
                return res.status(400).json({
                    type: 'https://codeyoung.dev/problems/invalid-parameter',
                    title: 'Invalid Parameter',
                    status: 400,
                    detail: 'trialDurationMinutes must be a valid number.',
                });
            }
        }
        // Call availability service (it handles validation internally)
        const result = await availabilityService.getAvailableSlots(parentDate, parentTimezone, duration);
        res.status(200).json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            // Validation errors from service layer
            if (error.message.includes('timezone') ||
                error.message.includes('date') ||
                error.message.includes('duration')) {
                return res.status(400).json({
                    type: 'https://codeyoung.dev/problems/validation-error',
                    title: 'Validation Error',
                    status: 400,
                    detail: error.message,
                });
            }
        }
        console.error('Error fetching availability:', error);
        res.status(500).json({
            type: 'https://codeyoung.dev/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred while fetching availability.',
        });
    }
});
/**
 * POST /api/bookings
 * Creates a trial class booking.
 *
 * Headers:
 * - Idempotency-Key: Required header for idempotent booking creation
 *
 * Body:
 * - parentName: string (required)
 * - parentEmail: string (required)
 * - parentLocalDate: YYYY-MM-DD (required)
 * - parentLocalTime: HH:MM (required)
 * - parentTimezone: IANA timezone (required)
 * - trialDurationMinutes: number (required)
 */
router.post('/bookings', async (req, res) => {
    try {
        // Extract idempotency key from header
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey || typeof idempotencyKey !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/missing-idempotency-key',
                title: 'Missing Idempotency Key',
                status: 400,
                detail: 'Idempotency-Key header is required for booking creation.',
            });
        }
        // Validate request body exists
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-request',
                title: 'Invalid Request',
                status: 400,
                detail: 'Request body must be a JSON object.',
            });
        }
        const { parentName, parentEmail, parentLocalDate, parentLocalTime, parentTimezone, trialDurationMinutes, } = req.body;
        // Validate required fields are present
        if (!parentName || typeof parentName !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentName is required and must be a string.',
            });
        }
        if (!parentEmail || typeof parentEmail !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentEmail is required and must be a string.',
            });
        }
        if (!parentLocalDate || typeof parentLocalDate !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentLocalDate is required and must be a string in YYYY-MM-DD format.',
            });
        }
        if (!parentLocalTime || typeof parentLocalTime !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentLocalTime is required and must be a string in HH:MM format.',
            });
        }
        if (!parentTimezone || typeof parentTimezone !== 'string') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'parentTimezone is required and must be a valid IANA timezone identifier.',
            });
        }
        if (!trialDurationMinutes || typeof trialDurationMinutes !== 'number') {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/invalid-parameter',
                title: 'Invalid Parameter',
                status: 400,
                detail: 'trialDurationMinutes is required and must be a number.',
            });
        }
        // Call booking service (it handles detailed validation internally)
        const result = await bookingService.createBooking({
            parentName,
            parentEmail,
            parentLocalDate,
            parentLocalTime,
            parentTimezone,
            trialDurationMinutes,
            idempotencyKey,
        });
        // Handle booking result
        if (result.success && result.booking) {
            // Return 201 Created for new bookings, 200 OK for idempotent retries
            // We can detect idempotent retry by checking if this is the first time the key is used
            // For simplicity, always return 201 since the booking was "created" from the client's perspective
            return res.status(201).json({
                id: result.booking.id,
                mentorId: result.booking.mentorId,
                parentName: result.booking.parentName,
                parentEmail: result.booking.parentEmail,
                startTime: result.booking.startTime,
                endTime: result.booking.endTime,
                parentTimezone: result.booking.parentTimezone,
                status: result.booking.status,
                classUrl: result.booking.classUrl,
            });
        }
        // Handle conflict (slot unavailable, capacity reached, no mentors)
        if (result.conflict) {
            return res.status(409).json({
                type: 'https://codeyoung.dev/problems/booking-conflict',
                title: 'Booking Conflict',
                status: 409,
                detail: result.conflict.reason,
                conflictType: result.conflict.type,
            });
        }
        // Handle validation or other errors
        if (result.error) {
            return res.status(400).json({
                type: 'https://codeyoung.dev/problems/validation-error',
                title: 'Validation Error',
                status: 400,
                detail: result.error,
            });
        }
        // Unexpected case - should not reach here
        return res.status(500).json({
            type: 'https://codeyoung.dev/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred while creating the booking.',
        });
    }
    catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            type: 'https://codeyoung.dev/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred while creating the booking.',
        });
    }
});
export default router;
