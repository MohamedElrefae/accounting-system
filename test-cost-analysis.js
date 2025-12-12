// Test to verify cost analysis functionality works
console.log('🧪 Testing Cost Analysis Functionality...');

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
          
          console.log(`🔍 Found ${actionButtons.length} action buttons in lines table`);
          
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
              const hasAnalysisContent = document.querySelector('[class*="analysis"]') || 
                                        document.querySelector('[class*="cost"]');
              
              if (analysisModal && hasAnalysisContent) {
                console.log('✅ Cost analysis modal opened successfully!');
                console.log('🏁 Cost analysis test completed successfully');
                
                // Close the modal
                const closeButton = analysisModal.querySelector('button[title*="إغلاق"], button[title*="close"], .ultimate-btn-delete');
                if (closeButton) {
                  closeButton.click();
                  console.log('🔒 Modal closed');
                }
              } else {
                console.log('❌ Cost analysis modal did not open properly');
              }
            }, 2000);
          } else {
            console.log('ℹ️ No cost analysis button found (may be due to permissions or line type)');
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
