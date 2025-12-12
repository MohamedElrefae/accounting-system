// Test to verify transaction line action buttons work
console.log('🧪 Testing Transaction Line Actions...');

setTimeout(() => {
  // Find the first transaction row
  const firstTransactionRow = document.querySelector('table tbody tr');
  
  if (firstTransactionRow) {
    console.log('🖱️ Clicking first transaction to load lines...');
    firstTransactionRow.click();
    
    setTimeout(() => {
      // Wait for lines to load
      const firstLineRow = document.querySelector('.transaction-lines-resizable-table tbody tr');
      
      if (firstLineRow) {
        console.log('🖱️ Clicking first transaction line to select it...');
        firstLineRow.click();
        
        setTimeout(() => {
          // Look for action buttons in the line
          const actionButtons = document.querySelectorAll('.transaction-lines-resizable-table button');
          
          console.log(`🔍 Found ${actionButtons.length} action buttons in lines table`);
          
          if (actionButtons.length > 0) {
            console.log('🧪 Testing action buttons...');
            
            // Test delete button (if exists)
            const deleteButton = Array.from(actionButtons).find(btn => 
              btn.textContent?.includes('حذف') || btn.title?.includes('حذف')
            );
            
            if (deleteButton) {
              console.log('🗑️ Found delete button - clicking will show confirmation dialog');
              // Note: Not actually clicking to avoid accidental deletion
            } else {
              console.log('ℹ️ No delete button found (may be due to permissions)');
            }
            
            // Test documents button (if exists)
            const documentsButton = Array.from(actionButtons).find(btn => 
              btn.textContent?.includes('مستندات') || btn.title?.includes('مستند')
            );
            
            if (documentsButton) {
              console.log('📄 Found documents button - clicking to open documents panel');
              documentsButton.click();
              
              setTimeout(() => {
                const documentsModal = document.querySelector('.transaction-modal');
                if (documentsModal) {
                  console.log('✅ Documents panel opened successfully!');
                  // Close it
                  const closeButton = documentsModal.querySelector('button');
                  if (closeButton) closeButton.click();
                } else {
                  console.log('❌ Documents panel did not open');
                }
                
                console.log('🏁 Line actions test completed');
              }, 1000);
            } else {
              console.log('ℹ️ No documents button found');
              console.log('🏁 Line actions test completed');
            }
          } else {
            console.log('ℹ️ No action buttons found in lines table');
            console.log('🏁 Test completed');
          }
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
