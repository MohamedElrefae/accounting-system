// Debug script to understand onClose prop differences between automated and manual testing
console.log('🧪 Debug onClose prop behavior...');

// Monitor console for specific debug messages
const originalLog = console.log;
const originalError = console.error;

let onClosePropType = 'unknown';
let onClosePropValue = 'unknown';
let handleFunctionType = 'unknown';

console.log = (...args) => {
  originalLog(...args);
  
  // Capture DraggableResizablePanel debug info
  if (args[0] === '🔍 DraggableResizablePanel render - onClose type:') {
    onClosePropType = args[1];
    console.log('📊 CAPTURED: onClose prop type in DraggableResizablePanel:', onClosePropType);
  }
  
  if (args[0] === '🔍 DraggableResizablePanel render - onClose value:') {
    onClosePropValue = args[1];
    console.log('📊 CAPTURED: onClose prop value in DraggableResizablePanel:', onClosePropValue);
  }
  
  // Capture handleDetailsPanelClose debug info
  if (args[0] === '🔍 handleDetailsPanelClose defined:') {
    handleFunctionType = args[1];
    console.log('📊 CAPTURED: handleDetailsPanelClose type in parent:', handleFunctionType);
  }
  
  // Capture when function is actually called
  if (args[0] === '🔥 handleDetailsPanelClose called!') {
    console.log('🎉 SUCCESS: handleDetailsPanelClose was executed!');
  }
};

console.error = originalError;

setTimeout(() => {
  console.log('🔍 Starting debug test...');
  
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
            console.log('📊 SUMMARY OF CAPTURED DATA:');
            console.log('  - handleDetailsPanelClose type:', handleFunctionType);
            console.log('  - onClose prop type in panel:', onClosePropType);
            console.log('  - onClose prop value in panel:', onClosePropValue);
            
            // Look for the close button
            const closeBtn = panel.querySelector('button[title*="إغلاق"]') ||
                             panel.querySelector('.closeBtn') ||
                             Array.from(panel.querySelectorAll('button')).find(btn => 
                               btn.title?.includes('إغلاق') || 
                               btn.className?.includes('closeBtn')
                             );
            
            if (closeBtn) {
              console.log('✅ Found close button - testing click...');
              console.log('🔍 This should show the same behavior as manual testing');
              
              // Test the close button
              closeBtn.click();
              
              setTimeout(() => {
                const isPanelClosed = !panel.offsetParent;
                console.log(isPanelClosed ? '✅ SUCCESS: Panel closed!' : '❌ Panel still visible');
                
                if (!isPanelClosed) {
                  console.log('🔍 ANALYSIS:');
                  console.log('  - If onClose prop is "function" but panel still closes, the issue is elsewhere');
                  console.log('  - If onClose prop is "undefined", that\'s the root cause');
                  console.log('  - Compare this with manual testing results');
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
