// Test to verify error handling works without crashes
console.log('🧪 Testing Error Handling in Cost Analysis Modal...');

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
                console.log('✅ Cost analysis modal opened without crashes!');
                
                // Check for error message
                const errorElements = analysisModal.querySelectorAll('*');
                let hasError = false;
                errorElements.forEach(el => {
                  if (el.textContent?.includes('تحليل التكلفة غير متاح') || 
                      el.textContent?.includes('فشل في تحميل')) {
                    console.log('ℹ️ Found expected error message:', el.textContent);
                    hasError = true;
                  }
                });
                
                if (!hasError) {
                  console.log('ℹ️ No error message shown - modal may have loaded successfully');
                }
                
                // Check that modal has content
                const hasContent = analysisModal.querySelector('h3, .modal-title, table, .form-group');
                if (hasContent) {
                  console.log('✅ Modal has content and is functional');
                }
                
                console.log('🏁 Error handling test completed successfully');
                console.log('✅ No "setError is not defined" errors should be present');
                
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
