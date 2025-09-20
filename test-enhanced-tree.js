#!/usr/bin/env node

/**
 * Enhanced Tree Functionality Test Script
 * ======================================
 * 
 * Tests the new tree functionality in transaction-line-items-enhanced service
 * that follows the sub-tree service pattern.
 * 
 * Run with: node test-enhanced-tree.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌳 Testing Enhanced Transaction Line Items Tree Functionality...\n');

const enhancedServicePath = path.join(__dirname, 'src/services/transaction-line-items-enhanced.ts');

if (!fs.existsSync(enhancedServicePath)) {
  console.log('❌ Enhanced service file not found');
  process.exit(1);
}

const content = fs.readFileSync(enhancedServicePath, 'utf-8');

// Test 1: Check for tree building functions
console.log('📋 Test 1: Tree Building Functions');
const treeFunctions = [
  'buildLineItemTree',
  'calculateDepthFromCode', 
  'extractParentCode',
  'buildHierarchyPath'
];

let foundFunctions = 0;
treeFunctions.forEach(func => {
  if (content.includes(`function ${func}`)) {
    console.log(`   ✅ ${func} - Found`);
    foundFunctions++;
  } else {
    console.log(`   ❌ ${func} - Missing`);
  }
});

// Test 2: Check for cache system
console.log('\n🗄️ Test 2: Cache System');
const cacheFeatures = [
  'TransactionLineItemsCache',
  'cache.tree.set',
  'cache.list.set', 
  'cache.metadata.set',
  'clearCache'
];

let foundCacheFeatures = 0;
cacheFeatures.forEach(feature => {
  if (content.includes(feature)) {
    console.log(`   ✅ ${feature} - Found`);
    foundCacheFeatures++;
  } else {
    console.log(`   ❌ ${feature} - Missing`);
  }
});

// Test 3: Check for tree-aware CRUD operations
console.log('\n🔧 Test 3: Tree-Aware CRUD Operations');
const crudMethods = [
  'async getLineItemsTree(',
  'async getLineItemsList(',
  'async createLineItem(',
  'async updateLineItem(',
  'async deleteLineItem('
];

let foundCrudMethods = 0;
crudMethods.forEach(method => {
  if (content.includes(method)) {
    console.log(`   ✅ ${method.replace('async ', '').replace('(', '')} - Found`);
    foundCrudMethods++;
  } else {
    console.log(`   ❌ ${method.replace('async ', '').replace('(', '')} - Missing`);
  }
});

// Test 4: Check for tree utility methods
console.log('\n🛠️ Test 4: Tree Utility Methods');
const utilityMethods = [
  'async getLineItemsByLevel(',
  'async findLineItemByCode(',
  'async getLineItemDescendants(',
  'async getLineItemStats(',
  'async fetchNextLineItemCode('
];

let foundUtilityMethods = 0;
utilityMethods.forEach(method => {
  if (content.includes(method)) {
    console.log(`   ✅ ${method.replace('async ', '').replace('(', '')} - Found`);
    foundUtilityMethods++;
  } else {
    console.log(`   ❌ ${method.replace('async ', '').replace('(', '')} - Missing`);
  }
});

// Test 5: Check for enhanced interfaces
console.log('\n📋 Test 5: Enhanced Interfaces');
const interfaces = [
  'interface LineItemTreeNode',
  'parent_code?:',
  'path?:',
  'child_count?:'
];

let foundInterfaces = 0;
interfaces.forEach(iface => {
  if (content.includes(iface)) {
    console.log(`   ✅ ${iface} - Found`);
    foundInterfaces++;
  } else {
    console.log(`   ❌ ${iface} - Missing`);
  }
});

// Test 6: Check for global utilities
console.log('\n🌐 Test 6: Global Utilities');
const globalUtils = [
  'export function clearTransactionLineItemsCache',
  'export function getTransactionLineItemsCacheStats'
];

let foundGlobalUtils = 0;
globalUtils.forEach(util => {
  if (content.includes(util)) {
    console.log(`   ✅ ${util.replace('export function ', '')} - Found`);
    foundGlobalUtils++;
  } else {
    console.log(`   ❌ ${util.replace('export function ', '')} - Missing`);
  }
});

// Test 7: Check for pattern consistency with sub-tree
console.log('\n🎯 Test 7: Sub-Tree Pattern Consistency');
const patternFeatures = [
  'const cache:', // Cache system
  '.clear()', // Cache clearing
  'buildTree', // Tree building
  'Map<string,', // Map-based storage
  'force = false', // Force reload parameter
  'console.log(\'🌳', // Consistent logging
];

let foundPatternFeatures = 0;
patternFeatures.forEach(feature => {
  if (content.includes(feature)) {
    console.log(`   ✅ ${feature} pattern - Found`);
    foundPatternFeatures++;
  } else {
    console.log(`   ❌ ${feature} pattern - Missing`);
  }
});

// Calculate overall score
console.log('\n' + '='.repeat(50));

const totalTests = foundFunctions + foundCacheFeatures + foundCrudMethods + foundUtilityMethods + foundInterfaces + foundGlobalUtils + foundPatternFeatures;
const maxScore = treeFunctions.length + cacheFeatures.length + crudMethods.length + utilityMethods.length + interfaces.length + globalUtils.length + patternFeatures.length;
const score = Math.round((totalTests / maxScore) * 100);

console.log(`📊 Overall Implementation Score: ${score}%`);
console.log(`✅ Features Implemented: ${totalTests}/${maxScore}`);

if (score >= 90) {
  console.log('🎉 Excellent! Tree functionality fully implemented following sub-tree patterns!');
} else if (score >= 75) {
  console.log('✅ Good! Most tree functionality implemented with sub-tree patterns.');
} else if (score >= 50) {
  console.log('⚠️ Fair. Some tree functionality implemented but missing key features.');
} else {
  console.log('❌ Poor. Major tree functionality missing or not following patterns.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Test the tree functions in your application');
console.log('2. Use the enhanced service in your components');
console.log('3. Monitor cache performance with getTransactionLineItemsCacheStats()');
console.log('4. Update your UI to use tree structure methods');

// Check for old methods that should be updated
console.log('\n🔄 Migration Recommendations:');
const oldMethods = [
  'transactionLineItemsService.listByTransaction',
  'getTreeStructure(', // Should use getLineItemsTree
  'deleteChildrenWithParent(', // Should use new delete methods
];

oldMethods.forEach(method => {
  if (content.includes(method)) {
    console.log(`   ⚠️ Consider updating usage of: ${method}`);
  }
});

console.log('\n📄 File Analysis Complete!');