@echo off
rem Stage the package and zip it for distribution: release\flight-computer-panel-<version>.zip
rem The zip holds a single flight-computer-panel\ folder, ready to extract into Community.
rem The version is read from flight-computer-panel\manifest.json (package_version).
setlocal
set "ROOT=%~dp0"
set "STAGE=%ROOT%dist\flight-computer-panel"
set "OUTDIR=%ROOT%release"

call "%ROOT%deploy.bat" stage
if errorlevel 1 (echo staging failed & exit /b 1)

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Get-Content -Raw '%ROOT%flight-computer-panel\manifest.json' | ConvertFrom-Json).package_version"`) do set "VERSION=%%v"
if "%VERSION%"=="" (echo could not read package_version from manifest.json & exit /b 1)

if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set "ZIP=%OUTDIR%\flight-computer-panel-%VERSION%.zip"
if exist "%ZIP%" del /Q "%ZIP%"

rem Windows' bundled bsdtar writes a standard zip (forward slashes); PowerShell 5.1's Compress-Archive does not.
"%SystemRoot%\System32\tar.exe" -a -c -f "%ZIP%" -C "%ROOT%dist" flight-computer-panel
if errorlevel 1 (echo zip failed & exit /b 1)

echo Created %ZIP%
exit /b 0
