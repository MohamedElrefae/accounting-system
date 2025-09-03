import { createClient } from '@supabase/supabase-js';

// Note: Replace these with your actual Supabase URL and key
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');

  try {
    // 1. Check transactions table structure
    console.log('📋 TRANSACTIONS TABLE STRUCTURE:');
    console.log('=====================================');
    const { data: transactionColumns, error: transactionError } = await supabase.rpc('sql', {
      query: `
        SELECT 
            column_name, 
            data_type, 
            is_nullable, 
            column_default,
            character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'transactions'
        ORDER BY ordinal_position;
      `
    });

    if (transactionError) {
      // Try alternative approach using a direct query
      const { data: altData, error: altError } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);
      
      if (altData && altData.length > 0) {
        console.log('Available columns in transactions table:');
        Object.keys(altData[0]).forEach(column => {
          console.log(`  - ${column}`);
        });
      } else {
        console.error('Error checking transactions table:', altError || transactionError);
      }
    } else {
      transactionColumns.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    console.log('\n📊 OTHER RELATED TABLES:');
    console.log('=====================================');
    
    // Check work_items table
    const { data: workItems, error: workItemsError } = await supabase
      .from('work_items')
      .select('*')
      .limit(1);
    
    if (workItems && workItems.length > 0) {
      console.log('Work Items table columns:');
      Object.keys(workItems[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('Work Items table: not accessible or empty');
    }

    // Check cost_centers table
    const { data: costCenters, error: costCentersError } = await supabase
      .from('cost_centers')
      .select('*')
      .limit(1);
    
    if (costCenters && costCenters.length > 0) {
      console.log('Cost Centers table columns:');
      Object.keys(costCenters[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('Cost Centers table: not accessible or empty');
    }

    // Check projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projects && projects.length > 0) {
      console.log('Projects table columns:');
      Object.keys(projects[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('Projects table: not accessible or empty');
    }

    // Check accounts table
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);
    
    if (accounts && accounts.length > 0) {
      console.log('Accounts table columns:');
      Object.keys(accounts[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('Accounts table: not accessible or empty');
    }

    console.log('\n🔍 CHECKING VIEWS:');
    console.log('=====================================');
    
    // Check if enriched transaction view exists
    const { data: enrichedView, error: enrichedError } = await supabase
      .from('v_transactions_enriched')
      .select('*')
      .limit(1);
    
    if (enrichedView && enrichedView.length > 0) {
      console.log('v_transactions_enriched view columns:');
      Object.keys(enrichedView[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
    } else {
      console.log('v_transactions_enriched view: not accessible or empty');
    }

  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDatabaseStructure();
