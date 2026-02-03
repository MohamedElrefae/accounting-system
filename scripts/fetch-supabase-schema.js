#!/usr/bin/env node

/**
 * Supabase Schema Fetcher for Enterprise Auth Performance Analysis
 * 
 * This script connects to the user's Supabase project using credentials from .env.local
 * and fetches actual database schema and auth function implementations for performance analysis.
 * 
 * Usage: node scripts/fetch-supabase-schema.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

// Supabase configuration from .env.local
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', SUPABASE_URL);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch database schema information
 */
async function fetchDatabaseSchema() {
  console.log('\n📊 Fetching database schema...');
  
  const queries = {
    // Get all tables and their row counts
    tables: `
      SELECT 
        schemaname,
        tablename,
        tableowner,
        hasindexes,
        hasrules,
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `,
    
    // Get auth-related tables specifically
    authTables: `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'user_profiles', 'user_roles', 'organizations', 'projects', 
        'org_memberships', 'project_memberships', 'org_roles', 'project_roles',
        'system_roles', 'access_requests'
      )
      ORDER BY table_name, ordinal_position;
    `,
    
    // Get RPC functions
    rpcFunctions: `
      SELECT 
        routine_name,
        routine_type,
        data_type as return_type,
        routine_definition
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name LIKE '%auth%' OR routine_name LIKE '%user%' OR routine_name LIKE '%org%'
      ORDER BY routine_name;
    `,
    
    // Get indexes on auth tables
    indexes: `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'user_profiles', 'user_roles', 'organizations', 'projects',
        'org_memberships', 'project_memberships', 'org_roles', 'project_roles'
      )
      ORDER BY tablename, indexname;
    `
  };
  
  const results = {};
  
  for (const [queryName, sql] of Object.entries(queries)) {
    try {
      console.log(`  📋 Executing ${queryName}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.warn(`  ⚠️  ${queryName} failed:`, error.message);
        results[queryName] = { error: error.message };
      } else {
        results[queryName] = data;
        console.log(`  ✅ ${queryName}: ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.warn(`  ❌ ${queryName} error:`, err.message);
      results[queryName] = { error: err.message };
    }
  }
  
  return results;
}

/**
 * Test the get_user_auth_data RPC function
 */
async function testAuthRPC() {
  console.log('\n🧪 Testing get_user_auth_data RPC function...');
  
  try {
    // First, get a sample user ID
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name_ar')
      .limit(3);
    
    if (usersError) {
      console.warn('  ⚠️  Could not fetch sample users:', usersError.message);
      return { error: usersError.message };
    }
    
    if (!users || users.length === 0) {
      console.warn('  ⚠️  No users found in database');
      return { error: 'No users found' };
    }
    
    console.log(`  👥 Found ${users.length} users, testing with first user...`);
    
    const testUser = users[0];
    console.log(`  🧪 Testing with user: ${testUser.email} (${testUser.id})`);
    
    const startTime = performance.now();
    const { data: authData, error: rpcError } = await supabase
      .rpc('get_user_auth_data', { p_user_id: testUser.id });
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    if (rpcError) {
      console.warn('  ❌ RPC function failed:', rpcError.message);
      return { 
        error: rpcError.message,
        duration,
        testUser: { id: testUser.id, email: testUser.email }
      };
    }
    
    console.log(`  ✅ RPC function succeeded in ${duration.toFixed(0)}ms`);
    console.log('  📊 Response structure:');
    
    if (authData) {
      const structure = {
        hasProfile: !!authData.profile,
        rolesCount: authData.roles?.length || 0,
        organizationsCount: authData.organizations?.length || 0,
        projectsCount: authData.projects?.length || 0,
        hasDefaultOrg: !!authData.default_org,
        orgRolesCount: authData.org_roles?.length || 0,
        projectRolesCount: authData.project_roles?.length || 0,
        systemRolesCount: authData.system_roles?.length || 0
      };
      
      console.log('    ', JSON.stringify(structure, null, 2));
      
      return {
        success: true,
        duration,
        testUser: { id: testUser.id, email: testUser.email },
        responseStructure: structure,
        sampleData: {
          profile: authData.profile ? 'Present' : 'Missing',
          roles: authData.roles || [],
          organizations: authData.organizations || [],
          projects: authData.projects || [],
          defaultOrg: authData.default_org || null
        }
      };
    } else {
      console.warn('  ⚠️  RPC returned null data');
      return {
        error: 'RPC returned null data',
        duration,
        testUser: { id: testUser.id, email: testUser.email }
      };
    }
    
  } catch (err) {
    console.error('  ❌ Test failed:', err.message);
    return { error: err.message };
  }
}

/**
 * Analyze current auth performance
 */
async function analyzeAuthPerformance() {
  console.log('\n⚡ Analyzing auth performance...');
  
  const tests = [];
  
  // Test 1: Multiple RPC calls to measure consistency
  console.log('  🔄 Running multiple RPC calls for consistency...');
  
  try {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      const userId = users[0].id;
      const iterations = 5;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const { data, error } = await supabase
          .rpc('get_user_auth_data', { p_user_id: userId });
        const endTime = performance.now();
        
        tests.push({
          iteration: i + 1,
          duration: endTime - startTime,
          success: !error,
          error: error?.message || null
        });
        
        console.log(`    Test ${i + 1}: ${(endTime - startTime).toFixed(0)}ms ${error ? '❌' : '✅'}`);
      }
    }
  } catch (err) {
    console.warn('  ⚠️  Performance test failed:', err.message);
  }
  
  // Calculate statistics
  const successfulTests = tests.filter(t => t.success);
  const durations = successfulTests.map(t => t.duration);
  
  if (durations.length > 0) {
    const stats = {
      totalTests: tests.length,
      successfulTests: successfulTests.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
    };
    
    console.log('  📊 Performance Statistics:');
    console.log(`    Average: ${stats.averageDuration.toFixed(0)}ms`);
    console.log(`    Min: ${stats.minDuration.toFixed(0)}ms`);
    console.log(`    Max: ${stats.maxDuration.toFixed(0)}ms`);
    console.log(`    Median: ${stats.medianDuration.toFixed(0)}ms`);
    console.log(`    Success Rate: ${((stats.successfulTests / stats.totalTests) * 100).toFixed(1)}%`);
    
    return stats;
  }
  
  return { error: 'No successful tests' };
}

