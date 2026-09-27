/**
 * Regression tests: same-time multi-mentor booking capacity.
 *
 * Invariant (project-research.md / coding-skill.md):
 *   "If N active eligible mentors can handle a slot, up to N parents must be
 *    able to book that exact time simultaneously — one mentor per booking.
 *    The daily limit of 2 bookings per mentor is NOT a per-slot limit."
 *
 * Tests cover:
 *  1. 10 mentors → 10 simultaneous bookings at the same slot (each gets its own mentor)
 *  2. 11th booking at that slot is rejected once all 10 mentors are occupied
 *  3. Simultaneous bookings at the same time use different mentors
 *  4. Adjacent non-overlapping slots stay valid after one slot is booked
 *  5. Per-mentor daily maximum of 2 is still enforced
 *  6. Availability endpoint does NOT drop a slot merely because some mentors
 *     are booked while other eligible mentors remain
 */

import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { connectToDatabase, disconnectFromDatabase } from '../src/db/connection.js';
import { availabilityService } from '../src/services/availability.service.js';
import { bookingService, CreateBookingRequest } from '../src/services/booking.service.js';

dotenv.config();

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Insert a confirmed booking directly into the collection.
 * Used to pre-populate state without going through the booking service.
 */
const insertBooking = (
  db: Db,
  mentorId: ObjectId,
  startISO: string,
  endISO: string,
  status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED',
) =>
  db.collection('bookings').insertOne({
    mentorId,
    parentName: 'Capacity Test Parent',
    parentEmail: 'capacity@test.example.com',
    startTime: new Date(startISO),
    endTime: new Date(endISO),
    parentTimezone: 'Asia/Kolkata',
    status,
    classUrl: 'https://meet.codeyoung.dev/test',
    idempotencyKey: `cap-${mentorId}-${startISO}-${Math.random()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

/**
 * Build a CreateBookingRequest for a London parent at the given HH:MM on 2026-10-05.
 * The slot 10:00 London = 09:00 UTC = 14:30 IST, well inside all mentors' 09:00-18:00 IST.
 */
const makeRequest = (localTime: string, extra: Partial<CreateBookingRequest> = {}): CreateBookingRequest => ({
  parentName: 'Capacity Test Parent',
  parentEmail: 'capacity@test.example.com',
  parentLocalDate: '2026-10-05',
  parentLocalTime: localTime,
  parentTimezone: 'Europe/London',
  trialDurationMinutes: 30,
  idempotencyKey: `cap-${localTime}-${Date.now()}-${Math.random()}`,
  ...extra,
});

// ─── suite ──────────────────────────────────────────────────────────────────

describe('Same-time multi-mentor booking capacity', () => {
  let client: MongoClient;
  let db: Db;
  let allMentorIds: ObjectId[];

  /**
   * UTC instants for 2026-10-05 10:00–10:30 London (BST = UTC+1):
   *   10:00 London = 09:00 UTC
   *   10:30 London = 09:30 UTC
   */
  const SLOT_START_UTC = '2026-10-05T09:00:00Z';
  const SLOT_END_UTC   = '2026-10-05T09:30:00Z';

  beforeAll(async () => {
    await connectToDatabase();

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();

    const mentors = await db.collection('mentors').find({ active: true }).toArray();
    expect(mentors.length).toBeGreaterThanOrEqual(10);
    allMentorIds = mentors.map(m => m._id as ObjectId);
  });

  afterAll(async () => {
    await client.close();
    await disconnectFromDatabase();
  });

  beforeEach(async () => {
    // Remove only test bookings on the capacity-test date to keep production data intact.
    await db.collection('bookings').deleteMany({
      startTime: { $gte: new Date('2026-10-05T00:00:00Z'), $lt: new Date('2026-10-06T00:00:00Z') },
    });
  });

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  it('availability returns slot with all 10 mentors eligible when none are booked', async () => {
    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);

    const slot = result.slots.find(s => s.parentLocalTime === '10:00');
    expect(slot).toBeDefined();
    // All 10 active mentors must be eligible (none booked yet)
    expect(slot!.eligibleMentorIds.length).toBe(10);
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  it('availability drops one mentor from a slot once that mentor is booked at that interval', async () => {
    const mentor0 = allMentorIds[0];

    // Book mentor0 at the 10:00 slot
    await insertBooking(db, mentor0, SLOT_START_UTC, SLOT_END_UTC);

    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);
    const slot = result.slots.find(s => s.parentLocalTime === '10:00');

    expect(slot).toBeDefined();
    // mentor0 is now occupied — must no longer appear in eligibleMentorIds
    expect(slot!.eligibleMentorIds).not.toContain(mentor0.toString());
    // Remaining 9 mentors are still eligible — slot is still visible
    expect(slot!.eligibleMentorIds.length).toBe(9);
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  it('availability slot remains visible when some mentors are booked but others remain eligible', async () => {
    // Book the first 5 mentors at 10:00
    for (let i = 0; i < 5; i++) {
      await insertBooking(db, allMentorIds[i], SLOT_START_UTC, SLOT_END_UTC);
    }

    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);
    const slot = result.slots.find(s => s.parentLocalTime === '10:00');

    // Slot must still be present — 5 mentors remain eligible
    expect(slot).toBeDefined();
    expect(slot!.eligibleMentorIds.length).toBe(5);

    // The 5 booked mentors must not appear
    for (let i = 0; i < 5; i++) {
      expect(slot!.eligibleMentorIds).not.toContain(allMentorIds[i].toString());
    }
    // The 5 remaining mentors must appear
    for (let i = 5; i < 10; i++) {
      expect(slot!.eligibleMentorIds).toContain(allMentorIds[i].toString());
    }
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  it('availability slot disappears only when ALL 10 mentors are booked at that interval', async () => {
    // Fill all 10 mentors at the 10:00 slot
    for (const mentorId of allMentorIds) {
      await insertBooking(db, mentorId, SLOT_START_UTC, SLOT_END_UTC);
    }

    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);
    const slot = result.slots.find(s => s.parentLocalTime === '10:00');

    // Slot must be absent — no mentor can take it
    expect(slot).toBeUndefined();
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  it('10 sequential bookings at the same slot succeed, each assigned to a different mentor', async () => {
    const successfulMentorIds: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = await bookingService.createBooking(makeRequest('10:00'));
      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      successfulMentorIds.push(result.booking!.mentorId);
    }

    // All 10 must have succeeded
    expect(successfulMentorIds.length).toBe(10);

    // Each booking must use a distinct mentor
    const uniqueMentors = new Set(successfulMentorIds);
    expect(uniqueMentors.size).toBe(10);
  }, 30_000);

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  it('11th booking for the same slot is rejected once all 10 mentors are occupied', async () => {
    // Book all 10 mentors at the 10:00 slot via the booking service
    for (let i = 0; i < 10; i++) {
      const r = await bookingService.createBooking(makeRequest('10:00'));
      expect(r.success).toBe(true);
    }

    // 11th request must fail
    const r11 = await bookingService.createBooking(makeRequest('10:00'));
    expect(r11.success).toBe(false);
    // Must be SLOT_UNAVAILABLE (all eligibleMentorIds = 0 in the re-validated availability)
    expect(r11.conflict?.type).toBe('SLOT_UNAVAILABLE');
  }, 30_000);

  // ── Test 7 ─────────────────────────────────────────────────────────────────
  it('adjacent non-overlapping slots remain independently available', async () => {
    // Book mentor0 at 10:00–10:30
    await insertBooking(db, allMentorIds[0], SLOT_START_UTC, SLOT_END_UTC);

    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);

    // 09:30–10:00 slot must still be available (adjacent before 10:00)
    const slotBefore = result.slots.find(s => s.parentLocalTime === '09:30');
    expect(slotBefore).toBeDefined();
    expect(slotBefore!.eligibleMentorIds).toContain(allMentorIds[0].toString());

    // 10:30–11:00 slot must still be available (adjacent after 10:00)
    const slotAfter = result.slots.find(s => s.parentLocalTime === '10:30');
    expect(slotAfter).toBeDefined();
    expect(slotAfter!.eligibleMentorIds).toContain(allMentorIds[0].toString());

    // 10:00 slot must exclude mentor0
    const slot1000 = result.slots.find(s => s.parentLocalTime === '10:00');
    expect(slot1000).toBeDefined();
    expect(slot1000!.eligibleMentorIds).not.toContain(allMentorIds[0].toString());
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────────
  it('per-mentor daily limit of 2 is still enforced', async () => {
    const mentor0 = allMentorIds[0];

    // Give mentor0 two confirmed bookings on 2026-10-05 in IST (09:00 and 09:30 UTC)
    // 09:00 UTC = 14:30 IST → 10:00 London
    // 10:00 UTC = 15:30 IST → 11:00 London
    await insertBooking(db, mentor0, '2026-10-05T09:00:00Z', '2026-10-05T09:30:00Z');
    await insertBooking(db, mentor0, '2026-10-05T10:00:00Z', '2026-10-05T10:30:00Z');

    const result = await availabilityService.getAvailableSlots('2026-10-05', 'Europe/London', 30);

    // mentor0 must be absent from ALL slots (daily cap reached)
    for (const slot of result.slots) {
      expect(slot.eligibleMentorIds).not.toContain(mentor0.toString());
    }

    // Other mentors must still appear in all their working-hours slots
    const anyOtherMentor = allMentorIds[1].toString();
    const slotsWith1 = result.slots.filter(s => s.eligibleMentorIds.includes(anyOtherMentor));
    expect(slotsWith1.length).toBeGreaterThan(0);
  });

  // ── Test 9 ─────────────────────────────────────────────────────────────────
  it('daily capacity of 2 is per-mentor, not per-slot — 20 total bookings for a day are possible', async () => {
    // Each of 10 mentors can take 2 bookings per day = 20 total.
    // Use two non-overlapping time slots on the same day.
    const slot1Time = '10:00'; // 09:00 UTC = 14:30 IST
    const slot2Time = '11:00'; // 10:00 UTC = 15:30 IST

    const results: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      const r1 = await bookingService.createBooking(makeRequest(slot1Time));
      results.push(r1.success);
      const r2 = await bookingService.createBooking(makeRequest(slot2Time));
      results.push(r2.success);
    }

    // All 20 must succeed
    const successes = results.filter(Boolean).length;
    expect(successes).toBe(20);
  }, 60_000);

  // ── Test 10 ────────────────────────────────────────────────────────────────
  it('21st booking on a fully-saturated day is rejected', async () => {
    // Fill all 10 mentors × 2 slots = 20 bookings
    for (let i = 0; i < 10; i++) {
      const r1 = await bookingService.createBooking(makeRequest('10:00'));
      expect(r1.success).toBe(true);
      const r2 = await bookingService.createBooking(makeRequest('11:00'));
      expect(r2.success).toBe(true);
    }

    // 21st booking must fail — all mentors at daily cap
    const r21 = await bookingService.createBooking(makeRequest('12:00'));
    expect(r21.success).toBe(false);
    expect(r21.conflict?.type).toMatch(/SLOT_UNAVAILABLE|NO_MENTORS_AVAILABLE/);
  }, 60_000);
});
