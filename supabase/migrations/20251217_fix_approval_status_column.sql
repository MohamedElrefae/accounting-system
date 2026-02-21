-- Add approval_status column to transactions table if it doesn't exist
-- This column is needed for the approval workflow but may be missing

-- Add approval_status column if not exists
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'approval_status'
        AND table_schema = 'public'
    ) THEN
        -- Add approval_status column
        ALTER TABLE transactions 
        ADD COLUMN approval_status VARCHAR(20) DEFAULT 'draft'
        CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected', 'revision_requested', 'cancelled', 'posted'));
        
        -- Add submitted_at column for tracking submission timestamp
        ALTER TABLE transactions 
        ADD COLUMN submitted_at TIMESTAMPTZ;
        
        -- Add submitted_by column for tracking who submitted
        ALTER TABLE transactions 
        ADD COLUMN submitted_by UUID REFERENCES auth.users(id);
        
        -- Create index for approval_status performance
        CREATE INDEX IF NOT EXISTS idx_transactions_approval_status_field 
        ON transactions(approval_status);
        
        -- Update existing records to have proper default approval_status
        UPDATE transactions 
        SET approval_status = 'draft' 
        WHERE approval_status IS NULL;
        
        RAISE NOTICE 'Added approval_status column to transactions table';
    ELSE
        RAISE NOTICE 'approval_status column already exists in transactions table';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN transactions.approval_status IS 'Approval workflow status - tracks submission and approval state';
COMMENT ON COLUMN transactions.submitted_at IS 'When transaction was submitted for approval';
COMMENT ON COLUMN transactions.submitted_by IS 'User who submitted the transaction for approval';

COMMIT;
