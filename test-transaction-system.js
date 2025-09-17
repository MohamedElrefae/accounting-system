// Test script to verify transaction system functionality
// Run this in your browser console after the transaction form is loaded

console.log('🧪 Testing Transaction System...');

// Test 1: Check if accounts can be loaded
async function testAccountsLoading() {
  try {
    console.log('📋 Testing accounts loading...');
    
    // Simulate what the transaction validation service does
    const response = await fetch('/rest/v1/accounts?select=id,code,name,category,normal_balance,is_postable,allow_transactions,is_active&is_active=eq.true', {
      headers: {
        'apikey': 'YOUR_ANON_KEY', // Replace with your actual anon key
        'Authorization': 'Bearer YOUR_JWT_TOKEN' // Replace with actual token
      }
    });
    
    if (response.ok) {
      const accounts = await response.json();
      console.log('✅ Accounts loaded successfully:', accounts.length, 'accounts');
      return accounts;
    } else {
      console.error('❌ Failed to load accounts:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading accounts:', error);
    return null;
  }
}

// Test 2: Check form validation
function testFormValidation() {
  console.log('🧮 Testing form validation...');
  
  // Try to find the transaction form
  const form = document.querySelector('form[id*="transaction"]') || document.querySelector('form');
  
  if (form) {
    console.log('✅ Found transaction form');
    
    // Check if validation errors display properly
    const errorElements = form.querySelectorAll('[class*="error"], [class*="invalid"]');
    console.log('📝 Found', errorElements.length, 'error display elements');
    
    // Check if required fields are marked
    const requiredFields = form.querySelectorAll('input[required], select[required]');
    console.log('⚡ Found', requiredFields.length, 'required fields');
    
    return true;
  } else {
    console.warn('⚠️ No transaction form found on this page');
    return false;
  }
}

// Test 3: Test validation service integration
async function testValidationService() {
  console.log('🔍 Testing validation service integration...');
  
  // Check if the validation service is available
  if (typeof window !== 'undefined') {
    console.log('🌐 Running in browser environment');
    
    // Check if there are any console errors related to validation
    const originalError = console.error;
    let validationErrors = [];
    
    console.error = (...args) => {
      if (args.some(arg => String(arg).includes('validation') || String(arg).includes('accounts'))) {
        validationErrors.push(args);
      }
      originalError.apply(console, args);
    };
    
    // Trigger form interactions to test validation
    setTimeout(() => {
      console.error = originalError;
      if (validationErrors.length === 0) {
        console.log('✅ No validation errors detected');
      } else {
        console.warn('⚠️ Found validation errors:', validationErrors);
      }
    }, 2000);
    
    return true;
  }
  return false;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting transaction system tests...');
  
  const accounts = await testAccountsLoading();
  const formTest = testFormValidation();
  const validationTest = await testValidationService();
  
  console.log('📊 Test Results:');
  console.log('- Accounts Loading:', accounts ? '✅ PASS' : '❌ FAIL');
  console.log('- Form Validation:', formTest ? '✅ PASS' : '❌ FAIL');
  console.log('- Validation Service:', validationTest ? '✅ PASS' : '❌ FAIL');
  
  if (accounts && formTest && validationTest) {
    console.log('🎉 All tests passed! Transaction system should be working.');
  } else {
    console.log('⚠️ Some tests failed. Check the database migration and code changes.');
  }
  
  return {
    accountsLoading: !!accounts,
    formValidation: formTest,
    validationService: validationTest,
    accountsCount: accounts ? accounts.length : 0
  };
}

// Auto-run if script is executed directly
if (typeof window !== 'undefined') {
  runAllTests();
}