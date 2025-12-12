// Performance testing script for Transactions page optimization
// This script measures load times to verify the code splitting improvements

const puppeteer = require('puppeteer');
const path = require('path');

async function measurePageLoadTime(url, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📡 URL: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable performance monitoring
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Collect performance metrics
    const metrics = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Get detailed performance timing
    const performanceTiming = await page.evaluate(() => {
      const timing = window.performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0,
        interactive: timing.domInteractive - timing.navigationStart
      };
    });
    
    // Get network information for chunk loading
    const networkEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js') || entry.name.includes('.chunk'))
        .map(entry => ({
          name: entry.name.split('/').pop(),
          size: entry.transferSize || 0,
          duration: entry.duration,
          startTime: entry.startTime
        }));
    });
    
    console.log(`⏱️  Performance Metrics:`);
    console.log(`   • DOM Content Loaded: ${performanceTiming.domContentLoaded}ms`);
    console.log(`   • Load Complete: ${performanceTiming.loadComplete}ms`);
    console.log(`   • First Paint: ${performanceTiming.firstPaint}ms`);
    console.log(`   • First Contentful Paint: ${performanceTiming.firstContentfulPaint}ms`);
    console.log(`   • Time to Interactive: ${performanceTiming.interactive}ms`);
    
    console.log(`📦 JavaScript Chunks Loaded:`);
    networkEntries.forEach(chunk => {
      console.log(`   • ${chunk.name}: ${(chunk.size / 1024).toFixed(1)}KB, ${chunk.duration.toFixed(1)}ms`);
    });
    
    const totalChunkSize = networkEntries.reduce((sum, chunk) => sum + chunk.size, 0);
    console.log(`   • Total JS Size: ${(totalChunkSize / 1024).toFixed(1)}KB`);
    
    return {
      testName,
      timeToInteractive: performanceTiming.interactive,
      firstContentfulPaint: performanceTiming.firstContentfulPaint,
      totalChunkSize,
      chunkCount: networkEntries.length,
      chunks: networkEntries
    };
    
  } catch (error) {
    console.error(`❌ Error testing ${testName}:`, error.message);
    return null;
  } finally {
    await browser.close();
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting Performance Test for Transactions Page Optimization');
  console.log('================================================================');
  
  const baseUrl = 'http://localhost:5173'; // Default Vite dev server port
  
  // Test the main transactions page
  const transactionsResult = await measurePageLoadTime(
    `${baseUrl}/transactions`,
    'Transactions Page (with Code Splitting)'
  );
  
  if (transactionsResult) {
    console.log('\n📊 Results Summary:');
    console.log('==================');
    console.log(`⏱️  Time to Interactive: ${transactionsResult.timeToInteractive}ms`);
    console.log(`🎨 First Contentful Paint: ${transactionsResult.firstContentfulPaint}ms`);
    console.log(`📦 Total JS Size: ${(transactionsResult.totalChunkSize / 1024).toFixed(1)}KB`);
    console.log(`🔢 Number of Chunks: ${transactionsResult.chunkCount}`);
    
    // Check if optimization goal was met
    const targetTime = 500; // 500ms target
    const actualTime = transactionsResult.timeToInteractive;
    
    console.log('\n🎯 Optimization Goal Analysis:');
    console.log('================================');
    console.log(`Target Time: <${targetTime}ms`);
    console.log(`Actual Time: ${actualTime}ms`);
    
    if (actualTime < targetTime) {
      console.log('✅ SUCCESS: Load time is under 500ms!');
      console.log(`🚀 Improvement: ${((1600 - actualTime) / 1600 * 100).toFixed(1)}% faster than baseline`);
    } else {
      console.log('⚠️  PARTIAL: Load time improved but still above 500ms');
      console.log(`📈 Improvement: ${((1600 - actualTime) / 1600 * 100).toFixed(1)}% faster than baseline`);
    }
    
    // Analyze chunk loading
    console.log('\n📦 Code Splitting Analysis:');
    console.log('==========================');
    const mainChunks = transactionsResult.chunks.filter(c => c.name.includes('Transactions'));
    const lazyChunks = transactionsResult.chunks.filter(c => 
      c.name.includes('HeaderTable') || 
      c.name.includes('LinesTable') || 
      c.name.includes('UnifiedCRUDForm')
    );
    
    console.log(`Main page chunks: ${mainChunks.length}`);
    console.log(`Lazy-loaded chunks: ${lazyChunks.length}`);
    
    if (lazyChunks.length > 0) {
      console.log('✅ Code splitting is working - components are loaded as separate chunks');
      lazyChunks.forEach(chunk => {
        console.log(`   • ${chunk.name}: ${(chunk.size / 1024).toFixed(1)}KB`);
      });
    } else {
      console.log('⚠️  No lazy-loaded chunks detected - code splitting may not be active');
    }
  }
  
  console.log('\n🏁 Performance test completed!');
}

// Check if dev server is running, then start the test
async function checkDevServerAndRun() {
  console.log('🔍 Checking if development server is running...');
  
  try {
    const response = await fetch('http://localhost:5173');
    if (response.ok) {
      console.log('✅ Development server is running');
      await runPerformanceTest();
    } else {
      console.log('❌ Development server is not responding correctly');
      console.log('💡 Please start the dev server with: npm run dev');
    }
  } catch (error) {
    console.log('❌ Development server is not running');
    console.log('💡 Please start the dev server with: npm run dev');
    console.log('📝 Then run: node test-performance.js');
  }
}

// Install dependencies if needed
async function checkDependencies() {
  const fs = require('fs');
  const packagePath = path.join(__dirname, 'package.json');
  
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (!packageJson.devDependencies?.puppeteer) {
      console.log('📦 Installing puppeteer for performance testing...');
      const { execSync } = require('child_process');
      execSync('npm install --save-dev puppeteer', { stdio: 'inherit' });
    }
  }
}

// Main execution
if (require.main === module) {
  checkDependencies().then(() => {
    checkDevServerAndRun().catch(console.error);
  });
}

module.exports = { measurePageLoadTime, runPerformanceTest };
