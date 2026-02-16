#!/usr/bin/env node

/**
 * Deploy Transactions Schema to Supabase
 * 
 * This script deploys the transactions and transaction_lines tables
 * to the Supabase project using the service role key for admin access.
 * 
 * Usage: node scripts/deploy-transactions-schema.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Deploying Transactions Schema to Supabase');
console.log('=' .repeat(60));
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

// Initialize Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Execute SQL migration
 */
async function deploySchema() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260214_create_transactions_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`\n📄 Migration file loaded: ${migrationPath}`);
    console.log(`📊 SQL size: ${migrationSQL.length} bytes`);
    
    // Test connection first
    console.log('\n🔌 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ Connection successful');
    
    // Execute the migration
    console.log('\n⚙️  Executing migration...');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;
      
      try {
        // Use rpc to execute raw SQL (if available) or use direct query
        // For now, we'll use the query method which works for DDL
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // If exec_sql doesn't exist, try alternative approach
          if (error.message.includes('exec_sql')) {
            console.log(`⚠️  exec_sql RPC not available, using alternative method...`);
            // For now, log that we need manual deployment
            throw new Error('exec_sql RPC function not available. Manual deployment required.');
          }
          throw error;
        }
        
        successCount++;
        console.log(`  ✅ Statement ${statementNum}/${statements.length}`);
        
      } catch (err) {
        errorCount++;
        const errorMsg = `Statement ${statementNum}: ${err.message}`;
        errors.push(errorMsg);
        console.log(`  ❌ ${errorMsg}`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Deployment Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Successful: ${successCount}/${statements.length}`);
    console.log(`❌ Failed: ${errorCount}/${statements.length}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (errorCount === 0) {
      console.log('\n✅ Migration deployed successfully!');
      console.log('\n📋 Tables created:');
      console.log('  - transactions (with indexes and RLS policies)');
      console.log('  - transaction_lines (with indexes and RLS policies)');
      console.log('\n🎉 Ready for data migration!');
      return true;
    } else {
      console.log('\n⚠️  Some statements failed. Check errors above.');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Verify schema was created
 */
async function verifySchema() {
  try {
    console.log('\n🔍 Verifying schema...');
    
    // Check if transactions table exists
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (txError && !txError.message.includes('no rows')) {
      console.log(`⚠️  transactions table check: ${txError.message}`);
    } else {
      console.log('✅ transactions table exists');
    }
    
    // Check if transaction_lines table exists
    const { data: linesData, error: linesError } = await supabase
      .from('transaction_lines')
      .select('*', { count: 'exact', head: true });
    
    if (linesError && !linesError.message.includes('no rows')) {
      console.log(`⚠️  transaction_lines table check: ${linesError.message}`);
    } else {
      console.log('✅ transaction_lines table exists');
    }
    
  } catch (error) {
    console.warn('⚠️  Verification check failed:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  const success = await deploySchema();
  
  if (success) {
    await verifySchema();
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
