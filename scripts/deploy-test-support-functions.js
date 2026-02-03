#!/usr/bin/env node

/**
 * Deploy Test Support Functions
 * 
 * Deploys SQL functions needed for property-based testing
 * of database index optimization.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function deployTestSupportFunctions() {
  console.log('🚀 Deploying test support functions...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'create_test_support_functions.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_text: sqlContent
    });
    
    if (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Test support functions deployed successfully');
    
    // Verify deployment
    console.log('🔍 Verifying deployment...');
    
    const { data: functions, error: verifyError } = await supabase
      .rpc('get_active_query_count');
    
    if (verifyError) {
      console.warn('⚠️  Verification warning:', verifyError.message);
    } else {
      console.log('✅ Verification successful');
    }
    
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deployTestSupportFunctions();
}

module.exports = { deployTestSupportFunctions };