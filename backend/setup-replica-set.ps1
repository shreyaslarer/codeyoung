# MongoDB Replica Set Setup Script for Windows
# This enables transaction support for the booking system

Write-Host "=== MongoDB Replica Set Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is installed
$mongoPath = Get-Command mongod -ErrorAction SilentlyContinue
if (-not $mongoPath) {
    Write-Host "ERROR: MongoDB is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ MongoDB found at: $($mongoPath.Source)" -ForegroundColor Green

# Check if MongoDB service is running
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "✓ MongoDB service is running" -ForegroundColor Green
    Write-Host "⚠️  Stopping MongoDB service to reconfigure..." -ForegroundColor Yellow
    Stop-Service -Name MongoDB -Force
    Start-Sleep -Seconds 2
}

# Create data directory for replica set
$dataDir = "C:\data\rs0"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Host "✓ Created data directory: $dataDir" -ForegroundColor Green
} else {
    Write-Host "✓ Data directory exists: $dataDir" -ForegroundColor Green
}

# Create MongoDB config file for replica set
$configFile = "C:\data\mongod-replica.cfg"
$configContent = @"
systemLog:
  destination: file
  path: C:\data\rs0\mongod.log
  logAppend: true
storage:
  dbPath: C:\data\rs0
net:
  port: 27017
  bindIp: 127.0.0.1,localhost
replication:
  replSetName: rs0
"@

Set-Content -Path $configFile -Value $configContent -Force
Write-Host "✓ Created MongoDB config: $configFile" -ForegroundColor Green

# Start MongoDB with replica set configuration
Write-Host ""
Write-Host "Starting MongoDB with replica set configuration..." -ForegroundColor Cyan
Write-Host "Config file: $configFile" -ForegroundColor Gray

$mongoProcess = Start-Process -FilePath "mongod" -ArgumentList "--config `"$configFile`"" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 5

# Check if MongoDB started successfully
$mongoConnected = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $null = mongosh --quiet --eval "db.version()" 2>&1
        $mongoConnected = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $mongoConnected) {
    Write-Host "ERROR: Failed to connect to MongoDB" -ForegroundColor Red
    Write-Host "Check the log file at: C:\data\rs0\mongod.log" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ MongoDB started successfully" -ForegroundColor Green

# Initialize replica set
Write-Host ""
Write-Host "Initializing replica set..." -ForegroundColor Cyan

$initCommand = @"
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'localhost:27017' }
  ]
})
"@

$result = mongosh --quiet --eval $initCommand 2>&1 | Out-String

if ($result -match '"ok"\s*:\s*1' -or $result -match '"ok"\s*:\s*1.0') {
    Write-Host "✓ Replica set initialized successfully" -ForegroundColor Green
} elseif ($result -match "already initialized") {
    Write-Host "✓ Replica set already initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Replica set initialization result:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Gray
}

# Wait for replica set to become ready
Write-Host ""
Write-Host "Waiting for replica set to become PRIMARY..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

for ($i = 0; $i -lt 30; $i++) {
    $status = mongosh --quiet --eval "rs.status().myState" 2>&1
    if ($status -match "1") {
        Write-Host "✓ Replica set is PRIMARY and ready" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
}

# Verify transaction support
Write-Host ""
Write-Host "Verifying transaction support..." -ForegroundColor Cyan

$checkTransactions = @"
try {
  const session = db.getMongo().startSession();
  session.startTransaction();
  session.abortTransaction();
  session.endSession();
  print('SUCCESS');
} catch (e) {
  print('FAILED: ' + e.message);
}
"@

$txResult = mongosh --quiet codeyoung_trial_booking --eval $checkTransactions 2>&1

if ($txResult -match "SUCCESS") {
    Write-Host "✓ Transaction support ENABLED" -ForegroundColor Green
} else {
    Write-Host "⚠️  Transaction test result: $txResult" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "MongoDB is now running as a replica set with transaction support." -ForegroundColor Green
Write-Host "Connection string: mongodb://localhost:27017/codeyoung_trial_booking" -ForegroundColor Gray
Write-Host "Replica set name: rs0" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: Keep this PowerShell window open or MongoDB will stop." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop MongoDB." -ForegroundColor Yellow
Write-Host ""

# Keep the script running to maintain MongoDB process
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping MongoDB..." -ForegroundColor Yellow
    Stop-Process -Id $mongoProcess.Id -Force -ErrorAction SilentlyContinue
}
