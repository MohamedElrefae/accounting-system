// Final test to verify transaction buttons are working with debugging
console.log('🧪 Final Test - Transaction Buttons with Debugging...');

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
        console.log('✅ Found Details button - testing click...');
        detailsBtn.click();
        
        setTimeout(() => {
          console.log('Checking if details opened...');
          const detailsPanel = document.querySelector('[class*="details"]') || 
                              document.querySelector('[class*="panel"]') ||
                              document.querySelector('[style*="position: fixed"]');
          
          if (detailsPanel) {
            console.log('✅ Details panel opened successfully!');
          } else {
            console.log('❌ No details panel found - check console for errors');
          }
        }, 1000);
      }
      
      // Test Edit button
      setTimeout(() => {
        const editBtn = Array.from(actionButtons).find(btn => 
          btn.textContent?.includes('تعديل') || 
          btn.textContent?.includes('تحرير')
        );
        
        if (editBtn) {
          console.log('✅ Found Edit button - testing click...');
          editBtn.click();
          
          setTimeout(() => {
            console.log('Checking if edit form opened...');
            const editForm = document.querySelector('[class*="form"]') || 
                           document.querySelector('[class*="wizard"]') ||
                           document.querySelector('[class*="modal"]');
            
            if (editForm) {
              console.log('✅ Edit form opened successfully!');
            } else {
              console.log('❌ No edit form found - check console for errors');
            }
          }, 1000);
        } else {
          console.log('❌ Edit button not visible - checking conditions in console logs');
          console.log('The Edit button may be hidden due to:');
          console.log('- Transaction is posted (is_posted = true)');
          console.log('- Transaction is approved (all lines approved)');
          console.log('- User lacks permissions');
          console.log('- User did not create the transaction');
          console.log('- Current mode does not allow editing');
        }
      }, 2000);
      
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Could not find transactions table');
  }
  
  console.log('🏁 Final button test completed');
  console.log('📝 Check the browser console for debug messages when clicking buttons');
  
}, 2000);
