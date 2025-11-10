// Bundle Analysis and Optimization Recommendations

interface BundleInfo {
  name: string;
  size: number;
  gzipSize?: number;
  modules: string[];
  loadTime?: number;
}

interface OptimizationRecommendation {
  type: 'split' | 'lazy' | 'tree-shake' | 'compress';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number; // in KB
  implementation: string;
}

class BundleAnalyzer {
  private bundles: Map<string, BundleInfo> = new Map();
  private loadTimes: Map<string, number> = new Map();

  // Track bundle loading
  trackBundleLoad(bundleName: string, size: number, loadTime: number) {
    this.bundles.set(bundleName, {
      name: bundleName,
      size,
      loadTime,
      modules: []
    });
    this.loadTimes.set(bundleName, loadTime);
  }

  // Analyze current bundle structure
  analyzeBundles(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for large bundles that should be split
    this.bundles.forEach((bundle) => {
      if (bundle.size > 500 * 1024) { // 500KB
        recommendations.push({
          type: 'split',
          priority: 'high',
          description: `Bundle "${bundle.name}" is ${(bundle.size / 1024).toFixed(0)}KB. Consider splitting into smaller chunks.`,
          estimatedSavings: bundle.size * 0.3 / 1024, // 30% savings
          implementation: `Use dynamic imports: import('./components/${bundle.name}')`
        });
      }

      if (bundle.loadTime && bundle.loadTime > 2000) { // 2 seconds
        recommendations.push({
          type: 'lazy',
          priority: 'high',
          description: `Bundle "${bundle.name}" takes ${bundle.loadTime}ms to load. Implement lazy loading.`,
          estimatedSavings: bundle.size * 0.8 / 1024, // 80% initial load savings
          implementation: `const ${bundle.name} = React.lazy(() => import('./${bundle.name}'))`
        });
      }
    });

    // Check for common optimization opportunities
    if (this.hasLargeMUIBundle()) {
      recommendations.push({
        type: 'tree-shake',
        priority: 'medium',
        description: 'MUI bundle is large. Use individual component imports for better tree-shaking.',
        estimatedSavings: 200,
        implementation: `import Button from '@mui/material/Button' instead of import { Button } from '@mui/material'`
      });
    }

    if (this.hasUnusedDependencies()) {
      recommendations.push({
        type: 'tree-shake',
        priority: 'medium',
        description: 'Unused dependencies detected. Remove or lazy load them.',
        estimatedSavings: 150,
        implementation: 'Review package.json and remove unused dependencies'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Check for large MUI bundle
  private hasLargeMUIBundle(): boolean {
    const muiBundle = Array.from(this.bundles.values()).find(b => 
      b.name.includes('mui') || b.name.includes('material')
    );
    return muiBundle ? muiBundle.size > 300 * 1024 : false; // 300KB
  }

  // Check for unused dependencies (simplified heuristic)
  private hasUnusedDependencies(): boolean {
    // This would need more sophisticated analysis in a real implementation
    return this.bundles.size > 10; // Heuristic: too many bundles might indicate unused deps
  }

  // Get bundle size report
  getBundleReport() {
    const totalSize = Array.from(this.bundles.values()).reduce((sum, bundle) => sum + bundle.size, 0);
    const totalLoadTime = Array.from(this.loadTimes.values()).reduce((sum, time) => sum + time, 0);

    return {
      totalSize: totalSize / 1024, // KB
      totalLoadTime,
      bundleCount: this.bundles.size,
      bundles: Array.from(this.bundles.values()).sort((a, b) => b.size - a.size),
      recommendations: this.analyzeBundles()
    };
  }

  // Performance score based on bundle analysis
  getPerformanceScore(): number {
    const report = this.getBundleReport();
    let score = 100;

    // Deduct points for large total size
    if (report.totalSize > 2000) score -= 30; // 2MB
    else if (report.totalSize > 1000) score -= 15; // 1MB

    // Deduct points for slow load times
    if (report.totalLoadTime > 5000) score -= 25; // 5s
    else if (report.totalLoadTime > 3000) score -= 10; // 3s

    // Deduct points for too many bundles
    if (report.bundleCount > 15) score -= 10;

    // Deduct points for high-priority recommendations
    const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high');
    score -= highPriorityRecs.length * 5;

    return Math.max(0, Math.min(100, score));
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

import React from 'react';

// Hook to track component bundle loading
export const useBundleTracking = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      // Estimate bundle size (this would be more accurate with webpack stats)
      const estimatedSize = 50 * 1024; // 50KB estimate
      bundleAnalyzer.trackBundleLoad(componentName, estimatedSize, loadTime);
    };
  }, [componentName]);
};

export default bundleAnalyzer;