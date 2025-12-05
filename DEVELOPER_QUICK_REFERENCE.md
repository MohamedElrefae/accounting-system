# 👨‍💻 Developer Quick Reference - Transaction Details Refactor

**Last Updated:** 30 نوفمبر 2025

---

## 🎯 What Changed

### Before
- Single long scrolling view
- Legacy single-row display
- Hard to find information
- No organization

### After
- 5 organized tabs
- Multi-line support
- Expandable sections
- Easy navigation
- Modern enterprise UI

---

## 📦 New Components

### 1. TabsContainer
**Location:** `src/components/Common/TabsContainer.tsx`

**Usage:**
```typescript
import { TabsContainer } from '../Common/TabsContainer'

const tabs = [
  { id: 'tab1', label: 'Tab 1', icon: '📄', badge: 5 },
  { id: 'tab2', label: 'Tab 2', icon: '📊' }
]

<TabsContainer
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  persistKey="myFeature" // Optional: for localStorage
>
  {activeTab === 'tab1' && <Tab1Content />}
  {activeTab === 'tab2' && <Tab2Content />}
</TabsContainer>
```

**Features:**
- Keyboard navigation (Arrow keys, Enter, Space)
- Badge support
- Disabled state
- LocalStorage persistence
- ARIA labels

---

### 2. ExpandableSection
**Location:** `src/components/Common/ExpandableSection.tsx`

**Usage:**
```typescript
import { ExpandableSection } from '../Common/ExpandableSection'

<ExpandableSection
  title="Section Title"
  icon="📄"
  badge={10}
  defaultExpanded={true}
  persistKey="mySection" // Optional: for localStorage
  onToggle={(expanded) => console.log(expanded)}
>
  <div>Section content here</div>
</ExpandableSection>
```

**Features:**
- Smooth animations
- State persistence
- Badge support
- Keyboard accessible
- Icon support

---

### 3. InfoField
**Location:** `src/components/Common/InfoField.tsx`

**Usage:**
```typescript
import { InfoField } from '../Common/InfoField'

<InfoField 
  label="Field Label" 
  value="Field Value"
  fullWidth={false}
/>
```

**Features:**
- Consistent styling
- Theme-aware
- Full-width option

---

### 4. InfoGrid
**Location:** `src/components/Common/InfoGrid.tsx`

**Usage:**
```typescript
import { InfoGrid } from '../Common/InfoGrid'
import { InfoField } from '../Common/InfoField'

<InfoGrid columns={2}>
  <InfoField label="Field 1" value="Value 1" />
  <InfoField label="Field 2" value="Value 2" />
  <InfoField label="Field 3" value="Value 3" fullWidth />
</InfoGrid>
```

**Features:**
- Responsive grid
- 1-4 columns support
- Auto-fit layout

---

## 🎨 Theme Tokens

All components use unified theme tokens from `src/index.css`:

### Colors
```css
--surface          /* Panel backgrounds */
--background       /* Header backgrounds */
--border           /* Border colors */
--accent           /* Primary accent */
--text             /* Primary text */
--muted_text       /* Secondary text */
--heading          /* Heading text */
--button_text      /* Button text */
--hover_bg         /* Hover states */
--selected_bg      /* Selected states */
--error            /* Error color */
--success          /* Success color */
--warning          /* Warning color */
```

### Spacing & Layout
```css
--radius-sm        /* 6px */
--radius-md        /* 8px */
--radius-lg        /* 12px */
--transition-fast  /* 0.2s ease */
--shadow-sm        /* Small shadow */
--shadow-md        /* Medium shadow */
```

### Usage Example
```css
.my-component {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.my-component:hover {
  background: var(--hover_bg);
}
```

---

## 🔧 Common Patterns

### Pattern 1: Adding a New Tab

```typescript
// 1. Add tab to tabs array
const tabs = useMemo(() => [
  // ... existing tabs
  { id: 'newtab', label: 'New Tab', icon: '🆕', badge: count }
], [count])

// 2. Add tab content
{activeTab === 'newtab' && (
  <div className="tab-content">
    <ExpandableSection title="Section 1">
      <InfoGrid columns={2}>
        <InfoField label="Field" value="Value" />
      </InfoGrid>
    </ExpandableSection>
  </div>
)}
```

