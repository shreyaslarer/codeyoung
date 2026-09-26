import { connectToDatabase, disconnectFromDatabase } from './connection.js';
import { Mentor } from '../models/mentor.schema.js';

const mentorData = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Anita Desai',
    email: 'anita.desai@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Vikram Patel',
    email: 'vikram.patel@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Kavita Reddy',
    email: 'kavita.reddy@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Sneha Iyer',
    email: 'sneha.iyer@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Rohan Verma',
    email: 'rohan.verma@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Meera Singh',
    email: 'meera.singh@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
  {
    name: 'Aditya Nair',
    email: 'aditya.nair@codeyoung.dev',
    timezone: 'Asia/Kolkata',
    active: true,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  },
];

async function seedMentors() {
  try {
    await connectToDatabase();
    
    console.log('Checking existing mentors...');
    const existingCount = await Mentor.countDocuments();
    
    if (existingCount === 10) {
      console.log('✓ Database already has 10 mentors. Skipping seed.');
      await disconnectFromDatabase();
      return;
    }
    
    console.log(`Found ${existingCount} mentors. Reseeding to restore 10 mentors...`);
    
    // Clear existing mentors
    await Mentor.deleteMany({});
    console.log('Cleared existing mentor data');
    
    // Insert the 10 mentors
    const insertedMentors = await Mentor.insertMany(mentorData);
    console.log(`✓ Successfully seeded ${insertedMentors.length} mentors`);
    
    // Verify
    const finalCount = await Mentor.countDocuments();
    console.log(`Final mentor count: ${finalCount}`);
    
    await disconnectFromDatabase();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding mentors:', error);
    process.exit(1);
  }
}

seedMentors();
