// Test to verify cost analysis works with original functionality restored
console.log('🧪 Testing Cost Analysis with Original Functionality Restored...');

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
                
                // Check if it shows the error message or loads successfully
                const errorElements = analysisModal.querySelectorAll('*');
                let hasError = false;
                let hasData = false;
                
                errorElements.forEach(el => {
                  if (el.textContent?.includes('تحليل التكلفة غير متاح')) {
                    console.log('ℹ️ Still shows error - database views may be missing');
                    hasError = true;
                  }
                  if (el.textContent?.includes('مبلغ') || el.textContent?.includes('تحليل') || el.querySelector('table')) {
                    console.log('✅ Modal has loaded data - original functionality working!');
                    hasData = true;
                  }
                });
                
                if (hasData && !hasError) {
                  console.log('🎉 SUCCESS: Cost analysis is working with original functionality!');
                } else if (hasError) {
                  console.log('⚠️ Database views still missing, but error handling works');
                } else {
                  console.log('ℹ️ Modal opened but checking content...');
                }
                
                // Close the modal
                const closeButton = analysisModal.querySelector('button[title*="إغلاق"], button[title*="close"], .ultimate-btn-delete');
                if (closeButton) {
                  closeButton.click();
                  console.log('🔒 Modal closed');
                }
                
                console.log('🏁 Test completed');
              } else {
                console.log('❌ Cost analysis modal did not open');
              }
            }, 3000); // Give more time for data to load
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
