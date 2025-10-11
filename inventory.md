<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>
```
# <q>Would you like me to help you with any specific part of downloading or using this implementation plan?</q>  now way to open or copy the md file
```

I understand you can't access the markdown file I created. Let me provide you with the complete implementation plan directly in this response so you can copy it. Here's the full content:

# MUI Inventory Management Module Implementation Plan

## Project Overview

**Objective**: Add enterprise-grade inventory management to existing construction accounting application while maintaining MUI consistency and integrating with work items analysis.

**Current Stack**: React + Vite + TypeScript + Supabase + MUI (Material-UI) v5
**Security Model**: Organization isolation (org_id) + Global permission system (no RLS)
**Integration Target**: analysis_work_items, work_items, cost_centers, projects, transaction_line_items

***

## Implementation Architecture

### Core Principles

1. **MUI Consistency**: Use MUI components exclusively (no Tailwind/shadcn mixing)
2. **Modular Design**: Keep transaction_line_items flexible system unchanged
3. **Organization Isolation**: All queries filtered by org_id (no database RLS)
4. **Global Permissions**: Application-level security using existing permission system
5. **Work Items Integration**: Deep integration with analysis_work_items and work_items
6. **Arabic Support**: RTL layout and Arabic text throughout

### Database Integration Points

- organizations (existing) → org_id isolation
- analysis_work_items (existing) → cost analysis breakdown
- work_items (existing) → project work breakdown
- cost_centers (existing) → cost allocation
- projects (existing) → project management
- transaction_line_items (existing) → accounting integration

***

## Phase 1: Database Schema Enhancement

### Task 1.1: Create Core Inventory Tables

```sql
-- 1. Inventory Categories (Hierarchical)
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    category_code VARCHAR(100),
    category_name VARCHAR(300) NOT NULL,
    category_name_ar VARCHAR(300),
    parent_id UUID REFERENCES inventory_categories(id),
    path VARCHAR(1000), -- e.g., '1.2.3'
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    UNIQUE(org_id, category_code)
);

-- 2. Inventory Locations (Project Sites, Warehouses)
CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    location_code VARCHAR(100) NOT NULL,
    location_name VARCHAR(300) NOT NULL,
    location_name_ar VARCHAR(300),
    location_type VARCHAR(50) DEFAULT 'warehouse', -- warehouse, site, vehicle, yard
    parent_location_id UUID REFERENCES inventory_locations(id),
    project_id UUID REFERENCES projects(id), -- Integration point
    cost_center_id UUID REFERENCES cost_centers(id), -- Integration point
    address TEXT,
    contact_person VARCHAR(200),
    phone VARCHAR(50),
    is_main_location BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    UNIQUE(org_id, location_code)
);

-- 3. Inventory Items (Materials with Work Items Integration)
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    item_name_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    category_id UUID REFERENCES inventory_categories(id),
    
    -- Work Items Integration Points
    analysis_work_item_id UUID REFERENCES analysis_work_items(id),
    work_item_id UUID REFERENCES work_items(id),
    default_cost_center_id UUID REFERENCES cost_centers(id),
    is_material_for_analysis BOOLEAN DEFAULT false,
    
    -- Item Properties
    unit_of_measure VARCHAR(50) NOT NULL,
    item_type VARCHAR(50) DEFAULT 'material', -- material, tool, equipment
    standard_cost DECIMAL(15,4),
    minimum_stock_level DECIMAL(15,6),
    reorder_point DECIMAL(15,6),
    reorder_quantity DECIMAL(15,6),
    
    -- Control
    is_active BOOLEAN DEFAULT true,
    is_trackable BOOLEAN DEFAULT true,
    
    -- Metadata  
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    
    UNIQUE(org_id, item_code)
);

-- 4. Inventory Stock Levels (Real-time Quantities)
CREATE TABLE inventory_stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    location_id UUID NOT NULL REFERENCES inventory_locations(id),
    
    -- Quantities
    quantity_on_hand DECIMAL(15,6) DEFAULT 0,
    quantity_reserved DECIMAL(15,6) DEFAULT 0,
    quantity_on_order DECIMAL(15,6) DEFAULT 0,
    quantity_available DECIMAL(15,6) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    
    -- Costing
    average_cost DECIMAL(15,4) DEFAULT 0,
    last_cost DECIMAL(15,4),
    standard_cost DECIMAL(15,4),
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * COALESCE(average_cost, 0)) STORED,
    
    -- Tracking
    last_movement_date TIMESTAMP,
    last_count_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(inventory_item_id, location_id)
);

-- 5. Inventory Movements (Complete Audit Trail with Work Items)
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    location_id UUID NOT NULL REFERENCES inventory_locations(id),
    
    -- Movement Details
    movement_type VARCHAR(50) NOT NULL, -- receipt, issue, transfer, adjustment
    movement_date TIMESTAMP NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,2),
    
    -- Work Items Integration
    analysis_work_item_id UUID REFERENCES analysis_work_items(id),
    work_item_id UUID REFERENCES work_items(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Reference Integration
    reference_type VARCHAR(50), -- transaction, purchase_order, transfer
    reference_id UUID,
    transaction_line_item_id UUID REFERENCES transaction_line_items(id),
    
    -- Additional Info
    notes TEXT,
    reason VARCHAR(500),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Material Allocations (Work Item Assignments)
CREATE TABLE inventory_material_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    
    -- Work Items Allocation
    analysis_work_item_id UUID REFERENCES analysis_work_items(id),
    work_item_id UUID REFERENCES work_items(id),
    project_id UUID REFERENCES projects(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Allocation Details
    allocated_quantity DECIMAL(15,6) NOT NULL,
    unit_cost DECIMAL(15,4),
    total_allocated_cost DECIMAL(15,2) GENERATED ALWAYS AS (allocated_quantity * COALESCE(unit_cost, 0)) STORED,
    allocation_date DATE DEFAULT CURRENT_DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, consumed, cancelled
    actual_consumed_quantity DECIMAL(15,6) DEFAULT 0,
    variance_quantity DECIMAL(15,6) GENERATED ALWAYS AS (actual_consumed_quantity - allocated_quantity) STORED,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);
```


