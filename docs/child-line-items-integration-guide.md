# 🌳 Child Line Items Integration Guide

## 📋 Overview

This guide demonstrates how to integrate the new **Child Line Items** functionality into your transaction line items system. The feature replicates your successful accounts tree architecture with automatic code suggestions and hierarchical structure management.

---

## 🗃️ Database Setup

### 1. Execute Database Functions

```sql path=null start=null
-- Execute this SQL in your database editor
-- File: sql/child_line_items_functions.sql

-- Function to generate next child line item code
CREATE OR REPLACE FUNCTION fn_get_next_line_item_code(
    p_transaction_id UUID,
    p_parent_item_code VARCHAR DEFAULT NULL
) RETURNS JSON AS $$
-- [Full function definition from the file]
```

### 2. Apply Performance Optimizations

```sql path=null start=null
-- Execute this SQL for optimal performance
-- File: sql/line_items_cleanup_and_optimization.sql

-- Add indexes for tree queries
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_item_code_pattern 
ON transaction_line_items (transaction_id, item_code) 
WHERE item_code IS NOT NULL;

-- Add trigger for automatic total calculation
CREATE TRIGGER trigger_calculate_transaction_line_item_total
    BEFORE INSERT OR UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_transaction_line_item_total();
```

---

## 🎯 React Component Integration

### 1. Import the Tree Manager

```tsx path=null start=null
// In your transaction line items page/component
import React from 'react';
import LineItemsTreeManager from '../components/line-items/LineItemsTreeManager';
import './components/line-items/LineItemsTreeManager.css';

interface TransactionLineItemsPageProps {
  transactionId: string;
}

const TransactionLineItemsPage: React.FC<TransactionLineItemsPageProps> = ({ 
  transactionId 
}) => {
  const handleItemsChange = (items: EditableTxLineItem[]) => {
    console.log('Line items updated:', items);
    // Handle the updated items (refresh UI, update state, etc.)
  };

  return (
    <div className="transaction-page">
      <div className="page-header">
        <h1>إدارة بنود المعاملة</h1>
      </div>
      
      <div className="content-area">
        {/* Traditional table view */}
        <div className="table-section">
          {/* Your existing table component */}
        </div>
        
        {/* New tree view */}
        <div className="tree-section">
          <LineItemsTreeManager
            transactionId={transactionId}
            onItemsChange={handleItemsChange}
            readOnly={false}
            className="custom-tree-style"
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionLineItemsPage;
```

### 2. Enhanced Service Usage

```tsx path=null start=null
// Using the enhanced service for advanced operations
import { transactionLineItemsEnhancedService } from '../services/transaction-line-items-enhanced';
import type { ChildLineItemRequest, CodeSuggestionResult } from '../services/transaction-line-items-enhanced';

const MyComponent: React.FC = () => {
  // Get code suggestion
  const getCodeSuggestion = async (parentCode?: string) => {
    try {
      const suggestion: CodeSuggestionResult = await transactionLineItemsEnhancedService
        .getCodeSuggestion(transactionId, parentCode);
      
      console.log('Suggested code:', suggestion.suggested_code);
      console.log('Pattern used:', suggestion.pattern_used); // 'dash' | 'numeric' | 'root_numeric'
      
      return suggestion;
    } catch (error) {
      console.error('Failed to get code suggestion:', error);
    }
  };

  // Create child item programmatically
  const createChildItem = async () => {
    const childData: ChildLineItemRequest = {
      parent_item_code: '1', // Parent item code
      item_name: 'Child Item Name',
      item_name_ar: 'اسم البند الفرعي',
      quantity: 2,
      percentage: 100,
      unit_price: 150.00,
      discount_amount: 10.00,
      tax_amount: 20.00,
      unit_of_measure: 'piece'
    };

    try {
      const newItem = await transactionLineItemsEnhancedService
        .createChildLineItem(transactionId, childData);
      
      console.log('Child item created:', newItem);
    } catch (error) {
      console.error('Failed to create child item:', error);
    }
  };

  // Get tree structure
  const loadTreeStructure = async () => {
    try {
      const treeNodes = await transactionLineItemsEnhancedService
        .getTreeStructure(transactionId);
      
      console.log('Tree structure:', treeNodes);
      // Each node has children array and depth information
    } catch (error) {
      console.error('Failed to load tree structure:', error);
    }
  };

  return (
    <div>
      <button onClick={() => getCodeSuggestion()}>Get Root Code Suggestion</button>
      <button onClick={() => getCodeSuggestion('1')}>Get Child Code for "1"</button>
      <button onClick={createChildItem}>Create Child Item</button>
      <button onClick={loadTreeStructure}>Load Tree Structure</button>
    </div>
  );
};
```

---

## 🔧 API Integration Examples

### 1. Next.js API Route

