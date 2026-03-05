import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bgxknceshxxifwytalex.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGtuY2VzaHh4aWZ3eXRhbGV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY5MzUyMSwiZXhwIjoyMDcxMjY5NTIxfQ.avathJX2nGS-2WjFoKOnsCRq_kOez56kJO5-H5ixwq0';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function sel(table, cols, opts = {}) {
  let q = supabase.from(table).select(cols);
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.eq) q = q.eq(opts.eq[0], opts.eq[1]);
  const { data, error } = await q;
  return { data, error };
}

async function rpcTest(fn, params) {
  const { data, error } = await supabase.rpc(fn, params);
  return { data, error };
}

async function main() {
  console.log('\n🔍 TASK 0 — CLEAN PRE-FLIGHT RESULTS\n');
  console.log('TIME:', new Date().toISOString());
  console.log('');

  // 1. Get actual TLI columns by querying with * and no limit
  console.log('=== 1. transaction_line_items — actual columns (via SELECT *) ===');
  const { data: tliRow, error: tliErr } = await supabase
    .from('transaction_line_items')
    .select('*')
    .limit(1);
  if (tliErr) {
    console.log('ERROR:', tliErr.message);
    // Try minimal select to get columns
    const { data: tliMin, error: tliMin2 } = await supabase
      .from('transaction_line_items')
      .select('id, transaction_line_id, line_number, line_item_id, quantity, percentage, unit_price, unit_of_measure, deduction_percentage, addition_percentage, deduction_amount, addition_amount, net_amount, created_at, updated_at')
      .limit(1);
    if (tliMin2) console.log('Minimal select error:', tliMin2.message);
    else console.log('Minimal columns OK. Row count found:', tliMin?.length);
    if (tliMin?.length) console.log('Sample row keys:', Object.keys(tliMin[0]));
  } else {
    console.log('tli row count:', tliRow?.length);
    if (tliRow?.length) console.log('Columns found:', Object.keys(tliRow[0]).join(', '));
    else {
      // No rows — get column names from empty result
      console.log('No rows, but query succeeded. Table exists.');
    }
  }

  // 2. total_amount column
  console.log('\n=== 2. total_amount column ===');
  const { data: totData, error: totErr } = await supabase
    .from('transaction_line_items')
    .select('id, total_amount')
    .limit(1);
  if (totErr) console.log('total_amount: DOES NOT EXIST ->', totErr.message);
  else console.log('total_amount: EXISTS, sample:', JSON.stringify(totData?.[0]));

  // 3. transaction_lines approval_status
  console.log('\n=== 3. transaction_lines.approval_status ===');
  const { data: tlData, error: tlErr } = await supabase
    .from('transaction_lines')
    .select('id, approval_status')
    .limit(1);
  if (tlErr) console.log('approval_status: DOES NOT EXIST ->', tlErr.message);
  else console.log('approval_status: EXISTS, sample:', JSON.stringify(tlData?.[0]));

  // 4. Views exist
  console.log('\n=== 4. Views ===');
  const views = ['v_transaction_line_items_report', 'v_line_items_browse'];
  for (const v of views) {
    const { data: vd, error: ve } = await supabase.from(v).select('*').limit(1);
    if (ve) console.log(`${v}: ERROR - ${ve.message}`);
    else console.log(`${v}: EXISTS - cols: ${vd?.length ? Object.keys(vd[0]).join(', ') : '(empty, but exists)'}`);
  }

  // 5. RPC functions
  console.log('\n=== 5. RPC Functions ===');
  const { error: r1 } = await supabase.rpc('can_edit_transaction_line', { p_line_id: '00000000-0000-0000-0000-000000000000' });
  console.log('can_edit_transaction_line:', r1 ? `NOT FOUND — ${r1.message}` : 'EXISTS ✅');

  const { error: r2 } = await supabase.rpc('replace_line_items_atomic', { p_transaction_line_id: '00000000-0000-0000-0000-000000000000', p_items: [] });
  console.log('replace_line_items_atomic:', r2 ? `NOT FOUND — ${r2.message}` : 'EXISTS ✅');

  const { error: r3 } = await supabase.rpc('calculate_transaction_line_totals', { transaction_line_id: '00000000-0000-0000-0000-000000000000' });
  console.log('calculate_transaction_line_totals:', r3 ? `NOT FOUND — ${r3.message}` : 'EXISTS ✅');

  const { error: r4 } = await supabase.rpc('apply_adjustments_to_transaction_lines', { transaction_line_id: '00000000-0000-0000-0000-000000000000', deduction_percentage: 0, addition_percentage: 0 });
  console.log('apply_adjustments_to_transaction_lines:', r4 ? `NOT FOUND — ${r4.message}` : 'EXISTS ✅');

  // 6. adjustment_types
  console.log('\n=== 6. adjustment_types ===');
  const { data: adj } = await supabase.from('adjustment_types').select('code, name, default_percentage').limit(10);
  console.log('rows:', JSON.stringify(adj));

  // 7. line_items
  console.log('\n=== 7. line_items sample ===');
  const { data: li } = await supabase.from('line_items').select('id, code, name, is_selectable, is_active, base_unit_of_measure, standard_cost').limit(6);
  console.log('rows:', JSON.stringify(li));

  console.log('\n\n✅ PRE-FLIGHT DONE\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
