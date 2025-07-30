# Aircraft Tracker 3D - Environment Setup Script (PowerShell)
Write-Host "🛰️ Aircraft Tracker 3D - Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if .env exists
if (Test-Path .env) {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
    Write-Host "📝 Current configuration:" -ForegroundColor Yellow
    Get-Content .env | Where-Object { $_ -match "^[A-Z_]+" } | ForEach-Object { $_ -replace "=.*", "=***" }
}
else {
    Write-Host "📁 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created from .env.example" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file to configure your IoT sensor:" -ForegroundColor Red
    Write-Host "   - TCP_HOST: Your IoT sensor IP address" -ForegroundColor White
    Write-Host "   - TCP_PORT: Your IoT sensor port (usually 30003)" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Current .env file contains demo values:" -ForegroundColor Yellow
    Get-Content .env
}

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your actual IoT sensor details" -ForegroundColor White
Write-Host "2. Run 'npm install' to install dependencies" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start the application" -ForegroundColor White
Write-Host "4. For real IoT connection, see TCP-CONNECTION-GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ready to track aircraft!" -ForegroundColor Green
