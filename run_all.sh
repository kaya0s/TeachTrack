#!/usr/bin/env bash
# ==============================================================================
# TeachTrack - All-in-One Startup Script (Linux / Bash)
# ==============================================================================
#
# IMPORTANT NOTICE:
#   *** ANACONDA / MINICONDA IS NOT SUPPORTED ***
#   Do NOT use Anaconda, Miniconda, or conda environments with this project.
#   TeachTrack strictly uses standard Python virtual environments (venv)
#   using Python 3.10+.
#
# WHY ANACONDA IS NOT SUPPORTED:
#   1. Conda's library packaging and binary dependencies can cause linking
#      conflicts with native C/C++ libraries, PyTorch, and OpenCV on Linux.
#   2. Standard Python `venv` ensures consistent, reproducible environments
#      matching production deployments without conda overhead or activation hooks.
#
# PYTHON VENV SETUP INSTRUCTIONS:
#   To set up the required virtual environment:
#     cd server
#     python3 -m venv .venv
#     source .venv/bin/activate
#     pip install --upgrade pip
#     pip install -r requirements.txt
#
# ANDROID EMULATOR CONFIGURATION:
#   This script is configured to launch the "Medium Phone" Android emulator:
#     - Emulator Name: Medium Phone
#     - Emulator ID:   Medium_Phone
#     - Command:       flutter emulators --launch Medium_Phone
#     - Target Device: emulator-5554 (or auto-detected Android emulator)
#
# SERVICES LAUNCHED:
#   1. Backend Server:  FastAPI / Uvicorn on http://0.0.0.0:8000
#   2. Admin Panel:     Next.js / React dev server on http://localhost:3000
#   3. Client Mobile:   Flutter application on Android Emulator Medium_Phone
#
# USAGE:
#   ./run_all.sh            # Auto-detects terminal (ptyxis, kitty, gnome-terminal, etc.)
#   ./run_all.sh --inline   # Runs all 3 services in the current terminal
#   ./run_all.sh --help     # Shows help
# ==============================================================================

set -e

# Resolve script directory to project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Ensure Android SDK tools and flutter are in PATH
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ -d "$ANDROID_HOME/platform-tools" ]; then
    export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
fi
if [ -d "$HOME/flutter/bin" ]; then
    export PATH="$PATH:$HOME/flutter/bin"
fi

echo ""
echo "========================================"
echo "   TeachTrack - Starting All Services   "
echo "========================================"
echo ""

# Parse CLI flags
INLINE_MODE=false
for arg in "$@"; do
    case "$arg" in
        --inline|-i)
            INLINE_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run_all.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -i, --inline    Run all services in current terminal with unified logs"
            echo "  -h, --help      Display this help message"
            exit 0
            ;;
    esac
done

# Step 1: Validate repository folder structure
if [ ! -d "server" ]; then
    echo "ERROR: Please run this script from the TeachTrack root directory."
    echo "Expected structure: TeachTrack/server, TeachTrack/client, TeachTrack/admin"
    exit 1
fi
if [ ! -d "admin" ]; then
    echo "ERROR: 'admin' folder not found in current directory."
    exit 1
fi
if [ ! -d "client" ]; then
    echo "ERROR: 'client' folder not found in current directory."
    exit 1
fi

# Step 2: Initialize Python Virtual Environment (venv)
# NOTE: Anaconda is explicitly unsupported.
echo "[0/4] Initializing Python Virtual Environment (venv)..."
echo "----------------------------------------"
echo "NOTE: Anaconda/Miniconda is NOT supported. Using Python standard venv."

VENV_PATH=""
if [ -d "$ROOT_DIR/server/.venv" ] && [ -f "$ROOT_DIR/server/.venv/bin/activate" ]; then
    VENV_PATH="$ROOT_DIR/server/.venv"
elif [ -d "$ROOT_DIR/server/venv" ] && [ -f "$ROOT_DIR/server/venv/bin/activate" ]; then
    VENV_PATH="$ROOT_DIR/server/venv"
elif [ -d "$ROOT_DIR/.venv" ] && [ -f "$ROOT_DIR/.venv/bin/activate" ]; then
    VENV_PATH="$ROOT_DIR/.venv"
elif [ -d "$ROOT_DIR/venv" ] && [ -f "$ROOT_DIR/venv/bin/activate" ]; then
    VENV_PATH="$ROOT_DIR/venv"
fi

if [ -z "$VENV_PATH" ]; then
    echo ""
    echo "ERROR: Python virtual environment (venv) not found!"
    echo "================================================================================"
    echo " Anaconda / Miniconda is NOT supported for TeachTrack."
    echo " Please create and set up a standard Python virtual environment (venv):"
    echo ""
    echo "   cd $ROOT_DIR/server"
    echo "   python3 -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    echo "================================================================================"
    echo ""
    exit 1
