// Test to debug why transaction buttons are not working or showing
console.log('🧪 Testing Transaction Button Conditions...');

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
      console.log('🔍 Analyzing first transaction row...');
      
      // Look for action buttons in this row
      const actionButtons = firstRow.querySelectorAll('button');
      console.log(`Found ${actionButtons.length} buttons in first row`);
      
      actionButtons.forEach((btn, index) => {
        console.log(`Button ${index + 1}:`, {
          text: btn.textContent?.trim(),
          title: btn.title,
          className: btn.className,
          disabled: btn.disabled,
          visible: btn.offsetParent !== null,
          style: {
            display: getComputedStyle(btn).display,
            visibility: getComputedStyle(btn).visibility,
            pointerEvents: getComputedStyle(btn).pointerEvents
          }
        });
      });
      
      // Check for Details button specifically
      const detailsBtn = Array.from(actionButtons).find(btn => 
        btn.textContent?.includes('تفاصيل') || 
        btn.title?.includes('تفاصيل')
      );
      
      if (detailsBtn) {
        console.log('✅ Found Details button');
        console.log('Details button properties:', {
          disabled: detailsBtn.disabled,
          visible: detailsBtn.offsetParent !== null,
          hasClickHandler: !!detailsBtn.onclick,
          eventListeners: getEventListeners ? getEventListeners(detailsBtn) : 'N/A'
        });
        
        // Test click with detailed logging
        console.log('🖱️ Testing Details button click...');
        
        // Add multiple event listeners to catch the click
        detailsBtn.addEventListener('click', function(e) {
          console.log('🔥 Details button click event fired!', {
            type: e.type,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            currentTarget: e.currentTarget,
            target: e.target
          });
        }, true); // Use capture phase
        
        // Also monitor for any errors during click
        const originalError = window.onerror;
        window.onerror = function(msg, url, line, col, error) {
          console.error('🚨 Error during button click:', { msg, url, line, col, error });
          if (originalError) return originalError.apply(this, arguments);
        };
        
        // Simulate click
        detailsBtn.click();
        
        // Check if anything opened after click
        setTimeout(() => {
          console.log('Checking for opened panels/modals...');
          const panels = document.querySelectorAll('[class*="panel"], [class*="modal"], [style*="position: fixed"]');
          console.log(`Found ${panels.length} potential panels after click`);
          
          panels.forEach((panel, index) => {
            const style = getComputedStyle(panel);
            console.log(`Panel ${index + 1}:`, {
              display: style.display,
              visibility: style.visibility,
              zIndex: style.zIndex,
              position: style.position
            });
          });
          
          // Restore error handler
          window.onerror = originalError;
        }, 1000);
      } else {
        console.log('❌ No Details button found in first row');
      }
      
      // Check for Edit button
      const editBtn = Array.from(actionButtons).find(btn => 
        btn.textContent?.includes('تعديل') || 
        btn.textContent?.includes('تحرير') ||
        btn.title?.includes('تعديل') ||
        btn.title?.includes('تحرير')
      );
      
      if (editBtn) {
        console.log('✅ Found Edit button');
        console.log('Edit button properties:', {
          disabled: editBtn.disabled,
          visible: editBtn.offsetParent !== null,
          hasClickHandler: !!editBtn.onclick
        });
      } else {
        console.log('❌ No Edit button found - checking conditions...');
        console.log('Possible reasons for Edit button not showing:');
        console.log('- Transaction is posted (is_posted = true)');
        console.log('- Transaction is approved (all lines approved)');
        console.log('- User lacks permissions (transactions.update/manage)');
        console.log('- User did not create the transaction');
        console.log('- Mode is not "my" or "all"');
      }
      
      // Try to get transaction data from the row
      console.log('🔍 Trying to extract transaction data from row...');
      const rowCells = firstRow.querySelectorAll('td');
      rowCells.forEach((cell, index) => {
        console.log(`Cell ${index + 1}:`, cell.textContent?.trim());
      });
      
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Could not find transactions table');
  }
  
  console.log('🏁 Button conditions test completed');
}, 2000);
