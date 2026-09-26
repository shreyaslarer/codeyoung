import mongoose from 'mongoose';
import { Booking, IBooking } from '../models/booking.schema.js';
import { bookingRepository } from '../models/booking.repository.js';
import { mentorRepository } from '../repositories/mentor.repository.js';
import { availabilityService } from './availability.service.js';
import { MentorAllocationService } from './mentor-allocation.service.js';
import {
  validateTimezone,
  localDateTimeToUtcInstant,
  getLocalDateForInstant,
  doIntervalsOverlap,
  getLocalDayBoundaries,
} from '../utils/temporal.utils.js';

const MAX_TRIALS_PER_MENTOR_PER_DAY = 2;

/**
 * Request to create a booking.
 */
export interface CreateBookingRequest {
  parentName: string;
  parentEmail: string;
  parentLocalDate: string;      // YYYY-MM-DD
  parentLocalTime: string;      // HH:MM
  parentTimezone: string;       // IANA timezone
  trialDurationMinutes: number;
  idempotencyKey: string;
}

/**
 * Result of a booking creation attempt.
 */
export interface BookingResult {
  success: boolean;
  booking?: {
    id: string;
    mentorId: string;
    parentName: string;
    parentEmail: string;
    startTime: Date;
    endTime: Date;
    parentTimezone: string;
    status: string;
    classUrl: string;
  };
  conflict?: {
    reason: string;
    type: 'SLOT_UNAVAILABLE' | 'CAPACITY_REACHED' | 'NO_MENTORS_AVAILABLE';
  };
  error?: string;
}

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
  private mentorAllocationService: MentorAllocationService;

  constructor() {
    this.mentorAllocationService = new MentorAllocationService();
  }

  /**
   * Create a trial class booking with transaction safety.
   * 
   * @param request - Booking creation request
   * @returns Booking result with confirmation or conflict
   */
  async createBooking(request: CreateBookingRequest): Promise<BookingResult> {
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
      const startInstant = localDateTimeToUtcInstant(
        request.parentLocalDate,
        request.parentLocalTime,
        request.parentTimezone
      );

      const startDate = new Date(startInstant);
      const endDate = new Date(startDate.getTime() + request.trialDurationMinutes * 60 * 1000);
      const endInstant = endDate.toISOString();

      // Step 4: Revalidate availability (database is final authority)
      const availabilityResult = await availabilityService.getAvailableSlots(
        request.parentLocalDate,
        request.parentTimezone,
        request.trialDurationMinutes
      );

      // Find if the requested time matches any available slot
      // We look for slots that start at the same time or overlap
      let eligibleMentorIds: string[] = [];
      
      // Normalize ISO strings by converting through Date objects
      const normalizeISO = (iso: string) => new Date(iso).toISOString();
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
      const allocationResult = await this.mentorAllocationService.allocateMentor(
        startDate,
        endDate,
        eligibleMentorIds
      );

      if (!allocationResult.success) {
        return {
          success: false,
          conflict: {
            reason: allocationResult.reason || 'No mentors available for this slot',
            type: 'NO_MENTORS_AVAILABLE',
          },
        };
      }

      const allocatedMentorId = allocationResult.allocatedMentorId!;

      // Step 6: Create booking inside transaction
      const bookingResult = await this.createBookingInTransaction(
        request,
        allocatedMentorId,
        startDate,
        endDate
      );

      return bookingResult;
    } catch (error) {
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
   * Create booking inside a MongoDB transaction.
   * This ensures atomicity and handles concurrent booking attempts.
   */
  private async createBookingInTransaction(
    request: CreateBookingRequest,
    mentorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BookingResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get mentor to access timezone
      const mentor = await mentorRepository.findById(mentorId);
      if (!mentor) {
        throw new Error(`Mentor ${mentorId} not found`);
      }

      // Step 6a: Check for overlapping CONFIRMED bookings using half-open intervals
      const overlappingBookings = await Booking.find({
        mentorId: new mongoose.Types.ObjectId(mentorId),
        status: 'CONFIRMED',
      }).session(session).exec();

      for (const booking of overlappingBookings) {
        const overlaps = doIntervalsOverlap(
          startTime.toISOString(),
          endTime.toISOString(),
          booking.startTime.toISOString(),
          booking.endTime.toISOString()
        );

        if (overlaps) {
          await session.abortTransaction();
          await session.endSession();
          return {
            success: false,
            conflict: {
              reason: 'This time slot conflicts with an existing booking',
              type: 'SLOT_UNAVAILABLE',
            },
          };
        }
      }

      // Step 6b: Check daily capacity (2 trials per mentor per local day)
      const mentorLocalDate = getLocalDateForInstant(startTime.toISOString(), mentor.timezone);
      const { startInstant: dayStartInstant, endInstant: dayEndInstant } = getLocalDayBoundaries(
        mentorLocalDate,
        mentor.timezone
      );

      const dayStartDate = new Date(dayStartInstant);
      const dayEndDate = new Date(dayEndInstant);

      const bookingsOnDay = await Booking.countDocuments({
        mentorId: new mongoose.Types.ObjectId(mentorId),
        status: 'CONFIRMED',
        startTime: { $gte: dayStartDate, $lt: dayEndDate },
      }).session(session).exec();

      if (bookingsOnDay >= MAX_TRIALS_PER_MENTOR_PER_DAY) {
        await session.abortTransaction();
        await session.endSession();
        return {
          success: false,
          conflict: {
            reason: 'Mentor has reached daily capacity for this date',
            type: 'CAPACITY_REACHED',
          },
        };
      }

      // Step 6c: Create booking atomically
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

      await newBooking.save({ session });

      // Commit transaction
      await session.commitTransaction();
      await session.endSession();

      return {
        success: true,
        booking: this.toBookingResponse(newBooking),
      };
    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      await session.endSession();

      if (error instanceof Error) {
        // Handle duplicate key error (race condition on idempotency key)
        if ('code' in error && error.code === 11000) {
          // Another request created the booking, fetch and return it
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
   * Validate booking request parameters.
   */
  private validateBookingRequest(request: CreateBookingRequest): void {
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
   */
  private generateClassUrl(mentorId: string, startTime: Date): string {
    const timestamp = startTime.getTime();
    const hash = Buffer.from(`${mentorId}-${timestamp}`).toString('base64url').substring(0, 12);
    return `https://meet.codeyoung.dev/${hash}`;
  }

  /**
   * Transform booking document to response format.
   */
  private toBookingResponse(booking: IBooking) {
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
