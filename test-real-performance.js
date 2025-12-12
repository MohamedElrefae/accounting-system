// Real-world performance test for Transactions page optimization
// This measures the actual bottlenecks: auth + data loading

console.log('🚀 Starting Real Performance Test for Transactions Page');
console.log('================================================================');

// Measure initial page load (before any data loading)
const startTime = performance.now();
console.log(`⏱️ Test started at: ${startTime.toFixed(2)}ms`);

// Track network requests
const networkRequests = [];
const originalFetch = window.fetch;

window.fetch = function(...args) {
  const requestStart = performance.now();
  const url = args[0];
  
  return originalFetch.apply(this, args).then(response => {
    const requestEnd = performance.now();
    const duration = requestEnd - requestStart;
    
    networkRequests.push({
      url: typeof url === 'string' ? url : url.url,
      duration,
      size: response.headers.get('content-length') || 'unknown',
      timestamp: requestStart
    });
    
    console.log(`📡 API Call: ${url.split('/').pop()} - ${duration.toFixed(2)}ms`);
    return response;
  });
};

// Measure Time to Interactive (when user can actually interact)
let ttiMeasured = false;
const measureTTI = () => {
  if (ttiMeasured) return;
  
  // Check if page is interactive (no loading spinners, buttons enabled)
  const loadingElements = document.querySelectorAll('.loading-spinner, [disabled*="true"]');
  const transactionTable = document.querySelector('table tbody tr');
  
  if (loadingElements.length === 0 && transactionTable) {
    const tti = performance.now() - startTime;
    ttiMeasured = true;
    
    console.log('\n📊 PERFORMANCE RESULTS');
    console.log('=======================');
    console.log(`⏱️ Time to Interactive: ${tti.toFixed(0)}ms`);
    
    // Analyze network requests
    const authRequests = networkRequests.filter(r => r.url.includes('auth') || r.url.includes('session'));
    const dataRequests = networkRequests.filter(r => r.url.includes('transaction') || r.url.includes('organizations') || r.url.includes('projects'));
    const totalRequests = networkRequests.length;
    
    console.log(`\n📡 Network Analysis:`);
    console.log(`• Total API calls: ${totalRequests}`);
    console.log(`• Auth calls: ${authRequests.length}`);
    console.log(`• Data calls: ${dataRequests.length}`);
    
    if (authRequests.length > 0) {
      const authTime = authRequests.reduce((sum, r) => sum + r.duration, 0);
      console.log(`• Auth total time: ${authTime.toFixed(0)}ms`);
    }
    
    if (dataRequests.length > 0) {
      const dataTime = dataRequests.reduce((sum, r) => sum + r.duration, 0);
      console.log(`• Data loading total time: ${dataTime.toFixed(0)}ms`);
    }
    
    // Check for optimization success
    const targetTime = 500; // 500ms target
    const actualTime = tti;
    
    console.log(`\n🎯 OPTIMIZATION ANALYSIS:`);
    console.log(`• Target: <${targetTime}ms`);
    console.log(`• Actual: ${actualTime.toFixed(0)}ms`);
    
    if (actualTime < targetTime) {
      console.log('✅ SUCCESS: Page is interactive in under 500ms!');
      console.log(`🚀 Performance improvement: ${((5000 - actualTime) / 5000 * 100).toFixed(1)}% faster than baseline`);
    } else if (actualTime < 2000) {
      console.log('⚠️ IMPROVED: Page is faster but still above 500ms target');
      console.log(`📈 Performance improvement: ${((5000 - actualTime) / 5000 * 100).toFixed(1)}% faster than baseline`);
    } else {
      console.log('❌ SLOW: Page is still taking too long to load');
      console.log(`📉 Only ${((5000 - actualTime) / 5000 * 100).toFixed(1)}% improvement from baseline`);
    }
    
    // Check for on-demand loading
    console.log(`\n🔄 ON-DEMAND LOADING CHECK:`);
    const initialDataRequests = networkRequests.filter(r => 
      r.timestamp < startTime + 1000 && // First second
      (r.url.includes('organizations') || r.url.includes('projects') || r.url.includes('accounts'))
    );
    
    const dimensionRequests = networkRequests.filter(r => 
      r.url.includes('cost-center') || 
      r.url.includes('work-item') || 
      r.url.includes('categories') ||
      r.url.includes('sub-tree')
    );
    
    console.log(`• Initial core data requests: ${initialDataRequests.length}`);
    console.log(`• Dimension requests (should be 0 initially): ${dimensionRequests.length}`);
    
    if (dimensionRequests.length === 0) {
      console.log('✅ SUCCESS: Dimensions are loaded on-demand!');
    } else {
      console.log('⚠️ WARNING: Some dimensions are still loading on initial page load');
    }
    
    // Test lazy loading by clicking a transaction
    console.log(`\n🧪 TESTING LAZY LOADING...`);
    setTimeout(() => {
      const firstRow = document.querySelector('table tbody tr');
      if (firstRow) {
        console.log('🖱️ Clicking first transaction to trigger lazy loading...');
        firstRow.click();
        
        setTimeout(() => {
          const lazyRequests = networkRequests.filter(r => 
            r.timestamp > performance.now() - 3000 && // Last 3 seconds
            (r.url.includes('cost-center') || r.url.includes('work-item') || r.url.includes('categories'))
          );
          
          console.log(`📦 Lazy-loaded requests after click: ${lazyRequests.length}`);
          if (lazyRequests.length > 0) {
            console.log('✅ SUCCESS: Lazy loading is working!');
            lazyRequests.forEach(r => {
              console.log(`   • ${r.url.split('/').pop()}: ${r.duration.toFixed(2)}ms`);
            });
          } else {
            console.log('⚠️ No lazy loading detected');
          }
          
          console.log('\n🏁 PERFORMANCE TEST COMPLETED');
        }, 2000);
      }
    }, 1000);
  }
};

// Monitor for page interactivity
const observer = new MutationObserver(() => {
  measureTTI();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'class']
});

// Initial check
measureTTI();

// Also check periodically
setInterval(measureTTI, 500);

console.log('🔍 Monitoring page load...');
