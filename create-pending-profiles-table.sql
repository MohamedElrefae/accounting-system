-- Create table to store approved user data for profile creation
CREATE TABLE IF NOT EXISTS public.pending_user_profiles (
    email TEXT PRIMARY KEY,
    full_name_ar TEXT,
    phone TEXT,
    department TEXT,
    job_title TEXT,
    assigned_role TEXT DEFAULT 'user',
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id),
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pending_user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage pending profiles
CREATE POLICY "Admins can manage pending profiles" ON public.pending_user_profiles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (is_super_admin = true OR department = 'Admin')
    )
);

-- Allow users to read their own pending profile
CREATE POLICY "Users can read own pending profile" ON public.pending_user_profiles
FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pending_user_profiles_email ON public.pending_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_pending_user_profiles_used ON public.pending_user_profiles(used);
