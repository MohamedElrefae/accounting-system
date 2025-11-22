# Egypt 2025 Election Data - Supabase Setup Guide

This guide will help you transfer your extracted Egyptian voter data to Supabase.

## 📋 Prerequisites

1. ✅ Completed PDF extraction (you should have `output/locations_cleaned.csv` and `output/voters_cleaned.csv`)
2. ✅ A Supabase project created at [supabase.com](https://supabase.com)
3. ✅ Python installed with pip

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
pip install -r supabase_requirements.txt
```

### Step 2: Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 3: Set Environment Variables

**Windows (Command Prompt):**
```cmd
set SUPABASE_URL=https://your-project-id.supabase.co
set SUPABASE_ANON_KEY=your-anon-key-here
```

**Windows (PowerShell):**
```powershell
$env:SUPABASE_URL='https://your-project-id.supabase.co'
$env:SUPABASE_ANON_KEY='your-anon-key-here'
```

**Or use the helper script:**
```cmd
set_supabase_env.bat
```

### Step 4: Create Database Schema
1. Open Supabase SQL Editor in your project dashboard
2. Copy the entire contents of `supabase_schema.sql`
3. Paste and execute in the SQL Editor

### Step 5: Transfer Data
```bash
python supabase_data_transfer.py
```

## 📊 Database Schema

### Tables Created:

#### `locations` table:
- `location_id` (Primary Key)
- `location_number` - Sub-committee number
- `location_name` - School/facility name (Arabic)
- `location_address` - Full address (Arabic)
- `governorate` - كفر الشيخ
- `district` - مطوبس
- `main_committee_id` - Main committee reference
- `police_department` - Associated police department
- `total_voters` - Number of voters at this location
- `created_at`, `updated_at` - Timestamps

#### `voters` table:
- `id` (Auto-increment Primary Key)
- `voter_id` - Sequential ID within location
- `full_name` - Complete Arabic name
- `location_id` - Foreign key to locations
- `source_page` - PDF page reference
- `created_at`, `updated_at` - Timestamps

### Views Created:

#### `voter_details` - Combined voter and location info
#### `election_statistics` - Summary statistics

## 🔍 Data Verification

After transfer, the script will show:
- Total locations and voters transferred
- Sample data from both tables
- Database statistics

## 📈 Expected Results

Based on your motobus.pdf extraction:
- **Locations**: 1,021 polling stations
- **Voters**: ~193,871 registered voters
- **Governorate**: كفر الشيخ (Kafr El-Sheikh)
- **District**: مطوبس (Motobus)

## 🔧 Troubleshooting

### Common Issues:

1. **Environment variables not set**
   - Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY
   - Restart command prompt after setting variables

2. **Permission errors**
   - Check your Supabase RLS policies
   - Ensure your API key has the right permissions

3. **Large dataset timeouts**
   - The script uses batching to handle large datasets
   - If it fails, you can re-run it (uses upsert to avoid duplicates)

4. **CSV files not found**
   - Make sure you've run the PDF extraction first
   - Check that `output/locations_cleaned.csv` and `output/voters_cleaned.csv` exist

## 🔐 Security Notes

- The schema includes Row Level Security (RLS) enabled
- Default policies allow all operations - modify based on your needs
- Consider using service role key for data import if you have permission issues

## 📝 SQL Queries Examples

After data transfer, you can query your data:

```sql
-- Get total voters by location
SELECT location_name, total_voters 
FROM locations 
ORDER BY total_voters DESC 
LIMIT 10;

-- Search voters by name
SELECT full_name, location_name 
FROM voter_details 
WHERE full_name ILIKE '%محمد%' 
LIMIT 20;

-- Get statistics
SELECT * FROM election_statistics;
```

## 🎯 Next Steps

After successful transfer:
1. Set up proper RLS policies for your use case
2. Create additional indexes if needed for your queries
3. Set up backup procedures
4. Consider creating a web interface to query the data

## 📞 Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your Supabase project settings
3. Ensure all CSV files are present and properly formatted