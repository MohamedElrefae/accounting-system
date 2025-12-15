-- Add Sample Materials with Arabic Names for Testing
-- Run this in Supabase SQL Editor

-- First, ensure we have some UOMs
INSERT INTO uoms (org_id, code, name, name_ar, is_active)
SELECT 
  org_id,
  'KG',
  'Kilogram',
  'كيلوجرام',
  true
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM uoms WHERE code = 'KG')
LIMIT 1;

INSERT INTO uoms (org_id, code, name, name_ar, is_active)
SELECT 
  org_id,
  'TON',
  'Ton',
  'طن',
  true
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM uoms WHERE code = 'TON')
LIMIT 1;

INSERT INTO uoms (org_id, code, name, name_ar, is_active)
SELECT 
  org_id,
  'M3',
  'Cubic Meter',
  'متر مكعب',
  true
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM uoms WHERE code = 'M3')
LIMIT 1;

INSERT INTO uoms (org_id, code, name, name_ar, is_active)
SELECT 
  org_id,
  'M',
  'Meter',
  'متر',
  true
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM uoms WHERE code = 'M')
LIMIT 1;

INSERT INTO uoms (org_id, code, name, name_ar, is_active)
SELECT 
  org_id,
  'PCS',
  'Pieces',
  'قطعة',
  true
FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM uoms WHERE code = 'PCS')
LIMIT 1;

-- Now add sample materials with Arabic names
INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M001',
  'Steel',
  'حديد',
  (SELECT id FROM uoms WHERE code = 'KG' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M001' AND org_id = o.org_id)
LIMIT 1;

INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M002',
  'Cement',
  'أسمنت',
  (SELECT id FROM uoms WHERE code = 'TON' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M002' AND org_id = o.org_id)
LIMIT 1;

INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M003',
  'Sand',
  'رمل',
  (SELECT id FROM uoms WHERE code = 'M3' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M003' AND org_id = o.org_id)
LIMIT 1;

INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M004',
  'Gravel',
  'حصى',
  (SELECT id FROM uoms WHERE code = 'M3' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M004' AND org_id = o.org_id)
LIMIT 1;

INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M005',
  'Rebar',
  'حديد تسليح',
  (SELECT id FROM uoms WHERE code = 'KG' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M005' AND org_id = o.org_id)
LIMIT 1;

INSERT INTO materials (
  org_id,
  material_code,
  material_name,
  material_name_ar,
  base_uom_id,
  is_active,
  is_trackable,
  material_type,
  valuation_method
)
SELECT 
  o.org_id,
  'M006',
  'Bricks',
  'طوب',
  (SELECT id FROM uoms WHERE code = 'PCS' AND org_id = o.org_id LIMIT 1),
  true,
  true,
  'material',
  'moving_average'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE material_code = 'M006' AND org_id = o.org_id)
LIMIT 1;

-- Verify the data
SELECT 
  m.material_code,
  m.material_name,
  m.material_name_ar,
  u.code as uom_code,
  u.name as uom_name,
  u.name_ar as uom_name_ar,
  m.is_active,
  m.is_trackable
FROM materials m
LEFT JOIN uoms u ON m.base_uom_id = u.id
ORDER BY m.material_code;
