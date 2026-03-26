@echo off
title Praeto Email Automation - Setup
echo.
echo ============================================
echo  Praeto Email Automation - Setup
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please download and install Node.js from:
    echo   https://nodejs.org  (use the LTS version)
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version

:: Install dependencies
echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

:: Create .env from example if not present
if not exist .env (
    copy .env.example .env >nul
    echo.
    echo [ACTION REQUIRED] Created .env file.
    echo   Open .env in Notepad and fill in your email credentials.
    echo   Then run start.bat to launch the system.
    echo.
    notepad .env
) else (
    echo [OK] .env file already exists.
)

:: Install PM2 globally (for background service)
echo.
echo Installing PM2 (background service manager)...
call npm install -g pm2 >nul 2>&1
if errorlevel 1 (
    echo [WARN] PM2 install failed - you can still run manually with start.bat
) else (
    echo [OK] PM2 installed.
)

echo.
echo ============================================
echo  Setup complete!
echo.
echo  To run once now:
echo    double-click start.bat
echo.
echo  To run as a background service:
echo    double-click start-service.bat
echo ============================================
echo.
pause
