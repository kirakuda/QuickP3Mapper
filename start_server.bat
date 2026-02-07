@echo off
cd /d "%~dp0"

echo Starting QuiqP3Mapper Dashboard...
echo Open your browser to: http://localhost:8001
echo.

REM Using Port 8001
py -m http.server 8001
if %ERRORLEVEL% EQU 0 goto end

echo 'py' launcher not found, trying 'python'...
python -m http.server 8001

:end
pause
