@echo off
REM Enhanced development server with EMFILE protection

echo Starting development server with EMFILE protection...

REM Set more aggressive environment variables for Windows
set UV_THREADPOOL_SIZE=256
set NODE_OPTIONS=--max-old-space-size=8192
set NODE_ENV=development

REM Start Vite with reduced concurrency
echo Environment variables set:
echo - UV_THREADPOOL_SIZE=%UV_THREADPOOL_SIZE%
echo - NODE_OPTIONS=%NODE_OPTIONS%
echo - NODE_ENV=%NODE_ENV%
echo.
echo Starting Vite...
npm run dev
