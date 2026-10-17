@echo off
rem Rebuild the SPB with the MSFS SDK and copy it to InGamePanels.
rem Needs the MSFS_SDK environment variable (set by the SDK installer, e.g. C:\MSFS SDK\).
setlocal
set "ROOT=%~dp0"
if "%MSFS_SDK%"=="" (echo MSFS_SDK is not set & exit /b 1)

"%MSFS_SDK%Tools\bin\fspackagetool.exe" "%ROOT%flight-computer-panel\Build\flight-computer-panel.xml"
if errorlevel 1 (echo fspackagetool failed & exit /b 1)
copy /Y "%ROOT%flight-computer-panel\Build\Packages\flight-computer-panel\Build\flight-computer-panel.spb" "%ROOT%flight-computer-panel\InGamePanels" >nul
exit /b %errorlevel%
