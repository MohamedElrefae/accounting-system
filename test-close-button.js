// Test script to debug the close button issue in UnifiedTransactionDetailsPanel
console.log('🧪 Testing UnifiedTransactionDetailsPanel Close Button...');

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
                             panel.querySelector('button[title*="close"]') ||
                             Array.from(panel.querySelectorAll('button')).find(btn => 
                               btn.title?.includes('إغلاق') || 
                               btn.title?.includes('close')
                             );
            
            if (closeBtn) {
              console.log('✅ Found close button:', {
                visible: closeBtn.offsetParent !== null,
                title: closeBtn.title,
                className: closeBtn.className,
                hasOnClick: !!closeBtn.onclick,
                onclick: closeBtn.onclick?.toString()
              });
              
              // Add a click listener to debug
              closeBtn.addEventListener('click', (e) => {
                console.log('🔥 Close button clicked!', e);
                console.log('Event details:', {
                  type: e.type,
                  target: e.target,
                  currentTarget: e.currentTarget
                });
              });
              
              // Test the close button
              console.log('🖱️ Testing close button click...');
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                console.log(isPanelClosed ? '✅ Panel closed successfully' : '❌ Panel still visible');
                
                if (!isPanelClosed) {
                  console.log('🔍 Debugging panel state...');
                  console.log('Panel element:', panel);
                  console.log('Panel style:', panel.style.cssText);
                  console.log('Panel class list:', panel.className);
                  
                  // Check if there's a backdrop
                  const backdrop = document.querySelector('[class*="backdrop"]');
                  if (backdrop) {
                    console.log('Backdrop still present:', backdrop);
                  }
                }
              }, 1000);
              
            } else {
              console.log('❌ Close button not found');
              console.log('Available buttons in panel:');
              panel.querySelectorAll('button').forEach((btn, index) => {
                console.log(`Button ${index + 1}:`, {
                  title: btn.title,
                  text: btn.textContent?.trim(),
                  className: btn.className,
                  visible: btn.offsetParent !== null
                });
              });
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
  
}, 2000);
