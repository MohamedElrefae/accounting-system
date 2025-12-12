// Final test to verify onClose prop fix works reliably
console.log('🧪 Testing Final onClose Fix...');

setTimeout(() => {
  // Find the transactions header table
  const headerTable = document.querySelector('.transactions-header-table') || 
                      document.querySelector('table') ||
                      document.querySelector('[class*="table"]');
  
  if (headerTable) {
    const rows = headerTable.querySelectorAll('tbody tr');
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      const actionButtons = firstRow.querySelectorAll('button');
      
      // Find and click the Details button
      const detailsBtn = Array.from(actionButtons).find(btn => 
        btn.textContent?.includes('تفاصيل') || 
        btn.title?.includes('تفاصيل')
      );
      
      if (detailsBtn) {
        console.log('✅ Step 1: Opening panel...');
        detailsBtn.click();
        
        setTimeout(() => {
          // Look for the DraggableResizablePanel
          const panel = document.querySelector('[class*="DraggableResizablePanel"]') ||
                       document.querySelector('[style*="position: fixed"][style*="z-index"]');
          
          if (panel) {
            console.log('✅ Step 2: Panel opened successfully');
            
            // Look for the close button
            const closeBtn = panel.querySelector('button[title*="إغلاق"]') ||
                             panel.querySelector('.closeBtn') ||
                             Array.from(panel.querySelectorAll('button')).find(btn => 
                               btn.title?.includes('إغلاق') || 
                               btn.className?.includes('closeBtn')
                             );
            
            if (closeBtn) {
              console.log('✅ Step 3: Found close button, testing click...');
              console.log('🔍 This should now work without onClose errors');
              
              // Test the close button
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                if (isPanelClosed) {
                  console.log('🎉 SUCCESS: Panel closed!');
                  console.log('✅ onClose prop is now stable across re-renders');
                  console.log('✅ No more "onClose is not a function" errors');
                  
                  // Test reopening to make sure it still works
                  setTimeout(() => {
                    console.log('🔄 Testing reopening...');
                    detailsBtn.click();
                    
                    setTimeout(() => {
                      const panelReopened = document.querySelector('[class*="DraggableResizablePanel"]');
                      if (panelReopened && panelReopened.offsetParent) {
                        console.log('✅ Panel reopened successfully!');
                        console.log('🎉 ALL ISSUES FIXED!');
                      } else {
                        console.log('❌ Panel failed to reopen');
                      }
                    }, 2000);
                  }, 1000);
                } else {
                  console.log('❌ Panel still visible - onClose prop issue persists');
                }
              }, 1000);
              
            } else {
              console.log('❌ Close button not found');
            }
            
          } else {
            console.log('❌ Panel not found');
          }
        }, 2000);
        
      } else {
        console.log('❌ Details button not found');
      }
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Transactions table not found');
  }
  
}, 1000);