```tsx path=null start=null
// pages/api/transactions/[transactionId]/line-items/tree.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { transactionLineItemsEnhancedService } from '../../../../src/services/transaction-line-items-enhanced';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { transactionId } = req.query;

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  switch (req.method) {
    case 'GET':
      return getTreeStructure(req, res, transactionId);
    
    case 'POST':
      return createChildItem(req, res, transactionId);
    
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getTreeStructure(req: NextApiRequest, res: NextApiResponse, transactionId: string) {
  try {
    const treeNodes = await transactionLineItemsEnhancedService.getTreeStructure(transactionId);
    res.status(200).json({ success: true, data: treeNodes });
  } catch (error) {
    console.error('Error getting tree structure:', error);
    res.status(500).json({ error: 'Failed to get tree structure' });
  }
}

async function createChildItem(req: NextApiRequest, res: NextApiResponse, transactionId: string) {
  try {
    const childData = req.body;
    const newItem = await transactionLineItemsEnhancedService.createChildLineItem(transactionId, childData);
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error creating child item:', error);
    res.status(500).json({ error: 'Failed to create child item' });
  }
}
```

### 2. Code Suggestion API Route

```tsx path=null start=null
// pages/api/transactions/[transactionId]/line-items/suggest-code.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { transactionLineItemsEnhancedService } from '../../../../src/services/transaction-line-items-enhanced';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { transactionId, parentCode } = req.query;

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const suggestion = await transactionLineItemsEnhancedService.getCodeSuggestion(
      transactionId,
      typeof parentCode === 'string' ? parentCode : undefined
    );
    
    res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    console.error('Error getting code suggestion:', error);
    res.status(500).json({ error: 'Failed to generate code suggestion' });
  }
}
```

---

## 🎨 CSS Customization

### 1. Custom Theme Integration

```css path=null start=null
/* Integrate with your existing theme */
.line-items-tree-manager {
  /* Override default colors to match your app theme */
  --primary-color: var(--app-primary, #3b82f6);
  --success-color: var(--app-success, #10b981);
  --warning-color: var(--app-warning, #f59e0b);
  --error-color: var(--app-error, #ef4444);
  
  /* Use your app's font stack */
  font-family: var(--app-font-family, 'Cairo', sans-serif);
  
  /* Match your app's border radius */
  border-radius: var(--app-border-radius, 0.75rem);
}

/* Custom node styling for your brand */
.line-items-tree-manager .node-content {
  background: var(--app-card-background, white);
  border-color: var(--app-border-color, #e5e7eb);
}

.line-items-tree-manager .node-content:hover {
  background: var(--app-hover-background, #f9fafb);
  box-shadow: var(--app-hover-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}
```

### 2. Compact View Mode

```css path=null start=null
/* Add a compact mode class */
.line-items-tree-manager.compact {
  font-size: 0.875rem;
}

.line-items-tree-manager.compact .node-content {
  padding: 0.5rem 1rem;
}

.line-items-tree-manager.compact .item-calculations {
  font-size: 0.75rem;
}

.line-items-tree-manager.compact .tree-header {
  padding: 1rem 1.5rem;
}
```

---

## 🔍 Advanced Usage Patterns

### 1. Tree Validation

```tsx path=null start=null
// Validate tree structure before saving
const validateAndSaveTree = async () => {
  try {
    const validation = await transactionLineItemsEnhancedService
      .validateTreeStructure(transactionId);
    
    if (!validation.valid) {
      // Show validation errors
      validation.errors.forEach(error => {
        console.error('Tree validation error:', error);
        showToast(error, { severity: 'error' });
      });
      return;
    }
    
    // Proceed with save
    await saveTransaction();
    showToast('Transaction saved successfully!', { severity: 'success' });
  } catch (error) {
    console.error('Validation failed:', error);
  }
};
```

### 2. Breadcrumb Navigation

```tsx path=null start=null
// Show hierarchy path for selected item
const [breadcrumbs, setBreadcrumbs] = useState<LineItemTreeNode[]>([]);

const handleItemSelect = async (itemCode: string) => {
  try {
    const path = await transactionLineItemsEnhancedService
      .getLineItemPath(transactionId, itemCode);
    
    setBreadcrumbs(path);
  } catch (error) {
    console.error('Failed to get item path:', error);
  }
};

// Render breadcrumbs
const BreadcrumbNav: React.FC = () => (
  <nav className="breadcrumb-nav">
    {breadcrumbs.map((item, index) => (
      <span key={item.id} className="breadcrumb-item">
        {item.item_code} - {item.item_name_ar}
        {index < breadcrumbs.length - 1 && <span className="separator"> › </span>}
      </span>
    ))}
  </nav>
);
```

### 3. Bulk Operations

