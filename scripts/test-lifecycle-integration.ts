
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load env vars
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try loading from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(process.cwd(), '.env.local')
]

for (const p of envPaths) {
  dotenv.config({ path: p })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
// Use Service Role Key to bypass RLS for setup/teardown and simulating actions if needed
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLifecycle() {
  console.log('🚀 Starting Transaction Lifecycle Integration Test...')
  
  let txId: string | null = null
  let userId: string | null = null
  let orgId: string | null = null

  try {
    // 1. Setup Context (User & Org)
    console.log('\n📦 1. Setting up context...')
    
    // Get a valid user (or the first user found)
    // Note: In a real CI env, we might create a temp user. Here we grab one.
    // If using Service Role, we can act as any user.
    // Let's try to find a user to "act as".
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users || users.users.length === 0) {
        // Fallback: if no users, we might be in a dev env. Create one? 
        // For now, let's assume at least one user exists or we can't really test "created_by" logic well.
        console.warn('⚠️ No users found in auth.users. Lifecycle tests relying on RLS/User IDs might fail.')
    } else {
        userId = users.users[0].id
        console.log(`   Using Actor ID: ${userId}`)
    }

    // Get a valid Organization
    let { data: orgs } = await supabase.from('organizations').select('id').limit(1)
    
    if (!orgs || orgs.length === 0) {
      console.log('   ⚠️ No organization found. Creating "Lifecycle Test Org"...')
      const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({
        code: 'LC-TEST',
        name: 'Lifecycle Test Org',
        status: 'active'
      }).select('id').single()
      
      if (orgErr) throw new Error(`Failed to create org: ${orgErr.message}`)
      orgId = newOrg.id
    } else {
      orgId = orgs[0].id
    }
    console.log(`   Using Org ID: ${orgId}`)

    // Get accounts
    let { data: accounts } = await supabase.from('accounts').select('id').eq('org_id', orgId).limit(2)
    
    if (!accounts || accounts.length < 2) {
      console.log('   ⚠️ Not enough accounts. Creating test accounts...')
      const accPayload = [
        { code: '1001-LC', name: 'Lifecycle Asset', type: 'asset', org_id: orgId },
        { code: '2001-LC', name: 'Lifecycle Liability', type: 'liability', org_id: orgId }
      ]
      const { data: newAccs, error: accErr } = await supabase.from('accounts').insert(accPayload).select('id')
      if (accErr) throw new Error(`Failed to create accounts: ${accErr.message}`)
      accounts = newAccs
    }

    if (!accounts || accounts.length < 2) throw new Error('Need at least 2 accounts')
    const [acc1, acc2] = accounts

    // 2. Create Transaction (Draft)
    console.log('\n📝 2. Creating Draft Transaction...')
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      org_id: orgId,
      entry_number: `TEST-${Date.now()}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Lifecycle Integration Test',
      created_by: userId,
      approval_status: 'draft',
      is_posted: false
    }).select().single()

    if (txError) throw txError
    txId = tx.id
    console.log(`   ✅ Transaction Created: ${txId}`)

    // 3. Add Lines
    console.log('\n➕ 3. Adding Transaction Lines...')
    const lines = [
      { transaction_id: txId, line_no: 1, account_id: acc1.id, debit_amount: 100, credit_amount: 0, description: 'Debit', org_id: orgId },
      { transaction_id: txId, line_no: 2, account_id: acc2.id, debit_amount: 0, credit_amount: 100, description: 'Credit', org_id: orgId }
    ]
    const { error: linesError } = await supabase.from('transaction_lines').insert(lines)
    if (linesError) throw linesError
    console.log('   ✅ Lines Added')

    // 4. Submit for Approval
    console.log('\n📤 4. Submitting for Approval...')
    // Note: RPC requires the user to be the caller usually, but with Service Role we might need to spoof or just call it.
    // However, `submit_transaction_for_line_approval` takes `p_submitted_by`.
    const { error: submitError } = await supabase.rpc('submit_transaction_for_line_approval', {
      p_transaction_id: txId,
      p_submitted_by: userId || '00000000-0000-0000-0000-000000000000' // Fallback UUID if no user
    })
    if (submitError) throw submitError
    
    // Verify status
    const { data: submittedTx } = await supabase.from('transactions').select('approval_status').eq('id', txId).single()
    console.log(`   Status after submit: ${submittedTx?.approval_status}`)
    // Note: Depending on auto-approval rules, it might be 'approved' or 'pending' or 'submitted'.
    // Assuming 'submitted' or 'pending' for now.

    // 5. Approve
    console.log('\n👍 5. Approving...')
    const { error: approveError } = await supabase.rpc('review_transaction', {
      p_transaction_id: txId,
      p_action: 'approve',
      p_reason: 'Automated Test Approval'
    })
    if (approveError) throw approveError

    const { data: approvedTx } = await supabase.from('transactions').select('approval_status').eq('id', txId).single()
    console.log(`   Status after approval: ${approvedTx?.approval_status}`)
    if (approvedTx?.approval_status !== 'approved') throw new Error('Approval failed')
    console.log('   ✅ Approved')

    // 6. Post
    console.log('\n📮 6. Posting...')
    const { error: postError } = await supabase.rpc('post_transaction', {
      p_transaction_id: txId,
      p_posted_by: userId || '00000000-0000-0000-0000-000000000000'
    })
    if (postError) throw postError

    const { data: postedTx } = await supabase.from('transactions').select('is_posted, posted_at').eq('id', txId).single()
    console.log(`   Posted: ${postedTx?.is_posted}`)
    if (!postedTx?.is_posted) throw new Error('Posting failed')
    console.log('   ✅ Posted')

    // 7. Clean up
    console.log('\n🧹 7. Cleaning Up...')
    if (txId) {
      // Need force delete or unpost first? usually cascade delete handles it if allowed.
      // sp_delete_transaction_cascade handles it.
      const { error: delError } = await supabase.rpc('sp_delete_transaction_cascade', {
        p_transaction_id: txId,
        p_force: true
      })
      if (delError) {
          console.warn(`   ⚠️ Cleanup failed via RPC: ${delError.message}. Trying direct delete...`)
          await supabase.from('transactions').delete().eq('id', txId)
      } else {
          console.log('   ✅ Test data deleted')
      }
    }

    console.log('\n🎉 Lifecycle Test Passed Successfully!')

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message)
    // Attempt cleanup
    if (txId) {
        try { await supabase.from('transactions').delete().eq('id', txId) } catch {}
    }
    process.exit(1)
  }
}

testLifecycle()
