-- Egypt 2025 Election Database Tables for Supabase
-- Execute this in Supabase SQL Editor

-- Drop tables if they exist (to start fresh)
DROP TABLE IF EXISTS voters;
DROP TABLE IF EXISTS locations;

-- Create locations table
CREATE TABLE locations (
    location_id BIGINT PRIMARY KEY,
    location_number VARCHAR(50),
    location_name TEXT,
    location_address TEXT,
    governorate VARCHAR(100) DEFAULT 'كفر الشيخ',
    district VARCHAR(100) DEFAULT 'مطوبس',
    main_committee_id VARCHAR(50),
    police_department VARCHAR(100),
    total_voters INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voters table
CREATE TABLE voters (
    id BIGSERIAL PRIMARY KEY,
    voter_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    location_id BIGINT NOT NULL,
    source_page INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add foreign key constraint
    CONSTRAINT fk_voters_location 
        FOREIGN KEY (location_id) 
        REFERENCES locations(location_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_voters_location_id ON voters(location_id);
CREATE INDEX idx_voters_full_name ON voters USING gin(to_tsvector('arabic', full_name));
CREATE INDEX idx_locations_location_number ON locations(location_number);
CREATE INDEX idx_locations_governorate ON locations(governorate);

-- Enable Row Level Security (optional - you can modify policies later)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (you can restrict later)
CREATE POLICY "Allow all operations on locations" ON locations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on voters" ON voters
    FOR ALL USING (true) WITH CHECK (true);

-- Insert a test record to verify tables work
INSERT INTO locations (location_id, location_number, location_name, governorate, district, total_voters)
VALUES (999999, 'TEST', 'Test Location', 'كفر الشيخ', 'مطوبس', 0);

-- Verify the test record
SELECT * FROM locations WHERE location_id = 999999;