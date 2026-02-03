#!/usr/bin/env node

/**
 * Critical Auth Indexes Deployment Script
 * 
 * Safely deploys critical database indexes for authentication performance optimization
 * Part of: Enterprise Auth Performance Optimization Spec
 * 
 * Usage: node scripts/deploy-critical-auth-indexes.js [--dry-run] [--verify-only]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
  dryRun: process.argv.includes('--dry-run'),
  verifyOnly: process.argv.includes('--verify-only')
};

// Validate configuration
if (!config.supabaseUrl || !config.supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please check .env.local file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Execute SQL file with error handling and logging
 */
async function executeSqlFile(filePath, description) {
  try {
    console.log(`\n📄 ${description}`);
    console.log(`   File: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    if (config.dryRun) {
      console.log('   🔍 DRY RUN - SQL would be executed:');
      console.log('   ' + sql.split('\n').slice(0, 5).join('\n   ') + '...');
      return { success: true, dryRun: true };
    }
    
    const startTime = Date.now();
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    const duration = Date.now() - startTime;
    
    if (error) {
      throw error;
    }
    
    console.log(`   ✅ Completed in ${duration}ms`);
    return { success: true, duration, data };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check current database state and index status
 */
async function checkDatabaseState() {
  console.log('\n🔍 Checking current database state...');
  
  try {
    // Check if scoped roles tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['org_roles', 'project_roles', 'system_roles']);
    
    if (tablesError) throw tablesError;
    
    const existingTables = tables.map(t => t.table_name);
    console.log(`   📊 Found tables: ${existingTables.join(', ')}`);
    
    // Check existing indexes
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname')
      .in('tablename', ['org_roles', 'project_roles', 'system_roles', 'user_profiles'])
      .like('indexname', 'idx_%');
    
    if (indexError) throw indexError;
    
    console.log(`   🗂️  Existing indexes: ${indexes.length} found`);
    
    // Check for critical missing indexes
    const criticalIndexes = [
      'idx_org_roles_user_org_composite',
      'idx_project_roles_user_project_composite',
      'idx_system_roles_user_role_composite'
    ];
    
    const missingIndexes = criticalIndexes.filter(
      idx => !indexes.some(i => i.indexname === idx)
    );
    
    if (missingIndexes.length > 0) {
      console.log(`   ⚠️  Missing critical indexes: ${missingIndexes.join(', ')}`);
      return { needsIndexes: true, missingIndexes };
    } else {
      console.log('   ✅ All critical indexes appear to be present');
      return { needsIndexes: false, missingIndexes: [] };
    }
    
  } catch (error) {
    console.error(`   ❌ Database state check failed: ${error.message}`);
    return { needsIndexes: true, error: error.message };
  }
}

/**
 * Verify performance improvements after index creation
 */
async function verifyPerformance() {
  console.log('\n📈 Verifying performance improvements...');
  
  const verifyScript = path.join(__dirname, '..', 'sql', 'verify_auth_performance_improvement.sql');
  return await executeSqlFile(verifyScript, 'Performance Verification');
}

/**
 * Main deployment function
 */
async function deployIndexes() {
  console.log('🚀 Critical Auth Indexes Deployment');
  console.log('=====================================');
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE DEPLOYMENT'}`);
  console.log(`Database: ${config.supabaseUrl}`);
  
  try {
    // Step 1: Check database state
    const dbState = await checkDatabaseState();
    
    if (config.verifyOnly) {
      console.log('\n🔍 VERIFY-ONLY MODE - Running performance verification...');
      await verifyPerformance();
      return;
    }
    
    if (!dbState.needsIndexes && !config.dryRun) {
      console.log('\n✅ All critical indexes already exist. Running verification...');
      await verifyPerformance();
      return;
    }
    
    // Step 2: Deploy critical indexes
    const indexScript = path.join(__dirname, '..', 'sql', 'create_critical_auth_indexes_phase1.sql');
    const indexResult = await executeSqlFile(indexScript, 'Creating Critical Auth Indexes');
    
    if (!indexResult.success) {
      throw new Error(`Index creation failed: ${indexResult.error}`);
    }
    
    if (config.dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes made to database');
      return;
    }
    
    // Step 3: Verify performance improvements
    console.log('\n⏱️  Waiting 30 seconds for indexes to be fully built...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const verifyResult = await verifyPerformance();
    
    if (verifyResult.success) {
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
      console.log('=====================================');
      console.log('✅ Critical auth indexes created');
      console.log('✅ Performance verification completed');
      console.log('📊 Expected improvements:');
      console.log('   - Auth load time: 220ms → 120-150ms');
      console.log('   - Scoped role queries: 45ms → 25-30ms');
      console.log('   - Permission checks: 25ms → 10-15ms');
      console.log('\n📋 Next Steps:');
      console.log('   1. Monitor production performance');
      console.log('   2. Proceed to RPC function optimization');
      console.log('   3. Implement service layer caching');
    } else {
      console.log('\n⚠️  DEPLOYMENT COMPLETED WITH WARNINGS');
      console.log('Indexes created but verification had issues');
    }
    
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('=====================================');
    console.error(`Error: ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connectivity');
    console.error('   2. Verify Supabase credentials');
    console.error('   3. Check for conflicting indexes');
    console.error('   4. Review database logs');
    process.exit(1);
  }
}

/**
 * Handle script execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  deployIndexes().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { deployIndexes, checkDatabaseState, verifyPerformance };