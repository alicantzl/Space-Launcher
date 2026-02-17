@echo off
title SpaceHub Builder Debug Mode
cd /d "%~dp0"

echo [ADIM 1] Baslatiliyor...
echo Lutfen Space Hub uygulamasinin KAPALI oldugundan emin olun.
pause

echo.
echo [ADIM 2] Modul Kontrolu...

if exist "node_modules\electron_runtime" (
    echo [BILGI] 'electron_runtime' klasoru bulundu.
    echo Modul adi duzeltiliyor...
    
    if exist "node_modules\electron" (
        echo [UYARI] Eski electron klasoru siliniyor...
        rd /s /q "node_modules\electron"
    )
    
    ren "node_modules\electron_runtime" "electron"
    if errorlevel 1 (
        echo.
        echo [HATA] KLASOR ADI DEGISTIRILEMEDI!
        echo Lutfen Space Hub uygulamasini KAPATIN.
        echo Klasor kilitli olabilir.
        pause
        exit /b
    )
    echo [TAMAM] Modul hazir.
) else (
    echo [BILGI] 'electron_runtime' bulunamadi, 'electron' zaten mevcut olabilir.
)

echo.
echo [ADIM 3] Build Islemi Baslatiliyor...
echo.

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [HATA] Build isleme sirasinda hata olustu!
    echo Lutfen yukaridaki hatayi okuyun.
) else (
    echo.
    echo [BASARILI] Setup olusturuldu!
    dir dist\*.exe
)

echo.
echo [ADIM 4] Temizlik...
if exist "node_modules\electron" (
    echo Gelistirme ortami geri yukleniyor...
    ren "node_modules\electron" "electron_runtime"
)

echo.
echo Islem bitti.
pause
