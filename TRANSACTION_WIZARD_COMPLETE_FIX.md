# Transaction Wizard Complete Fix - Step 1 + Step 2 Synchronization

## 🎯 **Final Problem Identified**
The user needed complete synchronization between Step 1 and Step 2 with proper organization/project validation:

1. **Step 1**: Should update when organization changes and validate project accessibility
2. **Step 2**: Should load Step 1 project as default but allow per-line flexibility
3. **Synchronization**: Both steps should respect current organization permissions

## 🔍 **Root Cause Analysis**

### **Step 1 Issues:**
- ❌ **No project validation**: When organization changed, Step 1 project wasn't validated for accessibility
- ❌ **Stale project selection**: Project from old org remained selected even if inaccessible in new org
- ❌ **No automatic cleanup**: Inaccessible projects weren't cleared from Step 1

### **Step 2 Issues (Previously Fixed):**
- ✅ **Default loading**: Fixed to load Step 1 project as default
- ✅ **Per-line flexibility**: Fixed to allow different projects per line
- ✅ **Secure filtering**: Fixed to use same approach as top bar

## 🛠️ **Complete Solution Applied**

### **1. Step 1 Project Validation**
```typescript
// Sync with scope context changes
useEffect(() => {
  if (open) {
    const currentScopeOrgId = getOrgId()
    const currentScopeProjectId = getProjectId()
    
    // Update header data if scope changes and wizard is on basic step
    if (currentStep === 'basic') {
      setHeaderData(prev => {
        // Update organization
        let newOrgId = currentScopeOrgId || prev.org_id
        let newProjectId = currentScopeProjectId || prev.project_id
        
        // ✅ NEW: If organization changed, validate project is still accessible
        if (newOrgId !== prev.org_id && newProjectId) {
          // Check if current project is accessible in new org
          const isProjectAccessible = secureProjects.some(p => p.id === newProjectId)
          if (!isProjectAccessible) {
            console.warn(`[TransactionWizard] Project ${newProjectId} is not accessible in org ${newOrgId}, clearing project selection`)
            newProjectId = undefined // Clear project if not accessible
          }
        }
        
        return {
          ...prev,
          org_id: newOrgId,
          project_id: newProjectId
        }
      })
    }
  }, [open, getOrgId, getProjectId, currentStep, secureProjects]) // ✅ Added secureProjects dependency
```

### **2. Step 2 Default Loading (Already Fixed)**
```typescript
const addLine = () => {
  const newLineNo = Math.max(...lines.map(l => l.line_no), 0) + 1
  
  // ✅ Load Step 1 project as default, but allow user to change to any accessible project
  // This follows same approach as top bar - show all accessible projects for org
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

### **3. Secure Project Loading (Already Fixed)**
```typescript
// ✅ Both steps use same secure approach
const projectOptions = useMemo(() => {
  if (loadingProjects) {
    return [{ value: '', label: 'Loading projects...' }]
  }
  return secureProjects.map(proj => ({ value: proj.id, label: `${proj.code} - ${proj.name}` }))
}, [secureProjects, loadingProjects])
```

## 🔄 **Complete Synchronization Flow**

### **When Organization Changes:**

#### **Step 1 (Header):**
1. **User changes organization** → `getOrgId()` returns new org
2. **Scope sync effect triggers** → Updates `headerData.org_id`
3. **Project validation runs** → Checks if current project is accessible in new org
4. **If inaccessible** → Project cleared with warning
5. **If accessible** → Project remains selected

#### **Step 2 (Lines):**
1. **Organization change triggers** → `loadSecureProjects()` called
2. **New projects loaded** → `secureProjects` updated with new org's accessible projects
3. **Existing lines validated** → Inaccessible projects cleared
4. **New lines created** → Default to Step 1 project (now validated)

### **Cross-Step Communication:**
```typescript
// Step 1 → Step 2 communication
project_id: headerData.project_id || undefined, // Step 2 reads Step 1 project

// Step 2 → Step 1 feedback (when user changes line project)
// Step 1 project remains unchanged unless explicitly modified
```

## 📊 **Expected Behavior Now**

### **Scenario 1: Organization Change with Valid Project**
1. **User has Org A + Project X** (accessible in both Org A and Org B)
2. **User changes to Org B** → Project X remains selected (accessible)
3. **Step 2 new lines** → Default to Project X (still accessible)
4. **Result**: Seamless transition, project preserved

### **Scenario 2: Organization Change with Invalid Project**
1. **User has Org A + Project X** (only accessible in Org A)
2. **User changes to Org B** → Project X validation fails
3. **Step 1 project cleared** → `project_id: undefined`
4. **Step 2 new lines** → No default project (user must select)
5. **Result**: Secure cleanup, prevents invalid project selection

### **Scenario 3: Step 2 Per-Line Flexibility**
1. **Step 1 project**: Project X selected
2. **Step 2 Line 1**: User changes to Project Y (different accessible project)
3. **Step 2 Line 2**: User changes to Project Z (another accessible project)
4. **Step 1 project**: Remains Project X (unchanged by Step 2)
5. **Result**: Flexible per-line project selection

## 🔒 **Security Model**

### **Complete Permission Enforcement:**
```typescript
// Step 1: Header validation
const isProjectAccessible = secureProjects.some(p => p.id === newProjectId)
if (!isProjectAccessible) {
  newProjectId = undefined // Clear inaccessible project
}

// Step 2: Line validation
if (updates.project_id && !secureProjects.some(p => p.id === updates.project_id)) {
  return // Block inaccessible project selection
}

// Both steps: Same secure project source
const projectOptions = secureProjects.map(proj => ({ 
  value: proj.id, 
  label: `${proj.code} - ${proj.name}` 
}))
```

### **Real-time Updates:**
- ✅ **Organization change** → Both steps update immediately
- ✅ **Project loading** → "Loading projects..." shown
- ✅ **Permission validation** → Inaccessible projects blocked/cleared
- ✅ **Cross-step sync** → Step 1 ↔ Step 2 communication

## ✅ **Final Verification**

- ✅ **Build passes** - Application compiles successfully
- ✅ **Step 1 validation** - Project accessibility checked on org change
- ✅ **Step 2 defaults** - New lines use Step 1 project as default
- ✅ **Per-line flexibility** - Different projects allowed per line
- ✅ **Secure filtering** - Both steps use same RPC-based approach
- ✅ **Real-time sync** - Organization changes affect both steps
- ✅ **Smart cleanup** - Only truly inaccessible projects cleared
- ✅ **User experience** - Loading states and error handling

## 🎯 **Complete Workflow**

### **User Experience:**
1. **Select org + project in top bar** → Step 1 loads these as defaults
2. **Open transaction wizard** → Step 1 shows selected org + project
3. **Go to Step 2** → New lines default to Step 1 project
4. **Change projects per line** → Flexible selection from accessible projects
5. **Change organization** → Both steps update with validation
6. **Permission changes** → Real-time updates across both steps

---

**Result**: Transaction Wizard now provides complete synchronization between Step 1 and Step 2 with proper organization/project validation, secure permission filtering, and flexible per-line project selection - exactly matching the top bar behavior!