```tsx path=null start=null
// Delete item with all children
const deleteItemWithChildren = async (itemCode: string) => {
  const confirmed = window.confirm(
    `هل تريد حذف البند "${itemCode}" وجميع البنود الفرعية التابعة له؟`
  );
  
  if (confirmed) {
    try {
      await transactionLineItemsEnhancedService
        .deleteLineItemWithChildren(transactionId, itemCode);
      
      showToast('تم حذف البند والبنود الفرعية', { severity: 'success' });
      // Refresh tree
      await loadTreeData();
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('فشل في حذف البند', { severity: 'error' });
    }
  }
};
```

---

## 🚀 Performance Optimization Tips

### 1. Lazy Loading

```tsx path=null start=null
// Load children only when expanded
const LazyTreeNode: React.FC<{ node: LineItemTreeNode }> = ({ node }) => {
  const [children, setChildren] = useState<LineItemTreeNode[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && children.length === 0) {
      setLoading(true);
      try {
        // Load children from server
        const childNodes = await loadChildrenForNode(node.id);
        setChildren(childNodes);
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="tree-node">
      <button onClick={handleExpand}>
        {loading ? <Spinner /> : expanded ? <ChevronDown /> : <ChevronRight />}
      </button>
      {/* Node content */}
      {expanded && children.map(child => (
        <LazyTreeNode key={child.id} node={child} />
      ))}
    </div>
  );
};
```

### 2. Virtualization for Large Trees

```tsx path=null start=null
// For transactions with many line items, use virtualization
import { FixedSizeList as List } from 'react-window';

const VirtualizedTreeManager: React.FC = ({ items }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TreeNode node={items[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={60}
      className="virtualized-tree"
    >
      {Row}
    </List>
  );
};
```

---

## ✅ Testing Examples

### 1. Unit Tests

```tsx path=null start=null
// __tests__/transaction-line-items-enhanced.test.ts
import { transactionLineItemsEnhancedService } from '../services/transaction-line-items-enhanced';

describe('TransactionLineItemsEnhancedService', () => {
  const mockTransactionId = 'test-transaction-id';

  test('should generate root code suggestion', async () => {
    const suggestion = await transactionLineItemsEnhancedService
      .getCodeSuggestion(mockTransactionId);
    
    expect(suggestion.pattern_used).toBe('root_numeric');
    expect(suggestion.suggested_code).toMatch(/^\d+$/);
  });

  test('should create child item with inherited properties', async () => {
    const childData = {
      parent_item_code: '1',
      item_name: 'Test Child Item',
      quantity: 1,
      unit_price: 100
    };

    const newItem = await transactionLineItemsEnhancedService
      .createChildLineItem(mockTransactionId, childData);
    
    expect(newItem.item_code).toMatch(/^1-\d+$|^1\d+$/);
    expect(newItem.item_name).toBe('Test Child Item');
  });
});
```

### 2. Integration Tests

```tsx path=null start=null
// __tests__/LineItemsTreeManager.test.tsx
import { render, fireEvent, screen } from '@testing-library/react';
import LineItemsTreeManager from '../components/line-items/LineItemsTreeManager';

describe('LineItemsTreeManager', () => {
  test('should display tree structure', () => {
    render(
      <LineItemsTreeManager
        transactionId="test-id"
        onItemsChange={jest.fn()}
      />
    );

    expect(screen.getByText('هيكل بنود التكلفة')).toBeInTheDocument();
    expect(screen.getByText('إضافة بند رئيسي')).toBeInTheDocument();
  });

  test('should show add form when clicking add child', async () => {
    render(<LineItemsTreeManager transactionId="test-id" />);
    
    // Simulate clicking add child button
    const addButton = screen.getByTitle('إضافة بند فرعي');
    fireEvent.click(addButton);
    
    // Check if form appears
    expect(screen.getByText('اقتراح الكود')).toBeInTheDocument();
  });
});
```

---

## 🎯 Summary

The Child Line Items functionality provides:

✅ **Hierarchical Structure** - Tree-like organization similar to your accounts system  
✅ **Automatic Code Suggestions** - Smart code generation based on existing patterns  
✅ **Smooth Animations** - Professional UI with CSS transitions and effects  
✅ **Service Integration** - Seamless integration with existing TransactionLineItemsService  
✅ **Database Functions** - Server-side functions for optimal performance  
✅ **Validation & Error Handling** - Comprehensive validation and user feedback  
✅ **RTL Support** - Full Arabic language and RTL layout support  
✅ **Responsive Design** - Works on desktop and mobile devices  

The system replicates your successful accounts tree pattern while maintaining full compatibility with your existing transaction line items workflow.


<citations>
<document>
<document_type>RULE</document_type>
<document_id>dd9Alq3S94UdGQcgfTaVjO</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>s1j20KWeFlAiY9MpWAHEfa</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>ssbbNbzu4CxvEu8NRBcuZ1</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>tSydsSYmxaa5bfIHY2Fn8c</document_id>
</document>
</citations>