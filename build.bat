@echo off
title SpaceHub Builder
cd /d "%~dp0"

echo [+] SpaceHub Setup Olusturucu Baslatiliyor...

:: 1. Uygulama Kapali mi?
echo [+] Uygulama kapatiliyor...
taskkill /F /IM electron.exe /T >nul 2>&1

:: 2. Modul Duzeltme (Builder icin standart yapiya donus)
if exist "node_modules\electron_runtime" (
    echo [+] Moduller derleme icin hazirlaniyor...
    if exist "node_modules\electron" rd /s /q "node_modules\electron"
    ren "node_modules\electron_runtime" "electron"
)

:: 3. Build Islemi
echo [+] Derleme islemi basliyor (Bu islem biraz surebilir)...
echo.
call npm run build

if %errorlevel% neq 0 (
    echo [!] Derleme Hatasi!
    goto :RESTORE
)

echo.
echo [+] BASARILI! Setup dosyasi olusturuldu.
echo [!] Dosya Konumu: dist\
dir dist\*.exe /b

:: 4. Modulleri Geri Yukle (Gelistirme ortami icin)
:RESTORE
if exist "node_modules\electron" (
    echo [+] Gelistirme ortami geri yukleniyor...
    if exist "node_modules\electron_runtime" rd /s /q "node_modules\electron_runtime"
    ren "node_modules\electron" "electron_runtime"
)

echo.
echo Islem tamamlandi.
pause
