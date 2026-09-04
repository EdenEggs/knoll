@echo off
rem ~~~ LAB 1, ONE CLICK ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
rem Knocks on serve.js's door first: if a server is already up (started from
rem here or from lab 2 — it's the same server either way), this just opens
rem the bench in the browser. If nobody answers, it starts the server in a
rem minimized window (close that window to stop the server), waits for the
rem door to open, then opens the bench.
rem Lives in lab\ next to the bench it opens; the server is ..\serve.js.

set "PORT=4321"
set "URL=http://localhost:%PORT%/lab/"
set "SERVE=%~dp0..\serve.js"

powershell -NoProfile -Command "try{$r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:%PORT%/_lab2/default';if($r.Content -match 'door'){exit 0}}catch{};exit 1" >nul 2>&1
if not errorlevel 1 goto open

start "knoll lab 1 - serve.js (close this window to stop the server)" /min cmd /c node "%SERVE%" %PORT%

powershell -NoProfile -Command "for($i=0;$i -lt 40;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:%PORT%/_lab2/default';if($r.Content -match 'door'){exit 0}}catch{Start-Sleep -Milliseconds 250}};exit 1" >nul 2>&1

:open
start "" "%URL%"
