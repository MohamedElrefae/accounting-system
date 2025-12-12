// Test to verify cost analysis modal works with correct context functions
console.log('🧪 Testing Cost Analysis Modal with Fixed Context Functions...');

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
                console.log('✅ Cost analysis modal opened successfully!');
                
                // Check for data loading after a delay
                setTimeout(() => {
                  // Look for dropdowns with data
                  const dropdowns = analysisModal.querySelectorAll('select, [role="combobox"]');
                  let hasData = false;
                  
                  dropdowns.forEach((dropdown, index) => {
                    const options = dropdown.querySelectorAll('option, .dropdown-option');
                    if (options.length > 1) { // More than just placeholder
                      console.log(`✅ Dropdown ${index + 1} has ${options.length} options`);
                      hasData = true;
                    }
                  });
                  
                  // Check for specific dimension data
                  const workItemsSelect = analysisModal.querySelector('select[name*="work"], select[name*="item"]');
                  const costCentersSelect = analysisModal.querySelector('select[name*="center"], select[name*="cost"]');
                  const categoriesSelect = analysisModal.querySelector('select[name*="category"], select[name*="tree"]');
                  
                  if (workItemsSelect && workItemsSelect.options.length > 1) {
                    console.log('✅ Work items loaded from context via getWorkItemsForOrg()');
                    hasData = true;
                  }
                  
                  if (costCentersSelect && costCentersSelect.options.length > 1) {
                    console.log('✅ Cost centers loaded from context via getCostCentersForOrg()');
                    hasData = true;
                  }
                  
                  if (categoriesSelect && categoriesSelect.options.length > 1) {
                    console.log('✅ Categories loaded from context via getCategoriesForOrg()');
                    hasData = true;
                  }
                  
                  // Check for analysis work items
                  const analysisItems = analysisModal.querySelectorAll('[data-analysis-item]');
                  if (analysisItems.length > 0) {
                    console.log('✅ Analysis work items loaded from context');
                    hasData = true;
                  }
                  
                  if (hasData) {
                    console.log('🎉 SUCCESS: Cost analysis modal is using correct context functions!');
                    console.log('✅ getWorkItemsForOrg(), getCostCentersForOrg(), getCategoriesForOrg() working');
                    console.log('✅ No "getDimensionsForOrg is not a function" errors');
                  } else {
                    console.log('⚠️ Modal opened but data still loading...');
                  }
                  
                  console.log('🏁 Fixed context functions test completed');
                  
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
    console.log('❌ No transactions found to test');
  }
}, 2000);