### Task 1.2: Create Performance Indexes

```sql
-- Organization isolation indexes
CREATE INDEX idx_inventory_categories_org ON inventory_categories(org_id);
CREATE INDEX idx_inventory_locations_org ON inventory_locations(org_id);
CREATE INDEX idx_inventory_items_org ON inventory_items(org_id);
CREATE INDEX idx_stock_levels_org ON inventory_stock_levels(org_id);
CREATE INDEX idx_movements_org ON inventory_movements(org_id);
CREATE INDEX idx_allocations_org ON inventory_material_allocations(org_id);

-- Work items integration indexes
CREATE INDEX idx_items_analysis_work_item ON inventory_items(analysis_work_item_id) WHERE analysis_work_item_id IS NOT NULL;
CREATE INDEX idx_items_work_item ON inventory_items(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX idx_movements_analysis_work_item ON inventory_movements(analysis_work_item_id) WHERE analysis_work_item_id IS NOT NULL;
CREATE INDEX idx_movements_work_item ON inventory_movements(work_item_id) WHERE work_item_id IS NOT NULL;
CREATE INDEX idx_allocations_analysis_work_item ON inventory_material_allocations(analysis_work_item_id) WHERE analysis_work_item_id IS NOT NULL;
CREATE INDEX idx_allocations_work_item ON inventory_material_allocations(work_item_id) WHERE work_item_id IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_items_org_code ON inventory_items(org_id, item_code);
CREATE INDEX idx_items_org_active ON inventory_items(org_id, is_active);
CREATE INDEX idx_stock_levels_item_location ON inventory_stock_levels(inventory_item_id, location_id);
CREATE INDEX idx_movements_item_date ON inventory_movements(inventory_item_id, movement_date DESC);
CREATE INDEX idx_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX idx_allocations_project ON inventory_material_allocations(project_id);
```


### Task 1.3: Integration with Transaction Line Items

