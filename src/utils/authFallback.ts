/**
 * Fallback auth system when database tables are not available
 */

import type { RoleSlug } from '../lib/permissions';

/**
 * Get user roles from Supabase auth metadata when database is not available
 */
export const getRolesFromAuthMetadata = (user: any): RoleSlug[] => {
  try {
    if (!user) return ['viewer'];

    // Check user metadata for roles
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    // Try different metadata fields
    const possibleRoleFields = [
      metadata.role,
      metadata.roles,
      appMetadata.role,
      appMetadata.roles,
      metadata.user_role,
      appMetadata.user_role
    ];

    for (const roleField of possibleRoleFields) {
      if (roleField) {
        if (Array.isArray(roleField)) {
          return roleField.map(r => String(r).toLowerCase()).filter(Boolean) as RoleSlug[];
        } else {
          return [String(roleField).toLowerCase() as RoleSlug];
        }
      }
    }

    // Check if user is admin based on email domain or specific emails
    const email = user.email || '';
    const adminEmails = ['admin@company.com', 'melre@company.com']; // Add your admin emails
    const adminDomains = ['admin.company.com']; // Add admin domains

    if (adminEmails.includes(email.toLowerCase())) {
      return ['super_admin'];
    }

    for (const domain of adminDomains) {
      if (email.toLowerCase().endsWith(`@${domain}`)) {
        return ['admin'];
      }
    }

    // Default role
    return ['viewer'];
  } catch (error) {
    console.warn('Error getting roles from auth metadata:', error);
    return ['viewer'];
  }
};

/**
 * Check if user is super admin from auth metadata
 */
export const isSuperAdminFromAuth = (user: any): boolean => {
  try {
    if (!user) return false;

    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    // Check explicit super admin flags
    if (metadata.is_super_admin === true || appMetadata.is_super_admin === true) {
      return true;
    }

    // Check roles
    const roles = getRolesFromAuthMetadata(user);
    return roles.includes('super_admin');
  } catch (error) {
    console.warn('Error checking super admin from auth:', error);
    return false;
  }
};

/**
 * Create a fallback auth system that works without database
 */
export const createFallbackAuthSystem = () => {
  return {
    getRoles: getRolesFromAuthMetadata,
    isSuperAdmin: isSuperAdminFromAuth,
    getProfile: (user: any) => ({
      id: user?.id || '',
      email: user?.email || '',
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
      is_super_admin: isSuperAdminFromAuth(user)
    })
  };
};

export default {
  getRolesFromAuthMetadata,
  isSuperAdminFromAuth,
  createFallbackAuthSystem
};