@echo off
title SEF Tool Baslatici
chcp 65001 >nul
color 0a

:: Node kurulumu kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js yüklü degil.
    echo Lütfen https://nodejs.org adresinden yukleyin.
    pause
    exit /b
)

:: Scriptin bulunduğu klasöre git
cd /d "%~dp0"

echo.
echo 🚀 SEF Tool baslatiliyor...
echo.

:: Gerekli modüller varsa geç, yoksa yükle
set packages=mineflayer mineflayer-pathfinder vec3
for %%p in (%packages%) do (
    call :check "%%p"
)
goto :run

:check
setlocal
set "pkg=%~1"
where /q npm 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ npm bulunamadi.
    echo Node.js kurulumunda npm eksik olabilir.
    pause
    exit /b
)
node -e "require.resolve('%pkg%')" 2>nul
if %errorlevel% neq 0 (
    echo 📦 %pkg% kuruluyor...
    call npm install %pkg% --silent
    echo ✅ %pkg% yüklendi.
)
endlocal
exit /b

:run
:: Toolu çalıştır
node sef.js

echo.
echo ✅ SEF Tool kapandi.
pause