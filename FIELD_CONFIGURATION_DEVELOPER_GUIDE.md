# Field Configuration System - Developer Quick Reference

## Overview

The Transaction Details Panel now has a complete field configuration system allowing users to customize which fields they see, in what order, and how they're displayed.

## Architecture

### Files:
1. **`src/config/transactionFieldConfigs.ts`** - Field definitions and helpers
2. **`src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`** - Implementation

### Key Components:
- **ColumnConfiguration** - Modal for configuring fields
- **InfoGrid** - Grid layout for displaying fields
- **InfoField** - Individual field display component

## Adding a New Field

### Step 1: Add to Field Configuration
**File**: `src/config/transactionFieldConfigs.ts`

```typescript
export const DEFAULT_BASIC_INFO_FIELDS: ColumnConfig[] = [
  // ... existing fields
  { 
    key: 'new_field',           // Unique identifier
    label: 'New Field Label',   // Display label
    visible: true,              // Default visibility
    width: 150,                 // Default width
    minWidth: 100,              // Minimum width
    maxWidth: 250,              // Maximum width
    type: 'text',               // Field type
    resizable: true             // Can user resize?
  },
]
```

### Step 2: Add to Value Mapper
**File**: `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`

```typescript
const getFieldValue = (fieldKey: string): any => {
  const fieldMap: Record<string, any> = {
    // ... existing mappings
    new_field: transaction.new_field || '—',
  }
  return fieldMap[fieldKey] || '—'
}
```

### Step 3: Done!
The field will automatically appear in the configuration modal and can be shown/hidden by users.

## Adding a New Tab

### Step 1: Define Fields
**File**: `src/config/transactionFieldConfigs.ts`

```typescript
export const DEFAULT_NEW_TAB_FIELDS: ColumnConfig[] = [
  { key: 'field1', label: 'Field 1', visible: true, width: 150, type: 'text', resizable: true },
  { key: 'field2', label: 'Field 2', visible: true, width: 150, type: 'text', resizable: true },
]

// Add to getDefaultFieldConfig
export const getDefaultFieldConfig = (tabKey: string): ColumnConfig[] => {
  switch (tabKey) {
    // ... existing cases
    case 'newTab':
      return DEFAULT_NEW_TAB_FIELDS
    default:
      return []
  }
}
```

### Step 2: Add State
**File**: `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`

```typescript
// Add modal state
const [newTabConfigOpen, setNewTabConfigOpen] = useState(false)

// Add field configuration state
const [newTabFields, setNewTabFields] = useState<ColumnConfig[]>(() => 
  loadFieldConfig('newTab') || getDefaultFieldConfig('newTab')
)

// Add change handler
const handleNewTabFieldsChange = (newConfig: ColumnConfig[]) => {
  setNewTabFields(newConfig)
  saveFieldConfig('newTab', newConfig)
}
```

### Step 3: Add Value Mapper

```typescript
const getNewTabValue = (data: any, fieldKey: string): any => {
  const fieldMap: Record<string, any> = {
    field1: data.field1 || '—',
    field2: data.field2 || '—',
  }
  return fieldMap[fieldKey] || '—'
}
```

### Step 4: Add Tab UI

```typescript
{activeTab === 'newTab' && (
  <div className="tab-content">
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', padding: '0 16px' }}>
      <button 
        className="ultimate-btn ultimate-btn-edit" 
        onClick={() => setNewTabConfigOpen(true)}
        title="تخصيص الحقول"
        style={{ fontSize: '12px', padding: '6px 12px' }}
      >
        <div className="btn-content"><span className="btn-text">⚙️ تخصيص الحقول</span></div>
      </button>
    </div>
    <ExpandableSection title="New Tab" icon="📄" defaultExpanded={true} persistKey="tx-new-tab">
      <InfoGrid columns={layoutSettings.infoGridColumns || 2}>
        {getVisibleFields(newTabFields).map(field => (
          <InfoField 
            key={field.key}
            label={field.label} 
            value={getNewTabValue(data, field.key)}
          />
        ))}
      </InfoGrid>
    </ExpandableSection>
  </div>
)}
```

