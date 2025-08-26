import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';


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
      
      // Get user's active role IDs (simple query to avoid nested relationship 406)
      const { data: userRoles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (rolesErr) {
        console.error('Error loading user roles:', rolesErr);
      }

      const roleIds: number[] = (userRoles ?? []).map((r: any) => r.role_id).filter((id: any) => id != null);

      // Get permissions for those roles (flat join avoided; select only needed field)
      let rolePermissions: any[] = [];
      if (roleIds.length > 0) {
        const { data: rpData, error: rpErr } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .in('role_id', roleIds);
        if (rpErr) {
          console.error('Error loading role permissions:', rpErr);
        } else {
          rolePermissions = rpData ?? [];
        }
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
      if (rolePermissions && Array.isArray(rolePermissions)) {
        rolePermissions.forEach((rp: any) => {
          if (rp?.permissions?.name) {
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
