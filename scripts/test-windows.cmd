@echo off
cd /d "%~dp0.."
set "NODE_EXTRA_CA_CERTS=%CD%\certs\localhost.crt"
call npm.cmd run testapi
pause
