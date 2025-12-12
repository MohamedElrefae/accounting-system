// Final test to verify dropdowns work in cost analysis modal
console.log('🧪 Testing Cost Analysis Modal - Final Dropdown Test...');

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
                
                // Check for dropdowns and test clicking
                setTimeout(() => {
                  const dropdowns = analysisModal.querySelectorAll('[style*="cursor: pointer"]');
                  console.log(`Found ${dropdowns.length} dropdown elements`);
                  
                  if (dropdowns.length > 0) {
                    // Test the first dropdown
                    const firstDropdown = dropdowns[0];
                    console.log('🖱️ Testing first dropdown click...');
                    
                    firstDropdown.click();
                    
                    setTimeout(() => {
                      // Check if menu opened
                      const menus = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]');
                      const openMenus = Array.from(menus).filter(menu => {
                        const style = window.getComputedStyle(menu);
                        return style.position === 'fixed' && parseInt(style.zIndex) > 1000;
                      });
                      
                      if (openMenus.length > 0) {
                        console.log('🎉 SUCCESS: Dropdown menu opened!');
                        console.log(`✅ Found ${openMenus.length} open menus`);
                        
                        // Check for menu items
                        const menuItems = openMenus[0].querySelectorAll('[style*="padding"], option, div');
                        if (menuItems.length > 1) {
                          console.log(`✅ Menu has ${menuItems.length} items to select from`);
                          console.log('🎉 COMPLETE SUCCESS: Dropdowns are working!');
                        } else {
                          console.log('⚠️ Menu opened but no items found');
                        }
                        
                        // Close the menu
                        const overlay = document.querySelector('[style*="position: fixed"][style*="inset"]');
                        if (overlay) overlay.click();
                        
                      } else {
                        console.log('❌ Dropdown menu did not open');
                        console.log('Possible causes:');
                        console.log('- No data in dropdown arrays');
                        console.log('- CSS z-index conflicts');
                        console.log('- Event propagation blocked');
                      }
                      
                      console.log('🏁 Final dropdown test completed');
                      
                    }, 1000);
                  } else {
                    console.log('❌ No dropdown elements found in modal');
                  }
                }, 2000);
              } else {
                console.log('❌ Cost analysis modal did not open');
              }
            }, 2000);
          } else {
            console.log('ℹ️ No cost analysis button found');
          }
        }, 1000);
      } else {
        console.log('ℹ️ No transaction lines found');
      }
    }, 3000);
  } else {
    console.log('❌ No transactions found to test');
  }
}, 2000);
