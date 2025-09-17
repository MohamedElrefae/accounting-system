import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

// Aggregates permissions from direct user grants and via roles
// Tables assumed:
// - public.permissions(id, name)
// - public.user_permissions(user_id, permission_id)
// - public.user_roles(user_id, role_id)
// - public.role_permissions(role_id, permission_id)
// Also treats super admins as having all permissions
export function useHasPermission() {
  const { user } = useAuth()
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false)
  const loadingRef = useRef(false)

  const load = useCallback(async (uid: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const names = new Set<string>()

      // Direct user permissions
      const { data: up } = await supabase
        .from('user_permissions')
        .select('permissions:permission_id(name)')
        .eq('user_id', uid)
      ;(up || []).forEach((row: any) => {
        const name = row?.permissions?.name
        if (name) names.add(name)
      })

      // Role permissions via user roles
      const { data: rp } = await supabase
        .from('role_permissions')
        .select('permission:permission_id(name), role_id')
        .in('role_id', (
          await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', uid)
        ).data?.map((r: any) => r.role_id) || [] )

      ;(rp || []).forEach((row: any) => {
        const name = row?.permission?.name
        if (name) names.add(name)
      })

      setPerms(names)

      // Super admin check
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_super_admin')
          .eq('id', uid)
          .single()
        setIsSuperAdmin(!!profile?.is_super_admin)
      } catch {
        setIsSuperAdmin(false)
      }
    } catch {
      // Silent fail; default no extra perms
      setPerms(new Set())
      setIsSuperAdmin(false)
    } finally {
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (user?.id) {
      load(user.id)
    } else {
      setPerms(new Set())
      setIsSuperAdmin(false)
    }
  }, [user?.id, load])

  const hasPermission = useCallback((name?: string): boolean => {
    if (isSuperAdmin) return true
    if (!name) return true
    return perms.has(name)
  }, [perms, isSuperAdmin])

  return hasPermission
}

