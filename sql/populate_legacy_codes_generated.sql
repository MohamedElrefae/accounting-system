-- Auto-generated SQL to populate legacy_code values
-- Generated from accounts_rows.csv

BEGIN;

UPDATE accounts 
SET legacy_code = '13111'
WHERE code = '12113' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '131'
WHERE code = '12101' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '221'
WHERE code = '22201' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '21'
WHERE code = '3000' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '117'
WHERE code = '11107' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '116'
WHERE code = '11106' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '2356'
WHERE code = '22306' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '13'
WHERE code = '1200' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '233'
WHERE code = '22202' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '115'
WHERE code = '11105' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '3'
WHERE code = '5000' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '23'
WHERE code = '2200' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '2'
WHERE code = '2000' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '211'
WHERE code = '31001' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '134'
WHERE code = '12201' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '232'
WHERE code = '22103' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '1'
WHERE code = '1000' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '1352'
WHERE code = '12304' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '1354'
WHERE code = '12307' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '234'
WHERE code = '22104' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '236'
WHERE code = '22701' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '31'
WHERE code = '5100' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '41'
WHERE code = '4100' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '56'
WHERE code = '42101' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '42'
WHERE code = '4200' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '2352'
WHERE code = '22303' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '132'
WHERE code = '12103' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '4'
WHERE code = '4000' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '11'
WHERE code = '1110' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '131313'
WHERE code = '12123' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

UPDATE accounts 
SET legacy_code = '12'
WHERE code = '1100' 
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NULL;

-- Verify the updates
SELECT COUNT(*) as total_with_legacy_code FROM accounts WHERE legacy_code IS NOT NULL;
SELECT COUNT(*) as still_null FROM accounts WHERE legacy_code IS NULL;

COMMIT;
