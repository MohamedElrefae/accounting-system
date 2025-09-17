// Enhanced debug script to diagnose sub_tree_id field visibility issues
// Run this in the browser console on the transactions page after opening the form

console.log('🔧 Debugging sub_tree_id field visibility...');

// Clear all localStorage to ensure clean state
console.log('🧹 Clearing all form-related localStorage...');

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
console.log('📋 All localStorage keys:', allKeys.length);

// Clear form-related keys
const formKeys = allKeys.filter(key => 
    key.includes('unifiedForm') || 
    key.includes('transaction') || 
    key.includes('Transaction') || 
    key.includes('form-layout') ||
    key.includes('معاملة')
);

console.log('🗑️ Clearing form-related keys:', formKeys);
formKeys.forEach(key => {
    console.log('  - Removing:', key);
    localStorage.removeItem(key);
});

// Also clear specific visibility keys we suspect
const specificKeys = [
    'unifiedForm:✏️ تعديل المعاملة:visibleFields',
    'unifiedForm:➕ معاملة جديدة:visibleFields', 
    'unifiedForm:✏️ تعديل المعاملة:fieldOrder',
    'unifiedForm:➕ معاملة جديدة:fieldOrder',
    'form-layout-✏️ تعديل المعاملة',
    'form-layout-➕ معاملة جديدة'
];

specificKeys.forEach(key => {
    if (localStorage.getItem(key)) {
        console.log('🗑️ Clearing specific key:', key);
        localStorage.removeItem(key);
    }
});

// Set explicit visible fields including sub_tree_id
const defaultVisibleFields = [
    'entry_number', 'entry_date', 'description', 'debit_account_id', 'credit_account_id',
    'amount', 'reference_number', 'organization_id', 'project_id', 'classification_id',
    'cost_center_id', 'work_item_id', 'analysis_work_item_id', 'sub_tree_id', 'notes'
];

console.log('✅ Setting default visible fields explicitly:', defaultVisibleFields);

// Set for both create and edit forms
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:visibleFields', JSON.stringify(defaultVisibleFields));
localStorage.setItem('unifiedForm:➕ معاملة جديدة:visibleFields', JSON.stringify(defaultVisibleFields));

// Set field order to ensure sub_tree_id is included
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:fieldOrder', JSON.stringify(defaultVisibleFields));
localStorage.setItem('unifiedForm:➕ معاملة جديدة:fieldOrder', JSON.stringify(defaultVisibleFields));

console.log('🔧 Debug setup complete. Now:');
console.log('1. Refresh the page');
console.log('2. Open the transaction form (create or edit)');
console.log('3. Look for 🌳 debug messages in console');
console.log('4. Check if sub_tree_id field appears in the form');

// Log current React DevTools info if available
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React DevTools detected - you can inspect component state');
} else {
    console.log('⚠️ React DevTools not detected - install for better debugging');
}

// Monitor localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    if (key.includes('sub_tree') || key.includes('visibleFields') || key.includes('fieldOrder')) {
        console.log('📝 localStorage.setItem:', key, '=', value);
    }
    return originalSetItem.apply(this, arguments);
};

console.log('🔍 localStorage monitoring enabled for sub_tree and field visibility keys');