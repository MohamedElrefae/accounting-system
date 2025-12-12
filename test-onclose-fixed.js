// Test script to verify the onClose fix
console.log('🧪 Testing onClose Fix...');

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
        console.log('✅ Found Details button - opening panel...');
        detailsBtn.click();
        
        setTimeout(() => {
          // Look for the DraggableResizablePanel
          const panel = document.querySelector('[class*="DraggableResizablePanel"]') ||
                       document.querySelector('[style*="position: fixed"][style*="z-index"]');
          
          if (panel) {
            console.log('✅ Panel opened successfully');
            
            // Look for the close button
            const closeBtn = panel.querySelector('button[title*="إغلاق"]') ||
                             panel.querySelector('.closeBtn') ||
                             Array.from(panel.querySelectorAll('button')).find(btn => 
                               btn.title?.includes('إغلاق') || 
                               btn.className?.includes('closeBtn')
                             );
            
            if (closeBtn) {
              console.log('✅ Found close button - testing click...');
              console.log('🔍 Check console for DraggableResizablePanel props and close button logs');
              
              // Test the close button
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                console.log(isPanelClosed ? '✅ SUCCESS: Panel closed!' : '❌ Panel still visible');
                
                if (isPanelClosed) {
                  console.log('🎉 Close button is now working correctly!');
                } else {
                  console.log('❌ Close button still not working');
                  
                  // Try backdrop as fallback
                  const backdrop = document.querySelector('[class*="backdrop"]');
                  if (backdrop) {
                    console.log('🔄 Trying backdrop click as fallback...');
                    backdrop.click();
                    
                    setTimeout(() => {
                      const closedAfterBackdrop = !panel.offsetParent;
                      console.log(closedAfterBackdrop ? '✅ Panel closed via backdrop' : '❌ Still not closed');
                    }, 500);
                  }
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
