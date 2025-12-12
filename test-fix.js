// Test to verify transaction lines and filters are working
console.log('🧪 Testing Transaction Lines & Filters Fix...');

setTimeout(() => {
  // Check if dimensions are loaded
  const hasCategories = window.categories && window.categories.length > 0;
  const hasWorkItems = window.workItems && window.workItems.length > 0;
  const hasCostCenters = window.costCenters && window.costCenters.length > 0;
  
  console.log('📊 Data Loading Status:');
  console.log(`• Categories: ${hasCategories ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`• Work Items: ${hasWorkItems ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`• Cost Centers: ${hasCostCenters ? '✅ Loaded' : '❌ Missing'}`);
  
  // Check filter dropdowns
  const categorySelect = document.querySelector('select[placeholder*="الشجرة"]');
  const workItemSelect = document.querySelector('select[placeholder*="عنصر"]');
  const costCenterSelect = document.querySelector('select[placeholder*="مركز"]');
  
  console.log('\n🔍 Filter Components:');
  console.log(`• Category filter: ${categorySelect ? '✅ Available' : '❌ Missing'}`);
  console.log(`• Work Item filter: ${workItemSelect ? '✅ Available' : '❌ Missing'}`);
  console.log(`• Cost Center filter: ${costCenterSelect ? '✅ Available' : '❌ Missing'}`);
  
  // Test transaction selection
  const firstRow = document.querySelector('table tbody tr');
  if (firstRow) {
    console.log('\n🖱️ Testing transaction selection...');
    firstRow.click();
    
    setTimeout(() => {
      const linesTable = document.querySelector('.transaction-lines-resizable-table tbody tr');
      const noLinesMessage = document.querySelector('text:contains("لا توجد قيود تفصيلية")');
      
      if (linesTable) {
        console.log('✅ Transaction lines loaded successfully!');
      } else if (noLinesMessage) {
        console.log('⚠️ No lines message shown - may be correct if transaction has no lines');
      } else {
        console.log('❌ Transaction lines not loading');
      }
      
      console.log('\n🏁 Test completed');
    }, 2000);
  } else {
    console.log('\n❌ No transactions found to test');
  }
}, 3000);
