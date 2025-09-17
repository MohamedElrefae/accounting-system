// Debug script to clear transaction form layout preferences
// Run this in the browser console on the transactions page

console.log('🔧 Clearing transaction form layout preferences...');

// List all localStorage keys related to the transaction form
const keys = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('transaction') || key.includes('Transaction'))) {
        keys.push(key);
    }
}

console.log('Found transaction-related localStorage keys:', keys);

// Clear all transaction form preferences
keys.forEach(key => {
    console.log('Removing key:', key);
    localStorage.removeItem(key);
});

// Also clear form layout for the specific form title
const formLayoutKeys = [
    'form-layout-✏️ تعديل المعاملة',
    'form-layout-➕ معاملة جديدة',
    'form-layout-default',
    'unifiedForm:✏️ تعديل المعاملة:columns',
    'unifiedForm:✏️ تعديل المعاملة:fullWidth',
    'unifiedForm:✏️ تعديل المعاملة:fieldOrder',
    'unifiedForm:✏️ تعديل المعاملة:visibleFields',
    'unifiedForm:➕ معاملة جديدة:columns',
    'unifiedForm:➕ معاملة جديدة:fullWidth',
    'unifiedForm:➕ معاملة جديدة:fieldOrder',
    'unifiedForm:➕ معاملة جديدة:visibleFields'
];

formLayoutKeys.forEach(key => {
    if (localStorage.getItem(key)) {
        console.log('Removing form layout key:', key);
        localStorage.removeItem(key);
    }
});

console.log('✅ Transaction form preferences cleared. Please refresh the page and try opening the form again.');

// Also log information about categories
console.log('🌳 Checking categories in memory...');
if (window.React) {
    // Try to find React component state
    console.log('React is available - form state should be checked in the browser React DevTools');
}