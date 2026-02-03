#!/usr/bin/env node

/**
 * Simple Supabase Connection Test
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  try {
    console.log('Testing user_profiles table...');
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('id, email', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Success!');
    console.log('Count:', count);
    console.log('Sample data:', data);
    
    // Test RPC function
    if (data && data.length > 0) {
      console.log('Testing get_user_auth_data RPC...');
      const { data: authData, error: rpcError } = await supabase
        .rpc('get_user_auth_data', { p_user_id: data[0].id });
      
      if (rpcError) {
        console.error('RPC Error:', rpcError);
      } else {
        console.log('RPC Success!');
        console.log('Auth data keys:', Object.keys(authData || {}));
      }
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();