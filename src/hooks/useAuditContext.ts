import { useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { getConnectionMonitor } from '@/utils/connectionMonitor'

type AuditPageInfo = {
  pageName: string
  moduleName: string
}

export function useAuditContext(pageInfo: AuditPageInfo) {
  useEffect(() => {
    let cancelled = false

    const setContext = async () => {
      const monitor = getConnectionMonitor()
      if (!monitor.getHealth().isOnline) return

      try {
        let requestId: string | null = null
        try {
          requestId = sessionStorage.getItem('audit_request_id')
        } catch {
          requestId = null
        }

        if (!requestId) {
          requestId = crypto.randomUUID()
          try {
            sessionStorage.setItem('audit_request_id', requestId)
          } catch {
            // ignore
          }
        }

        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'

        const { error } = await supabase.rpc('set_audit_context', {
          p_page_name: pageInfo.pageName,
          p_module_name: pageInfo.moduleName,
          p_request_id: requestId,
          p_ip_address: null,
          p_user_agent: userAgent,
          p_session_id: requestId.slice(0, 16),
        } as any)

        if (!cancelled && error) {
          console.warn('[audit] set_audit_context failed:', error.message)
        }
      } catch (e: any) {
        if (!cancelled) {
          console.warn('[audit] set_audit_context failed:', e?.message || e)
        }
      }
    }

    void setContext()

    return () => {
      cancelled = true
    }
  }, [pageInfo.pageName, pageInfo.moduleName])
}
