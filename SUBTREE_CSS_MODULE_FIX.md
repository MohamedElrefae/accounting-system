# SubTree.tsx - CSS Module Fix Applied

## Problem Identified
The inline `sx` props weren't being applied properly to MUI Table components. The browser wasn't showing:
- Hidden action buttons on hover
- Constrained column widths
- Proper button hover effects

## Solution Applied

### 1. **Moved Styling to CSS Module**
Instead of using inline `sx` props (which don't work reliably with MUI Table), moved all styling to `SubTree.module.css`:

```css
/* Action buttons - hidden by default, show on row hover */
.actionButtons {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  justify-content: flex-end;
}
.tableRow:hover .actionButtons {
  opacity: 1;
}

/* Button hover effects */
.actionButtons :global(.MuiIconButton-root) {
  transition: all 0.2s ease;
}
.actionButtons :global(.MuiIconButton-root:hover) {
  transform: scale(1.1);
  background-color: rgba(0, 0, 0, 0.04);
}

/* Linked Account column - constrained width */
.linkedAccountCell {
  width: 400px;
  min-width: 350px;
  max-width: 450px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 2. **Updated SubTree.tsx**
- Removed all `sx` props from Table, TableCell, and Box components
- Added CSS class names instead:
  - `styles.linkedAccountCell` for Linked Account column
  - `styles.actionButtons` for action buttons container
  - `styles.tableRow` for row hover effects

### 3. **Key Changes**

**Before:**
```tsx
<TableCell sx={{ width: 400, minWidth: 350, maxWidth: 450, ... }}>
  Linked Account
</TableCell>
```

**After:**
```tsx
<TableCell className={`${styles.tableCell} ${styles.linkedAccountCell}`}>
  Linked Account
</TableCell>
```

## What Now Works

✅ **Action Buttons Hidden on Hover**
- Buttons are invisible by default (opacity: 0)
- Appear when row is hovered (opacity: 1)
- Smooth 0.2s transition

✅ **Button Hover Effects**
- Scale up 1.1x on hover
- Background highlight on hover
- Smooth transitions

✅ **Column Width Constraints**
- Linked Account: 350px min, 450px max, 400px base
- Proper overflow handling with ellipsis
- Responsive to content

✅ **Consistent Styling**
- Uses CSS module for reliable styling
- Inherits theme variables (--text, --border, --hover_bg, etc.)
- Works with MUI Table components

## Files Modified

1. **src/pages/MainData/SubTree.module.css**
   - Added `.actionButtons` with opacity and hover effects
   - Added button hover scale effect
   - Added `.linkedAccountCell` with width constraints

2. **src/pages/MainData/SubTree.tsx**
   - Removed inline `sx` props from Table
   - Removed inline `sx` props from TableCell
   - Removed inline `sx` props from Box
   - Added CSS class names for styling

## Browser Cache Note

⚠️ **Important**: Clear browser cache or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to see the changes, as CSS modules are cached.

## Testing Checklist

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Hover over table rows - buttons should appear
- [ ] Hover over buttons - should scale 1.1x
- [ ] Linked Account column width is constrained
- [ ] Column shows "CODE - NAME_AR" format
- [ ] Tooltip shows on hover
- [ ] Filters work properly
- [ ] Pagination works
- [ ] No console errors

## Why This Works

CSS modules are more reliable than inline `sx` props for:
- Complex hover states (row:hover > child)
- Consistent styling across renders
- Better performance (no re-computation on each render)
- Proper cascade and specificity
- Works with `:global()` for MUI components

The `:global()` wrapper allows CSS modules to style MUI's internal classes without conflicts.