fi

echo "Found Python venv at: $VENV_PATH"
# shellcheck disable=SC1090
source "$VENV_PATH/bin/activate"
PYTHON_VER="$(python3 --version 2>&1 || echo 'Python 3')"
echo "Python venv activated successfully ($PYTHON_VER)."

# Step 3: Check Git Branch
echo ""
echo "[1/4] Checking Git Branch..."
echo "----------------------------------------"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
[ -z "$CURRENT_BRANCH" ] && CURRENT_BRANCH="unknown"
echo "Current branch: $CURRENT_BRANCH"
echo ""

if [ "$CURRENT_BRANCH" = "demo" ]; then
    echo "******************************************"
    echo "*                                        *"
    echo "*      BRANCH: DEMO  (Video Mode)        *"
    echo "*  Backend + Admin + Flutter starting    *"
    echo "*                                        *"
    echo "******************************************"
else
    echo "******************************************"
    echo "*                                        *"
    echo "*      BRANCH: MAIN  (Normal Mode)       *"
    echo "*   Backend + Admin + Flutter starting   *"
    echo "*                                        *"
    echo "******************************************"
fi
echo ""

# Step 4: Detect terminal emulator or fall back to inline mode
echo "[2/4] Detecting Terminal Environment..."
echo "----------------------------------------"

TERMINAL_BIN=""
if [ "$INLINE_MODE" = false ]; then
    if command -v ptyxis >/dev/null 2>&1; then
        TERMINAL_BIN="ptyxis"
    elif command -v kitty >/dev/null 2>&1; then
        TERMINAL_BIN="kitty"
    elif command -v gnome-terminal >/dev/null 2>&1; then
        TERMINAL_BIN="gnome-terminal"
    elif command -v xterm >/dev/null 2>&1; then
        TERMINAL_BIN="xterm"
    fi
fi

# Define command strings for each component
BACKEND_CMD="echo '=== [Backend Server] ==='; cd '$ROOT_DIR/server' && source '$VENV_PATH/bin/activate' && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000; echo ''; echo 'Backend stopped. Press Enter to close...'; read -r"

ADMIN_CMD="echo '=== [Admin Panel] ==='; cd '$ROOT_DIR/admin' && npm run dev; echo ''; echo 'Admin stopped. Press Enter to close...'; read -r"

# Flutter command: Launches Medium Phone emulator, waits with a timed gap, waits for device connection, and targets the emulator
FLUTTER_CMD="echo '=== [Flutter App] ==='; cd '$ROOT_DIR/client'; \
echo '[Flutter] Launching Medium Phone emulator...'; \
flutter emulators --launch Medium_Phone 2>/dev/null || flutter emulators --launch 'Medium Phone'; \
echo '[Flutter] Emulator launched. Waiting 25 seconds for initial boot...'; \
for i in {25..1}; do \
    printf '[Flutter] Booting emulator... %2d seconds remaining\r' \"\$i\"; \
    sleep 1; \
done; \
echo ''; \
if command -v adb >/dev/null 2>&1; then \
    echo '[Flutter] Waiting for ADB device readiness...'; \
    adb wait-for-device 2>/dev/null || true; \
fi; \
TARGET_DEVICE=\$(adb devices 2>/dev/null | grep -m1 'emulator-' | awk '{print \$1}'); \
if [ -z \"\$TARGET_DEVICE\" ]; then \
    TARGET_DEVICE='emulator-5554'; \
fi; \
echo \"[Flutter] Target device identified: \$TARGET_DEVICE\"; \
echo '[Flutter] Launching TeachTrack app on emulator...'; \
flutter run -d \"\$TARGET_DEVICE\" || flutter run -d android; \
echo ''; echo 'Flutter stopped. Press Enter to close...'; read -r"