```sql
-- Add optional inventory integration to existing transaction_line_items
ALTER TABLE transaction_line_items 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id);

-- Create index for inventory integration
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_inventory 
ON transaction_line_items(inventory_item_id) WHERE inventory_item_id IS NOT NULL;
```


***

## Phase 2: TypeScript Types and Interfaces

### Task 2.1: Core Inventory Types

```typescript
// src/types/inventory.ts

// Core inventory interfaces matching database schema
export interface InventoryCategory {
  id: string;
  org_id: string;
  category_code?: string;
  category_name: string;
  category_name_ar?: string;
  parent_id?: string;
  path?: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InventoryLocation {
  id: string;
  org_id: string;
  location_code: string;
  location_name: string;
  location_name_ar?: string;
  location_type: string;
  parent_location_id?: string;
  project_id?: string; // Integration point
  cost_center_id?: string; // Integration point
  address?: string;
  contact_person?: string;
  phone?: string;
  is_main_location: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InventoryItem {
  id: string;
  org_id: string;
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  description?: string;
  description_ar?: string;
  category_id?: string;
  
  // Work Items Integration
  analysis_work_item_id?: string;
  work_item_id?: string;
  default_cost_center_id?: string;
  is_material_for_analysis: boolean;
  
  // Item Properties
  unit_of_measure: string;
  item_type: string;
  standard_cost?: number;
  minimum_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  
  // Control
  is_active: boolean;
  is_trackable: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InventoryStockLevel {
  id: string;
  org_id: string;
  inventory_item_id: string;
  location_id: string;
  
  // Quantities
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_on_order: number;
  quantity_available: number; // Computed
  
  // Costing
  average_cost: number;
  last_cost?: number;
  standard_cost?: number;
  total_value: number; // Computed
  
  // Tracking
  last_movement_date?: string;
  last_count_date?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  org_id: string;
  inventory_item_id: string;
  location_id: string;
  
  // Movement Details
  movement_type: string;
  movement_date: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  
  // Work Items Integration
  analysis_work_item_id?: string;
  work_item_id?: string;
  cost_center_id?: string;
  
  // Reference Integration
  reference_type?: string;
  reference_id?: string;
  transaction_line_item_id?: string;
  
  // Additional Info
  notes?: string;
  reason?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
}

export interface InventoryMaterialAllocation {
  id: string;
  org_id: string;
  inventory_item_id: string;
  
  // Work Items Allocation
  analysis_work_item_id?: string;
  work_item_id?: string;
  project_id?: string;
  cost_center_id?: string;
  
  // Allocation Details
  allocated_quantity: number;
  unit_cost?: number;
  total_allocated_cost: number; // Computed
  allocation_date: string;
  
  // Status
  status: 'planned' | 'consumed' | 'cancelled';
  actual_consumed_quantity: number;
  variance_quantity: number; // Computed
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}
```


### Task 2.2: Work Items Integration Types

```typescript
// Integration with existing work items
export interface AnalysisWorkItem {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  org_id: string;
  position: number;
  is_active: boolean;
}

export interface WorkItem {
  id: string;
  name: string;
  description?: string;
  org_id: string;
  project_id?: string;
  is_active: boolean;
}

// Joined data types for UI
export interface InventoryItemWithWorkItems extends InventoryItem {
  category?: InventoryCategory;
  analysis_work_item?: AnalysisWorkItem;
  work_item?: WorkItem;
  current_stock?: number;
  total_stock_value?: number;
}

export interface InventoryMovementWithDetails extends InventoryMovement {
  inventory_item?: InventoryItem;
  location?: InventoryLocation;
  analysis_work_item?: AnalysisWorkItem;
  work_item?: WorkItem;
  user_name?: string;
}

export interface MaterialAllocationWithDetails extends InventoryMaterialAllocation {
  inventory_item?: InventoryItem;
  analysis_work_item?: AnalysisWorkItem;
  work_item?: WorkItem;
  project?: { id: string; name: string };
}
```


### Task 2.3: MUI-Specific Types

