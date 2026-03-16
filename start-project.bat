@echo off
echo Starting Aura Bank Platform...

:: Check if docker is available
WHERE docker >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Docker is not recognized. Please install Docker Desktop and start it.
    pause
    exit /b
)

:: Start services with docker-compose
echo Building and bringing up Docker containers...
docker compose up -d --build

echo.
echo =======================================================
echo Aura Bank Fintech Ecosystem is starting!
echo =======================================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo Database: localhost:5432
echo.
echo Use "docker compose logs -f" to see live logs.
echo Use "docker compose down" to stop services.
pause