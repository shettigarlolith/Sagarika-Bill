@echo off
setlocal

echo Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to build the Windows installer.
  echo Install the current LTS version from https://nodejs.org/
  exit /b 1
)

echo Installing project dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

echo Building Windows installer...
call npm run dist:win
if errorlevel 1 (
  echo Windows installer build failed.
  exit /b 1
)

echo.
echo Build complete.
echo Check the dist folder for the generated Setup.exe file.
exit /b 0
