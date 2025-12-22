import React, { useState, useEffect } from 'react'
import { createClient } from '../../utils/supabase'

const TransactionsTest: React.FC = () => {
  const [results, setResults] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const testTransactions = async () => {
      const tests = []
      
      // Test 1: Simple query
      try {
        console.log('Test 1: Simple transactions query')
        const { data, error } = await supabase
          .from('transactions')
          .select('entry_date')
          .limit(1)
        
        tests.push({
          test: 'Simple query',
          success: !error,
          data: data?.length || 0,
          error: error?.message || 'None'
        })
        console.log('Test 1 result:', { data, error })
      } catch (e) {
        tests.push({
          test: 'Simple query',
          success: false,
          data: 0,
          error: e.message
        })
      }

      // Test 2: With project_id
      try {
        console.log('Test 2: Transactions with project_id')
        const projectId = 'bf1a8234-a9ba-4483-a53b-cd33f91454ce'
        const { data, error } = await supabase
          .from('transactions')
          .select('entry_date')
          .eq('project_id', projectId)
          .limit(1)
        
        tests.push({
          test: 'With project_id',
          success: !error,
          data: data?.length || 0,
          error: error?.message || 'None'
        })
        console.log('Test 2 result:', { data, error })
      } catch (e) {
        tests.push({
          test: 'With project_id',
          success: false,
          data: 0,
          error: e.message
        })
      }

      // Test 3: Check table structure
      try {
        console.log('Test 3: Check table structure')
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .limit(1)
        
        tests.push({
          test: 'Table structure',
          success: !error,
          data: data ? Object.keys(data[0] || {}) : [],
          error: error?.message || 'None'
        })
        console.log('Test 3 result:', { data, error })
      } catch (e) {
        tests.push({
          test: 'Table structure',
          success: false,
          data: [],
          error: e.message
        })
      }

      setResults(tests)
    }

    testTransactions()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Transactions API Debug Test</h1>
      <div>
        {results.map((result, index) => (
          <div key={index} style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            border: '1px solid #ccc',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da'
          }}>
            <h4>{result.test}</h4>
            <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
            <p><strong>Data:</strong> {JSON.stringify(result.data)}</p>
            <p><strong>Error:</strong> {result.error}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TransactionsTest
