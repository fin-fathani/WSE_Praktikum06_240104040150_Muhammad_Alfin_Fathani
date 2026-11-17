@echo off
cd /d "%~dp0.."
call npm.cmd run setup
if errorlevel 1 (echo Setup gagal. & pause & exit /b 1)
call npm.cmd run docs
if errorlevel 1 (echo Dokumentasi gagal. & pause & exit /b 1)
call npm.cmd start
pause
