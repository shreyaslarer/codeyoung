# Port Conflict Resolution Guide

## Error: EADDRINUSE (Address Already In Use)

This error occurs when you try to start a server on a port that's already being used by another process.

```
Error: listen EADDRINUSE: address already in use :::3000
```

---

## Quick Fix

### Frontend (Port 3000)
```powershell
cd frontend
.\kill-port-3000.ps1
npm run dev
```

### Backend (Port 3001)
```powershell
cd backend
.\kill-port-3001.ps1
npm run dev
```

---

## Manual Fix (If Scripts Don't Work)

### Step 1: Find Process Using the Port

**For port 3000:**
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
```

**For port 3001:**
```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
```

This will show the Process ID (PID).

### Step 2: Check What the Process Is

```powershell
Get-Process -Id <PID>
```

Replace `<PID>` with the actual process ID from Step 1.

### Step 3: Stop the Process

```powershell
Stop-Process -Id <PID> -Force
```

### Step 4: Verify Port is Free

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

If no output, the port is free.

---

## Common Causes

### 1. Previous Server Still Running
- You started `npm run dev` but it didn't stop properly
- You closed the terminal without stopping the server (Ctrl+C)

**Solution**: Use the kill scripts or manual fix above

### 2. Multiple Terminal Windows
- You accidentally started the server in multiple terminals
- Each tries to use the same port

**Solution**: Close extra terminals, stop all processes on the port

### 3. Crashed Server Process
- Server crashed but process is still running
- Node.js didn't clean up properly

**Solution**: Force kill the process with the scripts

### 4. Different Application Using the Port
- Another app is configured to use port 3000 or 3001
- Could be another Node.js project, Docker, or other service

**Solution**: Either stop that app or change your port (see below)

---

## Change Port (Alternative Solution)

If you want to use a different port instead:

### Frontend (Next.js)

**Option 1: Command Line**
```powershell
npm run dev -- -p 3002
```

**Option 2: package.json**
```json
{
  "scripts": {
    "dev": "next dev -p 3002"
  }
}
```

**Update .env.local:**
```
# Frontend will run on port 3002
# Backend API URL stays the same
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (Express)

**Update .env:**
```
PORT=3002
```

**If changing backend port, update frontend .env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## Prevention Tips

### 1. Always Stop Servers Properly
```powershell
# In the terminal running the server
Ctrl + C
```

Wait for "Server stopped" message before closing terminal.

### 2. Check Ports Before Starting
```powershell
# Check if port 3000 is free
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Check if port 3001 is free
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
```

No output = port is free ✓

### 3. Use Process Managers (Optional)

**PM2 (Production-ready)**
```powershell
npm install -g pm2

# Start backend
pm2 start "npm run dev" --name backend

# Start frontend
pm2 start "npm run dev" --name frontend

# Stop all
pm2 stop all

# Stop specific
pm2 stop backend
```

**Nodemon (Development)**
Already included in backend. Automatically restarts on file changes.

---

## Troubleshooting

### "Access Denied" When Stopping Process

**Cause**: Process is running with higher privileges

**Solution**: Run PowerShell as Administrator
```powershell
# Right-click PowerShell → "Run as Administrator"
Stop-Process -Id <PID> -Force
```

### Port Still Shows as In Use After Killing Process

**Cause**: Windows may take a few seconds to release the port

**Solution**: Wait 5-10 seconds and try again
```powershell
Start-Sleep -Seconds 5
npm run dev
```

### Multiple Processes on Same Port

**Cause**: Server restarted multiple times without cleaning up

**Solution**: Kill all processes
```powershell
Get-NetTCPConnection -LocalPort 3000 | 
  Select-Object -ExpandProperty OwningProcess -Unique | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### Scripts Not Executing

**Cause**: PowerShell execution policy

**Solution**: Enable script execution (one-time setup)
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Quick Reference Commands

### Check Which Ports Are In Use
```powershell
# All Node.js processes
Get-Process node | Select-Object Id, ProcessName

# All active ports
Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | Sort-Object LocalPort
```

### Kill All Node.js Processes (Nuclear Option)
```powershell
# WARNING: This stops ALL Node.js processes on your system
Stop-Process -Name node -Force
```

Use with caution! Only if you know no other Node.js apps are running.

---

## Project-Specific Ports

This project uses:
- **Frontend (Next.js)**: Port 3000
- **Backend (Express)**: Port 3001
- **MongoDB**: Port 27017 (default) or 27018 (replica set)

Make sure these ports are available before starting the servers.

---

## Professional Development Practice

Following `coding-skill.md` principles:

### ✅ Clean Startup
1. Check ports before starting servers
2. Stop servers properly (Ctrl+C, wait for confirmation)
3. Close terminals only after servers are stopped

### ✅ Use Helper Scripts
- `kill-port-3000.ps1` for frontend conflicts
- `kill-port-3001.ps1` for backend conflicts
- Quick, reliable, reusable

### ✅ Document Issues
- If port conflicts happen frequently, document the cause
- Add prevention steps to your development workflow
- Share solutions with team

---

## Status

✅ **Port 3000 Issue**: RESOLVED
- Stopped Node.js process (PID: 27532)
- Port is now free
- Ready to start frontend server

✅ **Helper Scripts**: CREATED
- `frontend/kill-port-3000.ps1`
- `backend/kill-port-3001.ps1`

✅ **Documentation**: COMPLETE
- This guide covers all scenarios
- Quick fixes provided
- Prevention tips included

**You can now run `npm run dev` successfully!**
