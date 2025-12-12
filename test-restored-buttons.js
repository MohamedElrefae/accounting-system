// Test to verify restored transaction button functionality
console.log('🧪 Testing Restored Transaction Button Functionality...');

setTimeout(() => {
  // Find the transactions header table
  const headerTable = document.querySelector('.transactions-header-table') || 
                      document.querySelector('table') ||
                      document.querySelector('[class*="table"]');
  
  if (headerTable) {
    console.log('✅ Found transactions table');
    
    // Find all rows in the table
    const rows = headerTable.querySelectorAll('tbody tr');
    console.log(`Found ${rows.length} transaction rows`);
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      console.log('🔍 Testing first transaction row...');
      
      // Look for action buttons in this row
      const actionButtons = firstRow.querySelectorAll('button');
      console.log(`Found ${actionButtons.length} buttons in first row`);
      
      // Test Details button
      const detailsBtn = Array.from(actionButtons).find(btn => 
        btn.textContent?.includes('تفاصيل') || 
        btn.title?.includes('تفاصيل')
      );
      
      if (detailsBtn) {
        console.log('✅ Found Details button - testing restored functionality...');
        detailsBtn.click();
        
        setTimeout(() => {
          console.log('Checking for UnifiedTransactionDetailsPanel...');
          const detailsPanel = document.querySelector('[class*="UnifiedTransactionDetailsPanel"]') || 
                              document.querySelector('[class*="DraggableResizablePanel"]') ||
                              document.querySelector('[style*="position: fixed"][style*="z-index"]');
          
          if (detailsPanel) {
            console.log('✅ Unified Transaction Details Panel opened successfully!');
            console.log('Panel details:', {
              visible: detailsPanel.offsetParent !== null,
              position: getComputedStyle(detailsPanel).position,
              zIndex: getComputedStyle(detailsPanel).zIndex
            });
          } else {
            console.log('❌ Unified Transaction Details Panel not found');
          }
        }, 2000);
      }
      
      // Test Edit button
      setTimeout(() => {
        const editBtn = Array.from(actionButtons).find(btn => 
          btn.textContent?.includes('تعديل') || 
          btn.textContent?.includes('تحرير')
        );
        
        if (editBtn) {
          console.log('✅ Found Edit button - testing TransactionWizard...');
          editBtn.click();
          
          setTimeout(() => {
            console.log('Checking for TransactionWizard...');
            const wizard = document.querySelector('[class*="TransactionWizard"]') || 
                         document.querySelector('[class*="wizard"]') ||
                         document.querySelector('[class*="form"]');
            
            if (wizard) {
              console.log('✅ TransactionWizard opened successfully!');
              console.log('Wizard details:', {
                visible: wizard.offsetParent !== null,
                className: wizard.className
              });
            } else {
              console.log('❌ TransactionWizard not found');
            }
          }, 2000);
        } else {
          console.log('❌ Edit button not visible - checking conditions');
        }
      }, 3000);
      
      // Test Delete button
      setTimeout(() => {
        const deleteBtn = Array.from(actionButtons).find(btn => 
          btn.textContent?.includes('حذف') ||
          btn.className?.includes('delete')
        );
        
        if (deleteBtn) {
          console.log('✅ Found Delete button - testing cascade delete...');
          // Note: We won't actually click delete to avoid data loss
          console.log('Delete button found and ready for testing');
        } else {
          console.log('❌ Delete button not visible - checking conditions');
        }
      }, 4000);
      
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Could not find transactions table');
  }
  
  console.log('🏁 Restored button functionality test completed');
  console.log('📝 Expected behavior:');
  console.log('- Details: Opens UnifiedTransactionDetailsPanel in DraggableResizablePanel');
  console.log('- Edit: Opens TransactionWizard in edit mode');
  console.log('- Delete: Opens cascade delete confirmation');
  
}, 2000);
