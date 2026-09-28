# Codeyoung — Local Setup

This guide provides practical step-by-step instructions to set up, configure, and run the Codeyoung trial-class scheduling system locally.

---

## 1. Prerequisites

Before starting, ensure the following software is installed on your system:

| Tool | Minimum Version | Note |
|---|---|---|
| **Node.js** | `v18.x` or higher (`v20+` recommended) | JavaScript runtime |
| **npm** | `v9.x` or higher (bundled with Node.js) | Package manager |
| **MongoDB** | `v6.0+` or `v7.0+` | Community Server running locally on port `27017` (or MongoDB Atlas URI) |
| **Git** | Any recent version | Version control |

---

## 2. Clone the Repository

Clone the project repository and change into the project directory:

```bash
git clone <repository-url>
cd codeyoung
```

The repository is structured as two independent applications:
- `backend/` — Express + TypeScript + Mongoose scheduling API service (default port: `3001`)
- `frontend/` — Next.js 16 + React 19 + Tailwind CSS booking interface and admin dashboard (default port: `3000`)

---

## 3. Install Dependencies

Install dependencies separately in both workspace directories.

```bash
# 1. Install backend dependencies
cd backend
npm install
cd ..

# 2. Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## 4. Configure MongoDB

The backend requires a MongoDB database to store mentors, booking records, and audit activity.

### Start the Local MongoDB Daemon

Ensure MongoDB is running before launching the backend:

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux (systemd):**
```bash
sudo systemctl start mongod
```

**Windows (Service or Command Prompt):**
```powershell
net start MongoDB
```

*Or start `mongod` manually in a separate terminal pointing to your local data folder:*
```bash
mongod --dbpath <path-to-data-directory>
```

### Connection Details

- The application uses a database named **`codeyoung_trial_booking`**.
- Default local URI: `mongodb://localhost:27017/codeyoung_trial_booking`
- If using **MongoDB Atlas** (cloud), obtain your cluster connection string and use it as `MONGODB_URI` in step 5.

---

## 5. Configure Environment Variables

Create the environment configuration files from the provided example templates.

### 5.1 Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Verify or adjust the contents of `backend/.env`:

```env
# MongoDB connection URI (local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/codeyoung_trial_booking

# Application environment ('development' | 'production' | 'test')
NODE_ENV=development

# Server port
PORT=3001

# Allowed CORS origin for frontend
CORS_ORIGIN=http://localhost:3000
```

### 5.2 Frontend (`frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

Verify or adjust the contents of `frontend/.env.local`:

```env
# Base URL for the backend API (used client-side)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend URL used by Next.js server-side API proxy routes (optional, defaults to http://127.0.0.1:3001)
BACKEND_URL=http://127.0.0.1:3001
```

---

## 6. Start the Backend

MongoDB must be running and `backend/.env` must be configured before proceeding.

### 6.1 Seed Mentors (One-Time Setup)

The availability engine requires the 10 production mentors (working hours 09:00–18:00 in `Asia/Kolkata`) to exist in the database. Run the seed script:

```bash
cd backend
npm run seed
```

Expected output:
```text
Checking existing mentors...
✓ Successfully seeded 10 mentors
Final mentor count: 10
Database connection closed
```

> **Note:** The seed script is idempotent. If 10 mentors already exist, it reports `✓ Database already has 10 mentors. Skipping seed.` without creating duplicates.

### 6.2 Start the Backend Server

Run the development server with hot-reload from the `backend/` directory:

```bash
cd backend
npm run dev
```

Expected output:
```text
MongoDB connected successfully
Server running on http://localhost:3001
Health check: http://localhost:3001/health
Mentors API: http://localhost:3001/api/mentors
Availability API: http://localhost:3001/api/availability
Bookings API: http://localhost:3001/api/bookings
```

Verify backend health in another terminal or browser:
```bash
curl http://localhost:3001/health
# Returns: {"status":"ok","timestamp":"..."}
```

---

## 7. Start the Frontend

Open a **new, separate terminal window** (keep the backend server running).

```bash
cd frontend
npm run dev
```

