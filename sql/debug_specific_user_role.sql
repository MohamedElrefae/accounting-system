-- CHECK SPECIFIC USER ROLES
-- Replace '2629dd8a' with the ID you see in the React Debug Box
SELECT 
    ur.user_id, 
    ur.role_id,
    r.name as role_name,
    ur.id as membership_id
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id::text LIKE '2629dd8a%';

-- ALSO SHOW ALL USERS JUST IN CASE
SELECT ur.user_id, r.name 
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;
