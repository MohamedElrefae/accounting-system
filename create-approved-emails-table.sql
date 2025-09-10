-- Create a simple public table for approved emails that RegisterForm can access
-- This is more secure than exposing the full access_requests table

CREATE TABLE IF NOT EXISTS public.approved_emails (
    email TEXT PRIMARY KEY,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS needed - this table is intentionally public for registration purposes
-- It only contains email addresses that are approved for registration

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_approved_emails_email ON public.approved_emails(email);
CREATE INDEX IF NOT EXISTS idx_approved_emails_approved_at ON public.approved_emails(approved_at);

-- Test: Insert your email that's already approved
INSERT INTO public.approved_emails (email) 
VALUES ('m.elrefeay81@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Verify the table
SELECT * FROM approved_emails;
