
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

let loaded = false
for (const p of envPaths) {
  const result = dotenv.config({ path: p })
  if (result.error) {
    // console.log(`   Failed to load: ${p}`)
  } else {
    // console.log(`   Loaded env from: ${p}`)
    loaded = true
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY in .env')
  console.log('   Checked paths:', envPaths)
  console.log('   Current CWD:', process.cwd())
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Warning: Running with ANON key. Row-level security (RLS) might block inserts.')
  console.warn('    For load testing, it is recommended to use SUPABASE_SERVICE_ROLE_KEY in .env')
}

const BATCH_SIZE = 50
const TOTAL_TRANSACTIONS = 1000

async function main() {
  console.log('🚀 Starting Load Test Data Generation...')
  console.log(`   Target: ${TOTAL_TRANSACTIONS} transactions`)

  try {
    // 1. Fetch reference data
    console.log('📦 Fetching reference data...')
    
    // Get organization
    let { data: orgs } = await supabase.from('organizations').select('id').limit(1)
    let orgId = orgs?.[0]?.id
    
    if (!orgId) {
      console.log('   ⚠️ No organization found. Creating "Test Org"...')
      const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({
        code: 'TEST-ORG',
        name: 'Test Organization',
        status: 'active'
      }).select('id').single()
      
      if (orgErr) throw new Error(`Failed to create org: ${orgErr.message}`)
      orgId = newOrg.id
    }

    // Get accounts (need at least 2 for debit/credit)
    let { data: accounts } = await supabase.from('accounts').select('id, code').eq('org_id', orgId).limit(50)
    
    if (!accounts || accounts.length < 2) {
      console.log('   ⚠️ Not enough accounts found. Creating test accounts...')
      const accPayload = [
        { code: '1001', name: 'Cash', type: 'asset', org_id: orgId },
        { code: '2001', name: 'Payables', type: 'liability', org_id: orgId },
        { code: '4001', name: 'Sales', type: 'revenue', org_id: orgId },
        { code: '5001', name: 'Expenses', type: 'expense', org_id: orgId }
      ]
      // Use upsert to avoid conflicts if they exist but weren't returned for some reason? No, just insert if empty.
      // Or check codes. For simplicity in load test, just append random suffix if needed, but let's try standard.
      const { data: newAccs, error: accErr } = await supabase.from('accounts').insert(accPayload).select('id, code')
      if (accErr) throw new Error(`Failed to create accounts: ${accErr.message}`)
      accounts = newAccs
    }

    if (!accounts || accounts.length < 2) throw new Error('Failed to secure 2 accounts')

    // Get projects (optional)
    const { data: projects } = await supabase.from('projects').select('id').limit(10)
    
    // Get cost centers (optional)
    const { data: costCenters } = await supabase.from('cost_centers').select('id').eq('org_id', orgId).limit(10)

    console.log(`   Using Org: ${orgId}`)
    console.log(`   Accounts available: ${accounts.length}`)

    // 2. Generate Data
    console.log('🔄 Generating payload...')
    
    const headers = []
    const lines = []
    const startDate = new Date()
    
    // Helper to get random item
    const rnd = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null
    
    // Helper to generate transaction number
    const prefix = 'LOAD-' + Math.floor(Math.random() * 10000)

    for (let i = 0; i < TOTAL_TRANSACTIONS; i++) {
      const txId = crypto.randomUUID()
      const entryNumber = `${prefix}-${String(i + 1).padStart(4, '0')}`
      
      // Random date within last 30 days
      const date = new Date(startDate.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
      
      const amount = Math.floor(Math.random() * 10000) + 100
      
      headers.push({
        id: txId,
        org_id: orgId,
        entry_number: entryNumber,
        entry_date: date.toISOString().split('T')[0],
        description: `Load Test Transaction ${i + 1} - ${amount} SAR`,
        project_id: rnd(projects || [])?.id,
        is_posted: Math.random() > 0.5, // 50% posted
        amount: amount, // legacy field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approval_status: Math.random() > 0.7 ? 'approved' : 'draft'
      })

      // Create balanced lines (Debit/Credit)
      const debitAcc = rnd(accounts)!
      let creditAcc = rnd(accounts)!
      while (creditAcc.id === debitAcc.id) {
        creditAcc = rnd(accounts)!
      }

      // Line 1: Debit
      lines.push({
        transaction_id: txId,
        line_no: 1,
        account_id: debitAcc.id,
        debit_amount: amount,
        credit_amount: 0,
        description: `Debit for TX ${i + 1}`,
        cost_center_id: rnd(costCenters || [])?.id,
        org_id: orgId
      })

      // Line 2: Credit
      lines.push({
        transaction_id: txId,
        line_no: 2,
        account_id: creditAcc.id,
        debit_amount: 0,
        credit_amount: amount,
        description: `Credit for TX ${i + 1}`,
        cost_center_id: rnd(costCenters || [])?.id,
        org_id: orgId
      })
    }

    // 3. Insert in batches
    console.log('💾 Inserting data into Supabase...')
    const startInsert = Date.now()

    // Insert Headers
    for (let i = 0; i < headers.length; i += BATCH_SIZE) {
      const batch = headers.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('transactions').insert(batch)
      if (error) {
        console.error(`❌ Error inserting headers batch ${i}:`, error.message)
      } else {
        process.stdout.write('.')
      }
    }
    console.log('\n   ✅ Headers inserted')

    // Insert Lines
    for (let i = 0; i < lines.length; i += BATCH_SIZE * 2) { // Lines are 2x headers
      const batch = lines.slice(i, i + BATCH_SIZE * 2)
      const { error } = await supabase.from('transaction_lines').insert(batch)
      if (error) {
        console.error(`❌ Error inserting lines batch ${i}:`, error.message)
      } else {
        process.stdout.write('.')
      }
    }
    console.log('\n   ✅ Lines inserted')

    const duration = (Date.now() - startInsert) / 1000
    console.log(`\n🎉 Load test data generation complete!`)
    console.log(`   Time taken: ${duration.toFixed(2)}s`)
    console.log(`   Rate: ${(TOTAL_TRANSACTIONS / duration).toFixed(0)} tx/s`)

  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message)
    process.exit(1)
  }
}

main()
