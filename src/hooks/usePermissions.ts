import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Permission {
  id: number;
  name: string;
  name_ar: string;
  category: string;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      
      // Get user's role permissions
      const { data: rolePerms, error: roleError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            role_permissions (
              permissions (
                name
              )
            )
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error loading role permissions:', roleError);
      }

      // Get user's direct permissions
      const { data: userPerms, error: userError } = await supabase
        .from('user_permissions')
        .select(`
          permissions (
            name
          ),
          granted
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (userError) {
        console.error('Error loading user permissions:', userError);
      }

      // Combine permissions
      const allPermissions = new Set<string>();
      
      // Add role permissions
      if (rolePerms?.roles?.role_permissions) {
        rolePerms.roles.role_permissions.forEach((rp: any) => {
          if (rp.permissions?.name) {
            allPermissions.add(rp.permissions.name);
          }
        });
      }

      // Add/remove direct user permissions
      if (userPerms) {
        userPerms.forEach((up: any) => {
          if (up.permissions?.name) {
            if (up.granted) {
              allPermissions.add(up.permissions.name);
            } else {
              allPermissions.delete(up.permissions.name);
            }
          }
        });
      }

      // Check if user is super admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile?.is_super_admin) {
        allPermissions.add('*'); // Super admin has all permissions
      }

      setPermissions(Array.from(allPermissions));
    } catch (error) {
      console.error('Error in loadPermissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes('*') || permissions.includes(permission);
  };

  const hasAny = (perms: string[]): boolean => {
    return permissions.includes('*') || perms.some(p => permissions.includes(p));
  };

  const hasAll = (perms: string[]): boolean => {
    return permissions.includes('*') || perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAny,
    hasAll,
    reload: loadPermissions
  };
}
