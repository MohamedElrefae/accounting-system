#!/usr/bin/env node

/**
 * Scan Supabase Schema using REST API
 * Discovers all tables and their structure without direct DB connection
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually read .env.local to avoid conflicts with .env
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const env = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0 && !key.startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔍 Scanning Supabase Schema');
console.log('📍 Project:', SUPABASE_URL);
console.log('=' .repeat(70));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scanSchema() {
  try {
    // Test connection
    console.log('\n🔌 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Connected to Supabase');
    
    // Try to query transactions table
    console.log('\n' + '=' .repeat(70));
    console.log('🔎 CHECKING TRANSACTIONS TABLE');
    console.log('=' .repeat(70));
    
    const { data: txData, error: txError, status: txStatus } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (txError) {
      if (txError.code === 'PGRST116') {
        console.log('\n❌ transactions table DOES NOT EXIST');
        console.log(`   Error: ${txError.message}`);
      } else {
        console.log('\n⚠️  Error checking transactions table:');
        console.log(`   Code: ${txError.code}`);
        console.log(`   Message: ${txError.message}`);
      }
    } else {
      console.log('\n✅ transactions table EXISTS');
      console.log(`   Status: ${txStatus}`);
    }
    
    // Try to query transaction_lines table
    console.log('\n' + '=' .repeat(70));
    console.log('🔎 CHECKING TRANSACTION_LINES TABLE');
    console.log('=' .repeat(70));
    
    const { data: linesData, error: linesError, status: linesStatus } = await supabase
      .from('transaction_lines')
      .select('*', { count: 'exact', head: true });
    
    if (linesError) {
      if (linesError.code === 'PGRST116') {
        console.log('\n❌ transaction_lines table DOES NOT EXIST');
        console.log(`   Error: ${linesError.message}`);
      } else {
        console.log('\n⚠️  Error checking transaction_lines table:');
        console.log(`   Code: ${linesError.code}`);
        console.log(`   Message: ${linesError.message}`);
      }
    } else {
      console.log('\n✅ transaction_lines table EXISTS');
      console.log(`   Status: ${linesStatus}`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 SCHEMA STATUS');
    console.log('=' .repeat(70));
    
    const txExists = !txError || txError.code !== 'PGRST116';
    const linesExists = !linesError || linesError.code !== 'PGRST116';
    
    console.log(`\ntransactions table: ${txExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`transaction_lines table: ${linesExists ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (!txExists || !linesExists) {
      console.log('\n⚠️  SCHEMA INCOMPLETE');
      console.log('\nAction required:');
      console.log('  1. Deploy migration: supabase/migrations/20260214_create_transactions_schema.sql');
      console.log('  2. Or run: node scripts/deploy-transactions-schema.js');
    } else {
      console.log('\n✅ SCHEMA COMPLETE');
      console.log('\nNext steps:');
      console.log('  1. Run Excel migration: python migrate.py');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

scanSchema();
