@echo off
setlocal enabledelayedexpansion

:: Force the script to run from the USAStates folder
cd /d "%~dp0"

:: Get Year, Month, Day, Hour, Minute using a simpler method
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I

:: Extract parts manually: YYYY MM DD _ HH MM
set YYYY=%datetime:~0,4%
set MM=%datetime:~4,2%
set DD=%datetime:~6,2%
set HH=%datetime:~8,2%
set MIN=%datetime:~10,2%

set TIMESTAMP=%YYYY%%MM%%DD%_%HH%%MIN%

:: Relative Paths
set "SRC_COMP=src\components"
set "SRC_APP=src\App.jsx"
set "DEST=src\save\backup_%TIMESTAMP%"

echo ===========================================
echo BACKUP PROCESS STARTED
echo ===========================================

:: Create the destination folder (and parent 'save' folder if needed)
if not exist "%DEST%" mkdir "%DEST%"

:: Copy the components folder
echo Copying folder: %SRC_COMP% ...
xcopy "%SRC_COMP%" "%DEST%\components" /E /I /Y /Q

:: Copy the App.jsx file
echo Copying file: %SRC_APP% ...
copy "%SRC_APP%" "%DEST%\" /Y

echo ===========================================
echo BACKUP COMPLETE
echo Target: %DEST%
echo ===========================================

pause