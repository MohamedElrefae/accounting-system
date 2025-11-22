-- Simple table creation for Supabase
-- Copy and paste this into your Supabase SQL Editor

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
    location_id BIGINT NOT NULL REFERENCES locations(location_id),
    source_page INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_voters_location_id ON voters(location_id);
CREATE INDEX idx_voters_full_name ON voters USING gin(to_tsvector('arabic', full_name));
CREATE INDEX idx_locations_location_number ON locations(location_number);