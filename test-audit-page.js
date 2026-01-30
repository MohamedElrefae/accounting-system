// Test script to check /admin/audit page
// Run this in browser console at http://localhost:3001/admin/audit

console.log('=== Audit Page Test ===');
console.log('Current URL:', window.location.href);
console.log('Page title:', document.title);

// Check if page has content
const bodyContent = document.body.innerHTML;
console.log('Body content length:', bodyContent.length);
console.log('Body is empty:', bodyContent.trim().length === 0);

// Check for React root
const root = document.getElementById('root');
console.log('Root element exists:', !!root);
console.log('Root content:', root?.innerHTML.substring(0, 200));

// Check for audit-specific elements
const auditContainer = document.querySelector('[class*="audit"]');
console.log('Audit container found:', !!auditContainer);

// Check for tabs
const tabs = document.querySelectorAll('[role="tab"]');
console.log('Tabs found:', tabs.length);

// Check for errors in console
console.log('Check browser console for any errors');
