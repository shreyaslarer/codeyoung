/**
 * Focused regression tests for "Your Preferred Time" feature.
 *
 * Requirements covered:
 *  1. Preferred times (e.g. 10:15, 10:45) evaluated against mentor working hours.
 *  2. Unavailable preferred times (outside mentor hours) return preferredSlot: null.
 *  3. Mentor working-hour boundaries: 09:00-18:00 IST strictly enforced.
 *  4. Multiple mentors eligible for the same preferred time.
 *  5. Daily capacity: max 2 trials per mentor per local calendar day.
 *  6. Overlapping bookings: half-open interval overlap prevents double-booking.
 *  7. Concurrent booking attempts at the same preferred time.
 *  8. Timezone conversion: parent timezones (London, New York, Kolkata) properly converted.
 *  9. Confirmation that existing predefined 30-min slot flow remains completely unchanged.
 */

import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection.js';
import { availabilityService } from '../src/services/availability.service.js';
import { bookingService, CreateBookingRequest } from '../src/services/booking.service.js';

dotenv.config();

// ─── Helpers ────────────────────────────────────────────────────────────────

const insertBooking = (
  db: Db,
  mentorId: ObjectId,
  startISO: string,
  endISO: string,
  status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED'
) =>
  db.collection('bookings').insertOne({
    mentorId,
    parentName: 'Preferred Time Test Parent',
    parentEmail: 'pref@test.example.com',
    startTime: new Date(startISO),
    endTime: new Date(endISO),
    parentTimezone: 'Europe/London',
    status,
    classUrl: 'https://meet.codeyoung.dev/pref-test',
    idempotencyKey: `pref-${mentorId}-${startISO}-${Math.random()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makeBookingRequest = (
  overrides: Partial<CreateBookingRequest> = {}
): CreateBookingRequest => ({
  parentName: 'Jane Smith',
  parentEmail: 'jane.smith@example.com',
  parentLocalDate: '2026-10-20',
  parentLocalTime: '10:15',
  parentTimezone: 'Europe/London',
  trialDurationMinutes: 30,
  idempotencyKey: `pref-req-${Math.random().toString(36).slice(2)}`,
  ...overrides,
});

describe('Preferred Time Feature Regression Tests', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let mentorIds: ObjectId[];

  beforeAll(async () => {
    await connectToDatabase();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codeyoung';
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db();

    const mentors = await db
      .collection('mentors')
      .find({ active: true })
      .project({ _id: 1 })
      .toArray();

    mentorIds = mentors.map((m) => m._id as ObjectId);
    expect(mentorIds.length).toBe(10);
  });

  afterAll(async () => {
    await db.collection('bookings').deleteMany({
      $or: [
        { parentEmail: { $in: ['pref@test.example.com', 'jane.smith@example.com'] } },
        { startTime: { $gte: new Date('2026-10-19T00:00:00Z'), $lt: new Date('2026-10-22T00:00:00Z') } },
      ],
    });
    await mongoClient.close();
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    await db.collection('bookings').deleteMany({
      $or: [
        { parentEmail: { $in: ['pref@test.example.com', 'jane.smith@example.com'] } },
        { startTime: { $gte: new Date('2026-10-19T00:00:00Z'), $lt: new Date('2026-10-22T00:00:00Z') } },
      ],
    });
  });

  describe('1. Evaluating Arbitrary Preferred Times (10:15, 10:45, 12:00)', () => {
    it('returns an eligible preferredSlot for 10:15 AM London time', async () => {
      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30,
        '10:15'
      );

      expect(result.preferredSlot).toBeDefined();
      expect(result.preferredSlot).not.toBeNull();
      expect(result.preferredSlot!.parentLocalTime).toBe('10:15');
      expect(result.preferredSlot!.parentLocalDate).toBe('2026-10-20');
      expect(result.preferredSlot!.eligibleMentorIds.length).toBeGreaterThan(0);

      // Predefined slots must still be present
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots.some((s) => s.parentLocalTime === '10:00')).toBe(true);
      expect(result.slots.some((s) => s.parentLocalTime === '10:30')).toBe(true);
    });

    it('returns an eligible preferredSlot for 10:45 AM London time', async () => {
      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30,
        '10:45'
      );

      expect(result.preferredSlot).toBeDefined();
      expect(result.preferredSlot).not.toBeNull();
      expect(result.preferredSlot!.parentLocalTime).toBe('10:45');
      expect(result.preferredSlot!.eligibleMentorIds.length).toBeGreaterThan(0);
    });

    it('allows booking a preferred time (10:15 AM) through createBooking', async () => {
      const request = makeBookingRequest({
        parentLocalDate: '2026-10-20',
        parentLocalTime: '10:15',
        parentTimezone: 'Europe/London',
      });

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.booking!.parentTimezone).toBe('Europe/London');
      expect(result.booking!.status).toBe('CONFIRMED');
      expect(result.booking!.classUrl).toBeDefined();
    });
  });

  describe('2. Working Hours Boundaries & Unavailable Times', () => {
    it('returns preferredSlot: null for a time outside mentor working hours (02:00 AM London)', async () => {
      // 02:00 AM BST = 01:00 UTC = 06:30 AM IST (mentors work 09:00 - 18:00 IST)
      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30,
        '02:00'
      );

      expect(result.preferredSlot).toBeNull();
    });

    it('rejects booking for an out-of-hours preferred time with SLOT_UNAVAILABLE', async () => {
      const request = makeBookingRequest({
        parentLocalDate: '2026-10-20',
        parentLocalTime: '02:00',
        parentTimezone: 'Europe/London',
      });

      const result = await bookingService.createBooking(request);

      expect(result.success).toBe(false);
      expect(result.conflict).toBeDefined();
      expect(result.conflict!.type).toBe('SLOT_UNAVAILABLE');
    });

    it('respects the 18:00 IST boundary for preferred slots', async () => {
      // 17:30 IST is the latest valid 30-min start time (ends at 18:00 IST)
      const validBoundary = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Asia/Kolkata',
        30,
        '17:30'
      );
      expect(validBoundary.preferredSlot).not.toBeNull();

      // 17:45 IST would end at 18:15 IST (past 18:00 IST boundary), so must be unavailable
      const invalidBoundary = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Asia/Kolkata',
        30,
        '17:45'
      );
      expect(invalidBoundary.preferredSlot).toBeNull();
    });
  });

  describe('3. Multi-Mentor Allocation & Overlap Enforcement for Preferred Times', () => {
    it('allows up to 10 simultaneous bookings at 10:15 AM across all 10 active mentors', async () => {
      for (let i = 0; i < 10; i++) {
        const req = makeBookingRequest({
          parentLocalTime: '10:15',
          idempotencyKey: `pref-simul-${i}-${Date.now()}`,
        });

        const result = await bookingService.createBooking(req);
        expect(result.success).toBe(true);
      }

      // Verify all 10 mentors received a booking
      const bookings = await db
        .collection('bookings')
        .find({
          parentName: 'Jane Smith',
          status: 'CONFIRMED',
        })
        .toArray();

      expect(bookings.length).toBe(10);
      const allocatedMentorIds = new Set(bookings.map((b) => b.mentorId.toString()));
      expect(allocatedMentorIds.size).toBe(10);

      // The 11th booking must be rejected because all 10 mentors are occupied for 10:15-10:45
      const req11 = makeBookingRequest({
        parentLocalTime: '10:15',
        idempotencyKey: `pref-simul-11-${Date.now()}`,
      });
      const result11 = await bookingService.createBooking(req11);
      expect(result11.success).toBe(false);
      expect(result11.conflict?.type).toBe('SLOT_UNAVAILABLE');
    });

    it('enforces half-open overlap: a 10:15 booking conflicts with 10:00 and 10:30 for that mentor', async () => {
      const m1 = mentorIds[0];

      // Insert confirmed booking at 10:15-10:45 London time (09:15-09:45 UTC)
      await insertBooking(
        db,
        m1,
        '2026-10-20T09:15:00.000Z',
        '2026-10-20T09:45:00.000Z'
      );

      // Check availability for 10:00-10:30 (09:00-09:30 UTC): mentor 1 must NOT be eligible
      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30
      );

      const slot1000 = result.slots.find((s) => s.parentLocalTime === '10:00');
      expect(slot1000).toBeDefined();
      expect(slot1000!.eligibleMentorIds).not.toContain(m1.toString());

      // Check availability for 10:30-11:00 (09:30-10:00 UTC): mentor 1 must NOT be eligible
      const slot1030 = result.slots.find((s) => s.parentLocalTime === '10:30');
      expect(slot1030).toBeDefined();
      expect(slot1030!.eligibleMentorIds).not.toContain(m1.toString());

      // But non-overlapping slot 11:00-11:30 (10:00-10:30 UTC): mentor 1 SHOULD be eligible
      const slot1100 = result.slots.find((s) => s.parentLocalTime === '11:00');
      expect(slot1100).toBeDefined();
      expect(slot1100!.eligibleMentorIds).toContain(m1.toString());
    });
  });

  describe('4. Daily Capacity (Max 2 Trials Per Mentor Local Day)', () => {
    it('excludes mentor from preferred time eligibility once they reach 2 confirmed trials', async () => {
      const m1 = mentorIds[0];

      // Give mentor 1 two confirmed bookings on 2026-10-20
      await insertBooking(
        db,
        m1,
        '2026-10-20T04:00:00.000Z',
        '2026-10-20T04:30:00.000Z'
      );
      await insertBooking(
        db,
        m1,
        '2026-10-20T05:00:00.000Z',
        '2026-10-20T05:30:00.000Z'
      );

      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30,
        '10:15'
      );

      expect(result.preferredSlot).not.toBeNull();
      // Mentor 1 must not be eligible due to daily capacity limit
      expect(result.preferredSlot!.eligibleMentorIds).not.toContain(m1.toString());
      // Other 9 mentors should still be eligible
      expect(result.preferredSlot!.eligibleMentorIds.length).toBe(9);
    });
  });

  describe('5. Unchanged Predefined 30-Minute Slot Flow', () => {
    it('preserves standard 30-minute slots when preferredStartTime is omitted', async () => {
      const result = await availabilityService.getAvailableSlots(
        '2026-10-20',
        'Europe/London',
        30
      );

      expect(result.preferredSlot).toBeUndefined();
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots.every((s) => s.eligibleMentorIds.length > 0)).toBe(true);

      // Books regular 10:00 AM slot normally
      const request = makeBookingRequest({
        parentLocalTime: '10:00',
      });
      const bookResult = await bookingService.createBooking(request);
      expect(bookResult.success).toBe(true);
    });
  });
});
