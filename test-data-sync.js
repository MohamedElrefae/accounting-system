// Test script to verify database data sync in UnifiedTransactionDetailsPanel
console.log('🧪 Testing Database Data Sync...');

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
        console.log('✅ Found Details button - opening panel and testing data sync...');
        detailsBtn.click();
        
        setTimeout(() => {
          // Look for the DraggableResizablePanel
          const panel = document.querySelector('[class*="DraggableResizablePanel"]') ||
                       document.querySelector('[style*="position: fixed"][style*="z-index"]');
          
          if (panel) {
            console.log('✅ Panel opened successfully');
            console.log('🔍 Check console for data fetching logs:');
            console.log('  - 🔄 Fetching transaction audit data...');
            console.log('  - 🔄 Fetching approval history...');
            console.log('  - 🔄 Fetching transaction lines...');
            console.log('  - ✅ Loaded X audit records');
            console.log('  - ✅ Loaded X approval history records');
            console.log('  - ✅ Loaded X transaction lines');
            
            // Check if the panel has real data (not placeholders)
            setTimeout(() => {
              const hasRealData = panel.textContent.includes('دينار') || 
                                panel.textContent.includes('حساب') ||
                                panel.querySelector('table tbody tr');
              
              if (hasRealData) {
                console.log('✅ SUCCESS: Panel shows real database data!');
              } else {
                console.log('❌ Panel still shows placeholder data');
                console.log('📝 Check console for any fetch errors above');
              }
              
              // Test the close button (should work with fallback)
              const closeBtn = panel.querySelector('button[title*="إغلاق"]') ||
                               panel.querySelector('.closeBtn');
              
              if (closeBtn) {
                console.log('🖱️ Testing close button...');
                closeBtn.click();
                
                setTimeout(() => {
                  const isPanelClosed = !panel.offsetParent;
                  console.log(isPanelClosed ? '✅ Close button works!' : '❌ Close button failed');
                }, 1000);
              }
            }, 3000);
            
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
