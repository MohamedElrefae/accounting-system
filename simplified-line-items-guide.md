# Simplified Hierarchical Line Items Implementation Guide

## Overview

This document provides a **simplified, single-table approach** for implementing enterprise line item management in your construction accounting system. Instead of separate tables for categories and catalog items, this approach uses one hierarchical table where categories and actual items coexist, making implementation faster and more straightforward.

## Single Table Design Concept

### Key Principles
- **One Table**: `line_items` contains both categories and actual items
- **Hierarchical Structure**: Uses parent-child relationships with levels
- **Selective Items**: Only leaf-level items (Level 4) can be selected in transactions
- **Automatic Path Generation**: Hierarchical paths auto-generated for easy querying
- **Specifications at Item Level**: Technical details only for selectable items

### Table Structure
```sql
line_items:
┌────┬─────────────┬──────────────────────────┬───────────┬───────┬──────────────┬─────────────┐
│ id │ code        │ name                     │ parent_id │ level │ is_selectable│ specifications│
├────┼─────────────┼──────────────────────────┼───────────┼───────┼──────────────┼─────────────┤
│ 1  │ MAT         │ Construction Materials   │ null      │ 1     │ false        │ null        │
│ 2  │ CONC        │ Concrete & Masonry      │ 1         │ 2     │ false        │ null        │
│ 3  │ RM_CONC     │ Ready Mix Concrete      │ 2         │ 3     │ false        │ null        │
│ 4  │ CON-C25     │ Ready Mix Concrete C25  │ 3         │ 4     │ TRUE         │ grade:C25... │
│ 5  │ CON-C30     │ Ready Mix Concrete C30  │ 3         │ 4     │ TRUE         │ grade:C30... │
└────┴─────────────┴──────────────────────────┴───────────┴───────┴──────────────┴─────────────┘
```

## Database Schema

### Main Table Creation
```sql
-- Create enum for item types
CREATE TYPE item_type_enum AS ENUM ('material', 'service', 'equipment', 'labor');

-- Create the main hierarchical table
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    parent_id UUID REFERENCES line_items(id),
    level INTEGER NOT NULL,
    path TEXT NOT NULL,
    is_selectable BOOLEAN DEFAULT FALSE,
    item_type item_type_enum,
    specifications JSONB,
    base_unit_of_measure VARCHAR(50),
    standard_cost NUMERIC(15,4),
    is_active BOOLEAN DEFAULT TRUE,
    org_id UUID REFERENCES organizations(id) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_selectable_requirements CHECK (
        (is_selectable = FALSE) OR 
        (is_selectable = TRUE AND specifications IS NOT NULL AND base_unit_of_measure IS NOT NULL)
    )
);
```

### Indexes and Triggers
```sql
-- Create indexes for performance
CREATE INDEX idx_line_items_parent ON line_items(parent_id);
CREATE INDEX idx_line_items_path ON line_items(path);
CREATE INDEX idx_line_items_selectable ON line_items(is_selectable) WHERE is_selectable = TRUE;
CREATE INDEX idx_line_items_org_active ON line_items(org_id, is_active);

-- Auto-generate path trigger
CREATE OR REPLACE FUNCTION update_line_item_path() RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path := LOWER(NEW.code);
    ELSE
        SELECT path INTO parent_path FROM line_items WHERE id = NEW.parent_id;
        NEW.path := parent_path || '.' || LOWER(NEW.code);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_line_item_path
    BEFORE INSERT OR UPDATE ON line_items
    FOR EACH ROW EXECUTE FUNCTION update_line_item_path();
```

### Integration with Existing System
```sql
-- Add new column to existing transaction_line_items table
ALTER TABLE transaction_line_items 
ADD COLUMN line_item_id UUID REFERENCES line_items(id);

-- Create index for performance
CREATE INDEX idx_transaction_line_items_line_item ON transaction_line_items(line_item_id);

-- Create enhanced view for easy querying
CREATE VIEW transaction_line_items_enhanced AS
SELECT 
    tli.*,
    li.name as line_item_name,
    li.name_ar as line_item_name_ar,
    li.specifications,
    li.base_unit_of_measure as standard_unit,
    li.path as line_item_path,
    li.item_type,
    (SELECT STRING_AGG(parent_li.name, ' > ' ORDER BY parent_li.level)
     FROM line_items parent_li 
     WHERE li.path LIKE parent_li.path || '%' AND parent_li.id != li.id
    ) as category_path
FROM transaction_line_items tli
LEFT JOIN line_items li ON tli.line_item_id = li.id;
```

