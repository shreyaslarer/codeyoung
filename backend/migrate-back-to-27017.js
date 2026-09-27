// Migrate data from port 27018 (replica set) back to port 27017 (standalone)
import mongoose from 'mongoose';

async function migrateBack() {
  try {
    console.log('=== Migrating Data Back to Port 27017 ===\n');
    
    // Connect to source (replica set on 27018)
    console.log('Connecting to source database (port 27018)...');
    const sourceConnection = await mongoose.createConnection('mongodb://localhost:27018/codeyoung_trial_booking').asPromise();
    console.log('✓ Connected to source\n');
    
    // Get all collections
    const collections = await sourceConnection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate:\n`);
    
    const collectionData = {};
    
    // Read all data from source
    for (const coll of collections) {
      const collName = coll.name;
      console.log(`Reading ${collName}...`);
      const data = await sourceConnection.db.collection(collName).find({}).toArray();
      collectionData[collName] = data;
      console.log(`  ✓ ${data.length} documents\n`);
    }
    
    await sourceConnection.close();
    console.log('✓ Source data read complete\n');
    
    // Connect to target (standalone on 27017)
    console.log('Connecting to target database (port 27017)...');
    const targetConnection = await mongoose.createConnection('mongodb://localhost:27017/codeyoung_trial_booking').asPromise();
    console.log('✓ Connected to target\n');
    
    // Write data to target
    console.log('Migrating data...\n');
    for (const [collName, data] of Object.entries(collectionData)) {
      if (data.length > 0) {
        console.log(`Writing ${collName}...`);
        await targetConnection.db.collection(collName).deleteMany({});
        await targetConnection.db.collection(collName).insertMany(data);
        console.log(`  ✓ ${data.length} documents migrated\n`);
      }
    }
    
    await targetConnection.close();
    
    console.log('=== Migration Complete ===\n');
    console.log('✓ All data migrated to port 27017');
    console.log('✓ You can now use mongodb://localhost:27017');
    console.log('');
    console.log('⚠️  WARNING: Port 27017 is standalone mode');
    console.log('⚠️  Race conditions are possible without transactions');
    console.log('⚠️  For production, enable replica set on port 27017');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateBack();
