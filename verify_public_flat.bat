@echo off
cd /d "%~dp0"
echo Starting PUBLIC FLAT Dashboard Verification...
echo Open your browser to: http://localhost:8001
echo.

REM Start server at root level (Flat structure)
py -m http.server 8001 || python -m http.server 8001

pause