/**
 * Get sample data for analysis
 */
async function getSampleData() {
  console.log('\n📋 Fetching sample data...');
  
  const sampleQueries = {
    userProfiles: 'SELECT COUNT(*) as count FROM user_profiles',
    organizations: 'SELECT COUNT(*) as count FROM organizations',
    projects: 'SELECT COUNT(*) as count FROM projects',
    orgMemberships: 'SELECT COUNT(*) as count FROM org_memberships',
    projectMemberships: 'SELECT COUNT(*) as count FROM project_memberships',
    userRoles: 'SELECT COUNT(*) as count FROM user_roles',
    orgRoles: 'SELECT COUNT(*) as count FROM org_roles',
    projectRoles: 'SELECT COUNT(*) as count FROM project_roles'
  };
  
  const counts = {};
  
  for (const [table, query] of Object.entries(sampleQueries)) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.warn(`  ⚠️  ${table}:`, error.message);
        counts[table] = { error: error.message };
      } else {
        const count = data?.[0]?.count || 0;
        counts[table] = count;
        console.log(`  📊 ${table}: ${count} records`);
      }
    } catch (err) {
      console.warn(`  ❌ ${table}:`, err.message);
      counts[table] = { error: err.message };
    }
  }
  
  return counts;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Enterprise Auth Performance Analysis - Schema Fetcher');
  console.log('=' .repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    analysis: {}
  };
  
  try {
    // Test connection
    console.log('🔌 Testing Supabase connection...');
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Connection successful');
    
    // Fetch schema information
    results.analysis.schema = await fetchDatabaseSchema();
    
    // Test auth RPC function
    results.analysis.authRpcTest = await testAuthRPC();
    
    // Analyze performance
    results.analysis.performance = await analyzeAuthPerformance();
    
    // Get sample data counts
    results.analysis.dataCounts = await getSampleData();
    
    // Save results to file
    const outputPath = path.join(__dirname, '..', 'analysis', 'supabase-schema-analysis.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log('\n✅ Analysis complete!');
    console.log(`📄 Results saved to: ${outputPath}`);
    
    // Generate summary report
    await generateSummaryReport(results);
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Generate human-readable summary report
 */
async function generateSummaryReport(results) {
  console.log('\n📝 Generating summary report...');
  
  const report = `# Supabase Schema Analysis Report
Generated: ${results.timestamp}
Supabase URL: ${results.supabaseUrl}

## Database Schema Summary

### Auth-Related Tables
${results.analysis.schema.authTables ? 
  results.analysis.schema.authTables.reduce((acc, row) => {
    if (!acc[row.table_name]) acc[row.table_name] = [];
    acc[row.table_name].push(`- ${row.column_name} (${row.data_type})`);
    return acc;
  }, {}) : 'Error fetching schema'
}

### Data Counts
${Object.entries(results.analysis.dataCounts || {}).map(([table, count]) => 
  `- ${table}: ${typeof count === 'object' ? count.error : count}`
).join('\n')}

## Auth RPC Function Test
${results.analysis.authRpcTest.success ? 
  `✅ Success (${results.analysis.authRpcTest.duration.toFixed(0)}ms)
- Profile: ${results.analysis.authRpcTest.sampleData.profile}
- Roles: ${results.analysis.authRpcTest.sampleData.roles.length} roles
- Organizations: ${results.analysis.authRpcTest.sampleData.organizations.length} orgs
- Projects: ${results.analysis.authRpcTest.sampleData.projects.length} projects
- Default Org: ${results.analysis.authRpcTest.sampleData.defaultOrg || 'None'}` :
  `❌ Failed: ${results.analysis.authRpcTest.error}`
}

## Performance Analysis
${results.analysis.performance.averageDuration ? 
  `- Average RPC Duration: ${results.analysis.performance.averageDuration.toFixed(0)}ms
- Min Duration: ${results.analysis.performance.minDuration.toFixed(0)}ms
- Max Duration: ${results.analysis.performance.maxDuration.toFixed(0)}ms
- Success Rate: ${((results.analysis.performance.successfulTests / results.analysis.performance.totalTests) * 100).toFixed(1)}%` :
  `❌ Performance test failed: ${results.analysis.performance.error}`
}

## Recommendations

### Performance Issues Identified:
${results.analysis.performance.averageDuration > 500 ? 
  '⚠️ RPC function is slower than target (>500ms)' : 
  '✅ RPC function performance is acceptable'
}

### Next Steps:
1. Review RPC function implementation for optimization opportunities
2. Check database indexes on auth-related tables
3. Consider caching strategies for frequently accessed data
4. Implement parallel loading where possible

---
Generated by Enterprise Auth Performance Analysis Tool
`;

  const reportPath = path.join(__dirname, '..', 'analysis', 'supabase-analysis-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`📄 Summary report saved to: ${reportPath}`);
  
  // Print key findings to console
  console.log('\n🔍 Key Findings:');
  
  if (results.analysis.authRpcTest.success) {
    const duration = results.analysis.authRpcTest.duration;
    console.log(`  ✅ Auth RPC: ${duration.toFixed(0)}ms ${duration > 500 ? '(SLOW)' : '(OK)'}`);
  } else {
    console.log(`  ❌ Auth RPC: FAILED - ${results.analysis.authRpcTest.error}`);
  }
  
  if (results.analysis.performance.averageDuration) {
    const avg = results.analysis.performance.averageDuration;
    console.log(`  📊 Average: ${avg.toFixed(0)}ms ${avg > 500 ? '(NEEDS OPTIMIZATION)' : '(ACCEPTABLE)'}`);
  }
  
  const dataCounts = results.analysis.dataCounts;
  if (dataCounts) {
    console.log(`  📋 Data: ${dataCounts.userProfiles || 0} users, ${dataCounts.organizations || 0} orgs, ${dataCounts.projects || 0} projects`);
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, fetchDatabaseSchema, testAuthRPC, analyzeAuthPerformance };