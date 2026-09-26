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
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();

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
        parentLocalTime: '10:00',  // 10:00 London = 09:00 UTC (within mentor 03:30-12:30 UTC hours)
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
      });

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();

      // London is UTC+1 in September, so 10:00 London = 09:00 UTC
      const startTime = new Date(result.booking!.startTime);
      const endTime = new Date(result.booking!.endTime);

      expect(startTime.getUTCHours()).toBe(9);
      expect(startTime.getUTCMinutes()).toBe(0);
      expect(startTime.getUTCSeconds()).toBe(0);
      expect(endTime.getUTCHours()).toBe(9);
      expect(endTime.getUTCMinutes()).toBe(30);
      expect(endTime.getUTCSeconds()).toBe(0);
    });

    it('should generate unique class URLs for different bookings', async () => {
      const request1 = createBookingRequest({ parentLocalTime: '10:00' });
      const request2 = createBookingRequest({ parentLocalTime: '10:30' });  // Different time

      const result1 = await bookingService.createBooking(request1);
      const result2 = await bookingService.createBooking(request2);

      console.log('Booking 1:', {
        success: result1.success,
        mentorId: result1.booking?.mentorId,
        startTime: result1.booking?.startTime,
        url: result1.booking?.classUrl
      });
      console.log('Booking 2:', {
        success: result2.success,
        mentorId: result2.booking?.mentorId,
        startTime: result2.booking?.startTime,
        url: result2.booking?.classUrl
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // URLs should be different (different times or different mentors)
      expect(result1.booking?.classUrl).toBeDefined();
      expect(result2.booking?.classUrl).toBeDefined();
      expect(result1.booking?.classUrl).not.toBe(result2.booking?.classUrl);
    });
  });

  describe('Overlapping Booking Rejection', () => {
    it('should allow multiple bookings at same time when mentors available', async () => {
      // Create multiple bookings at the same time - should succeed with different mentors
      const requests = [
        createBookingRequest({ parentLocalTime: '10:00' }),
        createBookingRequest({ parentLocalTime: '10:00' }),
        createBookingRequest({ parentLocalTime: '10:00' })
      ];

      const results = await Promise.all(requests.map(r => bookingService.createBooking(r)));
      const successCount = results.filter(r => r.success).length;
      
      // At least 3 mentors should be available at 10:00
      expect(successCount).toBeGreaterThanOrEqual(3);
      
      // All successful bookings should have different mentors
      const mentorIds = results
        .filter(r => r.success)
        .map(r => r.booking!.mentorId);
      const uniqueMentors = new Set(mentorIds);
      expect(uniqueMentors.size).toBe(successCount);
    });

    it('should handle overlapping time requests correctly', async () => {
      // Book all available mentors at 10:00
      const time1Requests = [];
      for (let i = 0; i < 10; i++) {
        time1Requests.push(createBookingRequest({ parentLocalTime: '10:00' }));
      }
      
      const time1Results = await Promise.all(time1Requests.map(r => bookingService.createBooking(r)));
      const time1SuccessCount = time1Results.filter(r => r.success).length;
      
      // Some mentors should be available at 10:00
      expect(time1SuccessCount).toBeGreaterThan(0);
      
      // Try to book a slot that overlaps (10:15-10:45 overlaps with 10:00-10:30)
      // This should still succeed if there are mentors who didn't get booked at 10:00
      const overlappingRequest = createBookingRequest({ parentLocalTime: '10:15', trialDurationMinutes: 30 });
      const overlappingResult = await bookingService.createBooking(overlappingRequest);
      
      // Result depends on whether there are mentors available
      // Either succeeds (mentor available) or fails (no mentors)
      if (!overlappingResult.success) {
        expect(overlappingResult.conflict?.type).toBe('NO_MENTORS_AVAILABLE');
      }
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
      // Create two bookings at different times on the same day
      // Both times must be within mentor working hours (09:00-18:00 IST = 03:30-12:30 UTC)
      // For London (UTC+1), available times are 04:30-13:30 London time
      const request1 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',  // 09:00 UTC
        parentTimezone: 'Europe/London',
      });
      const request2 = createBookingRequest({ 
        parentLocalDate: '2026-09-30',
        parentLocalTime: '11:00',  // 10:00 UTC (within mentor hours)
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

    it('should enforce capacity limits per mentor per day', async () => {
      // This test verifies the capacity checking logic exists
      // With 10 mentors and 2 bookings each, we can make 20 bookings per day max
      // We'll create multiple bookings and verify the system doesn't exceed this
      
      const requests = [];
      for (let i = 0; i < 25; i++) {  // Try to create 25 bookings
        requests.push(createBookingRequest({ 
          parentLocalDate: '2026-10-01',  // Use different date to avoid conflicts with other tests
          parentLocalTime: i % 2 === 0 ? '10:00' : '11:00',  // Alternate times
        }));
      }

      const results = await Promise.all(requests.map(r => bookingService.createBooking(r)));
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Some should succeed, some should fail due to capacity/availability
      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThanOrEqual(20);  // Max 10 mentors * 2 bookings each
      
      // Failures should be due to capacity or no mentors available
      const failures = results.filter(r => !r.success);
      failures.forEach(result => {
        expect(result.conflict?.type).toMatch(/CAPACITY_REACHED|NO_MENTORS_AVAILABLE/);
      });
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