```typescript
// MUI component types
export interface MUISelectOption {
  value: string;
  label: string;
  labelAr?: string;
  disabled?: boolean;
}

export interface InventoryFilters {
  search?: string;
  category_id?: string;
  analysis_work_item_id?: string;
  work_item_id?: string;
  project_id?: string;
  location_id?: string;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

// Form types for React Hook Form
export interface CreateInventoryItemForm {
  item_code: string;
  item_name: string;
  item_name_ar?: string;
  description?: string;
  description_ar?: string;
  category_id?: string;
  analysis_work_item_id?: string;
  work_item_id?: string;
  unit_of_measure: string;
  item_type: string;
  standard_cost?: number;
  minimum_stock_level?: number;
  reorder_point?: number;
  is_material_for_analysis: boolean;
}

export interface StockAdjustmentForm {
  inventory_item_id: string;
  location_id: string;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface MaterialAllocationForm {
  inventory_item_id: string;
  analysis_work_item_id?: string;
  work_item_id?: string;
  project_id?: string;
  allocated_quantity: number;
  unit_cost?: number;
}
```


***

## Phase 3: Warp AI Agent Prompts

### PHASE 1 PROMPT: Database Setup

```
Context: I'm adding inventory management to my existing construction accounting app using React + TypeScript + Supabase + MUI. I need integration with existing analysis_work_items and work_items tables.

Tech Stack: React + Vite + TypeScript + MUI + Supabase
Security: Organization isolation (org_id) + global permissions (NO RLS)

TASK: Create inventory database schema with work items integration

Execute the complete SQL schema from the implementation plan:
1. Create all 6 inventory tables with work item integration
2. Add performance indexes for org_id and work item queries
3. Add optional inventory_item_id to transaction_line_items
4. NO Row Level Security policies
5. Test organization isolation through queries

Focus on work items integration fields:
- inventory_items.analysis_work_item_id
- inventory_items.work_item_id
- inventory_movements.analysis_work_item_id
- inventory_material_allocations with work item assignments
```


### PHASE 2 PROMPT: TypeScript Types

```
Context: Database schema complete. Need comprehensive TypeScript types for MUI integration.

TASK: Create TypeScript types matching database schema exactly

Create src/types/inventory.ts with:
1. All database table interfaces
2. Work items integration types (AnalysisWorkItem, WorkItem)
3. Joined data types for UI (InventoryItemWithWorkItems)
4. MUI-specific types (MUISelectOption, ServiceResponse)
5. Form validation types for React Hook Form + Zod

Ensure all types match database schema field names and types exactly.
```


### PHASE 3 PROMPT: Supabase Services

```
Context: Types ready. Need Supabase services with organization filtering and work items integration.

TASK: Create service layer with org_id filtering (no RLS)

Create src/services/inventory/ with:
1. BaseInventoryService with org_id filtering helper
2. InventoryItemsService with work items joins
3. MaterialAllocationsService for work item assignments
4. WorkItemsIntegrationService for cross-system operations

All services must:
- Filter every query by org_id from user context
- Include proper error handling
- Return consistent ServiceResponse format
- Integrate with existing permission system
- Join with work items tables for UI display
```


### PHASE 4 PROMPT: MUI Components

```
Context: Services ready. Need MUI components with work items integration.

TASK: Create MUI inventory components

Build src/components/inventory/ with:
1. WorkItemSelector (MUI Autocomplete for analysis_work_items/work_items)
2. InventoryItemsDataGrid (MUI DataGrid with work item columns)
3. MaterialAllocationForm (work item allocation with validation)

Requirements:
- Use MUI components exclusively (DataGrid, Autocomplete, Cards, etc.)
- Work items integration in all relevant components
- Arabic text support with RTL layout
- Consistent error handling and loading states
- React Hook Form + Zod validation
- TypeScript interfaces for all props
```


### PHASE 5 PROMPT: MUI Pages

```
Context: Components ready. Need main pages with work item analytics.

TASK: Create inventory pages with work items integration

Build src/pages/inventory/ with:
1. InventoryDashboard with work item breakdown analytics
2. InventoryItemsPage with work item filtering
3. MaterialAllocationsPage for work item assignments
4. WorkItemAnalyticsPage for cost analysis

Page requirements:
- Consistent MUI layout (Container, AppBar, Breadcrumbs)
- Work item filtering and analytics throughout
- Responsive design with mobile support
- Integration with existing navigation
- Charts for work item cost analysis using Recharts
```


