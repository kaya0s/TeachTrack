@echo off
title TeachTrack - Start All Services (Anaconda)
echo.
echo ========================================
echo    TeachTrack - Starting All Services
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "server" (
    echo ERROR: Please run this batch file from the CAPSTONE root directory
    echo Expected structure: CAPSTONE/server, CAPSTONE/client, CAPSTONE/admin
    pause
    exit /b 1
)
if not exist "admin" (
    echo ERROR: 'admin' folder not found in current directory.
    pause
    exit /b 1
)
if not exist "client" (
    echo ERROR: 'client' folder not found in current directory.
    pause
    exit /b 1
)

REM Initialize Anaconda - Try common installation paths
echo [0/4] Initializing Anaconda...
echo ----------------------------------------

set CONDA_PATH=
if exist "%USERPROFILE%\Anaconda3\Scripts\conda.exe" (
    set CONDA_PATH=%USERPROFILE%\Anaconda3
) else if exist "%USERPROFILE%\Miniconda3\Scripts\conda.exe" (
    set CONDA_PATH=%USERPROFILE%\Miniconda3
) else if exist "C:\ProgramData\Anaconda3\Scripts\conda.exe" (
    set CONDA_PATH=C:\ProgramData\Anaconda3
) else if exist "C:\ProgramData\Miniconda3\Scripts\conda.exe" (
    set CONDA_PATH=C:\ProgramData\Miniconda3
)

if "%CONDA_PATH%"=="" (
    echo ERROR: Anaconda/Miniconda not found in common locations.
    echo Please install Anaconda or update the path in this batch file.
    echo Common locations checked:
    echo   - %USERPROFILE%\Anaconda3
    echo   - %USERPROFILE%\Miniconda3
    echo   - C:\ProgramData\Anaconda3
    echo   - C:\ProgramData\Miniconda3
    pause
    exit /b 1
)

echo Found Anaconda at: %CONDA_PATH%
call "%CONDA_PATH%\Scripts\activate.bat" capstone
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate 'capstone' environment.
    echo Make sure it exists:  conda create -n capstone
    pause
    exit /b 1
)
echo Anaconda 'capstone' environment activated successfully.

echo.
echo [1/4] Checking Git Branch...
echo ----------------------------------------
cd /d "%~dp0"
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=unknown
echo Current branch: %CURRENT_BRANCH%

REM Show branch indicator banner
echo.
if "%CURRENT_BRANCH%"=="demo" (
    echo ******************************************
    echo *                                        *
    echo *      BRANCH: DEMO  ^(Video Mode^)        *
    echo *  Backend + Admin + Flutter starting    *
    echo *                                        *
    echo ******************************************
) else (
    echo ******************************************
    echo *                                        *
    echo *      BRANCH: MAIN  ^(Normal Mode^)         *
    echo *   Backend + Admin + Flutter starting     *
    echo *                                        *
    echo ******************************************
)
echo.

REM Check if Windows Terminal is available
where wt >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Windows Terminal ^(wt.exe^) not found.
    echo Install it from the Microsoft Store for split-pane support.
    echo Falling back to separate windows...
    echo.
    goto :fallback
)

echo.
echo [2/4] Launching split terminal...
echo ----------------------------------------

