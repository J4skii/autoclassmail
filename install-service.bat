@echo off
title Praeto Email Automation - Install Service
echo.
echo ============================================
echo  Installing Praeto Email Automation Service
echo ============================================
echo.

:: Must run as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Please right-click this file and choose
    echo         "Run as administrator"
    echo.
    pause
    exit /b 1
)

set EXE_PATH=%~dp0praeto-email.exe
set ENV_PATH=%~dp0.env

:: Check the exe exists
if not exist "%EXE_PATH%" (
    echo [ERROR] praeto-email.exe not found in this folder.
    echo         Make sure all 3 files are in the same folder.
    pause
    exit /b 1
)

:: Check .env exists and has been filled in
if not exist "%ENV_PATH%" (
    echo [ERROR] .env file not found.
    echo         See SETUP.txt Step 1.
    pause
    exit /b 1
)

findstr /C:"your_password_here" "%ENV_PATH%" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] You have not filled in the password in .env yet.
    echo         Open .env in Notepad and replace "your_password_here"
    echo         with the real password, then run this again.
    echo.
    pause
    exit /b 1
)

:: Remove old task if it exists
schtasks /delete /tn "Praeto Email Automation" /f >nul 2>&1

:: Create scheduled task - runs at startup, restarts on failure
schtasks /create ^
    /tn "Praeto Email Automation" ^
    /tr "\"%EXE_PATH%\" --daemon" ^
    /sc ONSTART ^
    /ru SYSTEM ^
    /rl HIGHEST ^
    /f >nul 2>&1

if errorlevel 1 (
    echo [ERROR] Failed to create scheduled task.
    echo         Make sure you ran this as Administrator.
    pause
    exit /b 1
)

:: Start it now without waiting for reboot
schtasks /run /tn "Praeto Email Automation" >nul 2>&1

echo [OK] Service installed and started successfully.
echo.
echo The system is now:
echo   - Running in the background
echo   - Will start automatically when Windows starts
echo   - Monitoring admin6@praeto.co.za
echo   - Sending digests to manager@praeto.co.za
echo.
echo You can verify in Task Scheduler - look for
echo "Praeto Email Automation" with status Running.
echo.
pause
