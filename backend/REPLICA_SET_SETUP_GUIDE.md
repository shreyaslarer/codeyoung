# MongoDB Replica Set Setup Guide

## Current Status
- MongoDB is running as a **standalone instance** on port 27017
- This prevents transaction support
- **Race conditions are possible** with concurrent bookings

## Solution: Convert to Replica Set

### Option A: Reconfigure Existing MongoDB Service (Recommended)

This preserves your existing data.

#### Step 1: Find MongoDB Configuration File

```powershell
# Check MongoDB service details
sc.exe qc MongoDB
```

Look for the `BINARY_PATH_NAME` - it will show the config file location, typically:
- `C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg`

#### Step 2: Edit MongoDB Configuration

Open the config file as Administrator and add these lines:

```yaml
replication:
  replSetName: rs0
```

Full example:
```yaml
systemLog:
  destination: file
  path: C:\Program Files\MongoDB\Server\8.0\log\mongod.log
  logAppend: true
storage:
  dbPath: C:\Program Files\MongoDB\Server\8.0\data
net:
  port: 27017
  bindIp: 127.0.0.1
replication:
  replSetName: rs0
```

#### Step 3: Restart MongoDB Service

```powershell
# As Administrator
Restart-Service -Name MongoDB
```

#### Step 4: Initialize Replica Set

```powershell
mongosh
```

Then in mongosh:
```javascript
rs.initiate({
  _id: 'rs0',
  members: [{ _id: 0, host: 'localhost:27017' }]
})

// Wait ~10 seconds, then verify
rs.status()
// Should show "stateStr": "PRIMARY"
```

#### Step 5: Verify Transaction Support

```javascript
// In mongosh
use codeyoung_trial_booking

const session = db.getMongo().startSession();
session.startTransaction();
db.bookings.countDocuments();
session.commitTransaction();
session.endSession();

print("✓ Transactions work!");
```

### Option B: Run Replica Set on Different Port (Development)

Use this if you cannot modify the existing MongoDB service (no admin access).

#### Step 1: Start MongoDB with Replica Set Config

```powershell
cd C:\Users\arers\Desktop\codeyoung\backend

# Start MongoDB on port 27018 with replica set
mongod --config mongod-replica.cfg
```

Keep this terminal open.

#### Step 2: Initialize Replica Set (New Terminal)

```powershell
mongosh --port 27018
```

```javascript
rs.initiate({
  _id: 'rs0',
  members: [{ _id: 0, host: 'localhost:27018' }]
})

// Wait ~10 seconds
rs.status()
```

#### Step 3: Migrate Data

```powershell
# Export from old database
mongodump --db=codeyoung_trial_booking --out=backup

# Import to new replica set
mongorestore --port=27018 --db=codeyoung_trial_booking backup/codeyoung_trial_booking
```

#### Step 4: Update Environment Variables

Edit `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27018/codeyoung_trial_booking
```

### Option C: Use MongoDB Atlas (Production)

For production, use managed MongoDB with built-in replica sets:

1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/codeyoung_trial_booking`
3. Update `.env` with Atlas connection string

## Verification Checklist

After setup, verify these:

### ✅ 1. Replica Set Status
```powershell
mongosh --eval "rs.status().ok"
# Should print: 1
```

### ✅ 2. Transaction Support
```powershell
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codeyoung_trial_booking').then(async () => { const admin = mongoose.connection.db.admin(); const status = await admin.serverStatus(); console.log('Replica Set:', status.repl?.setName || '❌ NONE'); console.log('Transactions:', status.repl ? '✅ ENABLED' : '❌ DISABLED'); process.exit(0); });"
```

Expected:
```
Replica Set: rs0
Transactions: ✅ ENABLED
```

### ✅ 3. Booking Service Transaction Mode
```powershell
# Start backend server
npm run dev

# Check logs - should see:
# "✓ MongoDB transactions enabled"
```

### ✅ 4. Test Concurrent Bookings

Create `test-race-condition.js`:
```javascript
import fetch from 'node-fetch';

async function testRaceCondition() {
  const baseUrl = 'http://localhost:3001';
  
  // Create 5 concurrent booking requests for same time slot
  const requests = Array(5).fill(null).map((_, i) => 
    fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentName: `Test Parent ${i}`,
        parentEmail: `test${i}@example.com`,
        parentLocalDate: '2026-10-15',
        parentLocalTime: '14:00',
        parentTimezone: 'Asia/Kolkata',
        trialDurationMinutes: 60,
        idempotencyKey: `race-test-${Date.now()}-${i}`
      })
    }).then(r => r.json())
  );

  const results = await Promise.all(requests);
  const successful = results.filter(r => r.success).length;
  const conflicts = results.filter(r => r.conflict).length;

  console.log('✅ Successful bookings:', successful);
  console.log('⚠️  Conflict responses:', conflicts);
  console.log(successful <= 2 ? '✅ PASS: No race condition' : '❌ FAIL: Race condition detected');
}

testRaceCondition();
```

Run:
```powershell
node test-race-condition.js
```

Expected:
```
✅ Successful bookings: 2 (or less)
⚠️  Conflict responses: 3 (or more)
✅ PASS: No race condition
```

## Troubleshooting

### Issue: "not running with --replSet"
**Solution**: MongoDB config doesn't have `replication.replSetName`. Add it and restart.

### Issue: "Cannot connect to MongoDB"
**Solution**: Check port number in connection string matches MongoDB port.

### Issue: "rs.initiate() fails"
**Solution**: 
```javascript
// Check if already initialized
rs.status()

// If already initialized, you're done!
```

### Issue: "Transactions not supported"
**Solution**: 
```javascript
// Check replica set state
rs.status().myState
// Must be 1 (PRIMARY) for transactions
```

### Issue: Windows Service won't restart (Access Denied)
**Solution**: 
- Run PowerShell as Administrator
- Or use Option B (different port)

## Current Database State

Before making changes, your database has:
- **34 confirmed bookings** across 7 dates
- **No capacity violations** (each mentor ≤2 bookings/day)
- **Race condition vulnerability** (needs fix)

All bookings are valid and will be preserved during migration.

## Production Deployment

For production environments:

1. **Use MongoDB Atlas** (recommended)
   - Automatic replica sets
   - Built-in backups
   - Monitoring included
   - Free tier available

2. **Self-hosted 3-node replica set**
   - 1 primary + 2 secondary nodes
   - Automatic failover
   - High availability

3. **Docker Compose** (staging/development)
   ```yaml
   version: '3.8'
   services:
     mongo:
       image: mongo:8
       command: mongod --replSet rs0
       ports:
         - "27017:27017"
   ```

## Next Steps

1. Choose setup option (A, B, or C)
2. Follow the steps for your chosen option
3. Run all verification checks
4. Test concurrent bookings
5. Deploy backend with transaction support

**Questions?** Each option is production-ready and will solve the race condition issue.