if [ -n "$TERMINAL_BIN" ]; then
    echo "Launching services in separate $TERMINAL_BIN windows..."
    case "$TERMINAL_BIN" in
        ptyxis)
            ptyxis --new-window -d "$ROOT_DIR/server" -T "TeachTrack - Backend" -- bash -c "$BACKEND_CMD" &
            sleep 2
            ptyxis --new-window -d "$ROOT_DIR/admin" -T "TeachTrack - Admin" -- bash -c "$ADMIN_CMD" &
            sleep 2
            ptyxis --new-window -d "$ROOT_DIR/client" -T "TeachTrack - Flutter" -- bash -c "$FLUTTER_CMD" &
            ;;
        kitty)
            kitty --title "TeachTrack - Backend" --directory "$ROOT_DIR/server" bash -c "$BACKEND_CMD" &
            sleep 2
            kitty --title "TeachTrack - Admin" --directory "$ROOT_DIR/admin" bash -c "$ADMIN_CMD" &
            sleep 2
            kitty --title "TeachTrack - Flutter" --directory "$ROOT_DIR/client" bash -c "$FLUTTER_CMD" &
            ;;
        gnome-terminal)
            gnome-terminal --title="TeachTrack - Backend" --working-directory="$ROOT_DIR/server" -- bash -c "$BACKEND_CMD" &
            sleep 2
            gnome-terminal --title="TeachTrack - Admin" --working-directory="$ROOT_DIR/admin" -- bash -c "$ADMIN_CMD" &
            sleep 2
            gnome-terminal --title="TeachTrack - Flutter" --working-directory="$ROOT_DIR/client" -- bash -c "$FLUTTER_CMD" &
            ;;
        xterm)
            xterm -title "TeachTrack - Backend" -e bash -c "$BACKEND_CMD" &
            sleep 2
            xterm -title "TeachTrack - Admin" -e bash -c "$ADMIN_CMD" &
            sleep 2
            xterm -title "TeachTrack - Flutter" -e bash -c "$FLUTTER_CMD" &
            ;;
    esac
else
    echo "No GUI terminal emulator detected or inline mode requested."
    echo "Starting all services in current terminal (Inline Mode)..."
    echo "Press Ctrl+C to stop all services."
    echo ""

    cleanup() {
        echo ""
        echo "Shutting down all services..."
        trap - SIGINT SIGTERM EXIT
        kill 0 2>/dev/null || true
        exit 0
    }
    trap cleanup SIGINT SIGTERM EXIT

    # Launch Backend
    (
        cd "$ROOT_DIR/server"
        # shellcheck disable=SC1090
        source "$VENV_PATH/bin/activate"
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | while IFS= read -r line; do echo "[Backend] $line"; done
    ) &

    sleep 2

    # Launch Admin
    (
        cd "$ROOT_DIR/admin"
        npm run dev 2>&1 | while IFS= read -r line; do echo "[Admin] $line"; done
    ) &

    sleep 2

    # Launch Flutter
    (
        cd "$ROOT_DIR/client"
        echo "[Flutter] Launching Medium Phone emulator..."
        flutter emulators --launch Medium_Phone 2>/dev/null || flutter emulators --launch "Medium Phone"
        echo "[Flutter] Emulator launched. Waiting 25 seconds for initial boot..."
        for i in {25..1}; do
            printf '[Flutter] Booting emulator... %2d seconds remaining\r' "$i"
            sleep 1
        done
        echo ""
        if command -v adb >/dev/null 2>&1; then
            echo "[Flutter] Waiting for ADB device readiness..."
            adb wait-for-device 2>/dev/null || true
        fi
        TARGET_DEVICE=$(adb devices 2>/dev/null | grep -m1 'emulator-' | awk '{print $1}')
        if [ -z "$TARGET_DEVICE" ]; then
            TARGET_DEVICE="emulator-5554"
        fi
        echo "[Flutter] Target device identified: $TARGET_DEVICE"
        echo "[Flutter] Launching TeachTrack app on emulator..."
        (flutter run -d "$TARGET_DEVICE" 2>&1 || flutter run -d android 2>&1) | while IFS= read -r line; do echo "[Flutter] $line"; done
    ) &
fi

# Step 5: Service Summary and Post-Start Actions
echo ""
echo "========================================"
echo "   All Services Started!                "
echo "========================================"
echo ""
if [ "$CURRENT_BRANCH" = "demo" ]; then
    echo "Demo Mode Active:"
    echo "  Backend:     http://localhost:8000 (Video Detection)"
    echo "  API Docs:    http://localhost:8000/docs"
    echo "  Admin Panel: http://localhost:3000 (usually)"
    echo "  Flutter:     Running on emulator-5554 (Medium Phone)"
    echo ""
    if [ -t 0 ]; then
        read -n 1 -s -r -p "Press any key to open API docs in browser (or Ctrl+C to skip)..."
        echo ""
        xdg-open "http://localhost:8000/docs" >/dev/null 2>&1 || true
    fi
else
    echo "Normal Mode Active:"
    echo "  Backend:     http://localhost:8000"
    echo "  API Docs:    http://localhost:8000/docs"
    echo "  Admin Panel: http://localhost:3000 (usually)"
    echo "  Flutter:     Running on emulator-5554 (Medium Phone)"
fi
echo ""

# If inline mode, wait for background services
if [ -z "$TERMINAL_BIN" ]; then
    wait
fi
