-- Egypt 2025 Election Voter Database Schema for Supabase
-- Motobus District, Kafr El-Sheikh Governorate

-- Enable Row Level Security (RLS) for security
-- You can modify these policies based on your access requirements

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    location_id BIGINT PRIMARY KEY,
    location_number VARCHAR(50),
    location_name TEXT,
    location_address TEXT,
    governorate VARCHAR(100) DEFAULT 'كفر الشيخ',
    district VARCHAR(100) DEFAULT 'مطوبس',
    main_committee_id VARCHAR(50),
    police_department VARCHAR(100),
    total_voters INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voters table
CREATE TABLE IF NOT EXISTS voters (
    id BIGSERIAL PRIMARY KEY,
    voter_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    location_id BIGINT NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    source_page INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create composite unique constraint to prevent duplicates
    UNIQUE(voter_id, location_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voters_location_id ON voters(location_id);
CREATE INDEX IF NOT EXISTS idx_voters_full_name ON voters USING gin(to_tsvector('arabic', full_name));
CREATE INDEX IF NOT EXISTS idx_locations_governorate ON locations(governorate);
CREATE INDEX IF NOT EXISTS idx_locations_district ON locations(district);
CREATE INDEX IF NOT EXISTS idx_locations_location_number ON locations(location_number);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your authentication needs)
-- For now, allowing all operations - you can restrict later

-- Locations policies
CREATE POLICY "Allow all operations on locations" ON locations
    FOR ALL USING (true) WITH CHECK (true);

-- Voters policies  
CREATE POLICY "Allow all operations on voters" ON voters
    FOR ALL USING (true) WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voters_updated_at 
    BEFORE UPDATE ON voters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy querying with location details
CREATE OR REPLACE VIEW voter_details AS
SELECT 
    v.id,
    v.voter_id,
    v.full_name,
    v.source_page,
    l.location_id,
    l.location_number,
    l.location_name,
    l.location_address,
    l.governorate,
    l.district,
    l.main_committee_id,
    l.police_department,
    l.total_voters as location_total_voters,
    v.created_at,
    v.updated_at
FROM voters v
JOIN locations l ON v.location_id = l.location_id;

-- Create summary statistics view
CREATE OR REPLACE VIEW election_statistics AS
SELECT 
    COUNT(DISTINCT l.location_id) as total_locations,
    COUNT(v.id) as total_voters,
    l.governorate,
    l.district,
    ROUND(AVG(l.total_voters), 2) as avg_voters_per_location,
    MIN(l.total_voters) as min_voters_per_location,
    MAX(l.total_voters) as max_voters_per_location
FROM locations l
LEFT JOIN voters v ON l.location_id = v.location_id
GROUP BY l.governorate, l.district;

-- Grant necessary permissions (adjust based on your user roles)
-- GRANT ALL ON locations TO authenticated;
-- GRANT ALL ON voters TO authenticated;
-- GRANT SELECT ON voter_details TO authenticated;
-- GRANT SELECT ON election_statistics TO authenticated;