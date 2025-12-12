// Comprehensive test to debug the close button issue
console.log('🧪 Comprehensive Close Button Debug Test...');

// Track console logs to see if onClose is called
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  if (args[0] === '🔥 Close button clicked in DraggableResizablePanel!') {
    console.log('✅ SUCCESS: onClose function was called!');
  }
  if (args[0] === '🔍 Details panel state changed:') {
    console.log('📊 State change detected:', args[1]);
  }
};

setTimeout(() => {
  console.log('🔍 Starting test...');
  
  // Find and click the Details button to open the panel
  const detailsBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('تفاصيل') || 
    btn.title?.includes('تفاصيل')
  );
  
  if (detailsBtn) {
    console.log('✅ Found Details button, clicking to open panel...');
    detailsBtn.click();
    
    setTimeout(() => {
      // Look for the panel
      const panel = document.querySelector('[class*="DraggableResizablePanel"]') ||
                   document.querySelector('[style*="position: fixed"][style*="z-index"]');
      
      if (panel) {
        console.log('✅ Panel is open and visible');
        
        // Find all buttons in the panel
        const buttons = panel.querySelectorAll('button');
        console.log(`🔍 Found ${buttons.length} buttons in panel`);
        
        buttons.forEach((btn, index) => {
          console.log(`Button ${index + 1}:`, {
            title: btn.title,
            text: btn.textContent?.trim(),
            className: btn.className,
            visible: btn.offsetParent !== null
          });
        });
        
        // Find the close button specifically
        const closeBtn = Array.from(buttons).find(btn => 
          btn.title?.includes('إغلاق') || 
          btn.title?.toLowerCase().includes('close') ||
          btn.className?.includes('close')
        );
        
        if (closeBtn) {
          console.log('✅ Found close button, testing click...');
          console.log('Close button details:', {
            title: closeBtn.title,
            className: closeBtn.className,
            hasOnClick: !!closeBtn.onclick,
            eventListeners: Object.getOwnPropertyNames(closeBtn).filter(prop => prop.startsWith('on'))
          });
          
          // Try multiple ways to trigger the click
          console.log('🖱️ Attempting click via click() method...');
          closeBtn.click();
          
          // Also try dispatching a click event
          setTimeout(() => {
            console.log('🖱️ Attempting click via dispatchEvent...');
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            closeBtn.dispatchEvent(clickEvent);
            
            // Check if panel closed after both attempts
            setTimeout(() => {
              const isPanelVisible = panel.offsetParent !== null;
              if (isPanelVisible) {
                console.log('❌ Panel still visible after click attempts');
                
                // Try to find and click the backdrop
                const backdrop = document.querySelector('[class*="backdrop"]');
                if (backdrop) {
                  console.log('🖱️ Trying backdrop click...');
                  backdrop.click();
                  
                  setTimeout(() => {
                    const stillVisible = panel.offsetParent !== null;
                    console.log(stillVisible ? '❌ Panel still visible after backdrop click' : '✅ Panel closed via backdrop');
                  }, 500);
                }
                
                // Try pressing Escape key
                setTimeout(() => {
                  console.log('⌨️ Trying Escape key...');
                  const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true
                  });
                  document.dispatchEvent(escapeEvent);
                  
                  setTimeout(() => {
                    const finalState = panel.offsetParent !== null;
                    console.log(finalState ? '❌ Panel still visible after Escape key' : '✅ Panel closed via Escape key');
                    
                    if (finalState) {
                      console.log('🔧 Manual fix attempt - calling state setter directly...');
                      // Try to manually set the state to false via React DevTools or console
                      console.log('You can try manually closing by running in console:');
                      console.log('React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current.useState()[1](false)');
                    }
                  }, 500);
                }, 1000);
                
              } else {
                console.log('✅ Panel closed successfully!');
              }
            }, 1000);
            
          }, 500);
          
        } else {
          console.log('❌ Close button not found in panel');
          console.log('Available button titles:', Array.from(buttons).map(btn => btn.title));
        }
        
      } else {
        console.log('❌ Panel not found after opening');
      }
    }, 2000);
    
  } else {
    console.log('❌ Details button not found');
  }
  
}, 1000);
