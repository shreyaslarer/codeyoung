import mongoose from 'mongoose';
import { Booking } from '../models/booking.schema.js';
import { bookingRepository } from '../models/booking.repository.js';
import { mentorRepository } from '../repositories/mentor.repository.js';
import { availabilityService } from './availability.service.js';
import { MentorAllocationService } from './mentor-allocation.service.js';
import { validateTimezone, localDateTimeToUtcInstant, getLocalDateForInstant, doIntervalsOverlap, getLocalDayBoundaries, } from '../utils/temporal.utils.js';
const MAX_TRIALS_PER_MENTOR_PER_DAY = 2;
/**
 * Booking Creation Service
 *
 * Creates trial class bookings with transaction-safe, idempotent booking flow.
 *
 * Flow:
 * 1. Check idempotency key (return existing booking if duplicate)
 * 2. Validate parent input (name, email, date/time, timezone, duration)
 * 3. Convert parent local time to UTC instants using Temporal Utilities
 * 4. Revalidate availability (database is final authority)
 * 5. Allocate mentor using Mentor Allocation Service
 * 6. Inside MongoDB transaction:
 *    a. Check for overlapping CONFIRMED bookings (half-open intervals)
 *    b. Check daily capacity (2 trials per mentor per local day)
 *    c. Create booking atomically
 * 7. Return booking confirmation or conflict result
 *
 * Database Integrity:
 * - Uses MongoDB transactions for atomicity
 * - Idempotency key prevents duplicate bookings
 * - Concurrent requests properly handled
 * - Rollback on any failure
 */
