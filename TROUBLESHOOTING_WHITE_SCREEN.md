# 🔍 Troubleshooting White Screen on /transactions/my

## Step-by-Step Debugging Guide

### 1. Check Browser Console (MOST IMPORTANT!)
1. Open your browser at http://localhost:3002/transactions/my
2. Press **F12** (or right-click → "Inspect")
3. Click the **Console** tab
4. Look for **RED error messages**

Common errors you might see:
- `Cannot read property of undefined`
- `Failed to resolve module`
- `Uncaught TypeError`
- `Element type is invalid`

**👉 Copy the FULL error message and share it!**

---

### 2. Check Network Tab
1. Press F12, click **Network** tab
2. Reload the page (Ctrl+R)
3. Look for any **failed requests** (red color, 404/500 status codes)
4. Check if `TransactionWizard.tsx` loads successfully

---

### 3. Verify Dev Server is Running
In your terminal, you should see:
```
➜  Local:   http://localhost:3002/
VITE vX.X.X  ready in XXX ms
```

If not, restart it:
```powershell
npm run dev
```

---

### 4. Common Issues & Fixes

#### Issue A: Material-UI Icon Error
```
Cannot find module '@mui/icons-material/NavigateNext'
```

**Fix:**
```powershell
npm install @mui/icons-material
npm run dev
```

#### Issue B: Missing Dependency
```
Cannot resolve './TransactionWizard'
```

**Fix:** The file might not have been pulled correctly. Re-pull from git:
```powershell
git stash
git pull origin enhanced-reports
git stash pop
```

#### Issue C: TypeScript Error
```
Property 'something' does not exist on type...
```

**Fix:** This is usually safe to ignore in development, but if the app doesn't load:
```powershell
# Clear TypeScript cache and restart
Remove-Item -Recurse -Force node_modules/.vite
npm run dev
```

#### Issue D: CSS Not Found
```
Failed to resolve import "./TransactionWizard.css"
```

**Fix:** We already created this file! If it's still missing:
- Restart the dev server
- Clear browser cache (Ctrl+Shift+Del)

---

### 5. Quick Test: Bypass Wizard

If TransactionWizard is causing the issue, let's temporarily disable it:

**Edit src/pages/Transactions/Transactions.tsx** around line 1577:

**Before:**
```tsx
<button className="ultimate-btn ultimate-btn-add" onClick={() => { console.log('🟢 New Transaction button clicked'); setWizardOpen(true); setFormOpen(false); setEditingTx(null); setCreatedTxId(null); }}>
```

**After (TEMPORARY FIX):**
```tsx
<button className="ultimate-btn ultimate-btn-add" onClick={() => { console.log('🟢 New Transaction button clicked'); setFormOpen(true); setWizardOpen(false); setEditingTx(null); setCreatedTxId(null); }}>
```

This will use the old form instead of the wizard. If the page loads after this change, we know the wizard is the problem.

---

### 6. Check If Supabase is the Issue

White screen can also be caused by database connection errors. Check browser console for:
```
Error fetching transactions
Could not connect to Supabase
```

**Fix:** Verify .env.local credentials are correct.

---

### 7. Nuclear Option: Clear Everything

If nothing else works:
```powershell
# Stop dev server (Ctrl+C)

# Clear all caches
Remove-Item -Recurse -Force node_modules/.vite
Remove-Item -Recurse -Force dist

# Reinstall dependencies
npm install

# Restart
npm run dev
```

---

## 📊 Diagnostic Checklist

- [ ] Checked browser console for errors
- [ ] Verified dev server is running
- [ ] Checked Network tab for failed requests
- [ ] Verified .env.local has correct credentials
- [ ] Tried clearing browser cache
- [ ] Tried restarting dev server
- [ ] Checked if other pages work (e.g., http://localhost:3002/dashboard)

---

## 🆘 Next Steps

Once you share the browser console error, I can provide a specific fix!

