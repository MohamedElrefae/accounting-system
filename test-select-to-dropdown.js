// Test to verify basic select has been replaced with SearchableDropdown
console.log('🧪 Testing Cost Analysis Modal - Select to SearchableDropdown Conversion...');

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
                
                // Test that basic select has been replaced with SearchableDropdown
                setTimeout(() => {
                  // Check for basic select elements (should be none or fewer)
                  const basicSelects = analysisModal.querySelectorAll('select');
                  console.log(`Found ${basicSelects.length} basic select elements`);
                  
                  // Check for SearchableDropdown elements (should be more)
                  const searchableDropdowns = analysisModal.querySelectorAll('[style*="cursor: pointer"]');
                  console.log(`Found ${searchableDropdowns.length} SearchableDropdown elements`);
                  
                  // Look specifically for unit of measure dropdown
                  const unitDropdown = Array.from(searchableDropdowns).find(dropdown => {
                    return dropdown.style.width === '120px' || dropdown.textContent?.includes('قطعة');
                  });
                  
                  if (unitDropdown) {
                    console.log('✅ Found unit of measure SearchableDropdown!');
                    console.log('🖱️ Testing unit of measure dropdown...');
                    
                    // Click the unit dropdown
                    unitDropdown.click();
                    
                    setTimeout(() => {
                      // Check if menu opened
                      const menus = document.querySelectorAll('[style*="position: fixed"]');
                      const openMenus = Array.from(menus).filter(menu => {
                        const style = window.getComputedStyle(menu);
                        return style.position === 'fixed' && parseInt(style.zIndex) > 1000;
                      });
                      
                      if (openMenus.length > 0) {
                        console.log('✅ Unit of measure dropdown menu opened!');
                        
                        // Check for unit options
                        const menuItems = openMenus[0].querySelectorAll('div[style*="padding"]');
                        console.log(`Found ${menuItems.length} unit options`);
                        
                        const unitNames = ['قطعة', 'متر', 'كيلو', 'لتر', 'ساعة', 'يوم', 'شكارة', 'صندوق'];
                        let foundUnits = [];
                        
                        menuItems.forEach(item => {
                          const text = item.textContent?.trim();
                          if (text && unitNames.some(unit => text.includes(unit))) {
                            foundUnits.push(text);
                          }
                        });
                        
                        console.log(`✅ Found unit options: ${foundUnits.join(', ')}`);
                        
                        // Try to select "متر"
                        const meterOption = Array.from(menuItems).find(item => 
                          item.textContent?.includes('متر')
                        );
                        
                        if (meterOption) {
                          console.log('🖱️ Selecting "متر"...');
                          meterOption.click();
                          
                          setTimeout(() => {
                            // Check if menu closed and value was selected
                            const stillOpen = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]').length > 0;
                            
                            if (!stillOpen) {
                              console.log('✅ Menu closed after selection!');
                              console.log('🎉 SUCCESS: Basic select replaced with SearchableDropdown!');
                              
                              // Check if the dropdown now shows the selected value
                              const dropdownText = unitDropdown.textContent?.trim();
                              if (dropdownText && dropdownText !== '— اختر —') {
                                console.log(`✅ Selected unit displayed: "${dropdownText}"`);
                              }
                            } else {
                              console.log('❌ Menu did not close after selection');
                            }
                          }, 300);
                        } else {
                          console.log('⚠️ Could not find meter option');
                        }
                      } else {
                        console.log('❌ Unit of measure dropdown menu did not open');
                      }
                    }, 500);
                  } else {
                    console.log('❌ Could not find unit of measure SearchableDropdown');
                  }
                  
                  // Summary of conversion
                  console.log('📋 Conversion Summary:');
                  console.log(`- Basic selects: ${basicSelects.length} (should be reduced)`);
                  console.log(`- SearchableDropdowns: ${searchableDropdowns.length} (should be increased)`);
                  console.log('🏁 Select to SearchableDropdown test completed');
                  
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
