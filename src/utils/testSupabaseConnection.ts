import { supabase } from './supabase'

/**
 * Test Supabase connection and print status to console
 */
export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // Test 1: Check if Supabase client exists
    if (!supabase) {
      console.error('❌ Supabase client is not initialized')
      return false
    }
    console.log('✅ Supabase client initialized')
    
    // Test 2: Check environment variables
    const url = import.meta.env.VITE_SUPABASE_URL
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
    
    console.log(`📍 URL: ${url || '❌ NOT SET'}`)
    console.log(`🔑 Key: ${hasKey ? '✅ SET' : '❌ NOT SET'}`)
    
    if (!url || !hasKey) {
      console.error('❌ Environment variables not configured')
      return false
    }
    
    // Test 3: Try to fetch from Supabase (test with a simple query)
    console.log('🔄 Testing database connection...')
    
    const { data: _data, error } = await supabase
      .from('accounts')
      .select('count')
      .limit(1)
    
    if (error) {
      // If table doesn't exist, that's ok - we're just testing connection
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('⚠️  Database connected, but "accounts" table not found')
        console.log('   (This is OK if you haven\'t set up the database yet)')
        return true
      }
      console.error('❌ Connection error:', error.message)
      return false
    }
    
    console.log('✅ Successfully connected to Supabase!')
    console.log('✅ Database query successful')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return true
    
  } catch (err) {
    console.error('❌ Connection test failed:', err)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return false
  }
}

// Auto-run test disabled for performance - call manually when needed
// if (import.meta.env.DEV) {
//   testSupabaseConnection()
// }

