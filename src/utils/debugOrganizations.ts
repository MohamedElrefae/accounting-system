import { supabase } from './supabase'

/**
 * Debug helper to check organizations table and status column
 */
export async function debugOrganizations() {
  console.log('🔍 Debugging Organizations...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // Test 1: Fetch all organizations (no filter)
    console.log('📋 Test 1: Fetching ALL organizations (no filter)...')
    const { data: allOrgs, error: allError } = await supabase
      .from('organizations')
      .select('*')
      .order('code', { ascending: true })
    
    if (allError) {
      console.error('❌ Error fetching all organizations:', allError.message)
      console.error('   Code:', allError.code)
      console.error('   Details:', allError.details)
      console.error('   Hint:', allError.hint)
      return
    }
    
    console.log(`✅ Found ${allOrgs?.length || 0} organizations (total)`)
    if (allOrgs && allOrgs.length > 0) {
      console.table(allOrgs.map(org => ({
        id: org.id,
        code: org.code,
        name: org.name,
        status: org.status || '(no status)',
        is_active: org.is_active
      })))
    }
    
    // Test 2: Fetch with status filter
    console.log('\n📋 Test 2: Fetching organizations with status=active...')
    const { data: activeOrgs, error: activeError } = await supabase
      .from('organizations')
      .select('*')
      .eq('status', 'active')
      .order('code', { ascending: true })
    
    if (activeError) {
      console.error('❌ Error with status filter:', activeError.message)
    } else {
      console.log(`✅ Found ${activeOrgs?.length || 0} active organizations`)
    }
    
    // Test 3: Check table schema
    console.log('\n📋 Test 3: Checking table schema...')
    const { data: schemaData, error: schemaError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
    
    if (schemaData && schemaData.length > 0) {
      console.log('✅ Table columns:', Object.keys(schemaData[0]))
      console.log('   Has status column?', 'status' in schemaData[0] ? '✅ YES' : '❌ NO')
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Debug complete!')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    debugOrganizations()
  }, 2000) // Wait 2 seconds after app loads
}

