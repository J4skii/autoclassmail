@echo off
title Praeto Email Automation
echo.
echo ============================================
echo  Praeto Email Automation - Running
echo ============================================
echo.

if not exist .env (
    echo [ERROR] .env file not found.
    echo   Run setup.bat first.
    pause
    exit /b 1
)

node main.js
echo.
pause
