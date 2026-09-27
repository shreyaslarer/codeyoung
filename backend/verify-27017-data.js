import mongoose from 'mongoose';

async function verify() {
  try {
    console.log('=== Verifying Port 27017 Database ===\n');
    
    await mongoose.connect('mongodb://localhost:27017/codeyoung_trial_booking');
    console.log('✓ Connected to mongodb://localhost:27017\n');
    
    const bookingCount = await mongoose.connection.db.collection('bookings').countDocuments();
    const mentorCount = await mongoose.connection.db.collection('mentors').countDocuments();
    
    console.log('Database Contents:');
    console.log(`  Bookings: ${bookingCount}`);
    console.log(`  Mentors: ${mentorCount}`);
    console.log('');
    
    // Show recent bookings
    const recentBookings = await mongoose.connection.db.collection('bookings')
      .find()
      .sort({ _id: -1 })
      .limit(5)
      .toArray();
    
    console.log('Recent 5 bookings:');
    recentBookings.forEach((b, i) => {
      console.log(`  ${i+1}. ${b.parentName} - ${b.startTime} (${b.status})`);
    });
    
    console.log('');
    console.log('✅ Your data is on port 27017');
    console.log('✅ Backend will now use this database');
    console.log('');
    console.log('⚠️  WARNING: Standalone mode (no transactions)');
    console.log('⚠️  Race conditions possible with concurrent bookings');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
