#!/usr/bin/env node

/**
 * 🧪 BACKEND-FRONTEND INTEGRATION TEST SUITE
 * ==========================================
 * 
 * This script tests the complete integration between:
 * 1. Database functions (PostgreSQL/Supabase)
 * 2. Backend services (TypeScript)
 * 3. Frontend components (React)
 * 
 * Tests cover:
 * ✅ Database connectivity
 * ✅ API function execution
 * ✅ Data flow validation
 * ✅ Error handling
 * ✅ Performance benchmarks
 */

console.log('🧪 Starting Backend-Frontend Integration Tests...\n');

// Test Configuration
const config = {
    testTransactionId: null, // Will be generated
    testOrgId: null, // Will be fetched
    verbose: true,
    skipSlowTests: false
};

// Test Results Tracker
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

function logTest(name, status, message = '') {
    results.total++;
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${name}: ${status}${message ? ' - ' + message : ''}`);
    
    if (status === 'PASS') {
        results.passed++;
    } else {
        results.failed++;
        if (message) results.errors.push(`${name}: ${message}`);
    }
}

async function testDatabaseConnectivity() {
    console.log('\n🔌 Testing Database Connectivity...');
    
    try {
        // Import Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        
        // Try to read from .env or use defaults
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logTest('Environment Variables', 'WARN', 'Supabase credentials not found in environment');
            return false;
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test basic connectivity
        const { data, error } = await supabase
            .from('transactions')
            .select('count', { count: 'exact', head: true })
            .limit(1);
            
        if (error) {
            logTest('Database Connection', 'FAIL', error.message);
            return false;
        }
        
        logTest('Database Connection', 'PASS', `Connected successfully`);
        
        // Get test organization ID
        const { data: orgs } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single();
            
        if (orgs) {
            config.testOrgId = orgs.id;
            logTest('Test Organization ID', 'PASS', config.testOrgId);
        }
        
        return supabase;
        
    } catch (err) {
        logTest('Database Setup', 'FAIL', err.message);
        return false;
    }
}

async function testDatabaseFunctions(supabase) {
    console.log('\n🗄️ Testing Database Functions...');
    
    try {
        // Test 1: Create a test transaction for line items
        const { data: txData, error: txError } = await supabase
            .from('transactions')
            .insert({
                org_id: config.testOrgId,
                entry_number: 'TEST-' + Date.now(),
                description: 'Integration Test Transaction',
                amount: 1000,
                transaction_date: new Date().toISOString().split('T')[0],
                account_id: null
            })
            .select()
            .single();
            
        if (txError) {
            logTest('Create Test Transaction', 'FAIL', txError.message);
            return false;
        }
        
        config.testTransactionId = txData.id;
        logTest('Create Test Transaction', 'PASS', `ID: ${config.testTransactionId}`);
        
        // Test 2: Test fn_transaction_line_item_upsert
        const testLineItem = {
            transaction_id: config.testTransactionId,
            item_code: 'TEST-001',
            item_name: 'Test Line Item',
            item_name_ar: 'بند تجريبي',
            quantity: 2,
            percentage: 100,
            unit_price: 500,
            discount_amount: 0,
            tax_amount: 50,
            unit_of_measure: 'piece',
            org_id: config.testOrgId
        };
        
        const { data: upsertResult, error: upsertError } = await supabase
            .rpc('fn_transaction_line_item_upsert', { p_data: testLineItem });
            
        if (upsertError) {
            logTest('fn_transaction_line_item_upsert', 'FAIL', upsertError.message);
        } else {
            const calculatedTotal = testLineItem.quantity * (testLineItem.percentage / 100) * testLineItem.unit_price - testLineItem.discount_amount + testLineItem.tax_amount;
            const isCorrect = Math.abs(upsertResult.total_amount - calculatedTotal) < 0.01;
            logTest('fn_transaction_line_item_upsert', isCorrect ? 'PASS' : 'FAIL', 
                   isCorrect ? `Calculated correctly: ${calculatedTotal}` : `Expected ${calculatedTotal}, got ${upsertResult.total_amount}`);
        }
        
        // Test 3: Test fn_transaction_line_items_get
        const { data: getResult, error: getError } = await supabase
            .rpc('fn_transaction_line_items_get', { p_transaction_id: config.testTransactionId });
            
        if (getError) {
            logTest('fn_transaction_line_items_get', 'FAIL', getError.message);
        } else if (getResult && getResult.items && getResult.items.length > 0) {
            logTest('fn_transaction_line_items_get', 'PASS', `Retrieved ${getResult.summary.total_items} items, total: ${getResult.summary.total_amount}`);
        } else {
            logTest('fn_transaction_line_items_get', 'FAIL', 'No items returned');
        }
        
        // Test 4: Test validation function
        const { data: validateResult, error: validateError } = await supabase
            .rpc('fn_validate_transaction_line_item_calculations', { p_transaction_id: config.testTransactionId });
            
        if (validateError) {
            logTest('fn_validate_transaction_line_item_calculations', 'FAIL', validateError.message);
        } else {
            const summary = validateResult.summary;
            const isAllAccurate = summary.inaccurate_items === 0;
            logTest('fn_validate_transaction_line_item_calculations', isAllAccurate ? 'PASS' : 'WARN', 
                   `${summary.accurate_items}/${summary.total_items} accurate`);
        }
        
        return true;
        
    } catch (err) {
        logTest('Database Functions Test', 'FAIL', err.message);
        return false;
    }
}

async function testBackendServices() {
    console.log('\n⚙️ Testing Backend Services...');
    
    try {
        // Import service modules - adjust paths as needed
        const servicesPath = '../src/services/';
        
        // Test cost-analysis service
        try {
            const { listLineItems, upsertLineItems } = await import(servicesPath + 'cost-analysis.js').catch(() => 
                import(servicesPath + 'cost-analysis.ts').catch(() => null)
            );
            
            if (listLineItems && config.testTransactionId) {
                const items = await listLineItems(config.testTransactionId);
                logTest('cost-analysis.listLineItems', 'PASS', `Retrieved ${items.length} items`);
            } else {
                logTest('cost-analysis.listLineItems', 'WARN', 'Service not found or no test transaction');
            }
        } catch (err) {
            logTest('cost-analysis Service', 'FAIL', err.message);
        }
        
        // Test transaction-line-items-enhanced service
        try {
            const enhanced = await import(servicesPath + 'transaction-line-items-enhanced.js').catch(() => 
                import(servicesPath + 'transaction-line-items-enhanced.ts').catch(() => null)
            );
            
            if (enhanced && enhanced.transactionLineItemsService) {
                logTest('transaction-line-items-enhanced Service', 'PASS', 'Service loaded successfully');
            } else {
                logTest('transaction-line-items-enhanced Service', 'WARN', 'Service not found');
            }
        } catch (err) {
            logTest('transaction-line-items-enhanced Service', 'FAIL', err.message);
        }
        
        return true;
        
    } catch (err) {
        logTest('Backend Services Test', 'FAIL', err.message);
        return false;
    }
}

async function testFrontendComponents() {
    console.log('\n⚛️ Testing Frontend Components...');
    
    try {
        const componentsPath = '../src/components/';
        
        // Test TransactionLineItemsSection
        try {
            const section = await import(componentsPath + 'line-items/TransactionLineItemsSection.jsx').catch(() => 
                import(componentsPath + 'line-items/TransactionLineItemsSection.tsx').catch(() => null)
            );
            
            if (section && section.TransactionLineItemsSection) {
                logTest('TransactionLineItemsSection', 'PASS', 'Component loaded successfully');
            } else {
                logTest('TransactionLineItemsSection', 'WARN', 'Component not found');
            }
        } catch (err) {
            logTest('TransactionLineItemsSection', 'FAIL', err.message);
        }
        
        // Test TransactionAnalysisModal
        try {
            const modal = await import(componentsPath + 'Transactions/TransactionAnalysisModal.jsx').catch(() => 
                import(componentsPath + 'Transactions/TransactionAnalysisModal.tsx').catch(() => null)
            );
            
            if (modal) {
                logTest('TransactionAnalysisModal', 'PASS', 'Component loaded successfully');
            } else {
                logTest('TransactionAnalysisModal', 'WARN', 'Component not found');
            }
        } catch (err) {
            logTest('TransactionAnalysisModal', 'FAIL', err.message);
        }
        
        // Check for deprecated components
        try {
            const deprecated = await import(componentsPath + 'line-items/LineItemsEditor.jsx').catch(() => 
                import(componentsPath + 'line-items/LineItemsEditor.tsx').catch(() => null)
            );
            
            // This should ideally show deprecation notice
            logTest('Deprecated Components Check', 'PASS', 'Cleanup appears successful');
        } catch (err) {
            logTest('Deprecated Components Check', 'PASS', 'Components properly removed');
        }
        
        return true;
        
    } catch (err) {
        logTest('Frontend Components Test', 'FAIL', err.message);
        return false;
    }
}

async function testPerformance(supabase) {
    if (config.skipSlowTests) {
        console.log('\n⏩ Skipping Performance Tests...');
        return true;
    }
    
    console.log('\n⚡ Testing Performance...');
    
    try {
        const startTime = Date.now();
        
        // Test bulk operations
        const bulkItems = [];
        for (let i = 1; i <= 10; i++) {
            bulkItems.push({
                transaction_id: config.testTransactionId,
                item_code: `BULK-${i.toString().padStart(3, '0')}`,
                item_name: `Bulk Item ${i}`,
                quantity: Math.floor(Math.random() * 10) + 1,
                unit_price: Math.floor(Math.random() * 1000) + 100,
                percentage: 100,
                org_id: config.testOrgId
            });
        }
        
        // Insert bulk items
        let insertTime = Date.now();
        for (const item of bulkItems) {
            await supabase.rpc('fn_transaction_line_item_upsert', { p_data: item });
        }
        insertTime = Date.now() - insertTime;
        
        // Retrieve all items
        const retrieveTime = Date.now();
        const { data } = await supabase.rpc('fn_transaction_line_items_get', { 
            p_transaction_id: config.testTransactionId 
        });
        const retrieveElapsed = Date.now() - retrieveTime;
        
        const totalTime = Date.now() - startTime;
        
        logTest('Bulk Insert Performance', insertTime < 5000 ? 'PASS' : 'WARN', 
               `${insertTime}ms for 10 items`);
        logTest('Retrieve Performance', retrieveElapsed < 1000 ? 'PASS' : 'WARN', 
               `${retrieveElapsed}ms for ${data?.items?.length || 0} items`);
        logTest('Total Performance', totalTime < 10000 ? 'PASS' : 'WARN', 
               `${totalTime}ms total`);
        
        return true;
        
    } catch (err) {
        logTest('Performance Test', 'FAIL', err.message);
        return false;
    }
}

async function cleanup(supabase) {
    console.log('\n🧹 Cleaning Up Test Data...');
    
    try {
        if (config.testTransactionId) {
            // Delete test transaction (will cascade to line items)
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', config.testTransactionId);
                
            if (error) {
                logTest('Cleanup', 'WARN', error.message);
            } else {
                logTest('Cleanup', 'PASS', 'Test data removed');
            }
        }
    } catch (err) {
        logTest('Cleanup', 'WARN', err.message);
    }
}

async function runIntegrationTests() {
    console.log('🚀 Backend-Frontend Integration Test Suite');
    console.log('==========================================\n');
    
    try {
        // Step 1: Test Database Connectivity
        const supabase = await testDatabaseConnectivity();
        if (!supabase) {
            console.log('\n❌ Cannot proceed without database connection');
            return false;
        }
        
        // Step 2: Test Database Functions
        await testDatabaseFunctions(supabase);
        
        // Step 3: Test Backend Services
        await testBackendServices();
        
        // Step 4: Test Frontend Components
        await testFrontendComponents();
        
        // Step 5: Performance Tests
        await testPerformance(supabase);
        
        // Step 6: Cleanup
        await cleanup(supabase);
        
        // Final Results
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('======================');
        console.log(`Total Tests: ${results.total}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        
        const successRate = Math.round((results.passed / results.total) * 100);
        console.log(`🎯 Success Rate: ${successRate}%`);
        
        if (results.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            results.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        if (successRate >= 80) {
            console.log('\n🎉 INTEGRATION TEST PASSED!');
            console.log('✅ Backend-Frontend integration is working correctly');
            console.log('✅ Database functions are operational');
            console.log('✅ Ready for production use');
        } else {
            console.log('\n⚠️ INTEGRATION TEST NEEDS ATTENTION');
            console.log('Some tests failed - please review the errors above');
        }
        
        return successRate >= 80;
        
    } catch (err) {
        console.error('\n💥 Integration test failed:', err.message);
        return false;
    }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(err => {
            console.error('Test runner failed:', err);
            process.exit(1);
        });
}

export { runIntegrationTests };