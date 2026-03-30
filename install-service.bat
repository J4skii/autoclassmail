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

:: Write task XML to temp file — this is the only way to set restart-on-failure via script
set XML_FILE=%TEMP%\praeto_task.xml

(
echo ^<?xml version="1.0" encoding="UTF-16"?^>
echo ^<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
echo   ^<Triggers^>
echo     ^<BootTrigger^>^<Enabled^>true^</Enabled^>^</BootTrigger^>
echo   ^</Triggers^>
echo   ^<Settings^>
echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
echo     ^<ExecutionTimeLimit^>PT0S^</ExecutionTimeLimit^>
echo     ^<RestartOnFailure^>
echo       ^<Interval^>PT1M^</Interval^>
echo       ^<Count^>10^</Count^>
echo     ^</RestartOnFailure^>
echo   ^</Settings^>
echo   ^<Actions^>
echo     ^<Exec^>
echo       ^<Command^>"%EXE_PATH%"^</Command^>
echo       ^<Arguments^>--daemon^</Arguments^>
echo     ^</Exec^>
echo   ^</Actions^>
echo   ^<Principals^>
echo     ^<Principal^>
echo       ^<UserId^>SYSTEM^</UserId^>
echo       ^<LogonType^>ServiceAccount^</LogonType^>
echo       ^<RunLevel^>HighestAvailable^</RunLevel^>
echo     ^</Principal^>
echo   ^</Principals^>
echo ^</Task^>
) > "%XML_FILE%"

:: Import the XML task definition
schtasks /create /tn "Praeto Email Automation" /xml "%XML_FILE%" /f >nul 2>&1
del "%XML_FILE%" >nul 2>&1

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
