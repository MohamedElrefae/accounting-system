// Test to verify basic button functionality in transaction table
console.log('🧪 Testing Basic Button Functionality...');

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
      
      // List all buttons
      actionButtons.forEach((btn, index) => {
        console.log(`Button ${index + 1}:`, {
          text: btn.textContent?.trim(),
          title: btn.title,
          className: btn.className,
          disabled: btn.disabled,
          visible: btn.offsetParent !== null
        });
      });
      
      // Test the basic test button first
      const testBtn = Array.from(actionButtons).find(btn => 
        btn.textContent?.includes('اختبار')
      );
      
      if (testBtn) {
        console.log('✅ Found test button - clicking to verify basic functionality...');
        
        // Add event listener to catch the click
        testBtn.addEventListener('click', function(e) {
          console.log('🔥 Test button click event fired!', e);
        });
        
        // Click the test button
        testBtn.click();
        
        setTimeout(() => {
          console.log('✅ Test button clicked - should have shown alert');
          
          // Now test the Details button
          const detailsBtn = Array.from(actionButtons).find(btn => 
            btn.textContent?.includes('تفاصيل') || 
            btn.title?.includes('تفاصيل')
          );
          
          if (detailsBtn) {
            console.log('✅ Found Details button - testing click...');
            
            // Add event listener to catch the click
            detailsBtn.addEventListener('click', function(e) {
              console.log('🔥 Details button click event fired!', e);
            });
            
            // Click the details button
            detailsBtn.click();
            
            setTimeout(() => {
              console.log('Checking for details panel...');
              const detailsPanel = document.querySelector('[class*="details"]') || 
                                  document.querySelector('[class*="panel"]') ||
                                  document.querySelector('[style*="position: fixed"]');
              
              if (detailsPanel) {
                console.log('✅ Details panel found after click!');
              } else {
                console.log('❌ No details panel found - check console for debug messages');
              }
            }, 2000);
          } else {
            console.log('❌ No Details button found');
          }
        }, 1000);
      } else {
        console.log('❌ No test button found - something is wrong with button rendering');
      }
      
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Could not find transactions table');
  }
  
  console.log('🏁 Basic button test completed');
  
}, 2000);