### Step 5: Add Configuration Modal

```typescript
<ColumnConfiguration
  columns={newTabFields}
  onConfigChange={handleNewTabFieldsChange}
  isOpen={newTabConfigOpen}
  onClose={() => setNewTabConfigOpen(false)}
  onReset={() => {
    const defaults = getDefaultFieldConfig('newTab')
    handleNewTabFieldsChange(defaults)
  }}
  sampleData={[]}
/>
```

## Field Types

### Supported Types:
- **text** - Plain text
- **number** - Numeric values
- **date** - Date/time values
- **currency** - Monetary values
- **boolean** - True/false values
- **badge** - Status badges
- **actions** - Action buttons

### Type-Specific Rendering:

```typescript
const getFieldValue = (fieldKey: string): any => {
  const fieldMap: Record<string, any> = {
    // Text
    description: transaction.description,
    
    // Number
    lines_count: txLines.length,
    
    // Date
    entry_date: formatDate(transaction.entry_date),
    created_at: formatDateTime(transaction.created_at),
    
    // Currency
    total_debits: <span className="amount">{formatCurrency(totalDebits)}</span>,
    
    // Badge
    status: <span className={`status-badge ${unifiedStatus.cls}`}>{unifiedStatus.label}</span>,
  }
  return fieldMap[fieldKey] || '—'
}
```

## Helper Functions

### getVisibleFields()
Filters configuration to return only visible fields:
```typescript
const getVisibleFields = (fields: ColumnConfig[]) => {
  return fields.filter(f => f.visible)
}
```

### loadFieldConfig()
Loads configuration from localStorage:
```typescript
const config = loadFieldConfig('basicInfo')
```

### saveFieldConfig()
Saves configuration to localStorage:
```typescript
saveFieldConfig('basicInfo', newConfig)
```

### getDefaultFieldConfig()
Gets default configuration for a tab:
```typescript
const defaults = getDefaultFieldConfig('basicInfo')
```

## Patterns

### InfoGrid Pattern (Recommended for most tabs)
```typescript
<InfoGrid columns={2}>
  {getVisibleFields(fields).map(field => (
    <InfoField 
      key={field.key}
      label={field.label} 
      value={getValueMapper(data, field.key)}
      fullWidth={field.key === 'description'} // Optional
    />
  ))}
</InfoGrid>
```

### Table Pattern (For tabular data)
```typescript
<table>
  <thead>
    <tr>
      {getVisibleFields(fields).map(field => (
        <th key={field.key} style={{ width: `${field.width}px` }}>
          {field.label}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {data.map((row, idx) => (
      <tr key={row.id}>
        {getVisibleFields(fields).map(field => (
          <td key={field.key}>
            {getValueMapper(row, field.key, idx)}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

### Card Pattern (For lists)
```typescript
{data.map((item, idx) => (
  <div key={item.id} className="card">
    <InfoGrid columns={2}>
      {getVisibleFields(fields).map(field => (
        <InfoField 
          key={field.key}
          label={field.label} 
          value={getValueMapper(item, field.key, idx)}
        />
      ))}
    </InfoGrid>
  </div>
))}
```

## Common Tasks

### Change Default Visibility
**File**: `src/config/transactionFieldConfigs.ts`
```typescript
{ key: 'cost_center', label: 'مركز التكلفة', visible: false, ... }
//                                                    ↑ Change this
```

### Change Default Width
```typescript
{ key: 'description', label: 'الوصف', width: 300, ... }
//                                          ↑ Change this
```

### Add Field Validation
```typescript
const getFieldValue = (fieldKey: string): any => {
  const fieldMap: Record<string, any> = {
    email: transaction.email && /\S+@\S+\.\S+/.test(transaction.email) 
      ? transaction.email 
      : '—',
  }
  return fieldMap[fieldKey] || '—'
}
```

### Add Conditional Rendering
```typescript
const getFieldValue = (fieldKey: string): any => {
  const fieldMap: Record<string, any> = {
    posted_by: transaction.is_posted 
      ? userNames[transaction.posted_by || ''] 
      : '—',
  }
  return fieldMap[fieldKey] || '—'
}
```

## Debugging

### Check Configuration
```typescript
console.log('Current config:', basicInfoFields)
console.log('Visible fields:', getVisibleFields(basicInfoFields))
```

### Check localStorage
```javascript
// In browser console
localStorage.getItem('transactionDetails:basicInfoFields')
```

### Reset Configuration
```javascript
// In browser console
localStorage.removeItem('transactionDetails:basicInfoFields')
// Then reload page
```

### Clear All Configurations
```javascript
// In browser console
Object.keys(localStorage)
  .filter(key => key.startsWith('transactionDetails:'))
  .forEach(key => localStorage.removeItem(key))