## Sample Data Population

### Construction Materials Hierarchy
```sql
-- Level 1: Root Categories
INSERT INTO line_items (code, name, name_ar, level, is_selectable, org_id) VALUES
('MAT', 'Construction Materials', 'مواد البناء', 1, FALSE, '[YOUR_ORG_ID]'),
('SRV', 'Services', 'خدمات', 1, FALSE, '[YOUR_ORG_ID]'),
('EQP', 'Equipment', 'معدات', 1, FALSE, '[YOUR_ORG_ID]');

-- Level 2: Material Categories
INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, org_id) 
SELECT 'CONC', 'Concrete & Masonry', 'خرسانة وبناء', id, 2, FALSE, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'MAT';

INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, org_id)
SELECT 'STEEL', 'Steel & Metal', 'حديد ومعادن', id, 2, FALSE, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'MAT';

-- Level 3: Subcategories
INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, org_id)
SELECT 'RM_CONC', 'Ready Mix Concrete', 'خرسانة جاهزة', id, 3, FALSE, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'CONC';

INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, org_id)
SELECT 'REBAR', 'Reinforcement Steel', 'حديد التسليح', id, 3, FALSE, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'STEEL';

-- Level 4: Actual Items (SELECTABLE)
INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, item_type, specifications, base_unit_of_measure, standard_cost, org_id)
SELECT 'CON-C25', 'Ready Mix Concrete C25', 'خرسانة جاهزة C25', id, 4, TRUE, 'material',
    '{"grade": "C25", "compressive_strength": "25_mpa", "slump": "100-150mm", "aggregate_size": "20mm", "cement_type": "OPC"}',
    'm3', 100.00, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'RM_CONC';

INSERT INTO line_items (code, name, name_ar, parent_id, level, is_selectable, item_type, specifications, base_unit_of_measure, standard_cost, org_id)
SELECT 'CON-C30', 'Ready Mix Concrete C30', 'خرسانة جاهزة C30', id, 4, TRUE, 'material',
    '{"grade": "C30", "compressive_strength": "30_mpa", "slump": "100-150mm", "aggregate_size": "20mm", "cement_type": "OPC"}',
    'm3', 110.00, '[YOUR_ORG_ID]'
FROM line_items WHERE code = 'RM_CONC';
```

## UI Implementation

### TypeScript Service
```typescript
export interface LineItem {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  path: string;
  specifications: Record<string, any>;
  baseUnitOfMeasure: string;
  standardCost?: number;
  categoryPath: string;
}

export class LineItemService {
  async getSelectableItems(orgId: string): Promise<LineItem[]> {
    const { data, error } = await supabase
      .from('line_items')
      .select(`
        id,
        code,
        name,
        name_ar,
        path,
        specifications,
        base_unit_of_measure,
        standard_cost
      `)
      .eq('is_selectable', true)
      .eq('is_active', true)
      .eq('org_id', orgId)
      .order('path');
    
    if (error) throw error;
    
    // Build category path for each item
    return data.map(item => ({
      ...item,
      categoryPath: this.buildCategoryPath(item.path)
    }));
  }

  private buildCategoryPath(path: string): string {
    // Convert path like "mat.conc.rm_conc" to "Construction Materials > Concrete & Masonry > Ready Mix Concrete"
    // This would need to be implemented based on your specific needs
    return path.split('.').join(' > ');
  }
}
```

### React Dropdown Component
```typescript
interface LineItemDropdownProps {
  value?: string;
  onChange: (lineItemId: string, item: LineItem) => void;
  orgId: string;
}

export const LineItemDropdown: React.FC<LineItemDropdownProps> = ({ 
  value, 
  onChange, 
  orgId 
}) => {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const lineItemService = new LineItemService();
        const selectableItems = await lineItemService.getSelectableItems(orgId);
        setItems(selectableItems);
      } catch (error) {
        console.error('Failed to load line items:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadItems();
  }, [orgId]);

  const handleChange = (lineItemId: string) => {
    const selectedItem = items.find(item => item.id === lineItemId);
    if (selectedItem) {
      onChange(lineItemId, selectedItem);
    }
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      loading={loading}
      placeholder="Select line item..."
      showSearch
      filterOption={(input, option) =>
        option?.children?.toString().toLowerCase().includes(input.toLowerCase())
      }
    >
      {items.map(item => (
        <Select.Option key={item.id} value={item.id}>
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-500">
              {item.categoryPath} • {item.baseUnitOfMeasure}
              {item.standardCost && ` • ${item.standardCost} EGP`}
            </div>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};
```