export class BookingService {
    mentorAllocationService;
    transactionsSupported = null;
    constructor() {
        this.mentorAllocationService = new MentorAllocationService();
    }
    /**
     * Check if MongoDB transactions are supported (requires replica set).
     * Caches result after first check.
     */
    async checkTransactionSupport() {
        if (this.transactionsSupported !== null) {
            return this.transactionsSupported;
        }
        try {
            const db = mongoose.connection.db;
            if (!db) {
                console.warn('⚠️  MongoDB database not connected - transactions DISABLED');
                this.transactionsSupported = false;
                return false;
            }
            const admin = db.admin();
            const serverInfo = await admin.serverStatus();
            // Transactions require replica set or sharded cluster
            const isReplicaSet = Boolean(serverInfo.repl && serverInfo.repl.setName);
            const isSharded = serverInfo.process === 'mongos';
            this.transactionsSupported = Boolean(isReplicaSet || isSharded);
            if (this.transactionsSupported) {
                const replSetName = serverInfo.repl?.setName || 'unknown';
                console.log(`✅ MongoDB transactions ENABLED (replica set: ${replSetName})`);
            }
            else {
                console.warn('⚠️  MongoDB transactions DISABLED - running in standalone mode');
                console.warn('⚠️  Race conditions possible! Enable replica set for production.');
            }
            return this.transactionsSupported;
        }
        catch (error) {
            // If we can't determine, assume no transaction support (safer)
            console.warn('⚠️  Unable to determine MongoDB transaction support, assuming standalone mode');
            console.warn('⚠️  Error:', error instanceof Error ? error.message : 'Unknown error');
            this.transactionsSupported = false;
            return false;
        }
    }
    /**
     * Create a trial class booking with transaction safety.
     *
     * @param request - Booking creation request
     * @returns Booking result with confirmation or conflict
     */
    async createBooking(request) {
        try {
            // Step 1: Check idempotency - return existing booking if key already used
            const existingBooking = await bookingRepository.findByIdempotencyKey(request.idempotencyKey);
            if (existingBooking) {
                return {
                    success: true,
                    booking: this.toBookingResponse(existingBooking),
                };
            }
            // Step 2: Validate input
            this.validateBookingRequest(request);
            // Step 3: Convert parent local time to UTC instants
            const startInstant = localDateTimeToUtcInstant(request.parentLocalDate, request.parentLocalTime, request.parentTimezone);
            const startDate = new Date(startInstant);
            const endDate = new Date(startDate.getTime() + request.trialDurationMinutes * 60 * 1000);
            const endInstant = endDate.toISOString();
            // Step 4: Revalidate availability (database is final authority)
            const availabilityResult = await availabilityService.getAvailableSlots(request.parentLocalDate, request.parentTimezone, request.trialDurationMinutes);
            // Find if the requested time matches any available slot
            // We look for slots that start at the same time or overlap
            let eligibleMentorIds = [];
            // Normalize ISO strings by converting through Date objects
            const normalizeISO = (iso) => new Date(iso).toISOString();
            const normalizedStart = normalizeISO(startInstant);
            const normalizedEnd = normalizeISO(endInstant);
            for (const slot of availabilityResult.slots) {
                const slotStart = normalizeISO(slot.startInstant);
                const slotEnd = normalizeISO(slot.endInstant);
                if (slotStart === normalizedStart && slotEnd === normalizedEnd) {
                    // Exact match found
                    eligibleMentorIds = slot.eligibleMentorIds;
                    break;
                }
            }
            if (eligibleMentorIds.length === 0) {
                return {
                    success: false,
                    conflict: {
                        reason: 'The requested time slot is no longer available',
                        type: 'SLOT_UNAVAILABLE',
                    },
                };
            }
            // Step 5: Allocate mentor using existing service
            const allocationResult = await this.mentorAllocationService.allocateMentor(startDate, endDate, eligibleMentorIds);
            if (!allocationResult.success) {
                return {
                    success: false,
                    conflict: {
                        reason: allocationResult.reason || 'No mentors available for this slot',
                        type: 'NO_MENTORS_AVAILABLE',
                    },
                };
            }
            const allocatedMentorId = allocationResult.allocatedMentorId;
            // Step 6: Create booking inside transaction
            const bookingResult = await this.createBookingInTransaction(request, allocatedMentorId, startDate, endDate);
            return bookingResult;
        }
        catch (error) {
            if (error instanceof Error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: false,
                error: 'An unexpected error occurred',
            };
        }
    }
    /**
     * Create booking inside a MongoDB transaction (if supported) or with careful ordering (if not).
     * This ensures atomicity when possible and correctness always.
     */
    async createBookingInTransaction(request, mentorId, startTime, endTime) {
        const supportsTransactions = await this.checkTransactionSupport();
        if (supportsTransactions) {
            return this.createBookingWithTransaction(request, mentorId, startTime, endTime);
        }
        else {
            return this.createBookingWithoutTransaction(request, mentorId, startTime, endTime);
        }
    }
    /**
     * Create booking WITH MongoDB transaction (replica set or sharded cluster).
     */
    async createBookingWithTransaction(request, mentorId, startTime, endTime) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const result = await this.performBookingCreation(request, mentorId, startTime, endTime, session);
            if (!result.success) {
                await session.abortTransaction();
                await session.endSession();
                return result;
            }
            await session.commitTransaction();
            await session.endSession();
            return result;
        }
        catch (error) {
            await session.abortTransaction();
            await session.endSession();
            if (error instanceof Error) {
                // Handle duplicate key error (race condition on idempotency key)
                if ('code' in error && error.code === 11000) {
                    const existingBooking = await bookingRepository.findByIdempotencyKey(request.idempotencyKey);
                    if (existingBooking) {
                        return {
                            success: true,
                            booking: this.toBookingResponse(existingBooking),
                        };
                    }
                }
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: false,
                error: 'Transaction failed',
            };
        }
    }
    /**
     * Create booking WITHOUT MongoDB transaction (standalone mode).
     * Uses careful ordering and idempotency key uniqueness for safety.
     */
    async createBookingWithoutTransaction(request, mentorId, startTime, endTime) {
        try {
            // In standalone mode, we rely on:
            // 1. Idempotency key uniqueness (database constraint)
            // 2. Careful ordering of checks before creation
            // 3. Application-level conflict detection
            const result = await this.performBookingCreation(request, mentorId, startTime, endTime, undefined);
            return result;
        }
        catch (error) {
            if (error instanceof Error) {
                // Handle duplicate key error (race condition on idempotency key)
                if ('code' in error && error.code === 11000) {
                    const existingBooking = await bookingRepository.findByIdempotencyKey(request.idempotencyKey);
                    if (existingBooking) {
                        return {
                            success: true,
                            booking: this.toBookingResponse(existingBooking),
                        };
                    }
                }
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: false,
                error: 'Booking creation failed',
            };
        }
    }
    /**
     * Perform the actual booking creation logic.
     * Works with or without a transaction session.
     */
    async performBookingCreation(request, mentorId, startTime, endTime, session) {
        // Get mentor to access timezone
        const mentor = await mentorRepository.findById(mentorId);
        if (!mentor) {
            throw new Error(`Mentor ${mentorId} not found`);
        }
        // Check for overlapping CONFIRMED bookings using half-open intervals
        const query = {
            mentorId: new mongoose.Types.ObjectId(mentorId),
            status: 'CONFIRMED',
        };
        const overlappingBookings = session
            ? await Booking.find(query).session(session).exec()
            : await Booking.find(query).exec();
        for (const booking of overlappingBookings) {
            const overlaps = doIntervalsOverlap(startTime.toISOString(), endTime.toISOString(), booking.startTime.toISOString(), booking.endTime.toISOString());
            if (overlaps) {
                return {
                    success: false,
                    conflict: {
                        reason: 'This time slot conflicts with an existing booking',
                        type: 'SLOT_UNAVAILABLE',
                    },
                };
            }
        }
        // Check daily capacity (2 trials per mentor per local day)
        const mentorLocalDate = getLocalDateForInstant(startTime.toISOString(), mentor.timezone);
        const { startInstant: dayStartInstant, endInstant: dayEndInstant } = getLocalDayBoundaries(mentorLocalDate, mentor.timezone);
        const dayStartDate = new Date(dayStartInstant);
        const dayEndDate = new Date(dayEndInstant);
        const capacityQuery = {
            mentorId: new mongoose.Types.ObjectId(mentorId),
            status: 'CONFIRMED',
            startTime: { $gte: dayStartDate, $lt: dayEndDate },
        };
        const bookingsOnDay = session
            ? await Booking.countDocuments(capacityQuery).session(session).exec()
            : await Booking.countDocuments(capacityQuery).exec();
        if (bookingsOnDay >= MAX_TRIALS_PER_MENTOR_PER_DAY) {
            return {
                success: false,
                conflict: {
                    reason: 'Mentor has reached daily capacity for this date',
                    type: 'CAPACITY_REACHED',
                },
            };
        }
        // Create booking
        const classUrl = this.generateClassUrl(mentorId, startTime);
        const newBooking = new Booking({
            mentorId: new mongoose.Types.ObjectId(mentorId),
            parentName: request.parentName,
            parentEmail: request.parentEmail,
            startTime,
            endTime,
            parentTimezone: request.parentTimezone,
            status: 'CONFIRMED',
            classUrl,
            idempotencyKey: request.idempotencyKey,
        });
        const savedBooking = session
            ? await newBooking.save({ session })
            : await newBooking.save();
        return {
            success: true,
            booking: this.toBookingResponse(savedBooking),
        };
    }
    /**
     * Validate booking request parameters.
     */
    validateBookingRequest(request) {
        // Validate parent name
        if (!request.parentName || request.parentName.trim().length === 0) {
            throw new Error('Parent name is required');
        }
        if (request.parentName.length > 100) {
            throw new Error('Parent name must be 100 characters or less');
        }
        // Validate parent email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!request.parentEmail || !emailRegex.test(request.parentEmail)) {
            throw new Error('Valid parent email is required');
        }
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(request.parentLocalDate)) {
            throw new Error('Parent local date must be in YYYY-MM-DD format');
        }
        // Validate time format
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(request.parentLocalTime)) {
            throw new Error('Parent local time must be in HH:MM format');
        }
        // Validate timezone
        validateTimezone(request.parentTimezone, 'parentTimezone');
        // Validate duration
        if (request.trialDurationMinutes < 1 || request.trialDurationMinutes > 240) {
            throw new Error('Trial duration must be between 1 and 240 minutes');
        }
        // Validate idempotency key
        if (!request.idempotencyKey || request.idempotencyKey.trim().length === 0) {
            throw new Error('Idempotency key is required');
        }
        if (request.idempotencyKey.length > 100) {
            throw new Error('Idempotency key must be 100 characters or less');
        }
    }
    /**
     * Generate a unique class URL for the booking.
     * Uses mentorId and timestamp to ensure uniqueness.
     */
    generateClassUrl(mentorId, startTime) {
        const timestamp = startTime.getTime();
        // Use full hash for uniqueness (base64url encoding of mentorId-timestamp)
        const hash = Buffer.from(`${mentorId}-${timestamp}`).toString('base64url');
        return `https://meet.codeyoung.dev/${hash}`;
    }
    /**
     * Transform booking document to response format.
     */
    toBookingResponse(booking) {
        return {
            id: booking._id.toString(),
            mentorId: booking.mentorId.toString(),
            parentName: booking.parentName,
            parentEmail: booking.parentEmail,
            startTime: booking.startTime,
            endTime: booking.endTime,
            parentTimezone: booking.parentTimezone,
            status: booking.status,
            classUrl: booking.classUrl,
        };
    }
}
export const bookingService = new BookingService();
