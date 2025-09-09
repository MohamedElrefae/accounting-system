@echo off
REM Set environment variables to increase file limits
set UV_THREADPOOL_SIZE=128
set NODE_OPTIONS=--max-old-space-size=8192

echo Starting Vite dev server with optimized settings...
npm run dev