## Quantity Tracking Queries

### Total Material Usage
```sql
-- Get total concrete usage across all projects
SELECT 
    li.name,
    li.base_unit_of_measure,
    SUM(tli.quantity) as total_quantity,
    AVG(tli.unit_price) as avg_price,
    SUM(tli.total_amount) as total_cost,
    COUNT(DISTINCT t.project_id) as projects_used
FROM transaction_line_items tli
JOIN transactions t ON tli.transaction_id = t.id
JOIN line_items li ON tli.line_item_id = li.id
WHERE li.path LIKE 'mat.conc.rm_conc%'  -- All ready mix concrete
  AND t.is_posted = TRUE
GROUP BY li.id, li.name, li.base_unit_of_measure
ORDER BY total_quantity DESC;
```

### Material Usage by Project
```sql
SELECT 
    p.name as project_name,
    li.name as material_name,
    SUM(tli.quantity) as quantity_used,
    li.base_unit_of_measure,
    SUM(tli.total_amount) as total_cost
FROM transaction_line_items tli
JOIN transactions t ON tli.transaction_id = t.id
JOIN projects p ON t.project_id = p.id
JOIN line_items li ON tli.line_item_id = li.id
WHERE li.is_selectable = TRUE
  AND t.is_posted = TRUE
GROUP BY p.id, p.name, li.id, li.name, li.base_unit_of_measure
ORDER BY p.name, total_cost DESC;
```

### Category-wise Consumption Report
```sql
SELECT 
    cat.name as category_name,
    COUNT(DISTINCT li.id) as items_count,
    SUM(tli.quantity) as total_quantity,
    SUM(tli.total_amount) as total_cost
FROM transaction_line_items tli
JOIN transactions t ON tli.transaction_id = t.id
JOIN line_items li ON tli.line_item_id = li.id
JOIN line_items cat ON cat.id = li.parent_id AND cat.level = 3
WHERE li.is_selectable = TRUE
  AND t.is_posted = TRUE
GROUP BY cat.id, cat.name
ORDER BY total_cost DESC;
```

## Benefits of This Approach

### Immediate Benefits
1. **Simplicity**: Single table, easier to understand and maintain
2. **Fast Implementation**: No complex JOINs for basic operations
3. **Consistent Data**: Standardized item names and specifications
4. **Easy Dropdown**: Simple query to get selectable items
5. **Quantity Tracking**: Reliable aggregation across projects

### Enterprise Features
1. **Hierarchical Organization**: Clear material categorization
2. **Multilingual Support**: Arabic and English names
3. **Technical Specifications**: Structured JSON data for materials
4. **Standard Costs**: Default pricing for budgeting
5. **Audit Trail**: Created by, timestamps for all changes

### Concrete Usage Example
With this implementation, you can easily answer:
**"How many m³ of concrete did we use across all projects this year?"**

```sql
-- Simple, reliable query
SELECT 
    li.name,
    SUM(tli.quantity) as total_m3
FROM transaction_line_items tli
JOIN transactions t ON tli.transaction_id = t.id
JOIN line_items li ON tli.line_item_id = li.id
WHERE li.path LIKE 'mat.conc.rm_conc%'
  AND EXTRACT(YEAR FROM t.transaction_date) = 2025
GROUP BY li.name
ORDER BY total_m3 DESC;
```

**Results:**
- Ready Mix Concrete C25: 450 m³
- Ready Mix Concrete C30: 280 m³
- Ready Mix Concrete C35: 120 m³
- **Total**: 850 m³

## Implementation Roadmap

### Phase 1: Database Setup (Week 1)
1. Create `line_items` table with all indexes and triggers
2. Populate with initial construction materials hierarchy
3. Add `line_item_id` column to `transaction_line_items`
4. Create enhanced view for reporting

### Phase 2: UI Integration (Week 2)  
1. Implement TypeScript service for line items
2. Create dropdown component for transaction forms
3. Update transaction entry forms to use line item selection
4. Test with sample transactions

### Phase 3: Reporting Enhancement (Week 3)
1. Update existing reports to use new line item data
2. Create material consumption reports
3. Add quantity tracking dashboards
4. Test cross-project aggregation

### Phase 4: Data Migration (Week 4)
1. Map existing transaction line items to new catalog
2. Clean up duplicate entries
3. Train users on new interface
4. Full system testing

This simplified approach gives you enterprise-level line item management with minimal complexity, allowing you to track concrete usage (and all materials) effectively across projects while maintaining the simplicity you requested for this implementation phase.