```

## Performance Tips

1. **Use useMemo for expensive calculations**:
```typescript
const visibleFields = useMemo(() => getVisibleFields(fields), [fields])
```

2. **Avoid inline functions in map()**:
```typescript
// Bad
{fields.map(field => getFieldValue(field.key))}

// Good
const renderField = (field: ColumnConfig) => getFieldValue(field.key)
{fields.map(renderField)}
```

3. **Batch localStorage updates**:
```typescript
// The saveFieldConfig already does this, but if you need custom logic:
const saveMultiple = (configs: Record<string, ColumnConfig[]>) => {
  Object.entries(configs).forEach(([key, config]) => {
    saveFieldConfig(key, config)
  })
}
```

## Testing

### Unit Test Example:
```typescript
describe('getVisibleFields', () => {
  it('should filter visible fields', () => {
    const fields = [
      { key: 'a', visible: true, ... },
      { key: 'b', visible: false, ... },
      { key: 'c', visible: true, ... },
    ]
    const result = getVisibleFields(fields)
    expect(result).toHaveLength(2)
    expect(result[0].key).toBe('a')
    expect(result[1].key).toBe('c')
  })
})
```

### Integration Test Example:
```typescript
describe('Field Configuration', () => {
  it('should save and load configuration', () => {
    const config = getDefaultFieldConfig('basicInfo')
    saveFieldConfig('test', config)
    const loaded = loadFieldConfig('test')
    expect(loaded).toEqual(config)
  })
})
```

## Troubleshooting

### Fields not appearing?
1. Check field is visible: `field.visible === true`
2. Check value mapper has the field key
3. Check no TypeScript errors

### Configuration not persisting?
1. Check localStorage is enabled
2. Check saveFieldConfig is called
3. Check browser console for errors

### Wrong field order?
1. Field order is determined by array order
2. Users can reorder via drag-and-drop
3. Check configuration array order

### Performance issues?
1. Check number of fields (< 50 recommended)
2. Use useMemo for expensive calculations
3. Avoid complex rendering in value mappers

## Best Practices

1. ✅ Always provide default values (`|| '—'`)
2. ✅ Use type-safe field keys
3. ✅ Keep value mappers simple
4. ✅ Document complex field logic
5. ✅ Test with real data
6. ✅ Consider mobile responsiveness
7. ✅ Provide meaningful field labels
8. ✅ Group related fields logically
9. ✅ Use appropriate field types
10. ✅ Handle null/undefined gracefully

## Resources

- **ColumnConfiguration Component**: `src/components/Common/ColumnConfiguration.tsx`
- **InfoGrid Component**: `src/components/Common/InfoGrid.tsx`
- **InfoField Component**: `src/components/Common/InfoField.tsx`
- **Field Configs**: `src/config/transactionFieldConfigs.ts`
- **Implementation**: `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`

## Support

For questions or issues:
1. Check this guide
2. Review existing implementations
3. Check TypeScript errors
4. Test in browser console
5. Ask team for help

---

**Last Updated**: Current Session
**Version**: 1.0.0
**Status**: Production Ready
