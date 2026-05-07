@echo off
REM Lance backend + frontend (Windows)
SET ROOT=%~dp0

echo Installation backend (Poetry)...
cd /d "%ROOT%backend"
call poetry install --no-root
IF ERRORLEVEL 1 GOTO :err

echo Installation frontend (npm)...
cd /d "%ROOT%frontend"
call npm install
IF ERRORLEVEL 1 GOTO :err

echo Demarrage du backend (http://localhost:8000)...
start "Teacher Hub - Backend" cmd /k "cd /d %ROOT%backend && poetry run fastapi dev app/main.py --port 8000"

echo Demarrage du frontend (http://localhost:5173)...
start "Teacher Hub - Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo OK - ouvre http://localhost:5173 dans ton navigateur.
echo Login: prof@teacher-hub.local / changeme123
pause
exit /b 0

:err
echo Erreur lors de l'installation. Verifie que Python, Node et Poetry sont installes.
pause
exit /b 1
