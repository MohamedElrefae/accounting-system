/**
 * Property-Based Testing Setup
 * 
 * Global setup and teardown for property-based tests
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

let supabase: any = null;

beforeAll(async () => {
  try {
    // Initialize Supabase client only if credentials are available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      
      // Deploy test support functions
      const { error } = await supabase.rpc('cleanup_test_auth_data');
      if (error) {
        console.warn('Cleanup warning:', error.message);
      }
      
      console.log('Property-based testing environment initialized');
    } else {
      console.log('Supabase credentials not available, running tests in local mode');
    }
  } catch (error) {
    console.warn('Failed to initialize Supabase:', error);
  }
});

afterAll(async () => {
  // Cleanup test data
  if (supabase) {
    try {
      await supabase.rpc('cleanup_test_auth_data');
      console.log('Property-based testing cleanup completed');
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
});

export { supabase };