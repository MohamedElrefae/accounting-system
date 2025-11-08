// 🔧 One-Click Fix for sub_tree_id Field Issue
// Copy and paste this entire script in browser console on the transactions page

console.log('🚀 Starting sub_tree_id field diagnostic and fix...');

// Step 1: Clear all form-related localStorage
console.log('🧹 Clearing localStorage...');
const keysToRemove = Object.keys(localStorage).filter(k => 
    k.includes('unifiedForm') || 
    k.includes('transaction') || 
    k.includes('Transaction') || 
    k.includes('form-layout') ||
    k.includes('معاملة')
);
console.log('🗑️ Removing keys:', keysToRemove);
keysToRemove.forEach(k => localStorage.removeItem(k));

// Step 2: Set explicit field visibility for transaction forms
const allTransactionFields = [
    'entry_number', 'entry_date', 'description', 
    'debit_account_id', 'credit_account_id', 'amount', 'reference_number',
    'org_id', 'project_id', 'classification_id', 'cost_center_id',
    'work_item_id', 'analysis_work_item_id', 'sub_tree_id', 'notes'
];

console.log('✅ Setting explicit field visibility...');
localStorage.setItem('unifiedForm:➕ معاملة جديدة:visibleFields', JSON.stringify(allTransactionFields));
localStorage.setItem('unifiedForm:➕ معاملة جديدة:fieldOrder', JSON.stringify(allTransactionFields));
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:visibleFields', JSON.stringify(allTransactionFields));
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:fieldOrder', JSON.stringify(allTransactionFields));

// Step 3: Force column count to ensure proper layout
localStorage.setItem('unifiedForm:➕ معاملة جديدة:columns', '2');
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:columns', '2');

// Step 4: Clear any full-width overrides that might hide the field
localStorage.setItem('unifiedForm:➕ معاملة جديدة:fullWidth', '[]');
localStorage.setItem('unifiedForm:✏️ تعديل المعاملة:fullWidth', '[]');

// Step 5: Set up monitoring
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    if (key.includes('sub_tree') || key.includes('visibleFields')) {
        console.log('📝 localStorage update:', key, '→', value);
    }
    return originalSetItem.apply(this, arguments);
};

console.log('🔍 Monitoring enabled for localStorage changes');

// Step 6: Check if React is available and components are loaded
if (window.React && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('⚛️ React environment detected');
} else {
    console.log('⚠️ React DevTools not detected - install for better debugging');
}

// Step 7: Search for existing sub_tree_id elements
const existingElements = document.querySelectorAll('*[id*="sub_tree"], *[name*="sub_tree"], *[data-field*="sub_tree"]');
console.log('🔍 Found existing sub_tree elements:', existingElements.length);
existingElements.forEach((el, i) => {
    console.log(`  ${i+1}. ${el.tagName} - id="${el.id}" name="${el.name}" class="${el.className}"`);
});

// Step 8: Instructions for user
console.log('');
console.log('🎯 NEXT STEPS:');
console.log('1. Close any open transaction forms');
console.log('2. Refresh the page (F5 or Ctrl+R)');
console.log('3. Open a transaction form (create or edit)');
console.log('4. Look for 🌳 debug messages in console');
console.log('5. The sub_tree_id field should appear as "الشجرة الفرعية"');
console.log('');
console.log('💡 If still not working:');
console.log('- Check console for errors (red text)');
console.log('- Look for "🌳 sub_tree_id field NOT FOUND" error');
console.log('- Try opening browser DevTools → Elements → search for "sub_tree"');

// Step 9: Set flag to track fix attempt
localStorage.setItem('subtree_fix_attempted', Date.now().toString());
console.log('✅ Fix script completed. Refresh the page now.');

// Auto-refresh after 3 seconds if user wants
setTimeout(() => {
    if (confirm('🔄 Auto-refresh the page now to apply fixes?')) {
        location.reload();
    }
}, 2000);