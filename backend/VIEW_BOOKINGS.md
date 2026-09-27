# How to View Your Bookings

## ⚠️ IMPORTANT: Database Port

Your application now uses **MongoDB replica set on port 27018**, NOT the old standalone on port 27017.

**Correct Database:**
```
mongodb://localhost:27018/codeyoung_trial_booking
```

**Old Database (DON'T USE):**
```
mongodb://localhost:27017/codeyoung_trial_booking
```

---

## Method 1: Using Node.js Script (Easiest)

```powershell
cd C:\Users\arers\Desktop\codeyoung\backend
node check-bookings.js
```

This shows:
- Total bookings count
- Recent 10 bookings with details
- Active mentors count

---

## Method 2: Using mongosh (MongoDB Shell)

### Connect to CORRECT Database (Port 27018)
```powershell
mongosh --port 27018
```

Then:
```javascript
use codeyoung_trial_booking

// Count all bookings
db.bookings.countDocuments()

// Show recent bookings
db.bookings.find().sort({ _id: -1 }).limit(10).pretty()

// Show specific booking details
db.bookings.find().forEach(function(booking) {
  print("Name: " + booking.parentName);
  print("Email: " + booking.parentEmail);
  print("Time: " + booking.startTime);
  print("Status: " + booking.status);
  print("---");
})
```

### ❌ WRONG - Connecting to Old Database
```powershell
# DON'T DO THIS - This is the OLD standalone database
mongosh --port 27017
# or
mongosh
```

---

## Method 3: Using MongoDB Compass (GUI)

### Step 1: Open MongoDB Compass

### Step 2: Connect to Correct Database
**Connection String:**
```
mongodb://localhost:27018/codeyoung_trial_booking
```

### Step 3: Navigate to Database
- Database: `codeyoung_trial_booking`
- Collection: `bookings`

### ❌ Common Mistake
If you connect to `mongodb://localhost:27017`, you'll see the OLD database with only 2 bookings (the ones we migrated).

---

## Current Booking Statistics

As of now, you have:
- **24 confirmed bookings** in the database
- **10 active mentors**
- All bookings saved successfully

Recent bookings (latest 10):
1. Alex Johnson - Sep 29, 2026 09:00 AM
2. Alex Johnson - Sep 29, 2026 09:00 AM
3. Alex Johnson - Sep 30, 2026 09:30 AM
4. Alex Johnson - Sep 30, 2026 09:30 AM
5. Alex Johnson - Sep 30, 2026 09:30 AM
6. Alex Johnson - Sep 30, 2026 09:30 AM
7. Alex Johnson - Sep 30, 2026 09:30 AM
8. Alex Johnson - Sep 30, 2026 09:30 AM
9. Alex Johnson - Sep 30, 2026 09:30 AM
10. Alex Johnson - Sep 30, 2026 09:30 AM

---

## Verify Backend is Using Correct Database

Check your `.env` file:
```powershell
cat backend\.env
```

Should show:
```
MONGODB_URI=mongodb://localhost:27018/codeyoung_trial_booking
```

If it shows port 27017, that's wrong!

---

## Quick Reference

### ✅ Correct Database (Replica Set)
- **Port**: 27018
- **Connection**: `mongodb://localhost:27018/codeyoung_trial_booking`
- **Purpose**: Production database with transactions enabled
- **Status**: Active, used by backend

### ❌ Old Database (Standalone)
- **Port**: 27017
- **Connection**: `mongodb://localhost:27017/codeyoung_trial_booking`
- **Purpose**: Old database (no longer used)
- **Status**: Contains only 2 migrated bookings (outdated)

---

## Troubleshooting

### "I don't see my new bookings"

**Problem**: You're checking port 27017 instead of 27018

**Solution**: 
```powershell
# Check correct database
mongosh --port 27018
use codeyoung_trial_booking
db.bookings.countDocuments()
```

### "Backend says booking created but I can't find it"

**Check backend logs**:
- Look for: `✅ MongoDB transactions ENABLED (replica set: rs0)`
- If you see: `⚠️ MongoDB transactions DISABLED`, restart backend

**Check backend .env**:
```powershell
cat backend\.env | Select-String MONGODB_URI
```

Should show port **27018**.

### "MongoDB Compass shows empty database"

**You're connected to wrong port!**

1. Disconnect from current connection
2. Create new connection
3. Use connection string: `mongodb://localhost:27018/codeyoung_trial_booking`
4. Connect
5. Navigate to `codeyoung_trial_booking` → `bookings`

---

## Summary

✅ **Your bookings ARE saved!**
✅ **24 bookings in database**
✅ **Backend is working correctly**

❌ **Common mistake**: Checking port 27017 instead of 27018

**Always use port 27018** to see current bookings.
