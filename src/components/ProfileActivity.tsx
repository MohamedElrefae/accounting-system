import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import { supabase } from '@/utils/supabase'

type AuditLogEnrichedRow = {
  id: string
  created_at: string
  actor_email: string | null
  actor_name: string | null
  table_name: string
  table_display_name?: string | null
  operation: string
  action_display?: string | null
  record_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: Record<string, any> | null
  page_name: string | null
  module_name: string | null
  action_description: string | null
  org_id: string | null
}

type LegacyAuditLogRow = {
  id: string | number
  action: string
  created_at: string
  details?: unknown
}

export function ProfileActivity({ locale = 'ar' }: { locale?: 'ar' | 'en' }) {
  const [rows, setRows] = useState<AuditLogEnrichedRow[]>([])
  const [legacyRows, setLegacyRows] = useState<LegacyAuditLogRow[]>([])
  const [mode, setMode] = useState<'enriched' | 'legacy'>('enriched')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isArabic = locale === 'ar'

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: qErr } = await supabase
          .from('audit_log_enriched')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (!qErr) {
          if (!cancelled) {
            setMode('enriched')
            setRows(((data as any[]) ?? []) as AuditLogEnrichedRow[])
          }
          return
        }

        const { data: legacyData, error: legacyErr } = await supabase
          .from('audit_logs')
          .select('id, action, created_at, details')
          .order('created_at', { ascending: false })
          .limit(100)

        if (legacyErr) throw legacyErr

        if (!cancelled) {
          setMode('legacy')
          setLegacyRows(((legacyData as any[]) ?? []) as LegacyAuditLogRow[])
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load activity')
          setRows([])
          setLegacyRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const labelByAction = useMemo(() => {
    return {
      Created: isArabic ? 'إنشاء' : 'Created',
      Modified: isArabic ? 'تعديل' : 'Modified',
      Deleted: isArabic ? 'حذف' : 'Deleted',
    } as Record<string, string>
  }, [isArabic])

  const chipColor = (actionDisplay: string): 'success' | 'info' | 'error' | 'default' => {
    if (actionDisplay === 'Created') return 'success'
    if (actionDisplay === 'Modified') return 'info'
    if (actionDisplay === 'Deleted') return 'error'
    return 'default'
  }

  const formatDateTime = (iso: string) => {
    try {
      return dayjs(iso)
        .locale(isArabic ? 'ar' : 'en')
        .format(isArabic ? 'YYYY/MM/DD hh:mm A' : 'MMM D, YYYY h:mm A')
    } catch {
      return iso
    }
  }

  const safeJson = (v: unknown) => {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">{isArabic ? 'جاري تحميل النشاط...' : 'Loading activity...'}</Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert severity="warning">
        {isArabic ? 'تعذر تحميل سجل النشاط: ' : 'Failed to load activity: '}
        {error}
      </Alert>
    )
  }

  if (mode === 'legacy') {
    if (legacyRows.length === 0) {
      return (
        <Card>
          <CardContent>
            <Typography color="text.secondary">{isArabic ? 'لا يوجد نشاط بعد' : 'No activity yet'}</Typography>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {isArabic ? 'آخر النشاطات' : 'Recent activity'}
          </Typography>
          <Stack spacing={1}>
            {legacyRows.map((log) => {
              const json = safeJson(log.details)
              return (
                <Accordion key={String(log.id)} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">{formatDateTime(log.created_at)} — {log.action}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {json || (isArabic ? 'لا توجد تفاصيل إضافية' : 'No extra details')}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )
            })}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">{isArabic ? 'لا يوجد نشاط بعد' : 'No activity yet'}</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      <Stack spacing={1}>
        {rows.map((row) => {
          const actionDisplay = row.action_display || row.operation
          const actionLabel = labelByAction[actionDisplay] || actionDisplay
          const actor = row.actor_name || row.actor_email || (isArabic ? 'غير معروف' : 'Unknown')
          const page = row.page_name || '—'
          const table = row.table_display_name || row.table_name

          const hasChanges = row.changed_fields && Object.keys(row.changed_fields).length > 0

          return (
            <Accordion key={row.id} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {formatDateTime(row.created_at)}
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                      {page} — {table}
                    </Typography>
                    <Chip size="small" color={chipColor(actionDisplay)} label={actionLabel} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {isArabic ? 'بواسطة: ' : 'by '}
                    {actor}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {isArabic ? 'المعرف:' : 'Record ID:'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {row.record_id}
                    </Typography>
                  </Stack>

                  {row.module_name ? (
                    <Typography variant="body2" color="text.secondary">
                      {isArabic ? 'الوحدة: ' : 'Module: '}
                      {row.module_name}
                    </Typography>
                  ) : null}

                  {hasChanges ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                        {isArabic ? 'التغييرات:' : 'Changed fields:'}
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(row.changed_fields || {}).map(([field, change]) => (
                          <Box key={field} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                              {field}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontFamily: 'monospace',
                                color: 'error.main',
                                wordBreak: 'break-word',
                              }}
                            >
                              ← {safeJson((change as any)?.old)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontFamily: 'monospace',
                                color: 'success.main',
                                wordBreak: 'break-word',
                              }}
                            >
                              → {safeJson((change as any)?.new)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {row.new_values ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                        {isArabic ? 'السجل الكامل:' : 'Full record:'}
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        {safeJson(row.new_values)}
                      </Box>
                    </Box>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Stack>
    </Box>
  )
}
