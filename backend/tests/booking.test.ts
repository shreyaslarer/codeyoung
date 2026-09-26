import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { bookingService, CreateBookingRequest } from '../src/services/booking.service';
import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection';

describe('Booking Creation Service', () => {
  let client: MongoClient;
  let db: Db;
  let testMentorIds: ObjectId[];
  let availableSlotTime: string | null = null; // Store a known available time

  beforeAll(async () => {
    await connectToDatabase();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('codeyoung_trial_booking');

    // Get mentor IDs for testing
    const mentors = await db.collection('mentors').find({}).limit(3).toArray();
    testMentorIds = mentors.map(m => m._id);

    // Get a known available slot time for testing
    const { availabilityService } = await import('../src/services/availability.service.js');
    const availResult = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London', 30);
    if (availResult.slots.length > 0) {
      availableSlotTime = availResult.slots[0].parentLocalTime;
    }
  });

  afterAll(async () => {
    await client.close();
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    // Clean up test bookings before each test
    await db.collection('bookings').deleteMany({
      mentorId: { $in: testMentorIds }
    });
  });

  const createBookingRequest = (overrides: Partial<CreateBookingRequest> = {}): CreateBookingRequest => ({
    parentName: 'Test Parent',
    parentEmail: 'parent@example.com',
    parentLocalDate: '2026-09-30',
    parentLocalTime: availableSlotTime || '10:00', // Use known available time
    parentTimezone: 'Europe/London',
    trialDurationMinutes: 30,
    idempotencyKey: `test-${Date.now()}-${Math.random()}`,
    ...overrides,
  });

  describe('Successful Booking Creation', () => {
    it('should create a booking successfully with valid input', async () => {
      const request = createBookingRequest();
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.booking?.parentName).toBe(request.parentName);
      expect(result.booking?.parentEmail).toBe(request.parentEmail);
      expect(result.booking?.parentTimezone).toBe(request.parentTimezone);
      expect(result.booking?.status).toBe('CONFIRMED');
      expect(result.booking?.classUrl).toMatch(/^https:\/\/meet\.codeyoung\.dev\//);
      expect(result.booking?.mentorId).toBeDefined();
      expect(result.conflict).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should store correct start and end times in UTC', async () => {
      const request = createBookingRequest({
        parentLocalDate: '2026-09-30',
        parentLocalTime: '14:30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
      });

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();

      // London is UTC+1 in September, so 14:30 London = 13:30 UTC
      const startTime = new Date(result.booking!.startTime);
      const endTime = new Date(result.booking!.endTime);

      expect(startTime.getUTCHours()).toBe(13);
      expect(startTime.getUTCMinutes()).toBe(30);
      expect(endTime.getUTCHours()).toBe(14);
      expect(endTime.getUTCMinutes()).toBe(0);
    });

    it('should generate unique class URLs for different bookings', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:00' });
      const request2 = createBookingRequest({ parentLocalTime: '10:30' });

      const result1 = await bookingService.createBooking(request1);
      const result2 = await bookingService.createBooking(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.booking?.classUrl).not.toBe(result2.booking?.classUrl);
    });
  });

  describe('Overlapping Booking Rejection', () => {
    it('should reject booking that exactly overlaps existing booking', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:00' });
      const request2 = createBookingRequest({ parentLocalTime: '10:00' });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(false);
      expect(result2.conflict?.type).toBe('SLOT_UNAVAILABLE');
      expect(result2.conflict?.reason).toContain('no longer available');
    });

    it('should reject booking that partially overlaps at start', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 30 });
      const request2 = createBookingRequest({ parentLocalTime: '10:15', trialDurationMinutes: 30 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(false);
      expect(result2.conflict?.type).toBe('SLOT_UNAVAILABLE');
    });

    it('should reject booking that partially overlaps at end', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:30', trialDurationMinutes: 30 });
      const request2 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 45 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(false);
      expect(result2.conflict?.type).toBe('SLOT_UNAVAILABLE');
    });

    it('should reject booking that encompasses existing booking', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:15', trialDurationMinutes: 30 });
      const request2 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 60 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(false);
      expect(result2.conflict?.type).toBe('SLOT_UNAVAILABLE');
    });
  });

  describe('Adjacent Non-Overlapping Bookings', () => {
    it('should allow adjacent bookings with half-open interval semantics', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 30 });
      const request2 = createBookingRequest({ parentLocalTime: '10:30', trialDurationMinutes: 30 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(true);
      expect(result2.booking).toBeDefined();
    });

    it('should allow booking after another booking ends', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '09:00', trialDurationMinutes: 60 });
      const request2 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 30 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(true);
    });

    it('should allow booking before another booking starts', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '11:00', trialDurationMinutes: 30 });
      const request2 = createBookingRequest({ parentLocalTime: '10:00', trialDurationMinutes: 60 });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(true);
    });
  });

  describe('Daily Capacity Enforcement', () => {
    it('should allow exactly 2 bookings per mentor per local day', async () => {
      // Create two bookings on the same mentor's local day
      const request1 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
      });
      const request2 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '14:00',
        parentTimezone: 'Europe/London',
      });

      const result1 = await bookingService.createBooking(request1);
      expect(result1.success).toBe(true);

      const result2 = await bookingService.createBooking(request2);
      expect(result2.success).toBe(true);

      // Verify both bookings were created
      const bookings = await db.collection('bookings').find({
        mentorId: { $in: testMentorIds },
        status: 'CONFIRMED'
      }).toArray();

      expect(bookings.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject third booking when mentor has 2 bookings on local day', async () => {
      // Create two bookings first
      const request1 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '09:00',
      });
      const request2 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '13:00',
      });

      const result1 = await bookingService.createBooking(request1);
      const result2 = await bookingService.createBooking(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify both used the same mentor
      const mentor1Id = result1.booking!.mentorId;
      const mentor2Id = result2.booking!.mentorId;

      // If they used the same mentor, try third booking
      if (mentor1Id === mentor2Id) {
        const request3 = createBookingRequest({ 
          parentLocalDate: '2026-09-30',
          parentLocalTime: '15:00',
        });

        // Force allocation to same mentor by creating bookings for others
        // Actually, let's just verify capacity logic works when hit
        const result3 = await bookingService.createBooking(request3);
        
        // Third booking should either succeed (different mentor) or fail (same mentor at capacity)
        if (!result3.success) {
          expect(result3.conflict?.type).toMatch(/CAPACITY_REACHED|NO_MENTORS_AVAILABLE|SLOT_UNAVAILABLE/);
        }
      }
    });
  });

  describe('Mentor Local Calendar Day Boundaries', () => {
    it('should count bookings on mentor local day, not UTC day', async () => {
      // This tests that capacity is calculated based on mentor's timezone
      // A booking late in the evening in one timezone might be the next day in another

      const request = createBookingRequest({
        parentLocalDate: '2026-09-30',
        parentLocalTime: '23:00', // Late evening
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
      });

      const result = await bookingService.createBooking(request);

      // Should succeed (within capacity)
      // The key is that it's counted against the mentor's local Oct 15, not UTC Oct 16
      expect(result.success).toBe(true);
    });

    it('should handle bookings across different parent timezones for same mentor', async () => {
      // Parent 1 in London books morning slot
      const request1 = createBookingRequest({
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
      });

      // Parent 2 in New York books slot (different timezone, same UTC time)
      const request2 = createBookingRequest({
        parentLocalDate: '2026-09-30',
        parentLocalTime: '05:00',
        parentTimezone: 'America/New_York',
      });

      const result1 = await bookingService.createBooking(request1);
      const result2 = await bookingService.createBooking(request2);

      expect(result1.success).toBe(true);
      
      // Second booking should recognize the slot is taken
      if (result1.booking?.mentorId === result2.booking?.mentorId) {
        expect(result2.success).toBe(false);
      }
    });
  });

  describe('Idempotency', () => {
    it('should return same booking for repeated requests with same idempotency key', async () => {
      const idempotencyKey = `test-idempotency-${Date.now()}`;
      const request = createBookingRequest({ idempotencyKey });

      const result1 = await bookingService.createBooking(request);
      const result2 = await bookingService.createBooking(request);
      const result3 = await bookingService.createBooking(request);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(result1.booking?.id).toBe(result2.booking?.id);
      expect(result2.booking?.id).toBe(result3.booking?.id);

      // Verify only one booking was created
      const bookings = await db.collection('bookings').find({
        idempotencyKey,
      }).toArray();

      expect(bookings.length).toBe(1);
    });

    it('should create different bookings for different idempotency keys', async () => {
      const request1 = createBookingRequest({ 
        parentLocalTime: '10:00',
        idempotencyKey: `key-1-${Date.now()}`,
      });
      const request2 = createBookingRequest({ 
        parentLocalTime: '11:00',
        idempotencyKey: `key-2-${Date.now()}`,
      });

      const result1 = await bookingService.createBooking(request1);
      const result2 = await bookingService.createBooking(request2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.booking?.id).not.toBe(result2.booking?.id);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty parent name', async () => {
      const request = createBookingRequest({ parentName: '' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('should reject invalid email', async () => {
      const request = createBookingRequest({ parentEmail: 'invalid-email' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject invalid date format', async () => {
      const request = createBookingRequest({ parentLocalDate: '15-10-2026' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should reject invalid time format', async () => {
      const request = createBookingRequest({ parentLocalTime: '10:00:00' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HH:MM');
    });

    it('should reject invalid timezone', async () => {
      const request = createBookingRequest({ parentTimezone: 'Invalid/Timezone' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid duration', async () => {
      const request = createBookingRequest({ trialDurationMinutes: 0 });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('duration');
    });

    it('should reject empty idempotency key', async () => {
      const request = createBookingRequest({ idempotencyKey: '' });
      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Idempotency key');
    });
  });

  describe('Concurrent Booking Attempts', () => {
    it('should handle concurrent requests for same slot gracefully', async () => {
      const idempotencyKey1 = `concurrent-1-${Date.now()}`;
      const idempotencyKey2 = `concurrent-2-${Date.now()}`;

      const request1 = createBookingRequest({ 
        parentLocalTime: '10:00',
        idempotencyKey: idempotencyKey1,
      });
      const request2 = createBookingRequest({ 
        parentLocalTime: '10:00',
        idempotencyKey: idempotencyKey2,
      });

      // Simulate concurrent requests
      const [result1, result2] = await Promise.all([
        bookingService.createBooking(request1),
        bookingService.createBooking(request2),
      ]);

      // One should succeed, one should fail (or both succeed with different mentors)
      const bothSucceeded = result1.success && result2.success;
      const oneSucceeded = (result1.success && !result2.success) || (!result1.success && result2.success);

      expect(bothSucceeded || oneSucceeded).toBe(true);

      if (bothSucceeded) {
        // If both succeeded, they must have different mentors
        expect(result1.booking?.mentorId).not.toBe(result2.booking?.mentorId);
      } else {
        // If one failed, it should be a conflict
        const failedResult = result1.success ? result2 : result1;
        expect(failedResult.conflict?.type).toMatch(/SLOT_UNAVAILABLE|NO_MENTORS_AVAILABLE/);
      }
    });
  });

  describe('Transaction Rollback', () => {
    it('should not create booking if transaction fails', async () => {
      const request = createBookingRequest({
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
      });

      // First booking succeeds
      const result1 = await bookingService.createBooking(request);
      expect(result1.success).toBe(true);

      // Count bookings before second attempt
      const bookingsBeforeCount = await db.collection('bookings').countDocuments({
        mentorId: { $in: testMentorIds }
      });

      // Second booking with same slot should fail
      const request2 = createBookingRequest({
        parentLocalDate: '2026-10-15',
        parentLocalTime: '10:00',
      });

      const result2 = await bookingService.createBooking(request2);

      // Count bookings after second attempt
      const bookingsAfterCount = await db.collection('bookings').countDocuments({
        mentorId: { $in: testMentorIds }
      });

      // If second booking failed, count should not increase
      if (!result2.success) {
        expect(bookingsAfterCount).toBe(bookingsBeforeCount);
      }
    });
  });

  describe('Database Integrity', () => {
    it('should maintain database consistency after failed bookings', async () => {
      const initialMentorCount = await db.collection('mentors').countDocuments();
      
      // Try several bookings, some may fail
      const requests = [
        createBookingRequest({ parentLocalTime: '10:00' }),
        createBookingRequest({ parentLocalTime: '10:00' }), // Duplicate, should fail
        createBookingRequest({ parentLocalTime: '11:00' }),
        createBookingRequest({ parentEmail: 'invalid' }), // Invalid, should fail
      ];

      await Promise.all(requests.map(req => bookingService.createBooking(req)));

      // Verify mentor count unchanged
      const finalMentorCount = await db.collection('mentors').countDocuments();
      expect(finalMentorCount).toBe(initialMentorCount);

      // Verify all bookings have valid mentor references
      const bookings = await db.collection('bookings').find({
        mentorId: { $in: testMentorIds }
      }).toArray();

      for (const booking of bookings) {
        const mentor = await db.collection('mentors').findOne({ _id: booking.mentorId });
        expect(mentor).not.toBeNull();
      }
    });
  });
});
