# 🗄️ Supabase Database Setup Guide

## Quick Start: Create a Supabase Project

### Step 1: Sign Up / Log In
1. Go to https://app.supabase.com
2. Sign in with GitHub (recommended) or email
3. Click "New Project"

### Step 2: Create Project
1. Choose an organization (or create one)
2. Fill in project details:
   - **Name**: accounting-system (or any name you prefer)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development
3. Click "Create new project"
4. Wait 2-3 minutes for provisioning

### Step 3: Get Your Credentials
Once the project is ready:
1. Go to **Settings** (⚙️ icon in sidebar)
2. Click **API**
3. Copy these two values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (long JWT token)

### Step 4: Add to .env.local
Paste them into your `.env.local` file:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Run Database Migrations
You need to set up the database schema. Choose one method:

#### Method A: Using Supabase Dashboard (Easiest)
1. In your Supabase project, go to **SQL Editor**
2. Run the migration files in order from `supabase/migrations/` folder
3. Copy and paste each .sql file content and click "Run"

#### Method B: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

#### Method C: Manual SQL Execution
1. Open `supabase/migrations/` folder
2. Copy contents of each migration file (in order)
3. In Supabase Dashboard → SQL Editor → New Query
4. Paste and run each migration

### Step 6: Initial Data Setup
The app expects certain base data. Run these SQL scripts:
- Fiscal year management migrations (20250922_p1_*.sql)
- Construction setup (if needed)

### Step 7: Test Connection
1. Restart your dev server: `npm run dev`
2. Open http://localhost:3001
3. You should see the login page!

## 🚨 Troubleshooting

### "Invalid API key"
- Double-check you copied the **anon public** key, not the service_role key
- Make sure there are no extra spaces or line breaks

### "Failed to fetch" or CORS errors
- Verify the Project URL is correct
- Check your Supabase project is active (not paused)

### "relation does not exist" errors
- You haven't run the migrations yet
- Go to Step 5 and run all migrations

### Authentication not working
- Ensure migrations are run
- Check that Row Level Security (RLS) policies are set up
- Try creating a test user in Supabase Auth dashboard

## 📊 Database Schema Overview

This app uses:
- **accounts**: Chart of accounts (hierarchical)
- **transactions**: Transaction headers
- **transaction_lines**: Multi-line entries
- **fiscal_years** & **fiscal_periods**: Fiscal management
- **projects**: Project tracking
- **organizations**: Multi-org support
- **users** & **profiles**: User management

All tables have Row Level Security (RLS) policies for data isolation.

## 🔐 Security Notes

- Never commit `.env.local` to git (it's already in .gitignore)
- The **anon public** key is safe for client-side use
- Never use the **service_role** key in frontend code
- RLS policies protect your data at the database level

## Need Help?

1. Check Supabase logs: Dashboard → Logs
2. Check browser console: F12 → Console
3. Check server terminal for errors
4. Verify all migrations ran successfully

