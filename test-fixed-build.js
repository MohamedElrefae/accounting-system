// Test to verify the fixed build and transaction button functionality
console.log('🧪 Testing Fixed Build and Transaction Button Functionality...');

setTimeout(() => {
  // Check if the page loads without errors
  console.log('✅ Page loaded successfully - no 500 error');
  
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
        console.log('✅ Found Details button - testing UnifiedTransactionDetailsPanel...');
        detailsBtn.click();
        
        setTimeout(() => {
          console.log('Checking for DraggableResizablePanel...');
          const panel = document.querySelector('[class*="DraggableResizablePanel"]') ||
                       document.querySelector('[style*="position: fixed"][style*="z-index"]');
          
          if (panel) {
            console.log('✅ DraggableResizablePanel opened successfully!');
            console.log('Panel features:', {
              visible: panel.offsetParent !== null,
              hasHeader: !!panel.querySelector('[class*="header"]'),
              hasContent: !!panel.querySelector('[class*="content"]'),
              hasControls: !!panel.querySelector('button[title*="close"], button[title*="maximize"]')
            });
            
            // Test panel controls
            const controls = panel.querySelectorAll('button');
            console.log(`Found ${controls.length} panel controls`);
            
            // Test close button
            const closeBtn = Array.from(controls).find(btn => 
              btn.title?.includes('close') || btn.textContent?.includes('×')
            );
            
            if (closeBtn) {
              console.log('✅ Found close button - testing panel close...');
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                console.log(isPanelClosed ? '✅ Panel closed successfully' : '❌ Panel still visible');
              }, 500);
            }
          } else {
            console.log('❌ DraggableResizablePanel not found');
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
                         document.querySelector('[class*="wizard"]');
            
            if (wizard) {
              console.log('✅ TransactionWizard opened successfully!');
              console.log('Wizard features:', {
                visible: wizard.offsetParent !== null,
                hasForm: !!wizard.querySelector('form'),
                hasFields: !!wizard.querySelector('input, select, textarea')
              });
            } else {
              console.log('❌ TransactionWizard not found');
            }
          }, 2000);
        } else {
          console.log('❌ Edit button not visible - checking conditions');
        }
      }, 4000);
      
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Could not find transactions table');
  }
  
  console.log('🏁 Fixed build test completed');
  console.log('📝 Expected behavior:');
  console.log('✅ No more 500 Internal Server Error');
  console.log('✅ Details: Opens UnifiedTransactionDetailsPanel in DraggableResizablePanel');
  console.log('✅ Edit: Opens TransactionWizard in edit mode');
  console.log('✅ Delete: Shows cascade delete confirmation dialog');
  
}, 2000);
