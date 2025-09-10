-- Verification SQL for the new approved emails workflow
-- Run these queries in order to test the complete flow

-- 1. First, run the table creation script (create-approved-emails-table.sql)

-- 2. Check if the approved_emails table was created successfully
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'approved_emails'
ORDER BY ordinal_position;

-- 3. Verify your email was inserted
SELECT * FROM approved_emails;

-- 4. Check current access requests status
SELECT id, email, full_name, status, approved_at 
FROM access_requests 
ORDER BY requested_at DESC;

-- 5. If you need to manually add your email to approved_emails (backup method)
INSERT INTO approved_emails (email) 
VALUES ('m.elrefeay81@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- 6. Verify the email is now in approved_emails
SELECT * FROM approved_emails WHERE email = 'm.elrefeay81@gmail.com';

-- 7. Test query that RegisterForm will use (this should return your email)
SELECT email FROM approved_emails WHERE email = 'm.elrefeay81@gmail.com';

-- 8. Check if there are any existing pending user profiles
SELECT * FROM pending_user_profiles WHERE email = 'm.elrefeay81@gmail.com';

-- 9. Clean up test data if needed (uncomment these if you want to reset)
-- DELETE FROM approved_emails WHERE email = 'm.elrefeay81@gmail.com';
-- DELETE FROM pending_user_profiles WHERE email = 'm.elrefeay81@gmail.com';

-- 10. Final verification - this should show your email is ready for registration
SELECT 
  ae.email,
  ae.approved_at,
  ar.status as request_status,
  pup.full_name as pending_name
FROM approved_emails ae
LEFT JOIN access_requests ar ON ae.email = ar.email AND ar.status = 'approved'
LEFT JOIN pending_user_profiles pup ON ae.email = pup.email
WHERE ae.email = 'm.elrefeay81@gmail.com';