if "%CURRENT_BRANCH%"=="demo" (
    echo Demo mode detected - Starting all 3 services in split panes.
    echo.
    REM Layout ^(demo^):
    REM  Left 60%% = Backend server
    REM  Right-top 40%% w, 50%% h = Admin panel
    REM  Right-bottom 40%% w, 50%% h = Flutter app
    wt --title "TeachTrack | DEMO" ^
      cmd /k "title Backend && echo [Backend] Activating environment... && call %CONDA_PATH%\Scripts\activate.bat capstone && cd /d %~dp0server && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" ^
      ; split-pane --vertical --size 0.4 cmd /k "title Admin && cd /d %~dp0admin && echo [Admin Panel] Starting dev server... && npm run dev" ^
      ; split-pane --horizontal --size 0.5 cmd /k "title Flutter && cd /d %~dp0client && echo [Flutter] Launching emulator kayaos... && flutter emulators --launch kayaos && timeout /t 10 /nobreak && echo [Flutter] Starting app... && flutter run -d emulator-5554"
) else (
    echo Normal mode detected - Starting Admin + Flutter + Backend.
    echo.
    REM Layout ^(normal mode^):
    REM  Left 50%% = Backend server
    REM  Right-top 50%% w, 50%% h = Admin panel
    REM  Right-bottom 50%% w, 50%% h = Flutter app
    wt --title "TeachTrack | MAIN" ^
      cmd /k "title Backend && echo [Backend] Activating environment... && call %CONDA_PATH%\Scripts\activate.bat capstone && cd /d %~dp0server && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" ^
      ; split-pane --vertical --size 0.5 cmd /k "title Admin && cd /d %~dp0admin && echo [Admin Panel] Starting dev server... && npm run dev" ^
      ; split-pane --horizontal --size 0.5 cmd /k "title Flutter && cd /d %~dp0client && echo [Flutter] Launching emulator kayaos... && flutter emulators --launch kayaos && timeout /t 10 /nobreak && echo [Flutter] Starting app... && flutter run -d emulator-5554"
)

echo.
echo ========================================
echo    All Services Started!
echo ========================================
echo.
if "%CURRENT_BRANCH%"=="demo" (
    echo Demo Mode Active:
    echo   Backend:     http://localhost:8000 ^(Video Detection^)
    echo   API Docs:    http://localhost:8000/docs
    echo   Admin Panel: http://localhost:3000 ^(usually^)
    echo   Flutter:     Running on emulator-5554
    echo.
    echo Press any key to open API docs in browser...
    pause >nul
    start http://localhost:8000/docs
) else (
    echo Normal Mode Active:
    echo   Backend:     http://localhost:8000
    echo   API Docs:    http://localhost:8000/docs
    echo   Admin Panel: http://localhost:3000 ^(usually^)
    echo   Flutter:     Running on emulator-5554
)
goto :end

REM ============================================================
:fallback
REM Fallback: separate windows if Windows Terminal is not found
REM ============================================================
if "%CURRENT_BRANCH%"=="demo" (
    echo Demo mode - Starting backend + admin + flutter in separate windows.
    start "Backend Server (Anaconda)" cmd /k "echo [Backend] Activating environment... && call \"%CONDA_PATH%\Scripts\activate.bat\" capstone && cd /d \"%~dp0server\" && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    timeout /t 5 /nobreak >nul
) else (
    echo Normal mode - Starting backend + admin + flutter in separate windows.
    start "Backend Server (Anaconda)" cmd /k "cd /d "%~dp0server" && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    timeout /t 5 /nobreak >nul
)
start "Admin Panel" cmd /k "cd /d \"%~dp0admin\" && npm run dev"
start "Flutter App" cmd /k "cd /d \"%~dp0client\" && flutter emulators --launch kayaos && timeout /t 10 /nobreak && flutter run -d emulator-5554"

echo.
echo ========================================
echo    All Services Started! (Separate Windows)
echo ========================================
echo.
if "%CURRENT_BRANCH%"=="demo" (
    echo Demo Mode Active:
    echo   Backend:     http://localhost:8000
    echo   API Docs:    http://localhost:8000/docs
    echo   Admin Panel: http://localhost:3000 ^(usually^)
    echo   Flutter:     Running on emulator-5554
    echo.
    echo Press any key to open API docs in browser...
    pause >nul
    start http://localhost:8000/docs
) else (
    echo Normal Mode Active:
    echo   Backend:     http://localhost:8000
    echo   API Docs:    http://localhost:8000/docs
    echo   Admin Panel: http://localhost:3000 ^(usually^)
    echo   Flutter:     Running on emulator-5554
)

:end
echo.
echo Close this window or press any key to exit...
pause >nul