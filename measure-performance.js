// Performance measurement script for Transactions page
// Copy and paste this into the browser console on the Transactions page

function measureTransactionsPerformance() {
  console.log('🚀 Measuring Transactions Page Performance...');
  console.log('================================================');
  
  // Get performance timing
  const timing = window.performance.timing;
  const navigation = window.performance.navigation;
  
  // Calculate key metrics
  const metrics = {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,
    domProcessing: timing.domComplete - timing.domLoading,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    loadComplete: timing.loadEventEnd - timing.navigationStart,
    timeToInteractive: timing.domInteractive - timing.navigationStart,
    firstPaint: 0,
    firstContentfulPaint: 0
  };
  
  // Get paint metrics
  const paintEntries = performance.getEntriesByType('paint');
  if (paintEntries.length >= 1) {
    metrics.firstPaint = paintEntries[0].startTime;
  }
  if (paintEntries.length >= 2) {
    metrics.firstContentfulPaint = paintEntries[1].startTime;
  }
  
  // Get JavaScript chunks
  const resources = performance.getEntriesByType('resource');
  const jsChunks = resources.filter(r => r.name.includes('.js') || r.name.includes('.chunk'));
  const lazyChunks = jsChunks.filter(r => 
    r.name.includes('HeaderTable') || 
    r.name.includes('LinesTable') || 
    r.name.includes('UnifiedCRUDForm')
  );
  
  const totalSize = jsChunks.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  
  // Display results
  console.log('⏱️ Performance Metrics:');
  console.log('------------------------');
  console.log(`• DNS Lookup: ${metrics.dns}ms`);
  console.log(`• TCP Connection: ${metrics.tcp}ms`);
  console.log(`• Request Time: ${metrics.request}ms`);
  console.log(`• Response Time: ${metrics.response}ms`);
  console.log(`• DOM Processing: ${metrics.domProcessing}ms`);
  console.log(`• DOM Content Loaded: ${metrics.domContentLoaded}ms`);
  console.log(`• Load Complete: ${metrics.loadComplete}ms`);
  console.log(`• Time to Interactive: ${metrics.timeToInteractive}ms`);
  console.log(`• First Paint: ${metrics.firstPaint}ms`);
  console.log(`• First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
  
  console.log('\n📦 JavaScript Chunks:');
  console.log('----------------------');
  console.log(`• Total Chunks: ${jsChunks.length}`);
  console.log(`• Total Size: ${(totalSize / 1024).toFixed(1)}KB`);
  console.log(`• Lazy-loaded Chunks: ${lazyChunks.length}`);
  
  console.log('\n📋 Chunk Details:');
  jsChunks.forEach((chunk, index) => {
    const name = chunk.name.split('/').pop();
    const size = (chunk.transferSize || 0) / 1024;
    const isLazy = name.includes('HeaderTable') || name.includes('LinesTable') || name.includes('UnifiedCRUDForm');
    console.log(`${index + 1}. ${isLazy ? '🔄' : '📦'} ${name}: ${size.toFixed(1)}KB, ${chunk.duration.toFixed(1)}ms`);
  });
  
  // Performance analysis
  console.log('\n🎯 Optimization Analysis:');
  console.log('--------------------------');
  
  const targetTime = 500;
  const actualTime = metrics.timeToInteractive;
  const improvement = ((1600 - actualTime) / 1600 * 100).toFixed(1);
  
  console.log(`• Target Time: <${targetTime}ms`);
  console.log(`• Actual Time: ${actualTime}ms`);
  console.log(`• Improvement: ${improvement}% faster than baseline`);
  
  if (actualTime < targetTime) {
    console.log('✅ SUCCESS: Load time is under 500ms!');
  } else {
    console.log('⚠️ Load time improved but still above 500ms target');
  }
  
  if (lazyChunks.length > 0) {
    console.log('✅ Code splitting is working - components loaded as separate chunks');
  } else {
    console.log('⚠️ No lazy-loaded chunks detected - code splitting may not be active');
  }
  
  // Return results for programmatic use
  return {
    metrics,
    chunks: jsChunks,
    lazyChunks,
    totalSize,
    targetMet: actualTime < targetTime,
    improvement: parseFloat(improvement)
  };
}

// Function to test lazy loading behavior
function testLazyLoading() {
  console.log('\n🧪 Testing Lazy Loading Behavior...');
  console.log('====================================');
  
  // Check if lazy components are loaded
  const lazyComponents = [
    'TransactionsHeaderTable',
    'TransactionLinesTable', 
    'UnifiedCRUDForm'
  ];
  
  lazyComponents.forEach(component => {
    const elements = document.querySelectorAll(`[data-testid*="${component.toLowerCase()}"], .${component.toLowerCase()}`);
    console.log(`• ${component}: ${elements.length > 0 ? '✅ Loaded' : '⏳ Not loaded yet'}`);
  });
  
  // Trigger lazy loading by interacting with the page
  console.log('\n🔄 Triggering lazy loading...');
  
  // Try to find and click a transaction to load the lines table
  const transactionRows = document.querySelectorAll('tbody tr, [role="row"]');
  if (transactionRows.length > 0) {
    console.log('• Clicking first transaction to trigger lines table loading...');
    transactionRows[0].click();
    
    setTimeout(() => {
      console.log('• Checking if lazy components loaded after interaction...');
      measureTransactionsPerformance();
    }, 2000);
  } else {
    console.log('• No transactions found to interact with');
  }
}

// Auto-run the measurement
console.log('📊 Performance measurement script loaded');
console.log('💡 Run measureTransactionsPerformance() to start measuring');
console.log('💡 Run testLazyLoading() to test lazy loading behavior');

// Run immediately if requested
measureTransactionsPerformance();
