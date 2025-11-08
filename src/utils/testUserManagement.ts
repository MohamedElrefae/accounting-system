/**
 * Test utility for EnterpriseUserManagement component
 */

import { supabase } from './supabase';

export const testUserManagementConnection = async () => {
  console.log('🧪 Testing User Management Database Connection...');
  
  try {
    // Test 1: Check user_profiles table
    console.log('📋 Testing user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, is_active')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ user_profiles error:', profilesError);
    } else {
      console.log('✅ user_profiles working:', profiles?.length || 0, 'records');
    }

    // Test 2: Check roles table
    console.log('🔐 Testing roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, name_ar')
      .limit(5);
    
    if (rolesError) {
      console.error('❌ roles error:', rolesError);
    } else {
      console.log('✅ roles working:', roles?.length || 0, 'records');
    }

    // Test 3: Check user_roles table with join
    console.log('🔗 Testing user_roles with join...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        roles!inner (
          id,
          name,
          name_ar
        )
      `)
      .eq('is_active', true)
      .limit(5);
    
    if (userRolesError) {
      console.error('❌ user_roles join error:', userRolesError);
    } else {
      console.log('✅ user_roles join working:', userRoles?.length || 0, 'records');
    }

    // Test 4: Check current user permissions
    console.log('👤 Testing current user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ auth error:', authError);
    } else if (user) {
      console.log('✅ current user:', user.email);
      
      // Check if current user has profile
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (currentProfileError) {
        console.error('❌ current user profile error:', currentProfileError);
      } else {
        console.log('✅ current user profile found:', currentProfile?.email);
      }
    }

    console.log('🎉 User Management test completed!');
    return true;
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
};

// Auto-run test if this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    testUserManagementConnection();
  }, 1000);
}