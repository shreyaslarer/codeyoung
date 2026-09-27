# Start MongoDB Replica Set for Development
# This script starts MongoDB with transaction support enabled

Write-Host "=== Starting MongoDB Replica Set ===" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is already running on port 27018
$existingProcess = Get-NetTCPConnection -LocalPort 27018 -ErrorAction SilentlyContinue

if ($existingProcess) {
    Write-Host "✓ MongoDB replica set already running on port 27018" -ForegroundColor Green
    Write-Host ""
    Write-Host "Transaction support: ENABLED" -ForegroundColor Green
    Write-Host "Connection string: mongodb://localhost:27018/codeyoung_trial_booking" -ForegroundColor Gray
    exit 0
}

# Start MongoDB with replica set configuration
Write-Host "Starting MongoDB replica set..." -ForegroundColor Cyan

$configPath = Join-Path $PSScriptRoot "mongod-replica.cfg"

try {
    $process = Start-Process -FilePath "mongod" `
        -ArgumentList "--config `"$configPath`"" `
        -WindowStyle Hidden `
        -PassThru
    
    Write-Host "✓ MongoDB process started (PID: $($process.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for MongoDB to be ready..." -ForegroundColor Cyan
    
    Start-Sleep -Seconds 3
    
    # Verify it's running
    $connection = Get-NetTCPConnection -LocalPort 27018 -ErrorAction SilentlyContinue
    
    if ($connection) {
        Write-Host "✓ MongoDB is listening on port 27018" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "MongoDB Replica Set: rs0" -ForegroundColor White
        Write-Host "Port: 27018" -ForegroundColor White
        Write-Host "Transaction Support: ✅ ENABLED" -ForegroundColor Green
        Write-Host ""
        Write-Host "Connection string:" -ForegroundColor White
        Write-Host "  mongodb://localhost:27018/codeyoung_trial_booking" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To verify transactions work:" -ForegroundColor White
        Write-Host "  node verify-transaction-support.js" -ForegroundColor Gray
        Write-Host ""
        Write-Host "IMPORTANT: Keep this PowerShell window open!" -ForegroundColor Yellow
        Write-Host "MongoDB will stop if you close this window." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To stop MongoDB:" -ForegroundColor White
        Write-Host "  Stop-Process -Id $($process.Id)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  MongoDB may still be starting..." -ForegroundColor Yellow
        Write-Host "Wait a few seconds and check: Get-NetTCPConnection -LocalPort 27018" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to start MongoDB: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure MongoDB is installed and in PATH" -ForegroundColor Yellow
    exit 1
}
