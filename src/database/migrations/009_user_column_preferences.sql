-- Migration: Create table for user column preferences
-- This allows users to store their table column configurations (width, visibility, order) in the database

-- Create the user_column_preferences table
CREATE TABLE IF NOT EXISTS user_column_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_key VARCHAR(100) NOT NULL, -- e.g., 'transactions_table', 'accounts_table'
    column_config JSONB NOT NULL, -- Stores the complete column configuration
    version INTEGER NOT NULL DEFAULT 1, -- For handling schema migrations
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint to ensure one preference per user per table
    UNIQUE(user_id, table_key)
);

-- Create index for faster lookups
CREATE INDEX idx_user_column_preferences_user_table ON user_column_preferences(user_id, table_key);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_column_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_column_preferences_updated_at
    BEFORE UPDATE ON user_column_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_column_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE user_column_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own column preferences"
ON user_column_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column preferences"
ON user_column_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column preferences"
ON user_column_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column preferences"
ON user_column_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create a function to upsert column preferences
CREATE OR REPLACE FUNCTION upsert_user_column_preferences(
    p_table_key VARCHAR(100),
    p_column_config JSONB,
    p_version INTEGER DEFAULT 1
)
RETURNS user_column_preferences AS $$
DECLARE
    result user_column_preferences;
BEGIN
    INSERT INTO user_column_preferences (user_id, table_key, column_config, version)
    VALUES (auth.uid(), p_table_key, p_column_config, p_version)
    ON CONFLICT (user_id, table_key)
    DO UPDATE SET
        column_config = EXCLUDED.column_config,
        version = EXCLUDED.version,
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_user_column_preferences(VARCHAR, JSONB, INTEGER) TO authenticated;

-- Create a function to get user column preferences
CREATE OR REPLACE FUNCTION get_user_column_preferences(p_table_key VARCHAR(100))
RETURNS user_column_preferences AS $$
DECLARE
    result user_column_preferences;
BEGIN
    SELECT * INTO result
    FROM user_column_preferences
    WHERE user_id = auth.uid() AND table_key = p_table_key;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_column_preferences(VARCHAR) TO authenticated;
