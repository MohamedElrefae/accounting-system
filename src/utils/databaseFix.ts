/**
 * Database compatibility and error handling utilities
 */

import { supabase } from './supabase';
import type { RoleSlug } from '../lib/permissions';
import { getRolesFromAuthMetadata } from './authFallback';

/**
 * Safely fetch user roles matching the actual database schema
 */
export const fetchUserRolesSafely = async (userId: string, user?: any): Promise<RoleSlug[]> => {
  // If no userId provided, return empty array
  if (!userId) {
    console.warn('⚠️ fetchUserRolesSafely: Called with empty userId');
    return [];
  }

  console.log(`🔍 fetchUserRolesSafely: Starting (User: ${userId})`);

  try {
    // STRATEGY 1: Simple two-step fetch (Most robust)
    // First, just get the role IDs. Less likely to hit RLS join issues.
    const { data: roleIds, error: roleIdsError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId); 
      // Removed .eq('is_active', true) for maximum reachability in debug mode

    if (roleIdsError) {
      console.error('❌ fetchUserRolesSafely: Failed to fetch role_ids', roleIdsError);
      return []; // Safe fail: No access
    }

    if (!roleIds || roleIds.length === 0) {
      console.warn('ℹ️ fetchUserRolesSafely: No role_ids found in user_roles table for:', userId);
      return []; // Valid: User has no roles
    }

    console.log('✅ fetchUserRolesSafely: Found role_ids:', roleIds);

    const roleIdsList = roleIds.map(r => r.role_id).filter(Boolean);

    // Second, fetch names for these IDs
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('name')
      .in('id', roleIdsList);

    if (rolesError) {
      console.error('❌ fetchUserRolesSafely: Failed to fetch role names', rolesError);
      return [];
    }

    console.log('✅ fetchUserRolesSafely: Raw Roles Data:', rolesData);

    // Map to RoleSlug
    const mappedRoles = (rolesData || [])
      .map(r => {
        const name = r.name?.toLowerCase().replace(/\s+/g, '_');
        // Sanitization and mapping
        if (name === 'super_admin') return 'super_admin';
        if (name === 'accountant') return 'accountant';
        if (name === 'admin') return 'admin';
        if (name === 'manager') return 'manager';
        if (name === 'auditor') return 'auditor';
        if (name === 'viewer') return 'viewer';
        if (name === 'hr') return 'hr';
        if (name === 'team_leader') return 'team_leader';
        return null; 
      })
      .filter(Boolean) as RoleSlug[];

    console.log('✅ fetchUserRolesSafely: FINAL Resolved Roles:', mappedRoles);
    return mappedRoles;

  } catch (error) {
    console.error('🔥 fetchUserRolesSafely: Critical Exception', error);
    return []; // Safe fail
  }
};

/**
 * Safely fetch user profile with error handling
 */
export const fetchUserProfileSafely = async (userId: string) => {
  if (!userId) {
    return { is_super_admin: false };
  }

  try {
    // Skip table check and try direct query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Profile fetch failed, using default:', error);
      return { is_super_admin: false }; // Default profile
    }

    return data || { is_super_admin: false };
  } catch (error) {
    console.warn('Profile fetch error, using default:', error);
    return { is_super_admin: false }; // Default profile
  }
};

/**
 * Check if database tables exist and are accessible
 */
export const checkDatabaseHealth = async (): Promise<{
  userRolesExists: boolean;
  userProfilesExists: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  let userRolesExists = false;
  let userProfilesExists = false;

  try {
    const { error: rolesError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);

    if (!rolesError) {
      userRolesExists = true;
    } else {
      errors.push(`user_roles: ${rolesError.message}`);
    }
  } catch (error) {
    errors.push(`user_roles: ${error}`);
  }

  try {
    const { error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (!profilesError) {
      userProfilesExists = true;
    } else {
      errors.push(`user_profiles: ${profilesError.message}`);
    }
  } catch (error) {
    errors.push(`user_profiles: ${error}`);
  }

  return { userRolesExists, userProfilesExists, errors };
};

export default {
  fetchUserRolesSafely,
  fetchUserProfileSafely,
  checkDatabaseHealth
};