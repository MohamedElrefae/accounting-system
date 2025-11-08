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
    return [];
  }

  try {
    // Fetch user roles with proper join to roles table
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          id,
          name,
          name_ar
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(5); // Reduced limit

    if (userRolesError) {
      console.warn('Failed to fetch user roles with join, trying fallback:', userRolesError);
      
      // Fallback: fetch role IDs and then role names separately
      const { data: roleIds, error: roleIdsError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(10);

      if (roleIdsError || !roleIds || roleIds.length === 0) {
        console.warn('No roles found in database, using auth metadata fallback');
        if (user) {
          return getRolesFromAuthMetadata(user);
        }
        return ['viewer'];
      }

      // Fetch role names separately
      const roleIdsList = roleIds.map(r => r.role_id).filter(Boolean);
      if (roleIdsList.length === 0) {
        return ['viewer'];
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, name_ar')
        .in('id', roleIdsList);

      if (rolesError || !rolesData) {
        console.warn('Failed to fetch role names, using default');
        return ['viewer'];
      }

      // Map role names to RoleSlug format
      return rolesData
        .map(role => {
          const roleName = String(role.name || '').toLowerCase().replace(/\s+/g, '_');
          // Map common role names to our RoleSlug types
          const roleMapping: { [key: string]: RoleSlug } = {
            'super_admin': 'super_admin',
            'admin': 'admin',
            'manager': 'manager',
            'accountant': 'accountant',
            'auditor': 'auditor',
            'viewer': 'viewer',
            'user': 'viewer'
          };
          return roleMapping[roleName] || 'viewer';
        })
        .filter(Boolean);
    }

    if (!userRolesData || userRolesData.length === 0) {
      console.warn('No roles found for user, using auth metadata fallback');
      if (user) {
        return getRolesFromAuthMetadata(user);
      }
      return ['viewer'];
    }

    // Extract role names from joined data
    const roles = userRolesData
      .map(userRole => {
        const role = (userRole as any).roles;
        if (!role) return null;
        
        const roleName = String(role.name || '').toLowerCase().replace(/\s+/g, '_');
        
        // Map database role names to our RoleSlug types
        const roleMapping: { [key: string]: RoleSlug } = {
          'super_admin': 'super_admin',
          'super admin': 'super_admin',
          'admin': 'admin',
          'administrator': 'admin',
          'manager': 'manager',
          'accountant': 'accountant',
          'auditor': 'auditor',
          'viewer': 'viewer',
          'user': 'viewer',
          'employee': 'viewer'
        };
        
        return roleMapping[roleName] || 'viewer';
      })
      .filter(Boolean) as RoleSlug[];

    return roles.length > 0 ? roles : ['viewer'];

  } catch (error) {
    console.warn('Failed to fetch user roles, using fallback:', error);
    if (user) {
      return getRolesFromAuthMetadata(user);
    }
    return ['viewer'];
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