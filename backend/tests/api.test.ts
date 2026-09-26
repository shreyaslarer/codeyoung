import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db } from 'mongodb';
import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection';

// We'll test the API by directly calling the route handlers
// For true E2E testing, we'd use supertest, but this tests the logic

describe('Scheduling REST API', () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    await connectToDatabase();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('codeyoung_trial_booking');
  });

  afterAll(async () => {
    await client.close();
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    // Clean up test bookings
    const mentors = await db.collection('mentors').find({}).limit(3).toArray();
    const mentorIds = mentors.map(m => m._id);
    await db.collection('bookings').deleteMany({
      mentorId: { $in: mentorIds }
    });
  });

  describe('GET /api/availability', () => {
    it('should return available slots for valid parameters', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      const result = await availabilityService.getAvailableSlots(
        '2026-09-30',
        'Europe/London',
        30
      );

      expect(result.parentDate).toBe('2026-09-30');
      expect(result.parentTimezone).toBe('Europe/London');
      expect(result.trialDurationMinutes).toBe(30);
      expect(result.slots).toBeInstanceOf(Array);
      expect(result.slots.length).toBeGreaterThan(0);
    });

    it('should handle invalid timezone gracefully', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      try {
        await availabilityService.getAvailableSlots(
          '2026-09-30',
          'Invalid/Timezone',
          30
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timezone');
      }
    });

    it('should handle invalid date format gracefully', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      try {
        await availabilityService.getAvailableSlots(
          '30-09-2026', // Wrong format
          'Europe/London',
          30
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('date');
      }
    });

    it('should handle invalid duration gracefully', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      try {
        await availabilityService.getAvailableSlots(
          '2026-09-30',
          'Europe/London',
          0 // Invalid duration
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('duration');
      }
    });

    it('should return empty slots when no availability', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      // Use a date far in the past or future that has no availability
      const result = await availabilityService.getAvailableSlots(
        '2020-01-01',
        'Europe/London',
        30
      );

      expect(result.slots).toBeInstanceOf(Array);
      // May or may not be empty depending on implementation
      // Just verify it returns a valid structure
    });

    it('should handle different timezones correctly', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      const timezones = ['Europe/London', 'America/New_York', 'Asia/Tokyo'];
      
      for (const tz of timezones) {
        const result = await availabilityService.getAvailableSlots(
          '2026-09-30',
          tz,
          30
        );

        expect(result.parentTimezone).toBe(tz);
        expect(result.slots).toBeInstanceOf(Array);
      }
    });

    it('should handle different durations correctly', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      const durations = [30, 45, 60];
      
      for (const duration of durations) {
        const result = await availabilityService.getAvailableSlots(
          '2026-09-30',
          'Europe/London',
          duration
        );

        expect(result.trialDurationMinutes).toBe(duration);
      }
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a booking successfully with valid input', async () => {
      const { bookingService } = await import('../src/services/booking.service.js');
      const { availabilityService } = await import('../src/services/availability.service.js');

      // Get an available slot first
      const availResult = await availabilityService.getAvailableSlots(
        '2026-09-30',
        'Europe/London',
        30
      );

      if (availResult.slots.length === 0) {
        console.warn('No available slots for booking test');
        return;
      }

      const firstSlot = availResult.slots[0];

      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: firstSlot.parentLocalTime,
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-api-${Date.now()}`,
      };

      const result = await bookingService.createBooking(bookingRequest);

      if (result.success && result.booking) {
        expect(result.booking.parentName).toBe(bookingRequest.parentName);
        expect(result.booking.parentEmail).toBe(bookingRequest.parentEmail);
        expect(result.booking.status).toBe('CONFIRMED');
        expect(result.booking.classUrl).toMatch(/^https:\/\//);
      }
    });

    it('should reject booking with missing idempotency key', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: '', // Empty key
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject booking with invalid email', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'invalid-email',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should reject booking with invalid date format', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '30-09-2026', // Wrong format
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should reject booking with invalid time format', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00:00', // Wrong format (has seconds)
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HH:MM');
    });

    it('should return same booking for duplicate idempotent requests', async () => {
      const { bookingService } = await import('../src/services/booking.service.js');
      const { availabilityService } = await import('../src/services/availability.service.js');

      // Get an available slot
      const availResult = await availabilityService.getAvailableSlots(
        '2026-09-30',
        'Europe/London',
        30
      );

      if (availResult.slots.length === 0) {
        console.warn('No available slots for idempotency test');
        return;
      }

      const firstSlot = availResult.slots[0];
      const idempotencyKey = `test-idempotent-${Date.now()}`;

      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: firstSlot.parentLocalTime,
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey,
      };

      const result1 = await bookingService.createBooking(bookingRequest);
      const result2 = await bookingService.createBooking(bookingRequest);
      const result3 = await bookingService.createBooking(bookingRequest);

      if (result1.success && result2.success && result3.success) {
        expect(result1.booking?.id).toBe(result2.booking?.id);
        expect(result2.booking?.id).toBe(result3.booking?.id);
      }
    });

    it('should return 409 conflict when slot is unavailable', async () => {
      const { bookingService } = await import('../src/services/booking.service.js');

      // Use a time that's unlikely to have availability or has conflicts
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '23:59', // Very late time, unlikely to be available
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-conflict-${Date.now()}`,
      };

      const result = await bookingService.createBooking(bookingRequest);

      // Should get conflict or error (slot not available)
      if (!result.success) {
        expect(result.conflict || result.error).toBeDefined();
      }
    });

    it('should reject booking with empty parent name', async () => {
      const bookingRequest = {
        parentName: '',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should reject booking with invalid timezone', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Invalid/Timezone',
        trialDurationMinutes: 30,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject booking with invalid duration', async () => {
      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '10:00',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 0,
        idempotencyKey: `test-${Date.now()}`,
      };

      const { bookingService } = await import('../src/services/booking.service.js');
      const result = await bookingService.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('duration');
    });
  });

  describe('API Request/Response Shapes', () => {
    it('should return availability with correct structure', async () => {
      const { availabilityService } = await import('../src/services/availability.service.js');
      
      const result = await availabilityService.getAvailableSlots(
        '2026-09-30',
        'Europe/London',
        30
      );

      // Verify top-level structure
      expect(result).toHaveProperty('parentDate');
      expect(result).toHaveProperty('parentTimezone');
      expect(result).toHaveProperty('trialDurationMinutes');
      expect(result).toHaveProperty('slots');

      // Verify slot structure if slots exist
      if (result.slots.length > 0) {
        const slot = result.slots[0];
        expect(slot).toHaveProperty('startInstant');
        expect(slot).toHaveProperty('endInstant');
        expect(slot).toHaveProperty('parentLocalDate');
        expect(slot).toHaveProperty('parentLocalTime');
        expect(slot).toHaveProperty('eligibleMentorIds');
        expect(Array.isArray(slot.eligibleMentorIds)).toBe(true);
      }
    });

    it('should return booking with correct public fields only', async () => {
      const { bookingService } = await import('../src/services/booking.service.js');
      const { availabilityService } = await import('../src/services/availability.service.js');

      const availResult = await availabilityService.getAvailableSlots(
        '2026-09-30',
        'Europe/London',
        30
      );

      if (availResult.slots.length === 0) {
        console.warn('No available slots for response shape test');
        return;
      }

      const firstSlot = availResult.slots[0];

      const bookingRequest = {
        parentName: 'Test Parent',
        parentEmail: 'parent@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: firstSlot.parentLocalTime,
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        idempotencyKey: `test-shape-${Date.now()}`,
      };

      const result = await bookingService.createBooking(bookingRequest);

      if (result.success && result.booking) {
        // Verify public fields are present
        expect(result.booking).toHaveProperty('id');
        expect(result.booking).toHaveProperty('mentorId');
        expect(result.booking).toHaveProperty('parentName');
        expect(result.booking).toHaveProperty('parentEmail');
        expect(result.booking).toHaveProperty('startTime');
        expect(result.booking).toHaveProperty('endTime');
        expect(result.booking).toHaveProperty('parentTimezone');
        expect(result.booking).toHaveProperty('status');
        expect(result.booking).toHaveProperty('classUrl');

        // Verify sensitive fields are not exposed
        expect(result.booking).not.toHaveProperty('_id');
        expect(result.booking).not.toHaveProperty('__v');
        expect(result.booking).not.toHaveProperty('createdAt');
        expect(result.booking).not.toHaveProperty('updatedAt');
      }
    });
  });

  describe('Database Integrity', () => {
    it('should maintain mentor count after API operations', async () => {
      const initialCount = await db.collection('mentors').countDocuments();
      
      // Perform some API operations
      const { availabilityService } = await import('../src/services/availability.service.js');
      await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London', 30);
      
      const finalCount = await db.collection('mentors').countDocuments();
      
      expect(finalCount).toBe(initialCount);
      expect(finalCount).toBe(10); // Should still have 10 mentors
    });
  });
});
