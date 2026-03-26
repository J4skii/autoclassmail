@echo off
title Praeto Email Automation - Background Service
echo.
echo ============================================
echo  Praeto Email Automation - Starting Service
echo ============================================
echo.

if not exist .env (
    echo [ERROR] .env file not found.
    echo   Run setup.bat first.
    pause
    exit /b 1
)

pm2 describe praeto-email >nul 2>&1
if errorlevel 1 (
    echo Starting service for the first time...
    pm2 start main.js --name praeto-email -- --daemon
) else (
    echo Restarting existing service...
    pm2 restart praeto-email
)

echo.
echo [OK] Service is running in the background.
echo.
echo Useful commands:
echo   pm2 logs praeto-email     - view live logs
echo   pm2 stop praeto-email     - stop the service
echo   pm2 status                - check if running
echo.

:: Auto-start on Windows boot
pm2 save >nul 2>&1

pause
