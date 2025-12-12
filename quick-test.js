// Quick test to verify Transactions page loads without errors
console.log('🧪 Quick Test: Transactions Page Load Check');

// Check if page loaded successfully
setTimeout(() => {
  const errors = [];
  
  // Check for React error boundaries
  const errorElements = document.querySelectorAll('[data-testid="error-boundary"]');
  if (errorElements.length > 0) {
    errors.push('React error boundaries detected');
  }
  
  // Check for console errors (simple check)
  const hasLoadingSpinner = document.querySelector('.loading-spinner');
  const hasTransactionTable = document.querySelector('table tbody tr');
  const hasErrorContainer = document.querySelector('.error-container');
  
  console.log('📊 Page Status Check:');
  console.log(`• Loading spinner: ${hasLoadingSpinner ? 'Visible' : 'Hidden'}`);
  console.log(`• Transaction table: ${hasTransactionTable ? 'Loaded' : 'Not loaded'}`);
  console.log(`• Error container: ${hasErrorContainer ? 'Visible' : 'Hidden'}`);
  
  if (hasErrorContainer) {
    console.log('❌ Page has errors');
  } else if (hasTransactionTable) {
    console.log('✅ Transactions page loaded successfully!');
    console.log('🚀 Ready for performance testing');
  } else if (hasLoadingSpinner) {
    console.log('⏳ Page is still loading...');
  } else {
    console.log('⚠️ Page status unclear');
  }
  
  // Check for on-demand loading setup
  console.log('\n🔍 Optimization Check:');
  const orgSelect = document.querySelector('select[placeholder*="المؤسسة"]');
  const projectSelect = document.querySelector('select[placeholder*="المشروع"]');
  
  console.log(`• Organization filter: ${orgSelect ? 'Available' : 'Not found'}`);
  console.log(`• Project filter: ${projectSelect ? 'Available' : 'Not found'}`);
  
}, 2000);
