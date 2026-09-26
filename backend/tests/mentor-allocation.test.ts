import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { MentorAllocationService } from '../src/services/mentor-allocation.service';
import { MentorRepository } from '../src/repositories/mentor.repository';
import { BookingRepository } from '../src/models/booking.repository';

dotenv.config();

describe('Mentor Allocation Service', () => {
  let client: MongoClient;
  let db: Db;
  let mentorAllocationService: MentorAllocationService;
  let mentorRepository: MentorRepository;
  let bookingRepository: BookingRepository;

  // Test mentor IDs (reusing production mentors)
  let mentor1Id: ObjectId;
  let mentor2Id: ObjectId;
  let mentor3Id: ObjectId;

  const createBooking = (mentorId: ObjectId, start: string, end: string, status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED') => ({
    mentorId,
    parentName: 'Test Parent',
    parentEmail: 'test@example.com',
    startTime: new Date(start),
    endTime: new Date(end),
    parentTimezone: 'Europe/London',
    status,
    classUrl: 'https://meet.example.com/test',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();

    mentorRepository = new MentorRepository(db);
    bookingRepository = new BookingRepository(db);
    mentorAllocationService = new MentorAllocationService(mentorRepository, bookingRepository);

    // Get existing mentor IDs for testing
    const mentors = await db.collection('mentors').find({}).limit(3).toArray();
    mentor1Id = mentors[0]._id;
    mentor2Id = mentors[1]._id;
    mentor3Id = mentors[2]._id;
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    // Clean up test bookings before each test
    await db.collection('bookings').deleteMany({
      mentorId: { $in: [mentor1Id, mentor2Id, mentor3Id] }
    });
  });

  describe('Least-Booked Selection', () => {
    it('should select the mentor with the fewest confirmed bookings', async () => {
      // mentor1 has 1 booking, mentor2 has 2 bookings, mentor3 has 0 bookings
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-20T10:00:00Z', '2026-09-20T11:00:00Z'),
        createBooking(mentor2Id, '2026-09-21T10:00:00Z', '2026-09-21T11:00:00Z'),
        createBooking(mentor2Id, '2026-09-22T10:00:00Z', '2026-09-22T11:00:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id, mentor3Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor3Id.toString());
    });

    it('should count only confirmed bookings, not cancelled ones', async () => {
      // mentor1 has 2 confirmed, mentor2 has 1 confirmed + 2 cancelled
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-20T10:00:00Z', '2026-09-20T11:00:00Z'),
        createBooking(mentor1Id, '2026-09-21T10:00:00Z', '2026-09-21T11:00:00Z'),
        createBooking(mentor2Id, '2026-09-22T10:00:00Z', '2026-09-22T11:00:00Z', 'CANCELLED'),
        createBooking(mentor2Id, '2026-09-23T10:00:00Z', '2026-09-23T11:00:00Z', 'CANCELLED'),
        createBooking(mentor2Id, '2026-09-24T10:00:00Z', '2026-09-24T11:00:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });
  });

  describe('Deterministic Tie-Breaking', () => {
    it('should use stable mentorId ordering when booking counts are equal', async () => {
      // All mentors have 0 bookings
      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id, mentor3Id]
      );

      const sortedIds = [mentor1Id, mentor2Id, mentor3Id]
        .map(id => id.toString())
        .sort((a, b) => a.localeCompare(b));

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(sortedIds[0]);
    });

    it('should use stable ordering as secondary sort after booking count', async () => {
      // mentor1 has 2 bookings, mentor2 and mentor3 each have 1 booking
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-20T10:00:00Z', '2026-09-20T11:00:00Z'),
        createBooking(mentor1Id, '2026-09-21T10:00:00Z', '2026-09-21T11:00:00Z'),
        createBooking(mentor2Id, '2026-09-22T10:00:00Z', '2026-09-22T11:00:00Z'),
        createBooking(mentor3Id, '2026-09-23T10:00:00Z', '2026-09-23T11:00:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id, mentor3Id]
      );

      const tiedIds = [mentor2Id.toString(), mentor3Id.toString()].sort((a, b) => a.localeCompare(b));
      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(tiedIds[0]);
    });
  });

  describe('Overlapping Booking Exclusion', () => {
    it('should exclude mentor with exact overlapping booking', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });

    it('should exclude mentor with partial overlap at start', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T09:30:00Z', '2026-09-28T10:30:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });

    it('should exclude mentor with partial overlap at end', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T10:30:00Z', '2026-09-28T11:30:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });

    it('should NOT exclude mentor with adjacent non-overlapping booking', async () => {
      // Booking ends exactly when requested slot starts (half-open intervals)
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T09:00:00Z', '2026-09-28T10:00:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      // mentor1 should not be excluded
      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor1Id.toString());
    });

    it('should NOT exclude mentor with cancelled overlapping booking', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T10:00:00Z', '2026-09-28T11:00:00Z', 'CANCELLED')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor1Id.toString());
    });
  });

  describe('Daily Capacity Exclusion', () => {
    it('should exclude mentor who has reached 2 trials on their local calendar day', async () => {
      // Create 2 bookings on the same day in mentor1's local timezone
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-28T05:00:00Z', '2026-09-28T06:00:00Z'),
        createBooking(mentor1Id, '2026-09-28T08:00:00Z', '2026-09-28T09:00:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });

    it('should NOT exclude mentor who has only 1 trial on their local calendar day', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T05:00:00Z', '2026-09-28T06:00:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor1Id.toString());
    });

    it('should NOT count cancelled bookings toward daily capacity', async () => {
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-28T05:00:00Z', '2026-09-28T06:00:00Z', 'CANCELLED'),
        createBooking(mentor1Id, '2026-09-28T07:00:00Z', '2026-09-28T08:00:00Z', 'CANCELLED'),
        createBooking(mentor1Id, '2026-09-28T09:00:00Z', '2026-09-28T10:00:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      // Should allocate mentor1 (only 1 confirmed booking)
      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor1Id.toString());
    });
  });

  describe('Edge Cases', () => {
    it('should fail when eligible mentor list is empty', async () => {
      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        []
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe('No eligible mentors provided');
    });

    it('should allocate successfully when only one mentor is eligible', async () => {
      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor1Id.toString());
    });

    it('should fail when the single eligible mentor has a conflict', async () => {
      await db.collection('bookings').insertOne(
        createBooking(mentor1Id, '2026-09-28T10:30:00Z', '2026-09-28T11:30:00Z')
      );

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id]
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No available mentors');
    });

    it('should fail when all eligible mentors are excluded', async () => {
      await db.collection('bookings').insertMany([
        createBooking(mentor1Id, '2026-09-28T10:30:00Z', '2026-09-28T11:30:00Z'),
        createBooking(mentor2Id, '2026-09-28T09:30:00Z', '2026-09-28T10:30:00Z')
      ]);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No available mentors');
    });

    it('should prefer less-booked mentor even if more-booked mentor is available', async () => {
      // mentor1 has 5 bookings, mentor2 has 2 bookings
      const bookings = [
        ...Array.from({ length: 5 }, (_, i) => 
          createBooking(mentor1Id, `2026-09-${20 + i}T10:00:00Z`, `2026-09-${20 + i}T11:00:00Z`)
        ),
        ...Array.from({ length: 2 }, (_, i) => 
          createBooking(mentor2Id, `2026-09-${20 + i}T14:00:00Z`, `2026-09-${20 + i}T15:00:00Z`)
        )
      ];
      await db.collection('bookings').insertMany(bookings);

      const result = await mentorAllocationService.allocateMentor(
        new Date('2026-09-28T10:00:00Z'),
        new Date('2026-09-28T11:00:00Z'),
        [mentor1Id, mentor2Id]
      );

      expect(result.success).toBe(true);
      expect(result.allocatedMentorId).toBe(mentor2Id.toString());
    });
  });
});
