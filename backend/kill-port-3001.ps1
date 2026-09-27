# Kill process using port 3001
# Use when you get "EADDRINUSE: address already in use :::3001"

Write-Host "Checking for processes using port 3001..." -ForegroundColor Cyan

$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($pid in $processIds) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "Found: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
            Write-Host "Stopping process..." -ForegroundColor Yellow
            
            Stop-Process -Id $pid -Force
            Start-Sleep -Seconds 1
            
            Write-Host "✓ Process stopped" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "✓ Port 3001 is now free" -ForegroundColor Green
    Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "✓ Port 3001 is already free" -ForegroundColor Green
}
