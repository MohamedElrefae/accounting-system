// Test to debug dropdown issues in cost analysis modal
console.log('🧪 Testing Cost Analysis Modal - Dropdown Debug...');

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
                
                // Check for dropdowns and their data
                setTimeout(() => {
                  const dropdowns = analysisModal.querySelectorAll('[style*="cursor: pointer"], div[style*="pointer"]');
                  console.log(`Found ${dropdowns.length} clickable dropdown elements`);
                  
                  dropdowns.forEach((dropdown, index) => {
                    const rect = dropdown.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    const hasText = dropdown.textContent && dropdown.textContent.trim().length > 0;
                    
                    console.log(`Dropdown ${index + 1}:`, {
                      visible: isVisible,
                      text: dropdown.textContent?.trim(),
                      clickable: dropdown.style.cursor === 'pointer',
                      rect: { width: rect.width, height: rect.height }
                    });
                    
                    if (isVisible && hasText) {
                      console.log(`🖱️ Attempting to click dropdown ${index + 1}...`);
                      
                      // Try to click it
                      dropdown.click();
                      
                      setTimeout(() => {
                        // Check if any menu opened
                        const menus = document.querySelectorAll('[style*="position: fixed"], [style*="z-index"]');
                        const openMenus = Array.from(menus).filter(menu => {
                          const style = window.getComputedStyle(menu);
                          return style.position === 'fixed' && parseInt(style.zIndex) > 1000;
                        });
                        
                        if (openMenus.length > 0) {
                          console.log(`✅ Dropdown ${index + 1} opened menu! Found ${openMenus.length} menus.`);
                        } else {
                          console.log(`❌ Dropdown ${index + 1} did not open menu`);
                        }
                      }, 500);
                    }
                  });
                  
                  // Check console for data logs
                  console.log('📋 Check browser console for dropdown data logs...');
                  
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
