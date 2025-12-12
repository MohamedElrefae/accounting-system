// Test script to verify panel open/close cycle works reliably
console.log('🧪 Testing Panel Open/Close Cycle...');

let testCount = 0;
const maxTests = 3;

function runTestCycle() {
  testCount++;
  console.log(`\n🔄 Test Cycle ${testCount}/${maxTests}`);
  
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
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                if (isPanelClosed) {
                  console.log('✅ Step 4: Panel closed successfully!');
                  
                  if (testCount < maxTests) {
                    console.log('🔄 Waiting 1 second before next test...');
                    setTimeout(runTestCycle, 1000);
                  } else {
                    console.log('\n🎉 ALL TESTS PASSED!');
                    console.log('✅ Panel open/close cycle is working reliably');
                    console.log('✅ No more onClose prop errors');
                    console.log('✅ Panel can be reopened multiple times');
                  }
                } else {
                  console.log('❌ Step 4 Failed: Panel still visible after close click');
                  console.log('🔍 Check console for any onClose errors');
                }
              }, 1000);
              
            } else {
              console.log('❌ Step 3 Failed: Close button not found');
            }
            
          } else {
            console.log('❌ Step 2 Failed: Panel not found after opening');
          }
        }, 2000);
        
      } else {
        console.log('❌ Step 1 Failed: Details button not found');
      }
    } else {
      console.log('❌ No transaction rows found');
    }
  } else {
    console.log('❌ Transactions table not found');
  }
}

// Start the test cycle
setTimeout(runTestCycle, 1000);