Expected output:
```text
▲ Next.js 16.3.6
- Local: http://localhost:3000
- Environments: .env.local
✓ Ready
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 8. Verify the Application

Follow this quick verification walkthrough to confirm the full system is operational:

### 1. Booking Flow (Parent Experience)
1. Open [http://localhost:3000](http://localhost:3000).
2. The navbar and Step 1 card display your detected timezone (e.g., `Asia/Kolkata`, `Europe/London`). Click **Change** to select a different timezone if desired.
3. Select an upcoming date from the date strip. Available 30-minute trial slots populate from the backend availability API.
4. Select any available slot (e.g., `10:00 AM`), or enter a custom time in the **Your preferred time** input, and click **Continue**.
5. On Step 2, enter parent details (Name and Email).
6. Click **Confirm booking**.
7. On Step 3 (Confirmation), verify:
   - Booking is confirmed with an automatically assigned mentor.
   - A canonical class link is displayed (`https://meet.codeyoung.dev/...`).
   - The **Add to Google Calendar**, **Download calendar file (.ics)**, and **Copy class link** actions work properly.

### 2. Operations Dashboard
1. Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
2. Verify live metrics: Total bookings, Mentors assigned, and Available capacity.
3. Check the **Mentor Allocation** section showing real-time load distribution across the 10 mentors.
4. Verify the **Scheduling Activity** table displays your newly confirmed booking.

### 3. Admin Authentication
1. Open [http://localhost:3000/admin](http://localhost:3000/admin).
2. Use the demo credentials to test authentication:
   - **Email:** `admin@codeyoung.com`
   - **Password:** `codeyoung2026`
3. Click **Sign in to Console** to authenticate and redirect to the dashboard.

---

## 9. Run Tests

Both workspaces include comprehensive test suites powered by Vitest.

### Backend Tests

Backend tests connect to MongoDB to test timezone math, the availability engine, mentor allocation, concurrency, slot capacity, and REST endpoints.

> **Requirement:** MongoDB must be running with `backend/.env` configured before running backend tests.

```bash
cd backend
npm test
```

To run backend tests in watch mode:
```bash
cd backend
npm run test:watch
```

### Frontend Tests

Frontend tests run unit tests for timezone detection, slot services, booking conflict notices, calendar export, class-link consistency, and form validation.

```bash
cd frontend
npm test
```

To run frontend tests in watch mode:
```bash
cd frontend
npm run test:watch
```

### Frontend Build Verification

To verify that the frontend production build compiles cleanly:

```bash
cd frontend
npm run build
```

---

## 10. Common Setup Issues

### MongoDB Connection Error (`ECONNREFUSED 127.0.0.1:27017`)
- **Cause:** Local MongoDB service is stopped or not listening on port `27017`.
- **Solution:** Start MongoDB (`net start MongoDB` on Windows, `brew services start mongodb-community` on macOS, or `sudo systemctl start mongod` on Linux). Verify `MONGODB_URI` in `backend/.env`.

### Empty Slot Grid / No Available Slots
- **Cause:** The database has not been seeded with mentors.
- **Solution:** Run `npm run seed` in the `backend/` directory to insert the 10 required mentors, then refresh the booking page.

### Port Conflict (`EADDRINUSE: :::3001` or `:::3000`)
- **Cause:** Another application is already using port `3001` or `3000`.
- **Solution:** Terminate the conflicting process, or change `PORT=3002` in `backend/.env` and update `NEXT_PUBLIC_API_URL=http://localhost:3002` in `frontend/.env.local`.

### Frontend Network Error / Availability Fails to Load
- **Cause:** Frontend cannot communicate with the backend.
- **Solution:**
  1. Confirm the backend is running by visiting `http://localhost:3001/health`.
  2. Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in `frontend/.env.local`.
  3. Verify `CORS_ORIGIN=http://localhost:3000` in `backend/.env`.

### Backend Tests Fail on Startup
- **Cause:** MongoDB is not running or `MONGODB_URI` is missing from `backend/.env`.
- **Solution:** The test runner (`tests/setup.ts`) connects to MongoDB in `beforeAll`. Ensure MongoDB is accessible before executing `npm test`.