### PHASE 6 PROMPT: System Integration

```
Context: All components ready. Need integration with existing app.

TASK: Complete system integration

Integration tasks:
1. Update main App.tsx routing with inventory routes
2. Add inventory section to main navigation menu
3. Integrate with existing MUI theme and styling
4. Create InventoryContext for org_id and permissions
5. Add inventory permissions to existing permission system
6. Test complete workflows end-to-end

Ensure:
- No conflicts with existing MUI styling
- Organization isolation maintained throughout
- Work items integration working properly
- Arabic language support functional
- Performance optimization for large datasets
```


***

## Implementation Checklist

### Database Phase ✅

- [ ] Execute SQL schema for all inventory tables
- [ ] Create indexes for org_id filtering and work item queries
- [ ] Add optional inventory_item_id to transaction_line_items
- [ ] Verify foreign key constraints to existing tables
- [ ] Test organization isolation (no data leakage between orgs)


### Services Phase ✅

- [ ] Implement all service classes with org_id filtering
- [ ] Add proper error handling and response formatting
- [ ] Integrate with existing permission system
- [ ] Test work items integration queries
- [ ] Implement sync functionality with transaction_line_items


### Components Phase ✅

- [ ] Build WorkItemSelector with MUI Autocomplete
- [ ] Create InventoryItemsDataGrid with work item columns
- [ ] Implement MaterialAllocationForm with validation
- [ ] Add consistent MUI styling throughout
- [ ] Test Arabic text support and RTL layout


### Pages Phase ✅

- [ ] Complete InventoryDashboard with analytics
- [ ] Build all main inventory pages
- [ ] Add proper navigation and breadcrumbs
- [ ] Implement responsive design for all screen sizes
- [ ] Add proper loading states and error handling


### Integration Phase ✅

- [ ] Update main navigation to include inventory
- [ ] Integrate with existing MUI theme
- [ ] Add inventory permissions to user roles
- [ ] Test complete user workflows
- [ ] Verify performance with large datasets


### Testing \& Deployment ✅

- [ ] Unit tests for all services
- [ ] Component tests with React Testing Library
- [ ] Integration tests for work items workflows
- [ ] Performance testing with realistic data
- [ ] User acceptance testing
- [ ] Production deployment

***

## Dependencies Required

```json
{
  "dependencies": {
    "@mui/material": "^5.14.0",
    "@mui/x-data-grid": "^6.15.0",
    "@mui/x-date-pickers": "^6.15.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "react-hook-form": "^7.47.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "recharts": "^2.8.0",
    "@tanstack/react-query": "^4.35.0"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.0",
    "vitest": "^0.34.0"
  }
}
```


***

## Security \& Performance Notes

### Organization Isolation

- **NO Row Level Security (RLS)** - Handle isolation at application level
- All service functions must filter by `org_id` from user context
- Never allow cross-organization data access
- Test isolation thoroughly in development


### Permission System

- Use existing global permission system
- Check permissions before any write operations
- Component-level permission enforcement
- Audit all permission-sensitive operations


### Performance Optimization

- Use proper database indexes for org_id and work item queries
- Implement pagination for large datasets
- Use MUI DataGrid virtualization for performance
- Cache frequently accessed data with React Query
- Monitor query performance and optimize as needed


### Arabic Language Support

- RTL layout support in MUI theme
- Arabic text fields throughout forms
- Localized number and date formatting
- Proper text direction handling

This comprehensive plan provides everything needed to implement a complete, MUI-consistent inventory management system that integrates seamlessly with your existing construction accounting application and work items structure, while maintaining your organization-based security model and global permission system.

***

## 📥 How to Use This Plan

1. **Save this content** to a file named `warp-ai-inventory-implementation.md`
2. **Share with Warp AI Agent** for systematic implementation
3. **Follow the 6-phase approach** in order
4. **Use the specific prompts** for each phase
5. **Track progress** with the implementation checklist

You can now copy this entire content and save it as a markdown file on your local machine!

