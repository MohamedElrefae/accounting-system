// Test to verify dropdown selection works in cost analysis modal
console.log('🧪 Testing Cost Analysis Modal - Dropdown Selection Test...');

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
                
                // Test dropdown selection
                setTimeout(() => {
                  const dropdowns = analysisModal.querySelectorAll('[style*="cursor: pointer"]');
                  console.log(`Found ${dropdowns.length} dropdown elements`);
                  
                  if (dropdowns.length >= 2) {
                    // Test the second dropdown (analysis work items)
                    const analysisDropdown = dropdowns[1];
                    console.log('🖱️ Clicking analysis work items dropdown...');
                    
                    analysisDropdown.click();
                    
                    setTimeout(() => {
                      // Check if menu opened
                      const menus = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]');
                      const openMenus = Array.from(menus).filter(menu => {
                        const style = window.getComputedStyle(menu);
                        return style.position === 'fixed' && parseInt(style.zIndex) > 1000;
                      });
                      
                      if (openMenus.length > 0) {
                        console.log('✅ Analysis dropdown menu opened!');
                        
                        // Look for menu items
                        const menuItems = openMenus[0].querySelectorAll('div[style*="padding"], div[style*="cursor: pointer"]');
                        console.log(`Found ${menuItems.length} menu items`);
                        
                        if (menuItems.length > 1) {
                          // Try to click the first actual item (skip the "— بلا —" option)
                          const firstItem = menuItems[1]; // Skip clear option
                          if (firstItem && firstItem.textContent && firstItem.textContent.trim() !== '— بلا —') {
                            console.log(`🖱️ Clicking first item: "${firstItem.textContent.trim()}"`);
                            
                            firstItem.click();
                            
                            setTimeout(() => {
                              // Check if menu closed and value was selected
                              const stillOpen = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]').length > 0;
                              
                              if (!stillOpen) {
                                console.log('✅ Menu closed after selection!');
                                console.log('🎉 SUCCESS: Dropdown selection working!');
                                
                                // Check if the dropdown now shows the selected value
                                const dropdownText = analysisDropdown.textContent?.trim();
                                if (dropdownText && dropdownText !== '— بحث —') {
                                  console.log(`✅ Selected value displayed: "${dropdownText}"`);
                                }
                              } else {
                                console.log('❌ Menu did not close after selection');
                              }
                            }, 500);
                          } else {
                            console.log('⚠️ No valid items to select (only clear option)');
                          }
                        } else {
                          console.log('❌ No menu items found');
                        }
                      } else {
                        console.log('❌ Analysis dropdown menu did not open');
                      }
                    }, 1000);
                  } else {
                    console.log('❌ Not enough dropdowns found');
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
