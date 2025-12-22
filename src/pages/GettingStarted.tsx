import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { useHasPermission } from '../hooks/useHasPermission'

type ChecklistItem = {
  id: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  path?: string
  requiredPermission?: string
}

type ChecklistState = Record<string, boolean>

const STORAGE_KEY = 'onboarding:getting_started_v1'

const readState = (): ChecklistState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ChecklistState
  } catch {
    return {}
  }
}

const writeState = (next: ChecklistState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const GettingStarted: React.FC = () => {
  const navigate = useNavigate()
  const hasPerm = useHasPermission()
  const { language, demoMode, setDemoMode } = useAppStore()
  const isAr = language === 'ar'

  const items: ChecklistItem[] = React.useMemo(
    () => [
      {
        id: 'pick_org',
        titleEn: 'Select your Organization',
        titleAr: 'اختر المؤسسة',
        descriptionEn: 'Use the selector in the top bar to choose the active organization.',
        descriptionAr: 'استخدم محدد المؤسسة في الشريط العلوي لاختيار المؤسسة الحالية.',
      },
      {
        id: 'accounts_tree',
        titleEn: 'Review the Chart of Accounts',
        titleAr: 'راجع شجرة الحسابات',
        descriptionEn: 'Open the Accounts Tree and verify structure before posting transactions.',
        descriptionAr: 'افتح شجرة الحسابات وتأكد من الهيكل قبل ترحيل المعاملات.',
        path: '/main-data/accounts-tree',
      },
      {
        id: 'create_transaction',
        titleEn: 'Start with a Transaction',
        titleAr: 'ابدأ بمعاملة',
        descriptionEn: 'Go to My Transactions and create or review entries.',
        descriptionAr: 'اذهب إلى معاملاتي وأنشئ أو راجع القيود.',
        path: '/transactions/my',
        requiredPermission: 'transactions.read.own',
      },
      {
        id: 'approvals',
        titleEn: 'Understand Approvals',
        titleAr: 'افهم نظام الموافقات',
        descriptionEn: 'If you review transactions, check the Approvals Inbox.',
        descriptionAr: 'إذا كنت تراجع المعاملات، افتح صندوق الموافقات.',
        path: '/approvals/inbox',
        requiredPermission: 'transactions.review',
      },
      {
        id: 'reports',
        titleEn: 'Run a Financial Report',
        titleAr: 'شغّل تقريراً مالياً',
        descriptionEn: 'Start with Trial Balance or General Ledger to validate your data.',
        descriptionAr: 'ابدأ بميزان المراجعة أو دفتر الأستاذ للتأكد من صحة البيانات.',
        path: '/reports/trial-balance',
      },
      {
        id: 'settings',
        titleEn: 'Configure Basics',
        titleAr: 'تهيئة الأساسيات',
        descriptionEn: 'Adjust fonts, organization settings, and user management as needed.',
        descriptionAr: 'عدّل الخطوط وإعدادات المؤسسة وإدارة المستخدمين حسب الحاجة.',
        path: '/settings/organization-management',
      },
    ],
    []
  )

  const [state, setState] = React.useState<ChecklistState>(() => readState())

  React.useEffect(() => {
    writeState(state)
  }, [state])

  const visibleItems = React.useMemo(() => {
    return items.filter((it) => {
      if (!it.requiredPermission) return true
      return hasPerm(it.requiredPermission)
    })
  }, [hasPerm, items])

  const completedCount = visibleItems.reduce((acc, it) => acc + (state[it.id] ? 1 : 0), 0)
  const totalCount = visibleItems.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, direction: isAr ? 'rtl' : 'ltr' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {isAr ? 'ابدأ هنا' : 'Getting Started'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAr ? 'اتبع هذه الخطوات السريعة لاستخدام النظام بدون تدريب شخصي.' : 'Use this quick checklist to use the system without personal training.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            color={progress === 100 ? 'success' : 'default'}
            variant={progress === 100 ? 'filled' : 'outlined'}
            label={isAr ? `الإنجاز: ${progress}%` : `Progress: ${progress}%`}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setState({})
            }}
          >
            {isAr ? 'إعادة ضبط القائمة' : 'Reset checklist'}
          </Button>
        </Stack>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'قائمة المهام' : 'Checklist'}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 999, mb: 2 }}
          />

          <Stack spacing={1.5}>
            {visibleItems.map((it, idx) => {
              const checked = Boolean(state[it.id])
              const title = isAr ? it.titleAr : it.titleEn
              const description = isAr ? it.descriptionAr : it.descriptionEn

              return (
                <Box key={it.id}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: '1 1 auto', minWidth: 240 }}>
                      <FormControlLabel
                        sx={{ m: 0, alignItems: 'flex-start' }}
                        control={
                          <Checkbox
                            checked={checked}
                            onChange={(e) => {
                              setState((prev) => ({ ...prev, [it.id]: e.target.checked }))
                            }}
                          />
                        }
                        label={
                          <Box sx={{ pt: 0.25 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                              {title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {description}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: 0.5 }}>
                      {it.path ? (
                        <Button
                          size="small"
                          variant={checked ? 'outlined' : 'contained'}
                          onClick={() => {
                            navigate(it.path!)
                          }}
                        >
                          {isAr ? 'فتح' : 'Open'}
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          setState((prev) => ({ ...prev, [it.id]: true }))
                        }}
                      >
                        {isAr ? 'تم' : 'Mark done'}
                      </Button>
                    </Stack>
                  </Stack>

                  {idx < visibleItems.length - 1 ? <Divider sx={{ my: 1 }} /> : null}
                </Box>
              )
            })}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'اختصارات مفيدة' : 'Helpful shortcuts'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => navigate('/welcome')}>
              {isAr ? 'صفحة الترحيب' : 'Welcome'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')}>
              {isAr ? 'لوحة التحكم' : 'Dashboard'}
            </Button>
            {hasPerm('admin.all') ? (
              <Button variant="outlined" onClick={() => navigate('/settings/diagnostics')}>
                {isAr ? 'التشخيص' : 'Diagnostics'}
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {isAr ? 'بيانات تجريبية (بدون قاعدة بيانات)' : 'Demo data (no database)'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isAr
              ? 'يشغّل وضعاً تجريبياً يعرض بيانات وهمية للعرض فقط. لا يتم إرسال أو حفظ أي بيانات في Supabase.'
              : 'Enables a demo view with mock data for exploration. Nothing is written to Supabase.'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {!demoMode ? (
              <Button variant="contained" onClick={() => setDemoMode(true)}>
                {isAr ? 'تفعيل الوضع التجريبي' : 'Enable Demo Mode'}
              </Button>
            ) : (
              <Button variant="outlined" color="warning" onClick={() => setDemoMode(false)}>
                {isAr ? 'إيقاف الوضع التجريبي' : 'Disable Demo Mode'}
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/')}
            >
              {isAr ? 'فتح لوحة التحكم' : 'Open Dashboard'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default GettingStarted
