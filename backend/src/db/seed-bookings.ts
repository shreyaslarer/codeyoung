import { connectToDatabase, disconnectFromDatabase } from './connection.js';
import { Mentor } from '../models/mentor.schema.js';
import { Booking } from '../models/booking.schema.js';

export async function seedInitialBookings() {
  try {
    await connectToDatabase();

    // Remove existing seed baseline bookings to ensure clean verification state
    await Booking.deleteMany({ idempotencyKey: { $regex: '^seed-idemp-' } });

    const mentors = await Mentor.find().sort({ _id: 1 });
    if (mentors.length === 0) {
      console.error('No mentors found in database! Please run mentor seed first.');
      await disconnectFromDatabase();
      return;
    }

    console.log(`Found ${mentors.length} mentors. Seeding initial scheduling activities for today...`);

    // Today's base date: 2026-09-27
    const initialBookings = [
      {
        mentorId: mentors[1]._id, // Rajesh Kumar (Mentor 02)
        parentName: 'John Doe',
        parentEmail: 'john.doe@example.com',
        parentTimezone: 'Europe/London',
        startTime: new Date('2026-09-27T09:00:00.000Z'), // 10:00 BST = 14:30 IST
        endTime: new Date('2026-09-27T09:30:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1024',
        idempotencyKey: 'seed-idemp-1024',
      },
      {
        mentorId: mentors[3]._id, // Vikram Patel (Mentor 04 / 06)
        parentName: 'Sarah Miller',
        parentEmail: 'sarah.m@example.com',
        parentTimezone: 'America/New_York',
        startTime: new Date('2026-09-27T20:30:00.000Z'), // 16:30 EDT = 02:00 IST (+1)
        endTime: new Date('2026-09-27T21:00:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1023',
        idempotencyKey: 'seed-idemp-1023',
      },
      {
        mentorId: mentors[1]._id, // Rajesh Kumar (2nd class -> 2/2 Full)
        parentName: 'Rohan Mehta',
        parentEmail: 'rohan.m@example.com',
        parentTimezone: 'Asia/Dubai',
        startTime: new Date('2026-09-27T09:30:00.000Z'), // 13:30 GST = 15:00 IST
        endTime: new Date('2026-09-27T10:00:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1022',
        idempotencyKey: 'seed-idemp-1022',
      },
      {
        mentorId: mentors[0]._id, // Priya Sharma (Mentor 01 - 1 class)
        parentName: 'Emily Zhang',
        parentEmail: 'emily.z@outlook.com',
        parentTimezone: 'Asia/Singapore',
        startTime: new Date('2026-09-27T09:00:00.000Z'), // 17:00 SGT = 14:30 IST
        endTime: new Date('2026-09-27T09:30:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1021',
        idempotencyKey: 'seed-idemp-1021',
      },
      {
        mentorId: mentors[3]._id, // Vikram Patel (2nd class -> 2/2 Full)
        parentName: "Liam O'Connor",
        parentEmail: 'liam.oc@eircom.net',
        parentTimezone: 'Europe/Dublin',
        startTime: new Date('2026-09-27T11:00:00.000Z'), // 12:00 IST = 16:30 IST
        endTime: new Date('2026-09-27T11:30:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1020',
        idempotencyKey: 'seed-idemp-1020',
      },
      {
        mentorId: mentors[2]._id, // Anita Desai (Mentor 03/04 - 1 class)
        parentName: 'Marcus Vance',
        parentEmail: 'mvance@comcast.net',
        parentTimezone: 'America/Chicago',
        startTime: new Date('2026-09-27T12:00:00.000Z'), // 07:00 CDT = 17:30 IST
        endTime: new Date('2026-09-27T12:30:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1019',
        idempotencyKey: 'seed-idemp-1019',
      },
      {
        mentorId: mentors[6]._id, // Sneha Iyer (Mentor 07 - 1 class)
        parentName: 'Fatima Al-Sayed',
        parentEmail: 'fatima.s@gmail.com',
        parentTimezone: 'Asia/Riyadh',
        startTime: new Date('2026-09-27T05:30:00.000Z'), // 08:30 AST = 11:00 IST
        endTime: new Date('2026-09-27T06:00:00.000Z'),
        status: 'CONFIRMED' as const,
        classUrl: 'https://meet.codeyoung.com/trial/room-cy-1018',
        idempotencyKey: 'seed-idemp-1018',
      },
    ];

    await Booking.insertMany(initialBookings);
    console.log(`✓ Successfully seeded ${initialBookings.length} initial bookings in MongoDB!`);

    await disconnectFromDatabase();
  } catch (err) {
    console.error('Error seeding initial bookings:', err);
    process.exit(1);
  }
}

// Execute when run directly
seedInitialBookings();
