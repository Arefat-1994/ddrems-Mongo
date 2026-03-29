@echo off
color 0B
title DDREMS Backend Server

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          DDREMS - Backend Server                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Killing existing processes on port 5000...
node kill-node-processes.js

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo.
echo Starting backend server on port 5000...
echo.

node server/index.js
