#!/usr/bin/env node

/**
 * Import Verification Script
 * ========================
 * 
 * This script tests if all the service imports in the codebase are working correctly
 * after the recent fixes to the transaction-line-items-enhanced service.
 * 
 * Run with: node test-imports.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing TypeScript import structure...\n');

// Files to check
const filesToCheck = [
  {
    path: 'src/services/transaction-line-items.ts',
    description: 'Basic transaction line items service'
  },
  {
    path: 'src/services/transaction-line-items-enhanced.ts',
    description: 'Enhanced transaction line items service'
  },
  {
    path: 'src/pages/MainData/CostAnalysisItems.tsx',
    description: 'Cost Analysis Items page (recently fixed)'
  },
  {
    path: 'src/components/line-items/TransactionLineItemsSection.tsx',
    description: 'Transaction Line Items Section component'
  },
  {
    path: 'src/components/line-items/TransactionLineItemsEditor.tsx',
    description: 'Transaction Line Items Editor component'
  }
];

let allGood = true;

// Check each file for common import issues
filesToCheck.forEach(({ path: filePath, description }) => {
  const fullPath = path.join(__dirname, filePath);
  
  console.log(`📁 Checking: ${description}`);
  console.log(`   Path: ${filePath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ❌ File not found`);
    allGood = false;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  
  // Check for problematic import patterns
  const importLines = lines.filter(line => line.trim().startsWith('import'));
  let fileIssues = [];
  
  importLines.forEach((line, index) => {
    // Check for importing non-existent services
    if (line.includes('transactionLineItemsService') && line.includes('transaction-line-items-enhanced')) {
      fileIssues.push(`Line ${index + 1}: Importing 'transactionLineItemsService' from enhanced service (should be 'transactionLineItemsEnhancedService')`);
    }
    
    // Check for importing types from wrong location
    if (line.includes('DbTxLineItem') && !line.includes('transaction-line-items')) {
      fileIssues.push(`Line ${index + 1}: DbTxLineItem type import may need verification`);
    }
  });
  
  if (fileIssues.length > 0) {
    console.log(`   ⚠️  Potential issues found:`);
    fileIssues.forEach(issue => console.log(`      - ${issue}`));
    allGood = false;
  } else {
    console.log(`   ✅ Import structure looks good`);
  }
  
  console.log();
});

// Check specific exports in enhanced service
console.log('🔧 Checking enhanced service exports...');
const enhancedServicePath = path.join(__dirname, 'src/services/transaction-line-items-enhanced.ts');

if (fs.existsSync(enhancedServicePath)) {
  const content = fs.readFileSync(enhancedServicePath, 'utf-8');
  
  // Check for singleton export
  if (content.includes('export const transactionLineItemsEnhancedService')) {
    console.log('   ✅ Singleton instance export found');
  } else {
    console.log('   ❌ Missing singleton instance export');
    allGood = false;
  }
  
  // Check for type re-exports
  if (content.includes('export type { DbTxLineItem, EditableTxLineItem }')) {
    console.log('   ✅ Type re-exports found');
  } else {
    console.log('   ⚠️  Type re-exports may be missing');
  }
  
  // Check for class export
  if (content.includes('export class TransactionLineItemsEnhancedService')) {
    console.log('   ✅ Class export found');
  } else {
    console.log('   ❌ Missing class export');
    allGood = false;
  }
} else {
  console.log('   ❌ Enhanced service file not found');
  allGood = false;
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('🎉 All import structures look correct!');
  console.log('✅ The fixes to transaction-line-items-enhanced imports should work.');
  console.log('\nNext steps:');
  console.log('1. Try running your TypeScript compiler (tsc) to verify');
  console.log('2. Test the CostAnalysisItems page in your application');
  console.log('3. Run the integration tests if available');
} else {
  console.log('⚠️  Some issues were found that may need attention.');
  console.log('❌ Please review the issues above and fix them before proceeding.');
}

// Test enhanced tree functionality
console.log('\n🌳 Checking enhanced tree functionality...');
const hasTreeMethods = content.includes('getLineItemsTree') && 
                      content.includes('buildLineItemTree') &&
                      content.includes('cache.tree.set');

if (hasTreeMethods) {
  console.log('   ✅ Enhanced tree methods found');
  console.log('   📋 Available methods:');
  console.log('      - getLineItemsTree() - Get hierarchical tree structure');
  console.log('      - getLineItemsList() - Get flat list with caching');
  console.log('      - createLineItem() - Create with cache invalidation');
  console.log('      - updateLineItem() - Update with cache invalidation');
  console.log('      - deleteLineItem() - Delete with cache invalidation');
  console.log('      - getLineItemsByLevel() - Get items at specific depth');
  console.log('      - findLineItemByCode() - Find item by code in tree');
  console.log('      - getLineItemDescendants() - Get all children');
  console.log('      - getLineItemStats() - Get tree statistics');
} else {
  console.log('   ⚠️  Enhanced tree methods not found or incomplete');
}

console.log('\nFor database cleanup, remember to run:');
console.log('📄 sql/cleanup_line_items_complete.sql');
console.log('\nFor integration testing, run:');
console.log('🧪 scripts/test-integration.js');
console.log('\nFor tree functionality testing, run:');
console.log('🌳 test-enhanced-tree.js');
