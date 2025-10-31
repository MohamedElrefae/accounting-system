// Debug script to check what's happening with the transactions page
console.log('🔍 Debug: Checking for potential issues...');

// Check if the page is loading at all
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM loaded');
  
  // Check if the main container exists
  const container = document.querySelector('.transactions-container');
  if (container) {
    console.log('✅ Transactions container found');
  } else {
    console.error('❌ Transactions container not found');
  }
  
  // Check for any error messages
  const errors = document.querySelectorAll('[role="alert"], .error, .error-message');
  if (errors.length > 0) {
    console.error('❌ Found error elements:', errors);
  }
  
  // Check React devtools for component errors
  setTimeout(() => {
    console.log('🔍 Checking React components...');
    const reactRoot = document.querySelector('#root');
    if (reactRoot) {
      console.log('✅ React root found');
      if (reactRoot.children.length === 0) {
        console.error('❌ React root has no children - white screen likely');
      }
    }
  }, 1000);
});

// Listen for console errors
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);
  
  // Check if this is a React rendering error
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('TransactionWizard') ||
    message.includes('React') ||
    message.includes('render')
  )) {
    console.error('🚨 React rendering error detected:', args);
  }
};

console.log('🔍 Debug script loaded');
