// Test to debug transaction header table buttons (Edit/Details)
console.log('🧪 Testing Transaction Header Table Buttons...');

setTimeout(() => {
  // Find the transactions header table
  const headerTable = document.querySelector('.transactions-header-table') || 
                      document.querySelector('table') ||
                      document.querySelector('[class*="table"]');
  
  if (headerTable) {
    console.log('✅ Found transactions table');
    
    // Find all action buttons in the table
    const actionButtons = headerTable.querySelectorAll('button');
    console.log(`Found ${actionButtons.length} buttons in table`);
    
    // Look for Edit and Details buttons specifically
    const editButtons = Array.from(actionButtons).filter(btn => 
      btn.textContent?.includes('تحرير') || 
      btn.textContent?.includes('تعديل') ||
      btn.title?.includes('تحرير') ||
      btn.title?.includes('تعديل') ||
      btn.className?.includes('edit')
    );
    
    const detailsButtons = Array.from(actionButtons).filter(btn => 
      btn.textContent?.includes('تفاصيل') || 
      btn.title?.includes('تفاصيل') ||
      btn.className?.includes('details')
    );
    
    console.log(`Found ${editButtons.length} Edit buttons`);
    console.log(`Found ${detailsButtons.length} Details buttons`);
    
    if (detailsButtons.length > 0) {
      console.log('🖱️ Testing Details button...');
      const firstDetailsBtn = detailsButtons[0];
      
      // Check if button has click handler
      console.log('Button details:', {
        text: firstDetailsBtn.textContent,
        title: firstDetailsBtn.title,
        className: firstDetailsBtn.className,
        hasOnClick: !!firstDetailsBtn.onclick,
        eventListeners: Object.getOwnPropertyNames(firstDetailsBtn).filter(prop => prop.startsWith('on'))
      });
      
      // Add debug click listener
      firstDetailsBtn.addEventListener('click', function(e) {
        console.log('🔥 Details button clicked!', e);
        console.log('Event details:', {
          type: e.type,
          bubbles: e.bubbles,
          cancelable: e.cancelable,
          defaultPrevented: e.defaultPrevented
        });
      });
      
      // Simulate click
      console.log('🖱️ Simulating click on Details button...');
      firstDetailsBtn.click();
      
      setTimeout(() => {
        console.log('Checking if details panel opened...');
        const detailsPanel = document.querySelector('[class*="details"]') || 
                            document.querySelector('[class*="panel"]') ||
                            document.querySelector('[style*="position: fixed"]');
        
        if (detailsPanel) {
          console.log('✅ Details panel found after click');
        } else {
          console.log('❌ No details panel found after click');
        }
      }, 1000);
    }
    
    if (editButtons.length > 0) {
      setTimeout(() => {
        console.log('🖱️ Testing Edit button...');
        const firstEditBtn = editButtons[0];
        
        // Check if button has click handler
        console.log('Edit button details:', {
          text: firstEditBtn.textContent,
          title: firstEditBtn.title,
          className: firstEditBtn.className,
          hasOnClick: !!firstEditBtn.onclick,
          eventListeners: Object.getOwnPropertyNames(firstEditBtn).filter(prop => prop.startsWith('on'))
        });
        
        // Add debug click listener
        firstEditBtn.addEventListener('click', function(e) {
          console.log('🔥 Edit button clicked!', e);
          console.log('Event details:', {
            type: e.type,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            defaultPrevented: e.defaultPrevented
          });
        });
        
        // Simulate click
        console.log('🖱️ Simulating click on Edit button...');
        firstEditBtn.click();
        
        setTimeout(() => {
          console.log('Checking if edit form opened...');
          const editForm = document.querySelector('[class*="form"]') || 
                         document.querySelector('[class*="wizard"]') ||
                         document.querySelector('[class*="modal"]');
          
          if (editForm) {
            console.log('✅ Edit form found after click');
          } else {
            console.log('❌ No edit form found after click');
          }
        }, 1000);
      }, 2000);
    }
    
    // Check for any JavaScript errors
    window.addEventListener('error', function(e) {
      console.error('🚨 JavaScript error detected:', e.error);
    });
    
    console.log('🏁 Button test completed');
    
  } else {
    console.log('❌ Could not find transactions table');
  }
}, 2000);
