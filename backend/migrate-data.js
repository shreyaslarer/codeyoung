// Migrate data from standalone MongoDB (port 27017) to replica set (port 27018)
import mongoose from 'mongoose';

async function migrateData() {
  try {
    console.log('=== MongoDB Data Migration ===\n');
    
    // Connect to old database (standalone)
    console.log('Connecting to source database (port 27017)...');
    const sourceConnection = await mongoose.createConnection('mongodb://localhost:27017/codeyoung_trial_booking').asPromise();
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
    
    // Connect to new database (replica set)
    console.log('Connecting to target database (port 27018)...');
    const targetConnection = await mongoose.createConnection('mongodb://localhost:27018/codeyoung_trial_booking').asPromise();
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
    console.log('✓ All data migrated successfully');
    console.log('✓ MongoDB replica set is ready on port 27018');
    console.log('\nNext step: Update .env file to use port 27018');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateData();
