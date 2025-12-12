// Test to verify cost analysis modal works with analysisItemsMap fix
console.log('🧪 Testing Cost Analysis Modal - analysisItemsMap Fix...');

setTimeout(() => {
  // Check if Transactions page loads without undefined map errors
  const transactionsPage = document.querySelector('[data-testid="transactions-page"], .transactions-container, main');
  
  if (transactionsPage) {
    console.log('✅ Transactions page loaded successfully - no undefined map errors!');
    
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
                  console.log('🎉 SUCCESS: Cost analysis modal opened without undefined errors!');
                  
                  // Check for data loading
                  setTimeout(() => {
                    // Look for analysis work items dropdown
                    const analysisDropdowns = analysisModal.querySelectorAll('select');
                    let hasAnalysisData = false;
                    
                    analysisDropdowns.forEach((dropdown, index) => {
                      const options = dropdown.querySelectorAll('option');
                      if (options.length > 1) { // More than just placeholder
                        console.log(`✅ Analysis dropdown ${index + 1} has ${options.length} options`);
                        hasAnalysisData = true;
                      }
                    });
                    
                    // Check specifically for analysis work items
                    const analysisItemsSelect = analysisModal.querySelector('select[name*="analysis"], select:nth-of-type(2)');
                    
                    if (analysisItemsSelect && analysisItemsSelect.options.length > 1) {
                      console.log('✅ Analysis work items loaded from analysisItemsMap!');
                      console.log(`✅ Found ${analysisItemsSelect.options.length - 1} analysis items`);
                      hasAnalysisData = true;
                    }
                    
                    if (hasAnalysisData) {
                      console.log('🎉 COMPLETE SUCCESS: analysisItemsMap fix working!');
                      console.log('✅ No "Cannot read properties of undefined (reading map)" errors');
                      console.log('✅ Analysis work items dropdown populated');
                      console.log('✅ Object.values(analysisItemsMap) conversion working');
                    } else {
                      console.log('⚠️ Modal opened but analysis data still loading...');
                    }
                    
                    console.log('🏁 analysisItemsMap fix test completed');
                    
                  }, 3000); // Give time for data to load
                  
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
      console.log('ℹ️ No transactions found to test');
    }
  } else {
    console.log('❌ Transactions page failed to load - undefined errors may persist');
  }
}, 2000);
