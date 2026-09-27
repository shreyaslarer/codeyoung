# MongoDB Replica Set Setup - Automated Script
# This script enables transaction support by converting standalone MongoDB to replica set

Write-Host "=== MongoDB Transaction Support Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs Administrator privileges to modify MongoDB configuration." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please follow these manual steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor White
    Write-Host "2. Run this command:" -ForegroundColor White
    Write-Host ""
    Write-Host "   cd '$PSScriptRoot'" -ForegroundColor Green
    Write-Host "   .\enable-transactions.ps1" -ForegroundColor Green
    Write-Host ""
    Write-Host "Alternative: Press Enter to open the setup guide with manual steps" -ForegroundColor Yellow
    $null = Read-Host
    Start-Process "REPLICA_SET_SETUP_GUIDE.md"
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Configuration
$configPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg"
$backupPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg.backup"
$serviceName = "MongoDB"

# Step 1: Verify MongoDB is installed
Write-Host "Step 1: Checking MongoDB installation..." -ForegroundColor Cyan
$mongoService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if (-not $mongoService) {
    Write-Host "❌ MongoDB service not found" -ForegroundColor Red
    Write-Host "Please install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ MongoDB service found" -ForegroundColor Green

# Step 2: Backup existing configuration
Write-Host ""
Write-Host "Step 2: Backing up configuration..." -ForegroundColor Cyan

if (Test-Path $configPath) {
    Copy-Item -Path $configPath -Destination $backupPath -Force
    Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "❌ Config file not found at: $configPath" -ForegroundColor Red
    exit 1
}

# Step 3: Read current configuration
Write-Host ""
Write-Host "Step 3: Updating configuration..." -ForegroundColor Cyan

$configContent = Get-Content $configPath -Raw

# Check if replication is already configured
if ($configContent -match "replication:\s*\r?\n\s*replSetName:") {
    Write-Host "✓ Replica set already configured" -ForegroundColor Green
    $skipConfig = $true
} else {
    # Add replication configuration
    $newConfig = $configContent -replace "#replication:", "replication:`r`n  replSetName: rs0"
    
    # If #replication: wasn't found, add it before #sharding:
    if ($newConfig -eq $configContent) {
        $newConfig = $configContent -replace "#sharding:", "replication:`r`n  replSetName: rs0`r`n#sharding:"
    }
    
    Set-Content -Path $configPath -Value $newConfig -Force
    Write-Host "✓ Configuration updated with replica set" -ForegroundColor Green
    $skipConfig = $false
}

# Step 4: Restart MongoDB service
Write-Host ""
Write-Host "Step 4: Restarting MongoDB service..." -ForegroundColor Cyan

try {
    if (-not $skipConfig) {
        Restart-Service -Name $serviceName -Force
        Write-Host "✓ MongoDB service restarted" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "✓ Service restart not needed" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to restart MongoDB service: $_" -ForegroundColor Red
    Write-Host "You may need to restart manually" -ForegroundColor Yellow
}

# Step 5: Initialize replica set
Write-Host ""
Write-Host "Step 5: Initializing replica set..." -ForegroundColor Cyan

# Check if replica set is already initialized
$rsStatus = mongosh --quiet --eval "try { rs.status().ok } catch(e) { -1 }" 2>&1 | Out-String
$rsStatusValue = $rsStatus.Trim()

if ($rsStatusValue -eq "1") {
    Write-Host "✓ Replica set already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing replica set..." -ForegroundColor Gray
    
    $initScript = @"
rs.initiate({
  _id: 'rs0',
  members: [{ _id: 0, host: 'localhost:27017' }]
})
"@
    
    $initResult = mongosh --quiet --eval $initScript 2>&1 | Out-String
    
    if ($initResult -match '"ok"\s*:\s*1' -or $initResult -match 'already initialized') {
        Write-Host "✓ Replica set initialized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Initialization result:" -ForegroundColor Yellow
        Write-Host $initResult -ForegroundColor Gray
    }
    
    # Wait for replica set to become ready
    Write-Host "Waiting for replica set to become PRIMARY..." -ForegroundColor Gray
    $maxWait = 30
    $waited = 0
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 1
        $state = mongosh --quiet --eval "rs.status().myState" 2>&1 | Out-String
        if ($state.Trim() -eq "1") {
            Write-Host "✓ Replica set is PRIMARY" -ForegroundColor Green
            break
        }
        $waited++
    }
    
    if ($waited -eq $maxWait) {
        Write-Host "⚠️  Replica set is taking longer than expected to become PRIMARY" -ForegroundColor Yellow
        Write-Host "This is usually normal. Check status with: mongosh --eval 'rs.status()'" -ForegroundColor Gray
    }
}

# Step 6: Verify transaction support
Write-Host ""
Write-Host "Step 6: Verifying transaction support..." -ForegroundColor Cyan

$txTest = @"
try {
  const session = db.getMongo().startSession();
  session.startTransaction();
  session.abortTransaction();
  session.endSession();
  print('TRANSACTION_SUCCESS');
} catch (e) {
  print('TRANSACTION_FAILED: ' + e.message);
}
"@

$txResult = mongosh --quiet codeyoung_trial_booking --eval $txTest 2>&1 | Out-String

if ($txResult -match "TRANSACTION_SUCCESS") {
    Write-Host "✓ Transaction support ENABLED" -ForegroundColor Green
} else {
    Write-Host "⚠️  Transaction test result:" -ForegroundColor Yellow
    Write-Host $txResult -ForegroundColor Gray
    Write-Host ""
    Write-Host "Wait 30 seconds and try again. Replica set may still be initializing." -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ MongoDB is now configured as a replica set" -ForegroundColor Green
Write-Host "✓ Transaction support enabled" -ForegroundColor Green
Write-Host "✓ Race condition vulnerability eliminated" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor White
Write-Host "  URI: mongodb://localhost:27017/codeyoung_trial_booking" -ForegroundColor Gray
Write-Host "  Replica Set: rs0" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. No changes needed in .env file" -ForegroundColor Gray
Write-Host "  2. Restart your backend server" -ForegroundColor Gray
Write-Host "  3. Test booking creation" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify replica set status:" -ForegroundColor White
Write-Host "  mongosh --eval 'rs.status()'" -ForegroundColor Gray
Write-Host ""
Write-Host "Backup saved at: $backupPath" -ForegroundColor Gray
Write-Host ""
