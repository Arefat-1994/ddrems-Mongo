@echo off
color 0E
title DDREMS Frontend Server

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          DDREMS - Frontend Server                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Starting frontend server on port 3000...
echo.

cd client
npm start
