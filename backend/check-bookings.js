import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/codeyoung_trial_booking';

async function checkBookings() {
  try {
    console.log('=== Checking Bookings ===\n');
    console.log('Connecting to:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    // Count all bookings
    const totalBookings = await mongoose.connection.db.collection('bookings')
      .countDocuments();
    
    console.log(`Total bookings in database: ${totalBookings}\n`);
    
    // Get all bookings
    const allBookings = await mongoose.connection.db.collection('bookings')
      .find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .toArray();
    
    if (allBookings.length === 0) {
      console.log('❌ No bookings found in database!');
      console.log('');
      console.log('This could mean:');
      console.log('1. You are looking at the wrong database (check port number)');
      console.log('2. The booking was not saved successfully');
      console.log('3. Backend is connected to different database than MongoDB shell');
      console.log('');
      console.log('Current connection: ' + MONGODB_URI);
      console.log('');
      console.log('Check backend logs for errors during booking creation.');
    } else {
      console.log('Recent bookings:\n');
      allBookings.forEach((booking, idx) => {
        console.log(`${idx + 1}. ${booking.parentName} (${booking.parentEmail})`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Time: ${booking.startTime}`);
        console.log(`   Mentor ID: ${booking.mentorId}`);
        console.log(`   Created: ${booking.createdAt || booking._id.getTimestamp()}`);
        console.log('');
      });
    }
    
    // Check mentors
    const mentorCount = await mongoose.connection.db.collection('mentors')
      .countDocuments({ active: true });
    console.log(`Active mentors: ${mentorCount}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBookings();
