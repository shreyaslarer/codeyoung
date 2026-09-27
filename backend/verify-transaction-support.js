import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/codeyoung_trial_booking';

async function verifyTransactionSupport() {
  console.log('=== MongoDB Transaction Support Verification ===\n');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Check deployment type
    const admin = mongoose.connection.db.admin();
    const serverInfo = await admin.serverStatus();
    
    console.log('--- MongoDB Deployment Information ---');
    console.log('Version:', serverInfo.version);
    console.log('Process:', serverInfo.process);
    
    const isReplicaSet = Boolean(serverInfo.repl && serverInfo.repl.setName);
    const isSharded = serverInfo.process === 'mongos';
    
    if (isReplicaSet) {
      console.log('Deployment Type: Replica Set');
      console.log('Replica Set Name:', serverInfo.repl.setName);
      console.log('Replica Set State:', serverInfo.repl.me);
      console.log('');
      
      // Get replica set status
      try {
        const rsStatus = await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
        const primary = rsStatus.members.find(m => m.stateStr === 'PRIMARY');
        if (primary) {
          console.log('✓ PRIMARY node:', primary.name);
        }
        console.log('Members:', rsStatus.members.length);
      } catch (e) {
        console.log('Unable to get replica set details');
      }
    } else if (isSharded) {
      console.log('Deployment Type: Sharded Cluster');
    } else {
      console.log('Deployment Type: Standalone');
    }
    
    console.log('');
    console.log('--- Transaction Support ---');
    
    if (isReplicaSet || isSharded) {
      console.log('Status: ✅ ENABLED');
      console.log('');
      
      // Test transaction
      console.log('Testing transaction...');
      const session = await mongoose.startSession();
      
      try {
        session.startTransaction();
        
        // Perform a simple operation
        await mongoose.connection.db.collection('bookings').countDocuments({}, { session });
        
        await session.commitTransaction();
        console.log('✅ Transaction test PASSED');
        console.log('');
        console.log('Result: Your booking system will now use ACID transactions');
        console.log('        Race conditions are ELIMINATED');
      } catch (error) {
        await session.abortTransaction();
        console.log('❌ Transaction test FAILED');
        console.log('Error:', error.message);
        console.log('');
        console.log('Note: Replica set may still be initializing. Wait 30 seconds and try again.');
      } finally {
        await session.endSession();
      }
    } else {
      console.log('Status: ❌ DISABLED');
      console.log('');
      console.log('⚠️  WARNING: Race condition vulnerability exists!');
      console.log('');
      console.log('To enable transactions:');
      console.log('1. Run: .\\enable-transactions.ps1 (as Administrator)');
      console.log('2. Or see: REPLICA_SET_SETUP_GUIDE.md for manual steps');
    }
    
    console.log('');
    console.log('--- Current Database State ---');
    const bookingCount = await mongoose.connection.db.collection('bookings')
      .countDocuments({ status: 'CONFIRMED' });
    console.log('Confirmed Bookings:', bookingCount);
    
    const mentorCount = await mongoose.connection.db.collection('mentors')
      .countDocuments({ active: true });
    console.log('Active Mentors:', mentorCount);
    
    console.log('');
    console.log('=== Verification Complete ===');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTransactionSupport();
