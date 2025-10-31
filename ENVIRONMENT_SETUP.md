# 🚀 Environment Setup Guide

## White Screen Issue - Common Causes & Fixes

### 1. Missing Environment Variables ⚠️ (MOST COMMON)

Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get your credentials:**
1. Visit https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon public key

### 2. After Creating .env.local

**IMPORTANT**: You MUST restart the dev server after creating/modifying .env files:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Check Browser Console

Open your browser's Developer Tools:
- **Chrome/Edge**: Press F12 or Ctrl+Shift+I
- **Firefox**: Press F12
- **Safari**: Cmd+Option+I

Look for errors in the Console tab. Common errors:

#### Error: "supabaseUrl is required"
✅ **Fix**: Add `VITE_SUPABASE_URL` to `.env.local`

#### Error: "supabaseAnonKey is required"  
✅ **Fix**: Add `VITE_SUPABASE_ANON_KEY` to `.env.local`

#### Error: "Network request failed" or CORS errors
✅ **Fix**: Check your Supabase project is active and the URL is correct

### 4. Database Not Set Up

If you see authentication or database errors, you may need to run migrations:

```bash
# If you have Supabase CLI installed
supabase db push

# Or manually run the migration files in supabase/migrations/
```

### 5. Still White Screen?

Run this diagnostic:

```bash
# Check if dev server is running
npm run dev

# Open browser to http://localhost:3001
# Check the terminal for any error messages
# Check browser console (F12) for JavaScript errors
```

### 6. Common Terminal Errors

#### "Port 3001 is already in use"
```bash
# Kill the existing process or use a different port
# The vite config will auto-fallback to another port
```

#### TypeScript errors during build
```bash
# Usually safe to ignore during dev mode
# The app will still run
```

### 7. Quick Test

Replace your `.env.local` with test values to verify it's an env issue:

```bash
# These won't work but will show different errors
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-key
```

If you now see "Invalid API key" or similar instead of white screen, 
you know the .env file is being read correctly.

## Next Steps After Setup

1. ✅ Create `.env.local` with real Supabase credentials
2. ✅ Restart dev server (`npm run dev`)
3. ✅ Open http://localhost:3001 in browser
4. ✅ Check browser console for any remaining errors
5. ✅ If you see login page → SUCCESS! 🎉

## Need Help?

1. Check terminal output where `npm run dev` is running
2. Check browser console (F12 → Console tab)
3. Share any error messages you see

