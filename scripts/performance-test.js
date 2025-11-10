#!/usr/bin/env node

/**
 * Automated Performance Testing Script
 * Tests the optimized app against performance benchmarks
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERFORMANCE_THRESHOLDS = {
  initialLoad: 3000, // 3 seconds
  routeNavigation: 1000, // 1 second
  memoryUsage: 100, // 100MB
  bundleSize: 1500, // 1.5MB
  firstContentfulPaint: 2000, // 2 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  firstInputDelay: 100, // 100ms
};

class PerformanceTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async initialize() {
    console.log('🚀 Starting Performance Tests...\n');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.setCacheEnabled(false);
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async testInitialLoad() {
    console.log('📊 Testing Initial Load Performance...');
    
    const startTime = Date.now();
    
    // Navigate to the app
    const response = await this.page.goto('http://localhost:4173', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    const test = {
      name: 'Initial Load',
      metrics: {
        totalLoadTime: loadTime,
        ...metrics
      },
      thresholds: {
        totalLoadTime: PERFORMANCE_THRESHOLDS.initialLoad,
        firstContentfulPaint: PERFORMANCE_THRESHOLDS.firstContentfulPaint
      },
      passed: loadTime <= PERFORMANCE_THRESHOLDS.initialLoad && 
              metrics.firstContentfulPaint <= PERFORMANCE_THRESHOLDS.firstContentfulPaint
    };

    this.results.tests.push(test);
    this.updateSummary(test);

    console.log(`   Total Load Time: ${loadTime}ms ${loadTime <= PERFORMANCE_THRESHOLDS.initialLoad ? '✅' : '❌'}`);
    console.log(`   First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(0)}ms ${metrics.firstContentfulPaint <= PERFORMANCE_THRESHOLDS.firstContentfulPaint ? '✅' : '❌'}`);
    console.log('');
  }

  async testRouteNavigation() {
    console.log('🧭 Testing Route Navigation Performance...');
    
    const routes = [
      '/transactions',
      '/reports/general-ledger',
      '/main-data/accounts-tree',
      '/inventory',
      '/fiscal/dashboard'
    ];

    const navigationResults = [];

    for (const route of routes) {
      const startTime = Date.now();
      
      try {
        await this.page.goto(`http://localhost:4173${route}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const navigationTime = Date.now() - startTime;
        navigationResults.push({
          route,
          time: navigationTime,
          passed: navigationTime <= PERFORMANCE_THRESHOLDS.routeNavigation
        });

        console.log(`   ${route}: ${navigationTime}ms ${navigationTime <= PERFORMANCE_THRESHOLDS.routeNavigation ? '✅' : '❌'}`);
      } catch (error) {
        navigationResults.push({
          route,
          time: 10000,
          passed: false,
          error: error.message
        });
        console.log(`   ${route}: FAILED ❌`);
      }
    }

    const avgNavigationTime = navigationResults.reduce((sum, r) => sum + r.time, 0) / navigationResults.length;
    const test = {
      name: 'Route Navigation',
      metrics: {
        averageNavigationTime: avgNavigationTime,
        routes: navigationResults
      },
      thresholds: {
        averageNavigationTime: PERFORMANCE_THRESHOLDS.routeNavigation
      },
      passed: avgNavigationTime <= PERFORMANCE_THRESHOLDS.routeNavigation
    };

    this.results.tests.push(test);
    this.updateSummary(test);

    console.log(`   Average Navigation Time: ${avgNavigationTime.toFixed(0)}ms ${test.passed ? '✅' : '❌'}`);
    console.log('');
  }

  async testMemoryUsage() {
    console.log('💾 Testing Memory Usage...');
    
    // Navigate through several routes to build up memory usage
    const routes = ['/dashboard', '/transactions', '/reports/general-ledger', '/main-data/accounts-tree'];
    
    for (const route of routes) {
      await this.page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const memoryMetrics = await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize / 1024 / 1024, // MB
          totalJSHeapSize: performance.memory.totalJSHeapSize / 1024 / 1024, // MB
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1024 / 1024 // MB
        };
      }
      return null;
    });

    if (memoryMetrics) {
      const test = {
        name: 'Memory Usage',
        metrics: memoryMetrics,
        thresholds: {
          usedJSHeapSize: PERFORMANCE_THRESHOLDS.memoryUsage
        },
        passed: memoryMetrics.usedJSHeapSize <= PERFORMANCE_THRESHOLDS.memoryUsage
      };

      this.results.tests.push(test);
      this.updateSummary(test);

      console.log(`   Used Memory: ${memoryMetrics.usedJSHeapSize.toFixed(1)}MB ${test.passed ? '✅' : '❌'}`);
      console.log(`   Total Memory: ${memoryMetrics.totalJSHeapSize.toFixed(1)}MB`);
    } else {
      console.log('   Memory metrics not available in this browser');
    }
    console.log('');
  }

  async testBundleSize() {
    console.log('📦 Testing Bundle Size...');
    
    // Get all network requests
    const responses = [];
    this.page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0')
        });
      }
    });

    await this.page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    const totalSize = responses.reduce((sum, r) => sum + r.size, 0) / 1024; // KB
    const jsSize = responses.filter(r => r.url.includes('.js')).reduce((sum, r) => sum + r.size, 0) / 1024;
    const cssSize = responses.filter(r => r.url.includes('.css')).reduce((sum, r) => sum + r.size, 0) / 1024;

    const test = {
      name: 'Bundle Size',
      metrics: {
        totalSize,
        jsSize,
        cssSize,
        fileCount: responses.length
      },
      thresholds: {
        totalSize: PERFORMANCE_THRESHOLDS.bundleSize
      },
      passed: totalSize <= PERFORMANCE_THRESHOLDS.bundleSize
    };

    this.results.tests.push(test);
    this.updateSummary(test);

    console.log(`   Total Bundle Size: ${totalSize.toFixed(0)}KB ${test.passed ? '✅' : '❌'}`);
    console.log(`   JavaScript: ${jsSize.toFixed(0)}KB`);
    console.log(`   CSS: ${cssSize.toFixed(0)}KB`);
    console.log(`   Files: ${responses.length}`);
    console.log('');
  }

  updateSummary(test) {
    if (test.passed) {
      this.results.summary.passed++;
    } else {
      this.results.summary.failed++;
    }
  }

  async generateReport() {
    console.log('📋 Generating Performance Report...\n');

    const reportPath = path.join(process.cwd(), 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Console summary
    console.log('='.repeat(50));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`📊 Total Score: ${Math.round((this.results.summary.passed / this.results.tests.length) * 100)}%`);
    console.log('='.repeat(50));

    if (this.results.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests.filter(t => !t.passed).forEach(test => {
        console.log(`   - ${test.name}`);
      });
    }

    console.log(`\n📄 Full report saved to: ${reportPath}`);

    return this.results.summary.failed === 0;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.testInitialLoad();
      await this.testRouteNavigation();
      await this.testMemoryUsage();
      await this.testBundleSize();
      
      const allPassed = await this.generateReport();
      await this.cleanup();

      process.exit(allPassed ? 0 : 1);
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new PerformanceTester();
tester.run();