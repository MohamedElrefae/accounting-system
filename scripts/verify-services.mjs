#!/usr/bin/env node

/**
 * 🔍 QUICK SERVICES VERIFICATION
 * ==============================
 * 
 * This script quickly verifies that our transaction line items
 * services are working correctly after the cleanup.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

console.log('🔍 Quick Service Verification');
console.log('============================\n');

// Helper function to check if file exists and log result
function checkFile(filePath, description) {
    try {
        const fullPath = resolve(projectRoot, filePath);
        const content = readFileSync(fullPath, 'utf8');
        
        if (content.includes('DEPRECATED') || content.includes('deprecated')) {
            console.log(`⚠️  ${description}: DEPRECATED (as expected)`);
            return 'deprecated';
        } else if (content.includes('transaction_line_items') && !content.includes('line_items')) {
            console.log(`✅ ${description}: Using correct table`);
            return 'correct';
        } else if (content.includes('line_items') && !content.includes('transaction_line_items')) {
            console.log(`❌ ${description}: Still using old table`);
            return 'incorrect';
        } else if (content.includes('transaction_line_items') && content.includes('line_items')) {
            console.log(`⚠️  ${description}: Mixed usage - needs review`);
            return 'mixed';
        } else {
            console.log(`ℹ️  ${description}: No database queries found`);
            return 'no-queries';
        }
    } catch (err) {
        console.log(`❌ ${description}: File not found or error`);
        return 'error';
    }
}

// Check key service files
console.log('📋 CHECKING SERVICE FILES:');
console.log('==========================');

const services = [
    { file: 'src/services/cost-analysis.ts', name: 'Cost Analysis Service' },
    { file: 'src/services/transaction-line-items.ts', name: 'Transaction Line Items Service' },
    { file: 'src/services/transaction-line-items-enhanced.ts', name: 'Enhanced Transaction Line Items Service' },
    { file: 'src/services/line-items.ts', name: 'Legacy Line Items Service (should be deprecated)' },
    { file: 'src/services/line-items-admin.ts', name: 'Legacy Admin Service (should be deprecated)' }
];

let correctServices = 0;
let deprecatedServices = 0;
let errorServices = 0;

for (const service of services) {
    const result = checkFile(service.file, service.name);
    if (result === 'correct') correctServices++;
    else if (result === 'deprecated') deprecatedServices++;
    else if (result === 'error') errorServices++;
}

console.log('\n📋 CHECKING COMPONENT FILES:');
console.log('============================');

const components = [
    { file: 'src/components/line-items/TransactionLineItemsSection.tsx', name: 'Transaction Line Items Section' },
    { file: 'src/components/Transactions/TransactionAnalysisModal.tsx', name: 'Transaction Analysis Modal' },
    { file: 'src/components/line-items/LineItemDropdown.tsx', name: 'Legacy Dropdown (should be deprecated)' },
    { file: 'src/components/line-items/LineItemsEditor.tsx', name: 'Legacy Editor (should be deprecated)' },
    { file: 'src/pages/MainData/CostAnalysisItems.tsx', name: 'Cost Analysis Items Page' }
];

let correctComponents = 0;
let deprecatedComponents = 0;

for (const component of components) {
    const result = checkFile(component.file, component.name);
    if (result === 'correct' || result === 'no-queries') correctComponents++;
    else if (result === 'deprecated') deprecatedComponents++;
}

console.log('\n📋 CHECKING CLEANUP SCRIPT:');
console.log('============================');

checkFile('sql/cleanup_line_items_complete.sql', 'Database Cleanup Script');

console.log('\n📊 VERIFICATION SUMMARY:');
console.log('========================');
console.log(`✅ Correct Services: ${correctServices}`);
console.log(`✅ Correct Components: ${correctComponents}`);
console.log(`⚠️  Deprecated Files: ${deprecatedServices + deprecatedComponents}`);
console.log(`❌ Error Files: ${errorServices}`);

const totalFiles = services.length + components.length;
const workingFiles = correctServices + correctComponents + deprecatedServices + deprecatedComponents;
const healthScore = Math.round((workingFiles / totalFiles) * 100);

console.log(`\n🎯 Health Score: ${healthScore}%`);

if (healthScore >= 90) {
    console.log('\n🎉 EXCELLENT! Services are properly configured');
    console.log('✅ Ready for database cleanup');
    console.log('✅ Ready for production use');
} else if (healthScore >= 70) {
    console.log('\n👍 GOOD! Most services are working');
    console.log('⚠️  Some issues may need attention');
} else {
    console.log('\n⚠️  NEEDS ATTENTION! Several issues detected');
    console.log('❌ Please review the errors above');
}

console.log('\n🚀 NEXT STEPS:');
console.log('==============');
console.log('1. Run database cleanup script:');
console.log('   psql -d your_database -f sql/cleanup_line_items_complete.sql');
console.log('\n2. Test the integration:');
console.log('   node scripts/test-integration.mjs');
console.log('\n3. Start your development server to test UI');

process.exit(healthScore >= 70 ? 0 : 1);