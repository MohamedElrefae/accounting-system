import { supabase } from '../src/utils/supabase'

// Simple console helpers
const ok = (msg: string) => console.log(`✅ ${msg}`)
const warn = (msg: string) => console.warn(`⚠️ ${msg}`)
const err = (msg: string) => console.error(`❌ ${msg}`)

async function checkColumns() {
  const needed = [
    'parent_id','level','path','is_selectable','item_type','specifications','unit_of_measure','standard_cost','is_active'
  ]
  const { data, error } = await supabase
    .from('information_schema.columns' as any)
    .select('column_name')
    .eq('table_schema','public')
    .eq('table_name','transaction_line_items')

  if (error) {
    err(`Failed to read information_schema.columns: ${error.message}`)
    return false
  }
  const cols = new Set((data || []).map((r: any) => r.column_name))
  let allGood = true
  for (const c of needed) {
    if (!cols.has(c)) { allGood = false; err(`Missing column public.transaction_line_items.${c}`) }
  }
  if (allGood) ok('transaction_line_items has all required catalog columns')
  return allGood
}

async function checkView() {
  // Check existence by selecting 1 row
  const { data, error } = await supabase
    .from('line_items')
    .select('id')
    .limit(1)
  if (error) {
    err(`View public.line_items not available or no access: ${error.message}`)
    return false
  }
  ok('public.line_items view is accessible')
  return true
}

async function checkRPC(name: string, args: Record<string, any>): Promise<boolean> {
  // Call rpc and detect function-not-found vs auth errors
  const { data, error } = await supabase.rpc(name as any, args as any)
  if (error) {
    if (String(error.message || '').includes('function') && String(error.message || '').includes('does not exist')) {
      err(`RPC ${name} is missing`)
      return false
    }
    // Any other error still proves function exists
    ok(`RPC ${name} is present`)
    return true
  }
  ok(`RPC ${name} is present`)
  return true
}

async function run() {
  console.log('--- Line Items Migration Check (using transaction_line_items as catalog) ---')
  const c1 = await checkColumns()
  const c2 = await checkView()
  const r1 = await checkRPC('fn_line_item_create', { p_org_id: '00000000-0000-0000-0000-000000000000', p_code: 'TEST', p_name: 'Test' })
  const r2 = await checkRPC('fn_line_item_update', { p_id: '00000000-0000-0000-0000-000000000000', p_code: 'X', p_name: 'Y' })
  const r3 = await checkRPC('fn_line_item_toggle_active', { p_id: '00000000-0000-0000-0000-000000000000' })
  const r4 = await checkRPC('fn_line_item_delete', { p_id: '00000000-0000-0000-0000-000000000000' })

  const all = c1 && c2 && r1 && r2 && r3 && r4
  if (all) {
    ok('Migration looks good. You can manage catalog items via the UI.')
  } else {
    warn('Migration incomplete. See ❌ messages above. Re-run the SQL migration steps and re-check.')
  }
}

run().catch(e => {
  err(`Unexpected error: ${e?.message || e}`)
  process.exit(1)
})
