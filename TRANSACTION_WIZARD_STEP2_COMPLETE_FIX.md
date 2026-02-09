# Transaction Wizard Step 2 - Complete Fix with Default Loading & Per-Line Flexibility

## 🎯 **Problem Identified**
The user needed Step 2 to:
1. **Load Step 1 project as default** when entering Step 2
2. **Allow different projects per line** (not force all lines to use same project)
3. **Use same secure approach as top bar** - show all accessible projects for the selected org

## 🔍 **Root Cause Analysis**

### **Previous Issues:**
- ❌ **Too restrictive**: Only allowed header project if accessible, otherwise undefined
- ❌ **No default loading**: Didn't load Step 1 project as default for new lines
- ❌ **Limited flexibility**: Didn't allow different projects per line as requested

### **User Requirements:**
1. **Default behavior**: Load Step 1 project when creating new lines
2. **Flexible behavior**: Allow users to select different projects per line
3. **Secure behavior**: Use same permission filtering as top bar (all accessible projects for org)

## 🛠️ **Solution Implemented**

### **1. Default Loading from Step 1**
```typescript
const addLine = () => {
  const newLineNo = Math.max(...lines.map(l => l.line_no), 0) + 1
  
  // Load Step 1 project as default, but allow user to change to any accessible project
  // This follows same approach as top bar - show all accessible projects for the org
  setLines(prev => [...prev, {
    line_no: newLineNo,
    account_id: '',
    debit_amount: 0,
    credit_amount: 0,
    description: '',
    org_id: headerData.org_id,
    project_id: headerData.project_id || undefined, // ✅ Default to Step 1 project
    cost_center_id: headerData.default_cost_center_id || undefined,
    work_item_id: headerData.default_work_item_id || undefined,
    sub_tree_id: headerData.default_sub_tree_id || undefined,
    classification_id: headerData.classification_id || undefined
  }])
}
```

### **2. Per-Line Project Flexibility**
```typescript
const updateLine = (idx: number, updates: Partial<TxLine>) => {
  // Validate project selection against user permissions
  // Allow different projects per line, but block truly inaccessible ones
  if (updates.project_id && updates.project_id !== '') {
    const isAccessible = secureProjects.some(p => p.id === updates.project_id)
    if (!isAccessible) {
      console.warn(`[TransactionWizard] Line ${idx}: Cannot select inaccessible project: ${updates.project_id}`)
      // Don't allow selection of inaccessible projects
      return
    }
  }
  
  setLines(prev => prev.map((line, i) => i === idx ? { ...line, ...updates } : line))
}
```

### **3. Smart Cleanup Logic**
```typescript
// Validate existing lines - clear only truly inaccessible projects
// Allow different projects per line, just clear ones not accessible for current org
setLines(prev => prev.map(line => {
  if (line.project_id && !userProjects.some(p => p.id === line.project_id)) {
    console.warn(`[TransactionWizard] Clearing inaccessible project ${line.project_id} from line (not accessible in org ${headerData.org_id})`)
    return { ...line, project_id: undefined }
  }
  return line
}))
```

## 🔄 **Complete Behavior Now**

### **Step 1 (Header):**
- ✅ Shows all accessible projects for selected organization
- ✅ Uses secure RPC filtering (same as top bar)
- ✅ Updates when organization changes

### **Step 2 (Lines):**
- ✅ **Default loading**: New lines get Step 1 project as default
- ✅ **Per-line flexibility**: Users can select different projects per line
- ✅ **Secure filtering**: Shows all accessible projects for the organization
- ✅ **Permission validation**: Blocks truly inaccessible projects
- ✅ **Smart cleanup**: Only clears projects not accessible for current org

## 📊 **Expected User Experience**

### **Scenario 1: Normal Workflow**
1. **User selects Org A + Project X in Step 1**
2. **User goes to Step 2** → New lines default to Project X
3. **User can change Line 1 to Project Y** (different accessible project)
4. **User can change Line 2 to Project Z** (another accessible project)
5. **All projects shown**: X, Y, Z (all accessible for Org A)

### **Scenario 2: Organization Change**
1. **User changes to Org B** in Step 1
2. **Step 2 updates** → Shows only Org B accessible projects
3. **Existing lines** → Projects not accessible in Org B are cleared
4. **New lines** → Default to Step 1 project (from Org B)

### **Scenario 3: Permission Validation**
1. **User tries to select inaccessible project** → Blocked with warning
2. **User selects accessible project** → Allowed
3. **Admin removes project access** → Project cleared from existing lines

## 🔒 **Security Model**

### **Same as Top Bar:**
```typescript
// Both Step 1 and Step 2 use same approach
const projectOptions = useMemo(() => {
  if (loadingProjects) {
    return [{ value: '', label: 'Loading projects...' }]
  }
  return secureProjects.map(proj => ({ value: proj.id, label: `${proj.code} - ${proj.name}` }))
}, [secureProjects, loadingProjects])
```

### **Permission Enforcement:**
- ✅ **Database-level**: `get_user_accessible_projects` RPC enforces permissions
- ✅ **Frontend-level**: Validation blocks selection of inaccessible projects
- ✅ **Real-time**: Updates when organization or permissions change

### **Flexibility vs Security:**
- ✅ **Flexible**: Different projects per line allowed
- ✅ **Secure**: Only accessible projects shown and selectable
- ✅ **User-friendly**: Defaults to Step 1 project for convenience

## 🎯 **Key Improvements**

### **Before (Restrictive):**
```typescript
// ❌ Too restrictive - only header project if accessible
const safeProjectId = headerData.project_id && secureProjects.some(p => p.id === headerData.project_id) 
  ? headerData.project_id 
  : undefined
```

### **After (Flexible & Secure):**
```typescript
// ✅ Flexible - defaults to header project, allows changes
project_id: headerData.project_id || undefined, // Default to Step 1 project
// ✅ Secure - validates against accessible projects
if (updates.project_id && !secureProjects.some(p => p.id === updates.project_id)) {
  return // Block inaccessible projects
}
```

## ✅ **Verification Checklist**

- ✅ **Build passes** - Application compiles successfully
- ✅ **Default loading** - Step 1 project loaded as default for new lines
- ✅ **Per-line flexibility** - Users can select different projects per line
- ✅ **Secure filtering** - Same approach as top bar (RPC-based)
- ✅ **Real-time updates** - Projects update when organization changes
- ✅ **Smart validation** - Only blocks truly inaccessible projects
- ✅ **User experience** - Loading states and error handling

---

**Result**: Transaction Wizard Step 2 now works exactly like the top bar - loads Step 1 project as default but allows different projects per line, all with secure permission filtering that updates in real-time when organization changes.
