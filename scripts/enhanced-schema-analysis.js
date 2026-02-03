#!/usr/bin/env node

/**
 * Enhanced Supabase Schema Analysis for Enterprise Auth Performance
 * 
 * This script connects to Supabase and fetches real database schema and performance data
 * for the Enterprise Authentication Performance Analysis.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', SUPABASE_URL);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch real database schema and performance data
 */
async function analyzeDatabase() {
  console.log('\n📊 Analyzing database schema and performance...');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    tables: {},
    authRpcTest: {},
    performanceMetrics: {},
    recommendations: []
  };
  
  try {
    // Test basic connection
    console.log('🔌 Testing connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      throw new Error(`Connection failed: ${connectionError.message}`);
    }
    
    console.log('✅ Connection successful');
    
    // Get table counts for auth-related tables
    const authTables = [
      'user_profiles', 'organizations', 'projects', 'user_roles',
      'org_memberships', 'project_memberships', 'org_roles', 'project_roles'
    ];
    
    console.log('📋 Fetching table information...');
    
    for (const tableName of authTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.warn(`  ⚠️  ${tableName}: ${error.message}`);
          analysis.tables[tableName] = { error: error.message };
        } else {
          console.log(`  📊 ${tableName}: ${count} records`);
          analysis.tables[tableName] = { count: count || 0 };
        }
      } catch (err) {
        console.warn(`  ❌ ${tableName}: ${err.message}`);
        analysis.tables[tableName] = { error: err.message };
      }
    }
    
    // Test get_user_auth_data RPC function
    console.log('\n🧪 Testing get_user_auth_data RPC function...');
    
    try {
      // Get a sample user
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name_ar')
        .limit(1);
      
      if (usersError || !users || users.length === 0) {
        console.warn('  ⚠️  No users found for testing');
        analysis.authRpcTest = { error: 'No users found' };
      } else {
        const testUser = users[0];
        console.log(`  🧪 Testing with user: ${testUser.email}`);
        
        // Test RPC function performance
        const iterations = 5;
        const durations = [];
        
        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          const { data: authData, error: rpcError } = await supabase
            .rpc('get_user_auth_data', { p_user_id: testUser.id });
          const endTime = performance.now();
          
          const duration = endTime - startTime;
          durations.push(duration);
          
          if (rpcError) {
            console.warn(`    Test ${i + 1}: ❌ ${rpcError.message}`);
          } else {
            console.log(`    Test ${i + 1}: ✅ ${duration.toFixed(0)}ms`);
            
            // Analyze response structure on first successful call
            if (i === 0 && authData) {
              analysis.authRpcTest.responseStructure = {
                hasProfile: !!authData.profile,
                rolesCount: authData.roles?.length || 0,
                organizationsCount: authData.organizations?.length || 0,
                projectsCount: authData.projects?.length || 0,
                hasDefaultOrg: !!authData.default_org,
                orgRolesCount: authData.org_roles?.length || 0,
                projectRolesCount: authData.project_roles?.length || 0
              };
            }
          }
        }
        
        // Calculate performance statistics
        const successfulDurations = durations.filter(d => d > 0);
        if (successfulDurations.length > 0) {
          analysis.performanceMetrics = {
            averageDuration: successfulDurations.reduce((a, b) => a + b, 0) / successfulDurations.length,
            minDuration: Math.min(...successfulDurations),
            maxDuration: Math.max(...successfulDurations),
            medianDuration: successfulDurations.sort((a, b) => a - b)[Math.floor(successfulDurations.length / 2)],
            successRate: (successfulDurations.length / iterations) * 100,
            totalTests: iterations
          };
          
          console.log('  📊 Performance Statistics:');
          console.log(`    Average: ${analysis.performanceMetrics.averageDuration.toFixed(0)}ms`);
          console.log(`    Min: ${analysis.performanceMetrics.minDuration.toFixed(0)}ms`);
          console.log(`    Max: ${analysis.performanceMetrics.maxDuration.toFixed(0)}ms`);
          console.log(`    Success Rate: ${analysis.performanceMetrics.successRate.toFixed(1)}%`);
        }
        
        analysis.authRpcTest.success = true;
        analysis.authRpcTest.testUser = { id: testUser.id, email: testUser.email };
      }
    } catch (err) {
      console.error('  ❌ RPC test failed:', err.message);
      analysis.authRpcTest = { error: err.message };
    }
    
    // Generate recommendations based on findings
    console.log('\n💡 Generating recommendations...');
    
    if (analysis.performanceMetrics.averageDuration > 500) {
      analysis.recommendations.push('⚠️ RPC function performance is slower than target (>500ms) - consider optimization');
    }
    
    if (analysis.performanceMetrics.successRate < 100) {
      analysis.recommendations.push('⚠️ RPC function has reliability issues - investigate error causes');
    }
    
    const totalUsers = analysis.tables.user_profiles?.count || 0;
    const totalOrgs = analysis.tables.organizations?.count || 0;
    const totalProjects = analysis.tables.projects?.count || 0;
    
    if (totalUsers > 1000) {
      analysis.recommendations.push('📈 Large user base detected - consider implementing advanced caching strategies');
    }
    
    if (totalOrgs > 50) {
      analysis.recommendations.push('🏢 Multiple organizations detected - ensure org-scoped queries are optimized');
    }
    
    if (totalProjects > 200) {
      analysis.recommendations.push('📁 Large number of projects - consider project-based data partitioning');
    }
    
    // Save analysis results
    const outputPath = path.join(__dirname, '..', 'analysis');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    const analysisFile = path.join(outputPath, 'enhanced-schema-analysis.json');
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    
    console.log('\n✅ Analysis complete!');
    console.log(`📄 Results saved to: ${analysisFile}`);
    
    return analysis;
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    analysis.error = error.message;
    return analysis;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Enhanced Enterprise Auth Performance Analysis');
  console.log('=' .repeat(60));
  
  const analysis = await analyzeDatabase();
  
  // Print summary
  console.log('\n🔍 Analysis Summary:');
  
  if (analysis.error) {
    console.log(`❌ Failed: ${analysis.error}`);
    return;
  }
  
  // Table summary
  console.log('\n📊 Database Tables:');
  Object.entries(analysis.tables).forEach(([table, info]) => {
    if (info.error) {
      console.log(`  ❌ ${table}: ${info.error}`);
    } else {
      console.log(`  📋 ${table}: ${info.count} records`);
    }
  });
  
  // Performance summary
  if (analysis.performanceMetrics.averageDuration) {
    console.log('\n⚡ RPC Performance:');
    console.log(`  Average: ${analysis.performanceMetrics.averageDuration.toFixed(0)}ms`);
    console.log(`  Range: ${analysis.performanceMetrics.minDuration.toFixed(0)}ms - ${analysis.performanceMetrics.maxDuration.toFixed(0)}ms`);
    console.log(`  Success Rate: ${analysis.performanceMetrics.successRate.toFixed(1)}%`);
  }
  
  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  console.log('\n🎯 Ready to enhance performance analysis with real data!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { analyzeDatabase, main };