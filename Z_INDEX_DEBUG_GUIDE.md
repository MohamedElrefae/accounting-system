# Z-Index Issue - Debug Guide

## Current Z-Index Hierarchy (Updated)

```
10003 - Snackbars, Alerts
10002 - Material-UI Dialogs, Modals, Custom Modals
10001 - Material-UI Popups, Menus, Dropdowns, Tooltips, Popper elements
10000 - Draggable Panel, Material-UI Backdrops
9998  - Panel Backdrop
```

## Files Modified for Z-Index Fix

1. **src/styles/z-index-fixes.css** (Global)
   - All Material-UI components set to proper z-index
   - Catch-all rules for any popup/menu/dropdown
   - Popper elements targeted with `[data-popper-placement]`

2. **src/components/Transactions/UnifiedTransactionDetailsPanel.css**
   - Modal overlay z-index increased to 10002

3. **src/components/Common/DraggableResizablePanel.tsx**
   - Panel z-index: 10000 (inline style)

## How to Debug the Issue

### Step 1: Identify the Element
1. Open browser DevTools (F12)
2. Click the delete button to trigger the popup
3. Use the Element Inspector to select the popup/menu element
4. Check the computed z-index in the Styles panel

### Step 2: Check Current Z-Index
In DevTools Console, run:
```javascript
// Find the popup element
const popup = document.querySelector('[role="menu"]') || 
              document.querySelector('.MuiMenu-root') ||
              document.querySelector('.MuiPopover-root');

if (popup) {
  console.log('Popup z-index:', window.getComputedStyle(popup).zIndex);
  console.log('Popup element:', popup);
}

// Find the panel
const panel = document.querySelector('[class*="panel"]');
if (panel) {
  console.log('Panel z-index:', window.getComputedStyle(panel).zIndex);
}
```

### Step 3: Verify CSS is Loaded
```javascript
// Check if z-index-fixes.css is loaded
const sheets = document.styleSheets;
for (let sheet of sheets) {
  if (sheet.href && sheet.href.includes('z-index-fixes')) {
    console.log('✅ z-index-fixes.css is loaded');
    break;
  }
}
```

### Step 4: Check for Stacking Context Issues
```javascript
// Check if any parent has a stacking context
function checkStackingContext(el) {
  const style = window.getComputedStyle(el);
  const hasContext = 
    style.position !== 'static' ||
    style.zIndex !== 'auto' ||
    style.opacity !== '1' ||
    style.transform !== 'none' ||
    style.filter !== 'none';
  
  if (hasContext) {
    console.log('Stacking context found:', el, {
      position: style.position,
      zIndex: style.zIndex,
      opacity: style.opacity,
      transform: style.transform,
      filter: style.filter
    });
  }
  
  if (el.parentElement) {
    checkStackingContext(el.parentElement);
  }
}

const popup = document.querySelector('[role="menu"]');
if (popup) checkStackingContext(popup);
```

## Possible Issues & Solutions

### Issue 1: CSS Not Loading
**Symptom:** z-index-fixes.css not in DevTools Sources
**Solution:** 
- Verify import in src/App.tsx: `import './styles/z-index-fixes.css'`
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)

### Issue 2: Specificity Problem
**Symptom:** CSS rules not applying
**Solution:**
- Check if inline styles override CSS
- Use `!important` (already done in z-index-fixes.css)
- Check for conflicting CSS rules

### Issue 3: Stacking Context Issue
**Symptom:** z-index doesn't work even though it's higher
**Solution:**
- Parent element might have `position: relative` or `opacity < 1`
- Check parent elements for stacking context
- May need to adjust parent z-index instead

### Issue 4: Wrong Element Selected
**Symptom:** Fixing z-index doesn't help
**Solution:**
- The popup might be a different element than expected
- Use DevTools to find the actual element
- Check if it's a custom component, not Material-UI

## Testing the Fix

### Test 1: Delete Button Popup
1. Open transaction details panel
2. Click delete button
3. Verify popup appears above the panel
4. Check DevTools for z-index values

### Test 2: Other Popups
Test these to ensure they also appear above:
- Select dropdowns
- Autocomplete suggestions
- Tooltips
- Context menus

### Test 3: Modal Dialogs
1. Click delete button to open confirmation modal
2. Verify modal appears above panel
3. Check that modal backdrop is visible

## Advanced Debugging

### Check All Z-Index Values
```javascript
// Get all elements with z-index
const elements = document.querySelectorAll('[style*="z-index"], [class*="z-"]');
const zIndexMap = {};

elements.forEach(el => {
  const zIndex = window.getComputedStyle(el).zIndex;
  if (zIndex !== 'auto') {
    zIndexMap[el.className || el.tagName] = zIndex;
  }
});

console.table(zIndexMap);
```

### Monitor Z-Index Changes
```javascript
// Watch for z-index changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      const zIndex = mutation.target.style.zIndex;
      if (zIndex) {
        console.log('Z-index changed:', mutation.target, zIndex);
      }
    }
  });
});

observer.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ['style']
});
```

## Expected Behavior After Fix

1. ✅ Delete button popup appears above the panel
2. ✅ Modal dialogs appear above the panel
3. ✅ Select dropdowns appear above the panel
4. ✅ All popups are clickable and interactive
5. ✅ No elements are hidden behind the panel

## If Issue Persists

1. Check browser console for errors
2. Verify all CSS files are loaded
3. Check for conflicting CSS rules
4. Try in incognito mode (no extensions)
5. Test in different browser
6. Check if issue is specific to certain components

## Contact Information

If the issue persists after following this guide:
1. Provide DevTools screenshot showing z-index values
2. Specify which popup is affected
3. Include browser and version information
4. Describe exact steps to reproduce
