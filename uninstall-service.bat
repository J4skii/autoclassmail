@echo off
title Praeto Email Automation - Remove Service
echo.
echo ============================================
echo  Removing Praeto Email Automation Service
echo ============================================
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Please right-click and choose "Run as administrator"
    pause
    exit /b 1
)

schtasks /end /tn "Praeto Email Automation" >nul 2>&1
schtasks /delete /tn "Praeto Email Automation" /f >nul 2>&1

if errorlevel 1 (
    echo [WARN] Task was not found or already removed.
) else (
    echo [OK] Service stopped and removed.
)

echo.
pause
