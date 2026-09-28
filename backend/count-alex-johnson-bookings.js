import mongoose from 'mongoose';

async function countBookings() {
  try {
    await mongoose.connect('mongodb://localhost:27017/codeyoung_trial_booking');
    
    const alexBookings = await mongoose.connection.db.collection('bookings')
      .find({ parentName: 'Alex Johnson' })
      .toArray();
    
    console.log(`\n=== Booking Analysis ===\n`);
    console.log(`Total "Alex Johnson" bookings: ${alexBookings.length}`);
    
    if (alexBookings.length > 0) {
      console.log('\n⚠️  FOUND THE ISSUE!\n');
      console.log('The frontend has default test values:');
      console.log('  parentName: "Alex Johnson"');
      console.log('  parentEmail: "alex.johnson@example.com"');
      console.log('');
      console.log('These are being used for actual bookings!');
      console.log('');
      console.log('Recent "Alex Johnson" bookings:');
      alexBookings.slice(0, 5).forEach((b, i) => {
        const created = b.createdAt || b._id.getTimestamp();
        console.log(`  ${i+1}. ${b.parentEmail} - ${created}`);
      });
    }
    
    // Check all unique parent names
    const allNames = await mongoose.connection.db.collection('bookings')
      .distinct('parentName');
    
    console.log(`\n\nAll unique parent names in database:`);
    allNames.forEach(name => {
      console.log(`  - ${name}`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

countBookings();