---

### Pattern 2: Adding an Expandable Section

```typescript
<ExpandableSection 
  title="My Section"
  icon="📋"
  badge={items.length}
  defaultExpanded={true}
  persistKey="unique-key"
>
  {/* Your content here */}
</ExpandableSection>
```

---

### Pattern 3: Displaying Data in Grid

```typescript
<InfoGrid columns={2}>
  <InfoField label="Name" value={data.name} />
  <InfoField label="Date" value={formatDate(data.date)} />
  <InfoField label="Description" value={data.description} fullWidth />
</InfoGrid>
```

---

### Pattern 4: Formatting Currency

```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
```

---

### Pattern 5: Formatting Dates

```typescript
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ar-EG')
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('ar-EG')
}
```

---

## 🐛 Troubleshooting

### Issue: Tabs not switching
**Solution:** Check that `activeTab` state is updating and tab IDs match

### Issue: Sections not persisting
**Solution:** Ensure `persistKey` is unique and consistent

### Issue: Styling looks wrong
**Solution:** Verify CSS files are imported and theme tokens are defined

### Issue: TypeScript errors
**Solution:** Check that all props are correctly typed and imported

### Issue: Performance slow
**Solution:** Use `useMemo` for expensive calculations, lazy load tab content

---

## 📚 File Structure

```
src/components/
├── Common/
│   ├── TabsContainer.tsx          # Tab navigation
│   ├── TabsContainer.css          # Tab styles
│   ├── ExpandableSection.tsx      # Collapsible sections
│   ├── ExpandableSection.css      # Section styles
│   ├── InfoField.tsx              # Data display field
│   ├── InfoField.css              # Field styles
│   ├── InfoGrid.tsx               # Responsive grid
│   └── InfoGrid.css               # Grid styles
│
└── Transactions/
    ├── UnifiedTransactionDetailsPanel.tsx      # Main component (updated)
    ├── UnifiedTransactionDetailsPanel.backup.tsx  # Backup of old version
    └── UnifiedTransactionDetailsPanel.css      # Panel styles
```

---

## 🔄 Migration Guide

### If you need to update another component:

1. **Import new components:**
```typescript
import { TabsContainer } from '../Common/TabsContainer'
import { ExpandableSection } from '../Common/ExpandableSection'
import { InfoField } from '../Common/InfoField'
import { InfoGrid } from '../Common/InfoGrid'
```

2. **Add tab state:**
```typescript
const [activeTab, setActiveTab] = useState('tab1')
```

3. **Define tabs:**
```typescript
const tabs = [
  { id: 'tab1', label: 'Tab 1', icon: '📄' },
  { id: 'tab2', label: 'Tab 2', icon: '📊' }
]
```

4. **Wrap content in TabsContainer:**
```typescript
<TabsContainer tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
  {/* Tab content */}
</TabsContainer>
```

5. **Organize content with ExpandableSection:**
```typescript
<ExpandableSection title="Section">
  <InfoGrid columns={2}>
    <InfoField label="Label" value="Value" />
  </InfoGrid>
</ExpandableSection>
```

---

## ✅ Best Practices

### DO ✅
- Use theme tokens for all colors
- Use `persistKey` for user preferences
- Use `useMemo` for expensive calculations
- Use semantic HTML
- Add ARIA labels
- Test keyboard navigation
- Test on mobile devices
- Handle empty states
- Show loading states
- Provide user feedback

### DON'T ❌
- Hardcode colors
- Forget accessibility
- Ignore responsive design
- Skip error handling
- Forget to test
- Use inline styles excessively
- Ignore TypeScript errors
- Skip documentation

---

## 📞 Need Help?

- Check `TESTING_GUIDE.md` for testing procedures
- Check `ENTERPRISE_UI_ENHANCEMENT.md` for design details
- Check `IMPLEMENTATION_PROGRESS.md` for current status
- Check existing components for examples

---

**Happy Coding! 🚀**
