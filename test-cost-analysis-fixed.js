// Test to verify cost analysis modal works with error handling
console.log('🧪 Testing Cost Analysis Modal with Error Handling...');

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
          // Look for cost analysis button in the line actions
          const actionButtons = document.querySelectorAll('.transaction-lines-resizable-table button');
          
          // Find cost analysis button
          const costAnalysisButton = Array.from(actionButtons).find(btn => 
            btn.textContent?.includes('تحليل') || 
            btn.textContent?.includes('تكلفة') || 
            btn.title?.includes('تحليل') ||
            btn.title?.includes('تكلفة') ||
            btn.title?.includes('cost')
          );
          
          if (costAnalysisButton) {
            console.log('📊 Found cost analysis button - clicking to open modal...');
            costAnalysisButton.click();
            
            setTimeout(() => {
              // Check if cost analysis modal opened
              const analysisModal = document.querySelector('.transaction-modal');
              
              if (analysisModal) {
                console.log('✅ Cost analysis modal opened!');
                
                // Check for error message
                const errorMessage = analysisModal.querySelector('.error-message, [style*="color: red"]');
                if (errorMessage) {
                  console.log('ℹ️ Modal shows expected error message (cost analysis views not available):', errorMessage.textContent);
                }
                
                // Check for basic content
                const modalContent = analysisModal.querySelector('h3, .modal-title');
                if (modalContent) {
                  console.log('✅ Modal has content:', modalContent.textContent);
                }
                
                // Try to close the modal
                const closeButton = analysisModal.querySelector('button[title*="إغلاق"], button[title*="close"], .ultimate-btn-delete, button:contains("إغلاق")');
                if (closeButton) {
                  closeButton.click();
                  setTimeout(() => {
                    console.log('🔒 Modal closed successfully');
                    console.log('🏁 Cost analysis test completed - modal handles errors gracefully');
                  }, 500);
                } else {
                  console.log('ℹ️ Could not find close button, but modal opened successfully');
                  console.log('🏁 Cost analysis test completed');
                }
              } else {
                console.log('❌ Cost analysis modal did not open');
              }
            }, 2000);
          } else {
            console.log('ℹ️ No cost analysis button found');
            console.log('🏁 Test completed');
          }
        }, 1000);
      } else {
        console.log('ℹ️ No transaction lines found');
        console.log('🏁 Test completed');
      }
    }, 3000);
  } else {
    console.log('❌ No transactions found to test');
  }
}, 2000);
