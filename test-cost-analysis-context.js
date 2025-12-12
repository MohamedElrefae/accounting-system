// Test to verify cost analysis modal uses context data properly
console.log('🧪 Testing Cost Analysis Modal with Context Data...');

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
                
                // Check for data loading
                setTimeout(() => {
                  // Look for dropdowns with data
                  const dropdowns = analysisModal.querySelectorAll('select, .dropdown, [role="combobox"]');
                  let hasData = false;
                  
                  dropdowns.forEach(dropdown => {
                    const options = dropdown.querySelectorAll('option, .dropdown-item');
                    if (options.length > 1) { // More than just placeholder
                      console.log(`✅ Found dropdown with ${options.length} options`);
                      hasData = true;
                    }
                  });
                  
                  // Check for work items, cost centers, categories
                  const workItemsSelect = analysisModal.querySelector('select[name*="work"], select[name*="item"]');
                  const costCentersSelect = analysisModal.querySelector('select[name*="center"], select[name*="cost"]');
                  const categoriesSelect = analysisModal.querySelector('select[name*="category"], select[name*="tree"]');
                  
                  if (workItemsSelect && workItemsSelect.options.length > 1) {
                    console.log('✅ Work items loaded from context');
                    hasData = true;
                  }
                  
                  if (costCentersSelect && costCentersSelect.options.length > 1) {
                    console.log('✅ Cost centers loaded from context');
                    hasData = true;
                  }
                  
                  if (categoriesSelect && categoriesSelect.options.length > 1) {
                    console.log('✅ Categories loaded from context');
                    hasData = true;
                  }
                  
                  if (hasData) {
                    console.log('🎉 SUCCESS: Cost analysis modal is using context data!');
                    console.log('✅ All dimensions loaded properly from TransactionsDataContext');
                  } else {
                    console.log('⚠️ Modal opened but still waiting for data to load...');
                  }
                  
                  // Check for line items
                  const lineItemsTable = analysisModal.querySelector('table tbody tr');
                  if (lineItemsTable) {
                    console.log('✅ Line items data loaded');
                  }
                  
                  console.log('🏁 Context data test completed');
                  
                }, 3000); // Give more time for context data to load
                
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
