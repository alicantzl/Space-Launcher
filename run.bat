@echo off
title S P A C E - Launcher
cd /d "%~dp0"

:: 1. Force Clean Termination
taskkill /F /IM electron.exe /T >nul 2>&1

:: 2. Environment Fixes
set ELECTRON_RUN_AS_NODE=
set ELECTRON_NO_ATTACH_CONSOLE=true

:: 3. Runtime Management (Fixes 'npm install' resetting the fix)
if exist "node_modules\electron" (
    echo [+] Updating runtime configuration...
    if exist "node_modules\electron_runtime" rd /s /q "node_modules\electron_runtime"
    ren "node_modules\electron" "electron_runtime"
)

:: 4. Verify Runtime Exists
if not exist "node_modules\electron_runtime\dist\electron.exe" (
    echo [!] Electron runtime missing! Attempting recovery...
    call npm install electron@^28.2.0 --save-dev
    ren "node_modules\electron" "electron_runtime"
)

:: 5. Launch Application
echo [+] Starting SpaceHub...
start "" "node_modules\electron_runtime\dist\electron.exe" . --ignore-gpu-blocklist --enable-gpu-rasterization --no-sandbox

exit
