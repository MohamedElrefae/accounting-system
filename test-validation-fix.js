// Simple test to verify transaction validation fix
// Run this in the browser console when on the transactions page

console.log('🧪 Testing Transaction Validation Fix...');

async function testValidationService() {
  try {
    console.log('📋 Testing validation service...');
    
    // Test data for validation
    const testTransaction = {
      debit_account_id: 'test-debit-id',
      credit_account_id: 'test-credit-id', 
      amount: 1000,
      description: 'دفع نقد',
      entry_date: new Date().toISOString().split('T')[0]
    };
    
    // Try to import the validation API
    const validationModule = await import('/src/services/transaction-validation-api.js');
    if (validationModule && validationModule.transactionValidationAPI) {
      console.log('✅ Transaction validation API loaded successfully');
      
      // Test the validation function
      const result = await validationModule.transactionValidationAPI.validateTransactionBeforeSave(testTransaction);
      console.log('✅ Validation completed:', result);
      
      if (result && typeof result.is_valid === 'boolean') {
        console.log('✅ Validation result format is correct');
        console.log('📊 Result details:');
        console.log('  - Valid:', result.is_valid);
        console.log('  - Errors:', result.errors?.length || 0);
        console.log('  - Warnings:', result.warnings?.length || 0);
        
        return true;
      } else {
        console.error('❌ Invalid validation result format');
        return false;
      }
    } else {
      console.error('❌ Could not load validation API');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testFormValidation() {
  console.log('🧮 Testing form validation...');
  
  // Check if we're on a page with transaction forms
  const forms = document.querySelectorAll('form');
  console.log('📝 Found', forms.length, 'forms on page');
  
  // Look for transaction-related inputs
  const transactionInputs = document.querySelectorAll('input[placeholder*="وصف"], select[id*="account"], input[placeholder*="مبلغ"]');
  console.log('💰 Found', transactionInputs.length, 'transaction-related inputs');
  
  return transactionInputs.length > 0;
}

// Run all tests
async function runValidationTests() {
  console.log('🚀 Starting validation fix tests...');
  
  const validationTest = await testValidationService();
  const formTest = testFormValidation();
  
  console.log('📊 Test Results:');
  console.log('- Validation Service:', validationTest ? '✅ WORKING' : '❌ FAILED');
  console.log('- Form Elements:', formTest ? '✅ FOUND' : '❌ NOT FOUND');
  
  if (validationTest) {
    console.log('🎉 Transaction validation fix is working!');
    console.log('💡 The 404 error should be resolved now.');
    console.log('📝 Try creating a transaction to test the full workflow.');
  } else {
    console.log('⚠️ Validation service needs more work. Check the console for details.');
  }
  
  return {
    validationService: validationTest,
    formElements: formTest
  };
}

// Auto-run tests
runValidationTests().catch(console.error);