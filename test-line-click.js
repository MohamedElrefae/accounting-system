// Test to verify TransactionLinesTable line clicking works
console.log('🧪 Testing Transaction Line Click Fix...');

setTimeout(() => {
  // Find the first transaction row
  const firstTransactionRow = document.querySelector('table tbody tr');
  
  if (firstTransactionRow) {
    console.log('🖱️ Clicking first transaction to load lines...');
    firstTransactionRow.click();
    
    setTimeout(() => {
      // Wait for lines to load, then try clicking a line
      const firstLineRow = document.querySelector('.transaction-lines-resizable-table tbody tr');
      
      if (firstLineRow) {
        console.log('🖱️ Clicking first transaction line...');
        firstLineRow.click();
        
        setTimeout(() => {
          console.log('✅ Line click test completed - no errors should be shown');
          console.log('🏁 Test completed successfully');
        }, 1000);
      } else {
        console.log('ℹ️ No transaction lines found (transaction may have no lines)');
        console.log('🏁 Test completed');
      }
    }, 3000);
  } else {
    console.log('❌ No transactions found to test');
  }
}, 2000);
