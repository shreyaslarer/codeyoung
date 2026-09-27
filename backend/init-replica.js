// Initialize MongoDB replica set on port 27018
import { MongoClient } from 'mongodb';

async function initReplicaSet() {
  const uri = 'mongodb://localhost:27018/?directConnection=true';
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB on port 27018...');
    await client.connect();
    console.log('✓ Connected');

    const admin = client.db('admin');
    
    // Check if replica set is already initialized
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log('✓ Replica set already initialized:', status.set);
      return;
    } catch (err) {
      // Not initialized yet, continue
    }

    console.log('Initializing replica set...');
    const result = await admin.command({
      replSetInitiate: {
        _id: 'rs0',
        members: [{ _id: 0, host: 'localhost:27018' }]
      }
    });

    console.log('✓ Replica set initialized:', result);
    console.log('');
    console.log('Waiting for PRIMARY status...');
    
    // Wait for replica set to become PRIMARY
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const status = await admin.command({ replSetGetStatus: 1 });
        if (status.myState === 1) {
          console.log('✓ Replica set is PRIMARY');
          break;
        }
      } catch (err) {
        // Keep waiting
      }
    }

    console.log('');
    console.log('=== Setup Complete ===');
    console.log('MongoDB replica set running on port 27018');
    console.log('Update your .env file to use this connection');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

initReplicaSet();
