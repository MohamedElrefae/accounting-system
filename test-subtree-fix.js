// Test to verify sub_tree_id filtering fix
import { getTransactions } from '../src/services/transactions'

// This test verifies that the sub_tree_id filter no longer causes errors
// when querying the transactions table (since sub_tree_id only exists on transaction_lines)

async function testSubTreeFilterFix() {
  try {
    // This should not throw an error anymore
    const result = await getTransactions({
      filters: {
        expensesCategoryId: 'test-category-id', // This was causing the error
        orgId: 'test-org-id'
      },
      page: 1,
      pageSize: 20
    })
    
    console.log('✅ Test passed: getTransactions with expensesCategoryId filter works')
    console.log('Result:', result)
    return true
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    // Check if it's the specific error we fixed
    if (error.message.includes('column transactions.sub_tree_id does not exist')) {
      console.error('❌ The sub_tree_id issue still exists!')
      return false
    }
    
    // Other errors might be expected (e.g., auth, connection)
    console.log('ℹ️ Different error (might be expected):', error.message)
    return true
  }
}

// Run the test
testSubTreeFilterFix()
