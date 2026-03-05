-- 001_create_adjustment_types.sql
-- Step 1: Create adjustment_types table

CREATE TABLE public.adjustment_types (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code               VARCHAR(50)   NOT NULL,
  name               VARCHAR(255)  NOT NULL,
  name_ar            VARCHAR(255),
  default_percentage NUMERIC(10,6) NOT NULL, -- 0.05 = 5%, 0.14 = 14%
  org_id             UUID          NOT NULL,
  description        TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT uk_adj_types_org_code UNIQUE (org_id, code),
  CONSTRAINT fk_adj_types_org FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_adj_types_org ON public.adjustment_types(org_id);
