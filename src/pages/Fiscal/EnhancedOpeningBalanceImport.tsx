import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Grow,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
  TextField,
  Autocomplete,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { alpha } from '@mui/material/styles'
import SearchableSelect, { type SearchableSelectOption } from '@/components/Common/SearchableSelect'

// Icons
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import BusinessIcon from '@mui/icons-material/Business'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import TimelineIcon from '@mui/icons-material/Timeline'
import LanguageIcon from '@mui/icons-material/Language'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import VisibilityIcon from '@mui/icons-material/Visibility'
import GetAppIcon from '@mui/icons-material/GetApp'
import EnhancedOBImportResultsModal from '@/components/Fiscal/EnhancedOBImportResultsModal'
import DraggableResizableDialog from '@/components/Common/DraggableResizableDialog'
import { ImportProgressTracker } from '@/components/Fiscal/ImportProgressTracker'
import OpeningBalanceImportWizard from '@/components/Fiscal/OpeningBalanceImportWizard'
import UltimateButton from '@/components/Common/UltimateButton'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Services and Utils
import { useArabicLanguage, ArabicLanguageService } from '@/services/ArabicLanguageService'
import { OpeningBalanceImportService } from '@/services/OpeningBalanceImportService'
import { FiscalYearSelector } from '@/components/Fiscal/FiscalYearSelector'
import { FiscalYearService } from '@/services/fiscal'
import { getActiveOrgId, getActiveProjectId } from '@/utils/org'
import useAppStore from '@/store/useAppStore'
import { tokens } from '@/theme/tokens'
import { getOrganization, getOrganizations } from '@/services/organization'
import { getProject } from '@/services/projects'
import './FiscalPages.css'

// Enhanced Professional Container
const ProfessionalContainer = ({ children, title, subtitle, actions }: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) => {
  const { isRTL, getDirectionalStyle } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Box sx={{
      minHeight: '100vh',
      background: tokens.palette.background.default,
      py: tokens.spacing(2)
    }}>
      <Container maxWidth="xl">
        <Paper 
          elevation={0} 
          sx={{ 
            minHeight: 'calc(100vh - 32px)',
            borderRadius: tokens.radius.md,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: tokens.palette.background.paper,
            border: `1px solid ${tokens.palette.divider}`,
            boxShadow: tokens.shadows.panel
          }}
        >
          {/* Header */}
          <Box sx={{
            background: tokens.palette.primary.main,
            color: tokens.palette.primary.contrastText,
            p: tokens.spacing(3),
            position: 'relative',
            overflow: 'hidden',
            ...getDirectionalStyle()
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3Ccircle cx="53" cy="7" r="7"/%3E%3Ccircle cx="30" cy="30" r="7"/%3E%3Ccircle cx="7" cy="53" r="7"/%3E%3Ccircle cx="53" cy="53" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }} />
            
            <Stack 
              direction={isRTL ? 'row-reverse' : 'row'} 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ position: 'relative', zIndex: 1 }}
              spacing={tokens.spacing(2)}
            >
              <Box>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: tokens.spacing(0.5) }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {actions && (
                <Box sx={{ display: 'flex', gap: tokens.spacing(1), flexWrap: 'wrap' }}>
                  {actions}
                </Box>
              )}
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: tokens.spacing(3)
          }}>
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

// Professional Status Card
const StatusCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary', 
  trend 
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
  trend?: { value: number; label: string }
}) => {
  const { isRTL, getDirectionalStyle, formatNumber } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Card elevation={0} sx={{
      background: 'var(--surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 0,
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4]
      }
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="center">
          <Box sx={{
            p: 1.5,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
            color: theme.palette[color].contrastText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon sx={{ fontSize: 28 }} />
          </Box>
          
          <Box sx={{ flex: 1, ...getDirectionalStyle() }}>
            <Typography variant="body2" color="text.secondary" fontWeight="medium">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight="bold" color={`${color}.main`}>
              {typeof value === 'number' ? formatNumber(value) : value}
            </Typography>
            {trend && (
              <Typography 
                variant="caption" 
                color={trend.value >= 0 ? 'success.main' : 'error.main'}
                fontWeight="medium"
              >
                {trend.value >= 0 ? '+' : ''}{formatNumber(trend.value)}% {trend.label}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// Professional File Upload Zone
const FileUploadZone = ({ 
  onFileSelect, 
  file, 
  loading = false 
}: {
  onFileSelect: (file: File) => void
  file: File | null
  loading?: boolean
}) => {
  const { t, isRTL, texts, getDirectionalStyle } = useArabicLanguage()
  const theme = useTheme()
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0])
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }, [onFileSelect])

  return (
    <Card 
      elevation={0}
      sx={{
        border: `2px dashed ${dragActive ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3)}`,
        borderRadius: 3,
        background: dragActive 
          ? alpha(theme.palette.primary.main, 0.05)
          : 'transparent',
        transition: 'all 0.3s ease',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent sx={{ p: 4, textAlign: 'center', ...getDirectionalStyle() }}>
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={loading}
        />
        <label htmlFor="file-upload" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
          <Stack spacing={3} alignItems="center">
            {loading ? (
              <CircularProgress size={60} thickness={4} />
            ) : (
              <Box sx={{
                p: 2,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: tokens.palette.primary.contrastText,
                display: 'inline-flex'
              }}>
                <CloudUploadIcon sx={{ fontSize: 40 }} />
              </Box>
            )}
            
            <Box>
              <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                {loading 
                  ? t(texts.common.loading)
                  : t(texts.importProcess.uploadFile)
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {file 
                  ? file.name
                  : isRTL 
                    ? 'اسحب وأفلت ملف Excel هنا أو انقر للتحديد'
                    : 'Drag & drop Excel file here or click to select'
                }
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {isRTL 
                  ? 'الصيغ المدعومة: .xlsx, .xls, .csv'
                  : 'Supported formats: .xlsx, .xls, .csv'
                }
              </Typography>
            </Box>
          </Stack>
        </label>
      </CardContent>
    </Card>
  )
}

// Professional Progress Stepper
const ImportStepper = ({ 
  activeStep, 
  steps, 
  onStepClick 
}: {
  activeStep: number
  steps: Array<{ label: string; description?: string; completed?: boolean; error?: boolean }>
  onStepClick?: (step: number) => void
}) => {
  const { isRTL } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Card elevation={0} sx={{ 
      background: alpha(theme.palette.background.paper, 0.8),
      backdropFilter: 'blur(10px)',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
    }}>
      <CardContent sx={{ p: 3 }}>
        <Stepper 
          activeStep={activeStep} 
          orientation="horizontal" 
          sx={{
            '& .MuiStepConnector-root': {
              display: isRTL ? 'none' : 'block'
            }
          }}
        >
          {steps.map((step, index) => (
            <Step 
              key={index} 
              completed={step.completed}
              sx={{
                cursor: onStepClick ? 'pointer' : 'default',
                '& .MuiStepLabel-root': {
                  direction: isRTL ? 'rtl' : 'ltr'
                }
              }}
              onClick={() => onStepClick?.(index)}
            >
              <StepLabel 
                error={step.error}
                StepIconComponent={({ active, completed, error }) => (
                  <Box sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: error 
                      ? theme.palette.error.main
                      : completed 
                        ? theme.palette.success.main
                        : active 
                          ? theme.palette.primary.main
                          : theme.palette.grey[300],
                    color: theme.palette.common.white,
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}>
                    {error ? (
                      <ErrorIcon sx={{ fontSize: 20 }} />
                    ) : completed ? (
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                    ) : (
                      <Typography variant="body2" fontWeight="bold">
                        {index + 1}
                      </Typography>
                    )}
                  </Box>
                )}
              >
                <Typography variant="subtitle2" fontWeight="medium">
                  {step.label}
                </Typography>
                {step.description && (
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                )}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  )
}

// Main Enhanced Component
export default function EnhancedOpeningBalanceImport() {
  const { t, isRTL, texts, getDirectionalStyle, formatNumber, formatCurrency } = useArabicLanguage()
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // State
  const [orgId, setOrgId] = useState(() => getActiveOrgId() || '')
  const [projectId] = useState(() => getActiveProjectId() || '')
  const [orgName, setOrgName] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [orgOptions, setOrgOptions] = useState<any[]>([])
  const [debugOpen, setDebugOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [importStatus, setImportStatus] = useState<any>(null)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [includeCurrencyInTemplate, setIncludeCurrencyInTemplate] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [currentImportId, setCurrentImportId] = useState<string>('')
  const [approvalRequestId, setApprovalRequestId] = useState<string>('')
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([])
  // Preview/edit before validate/import
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  // Column config for preview table (visibility/order/width)
  const [previewColConfig, setPreviewColConfig] = useState<Array<{ key: string; visible: boolean; width?: number }>>([])
  // Column mapping for preview -> normalized rows
  const [columnMap, setColumnMap] = useState<{ [k: string]: string }>({
    account_code: 'account_code',
    opening_balance_debit: 'opening_balance_debit',
    opening_balance_credit: 'opening_balance_credit',
    amount: 'amount',
    project_code: 'project_code',
    cost_center_code: 'cost_center_code',
    currency_code: 'currency_code',
  })
  // Quick create fiscal year inline
  const [showCreateFY, setShowCreateFY] = useState(false)
  const [newYearNumber, setNewYearNumber] = useState<number>(new Date().getFullYear())
  const [newStartDate, setNewStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`)
  const [newEndDate, setNewEndDate] = useState<string>(`${new Date().getFullYear()}-12-31`)
  const [creatingFY, setCreatingFY] = useState(false)

  // Manual entry state
  const [showManual, setShowManual] = useState(false)
  const [manualRows, setManualRows] = useState<Array<{ account_code: string; opening_balance_debit?: string | number; opening_balance_credit?: string | number; amount?: string | number; project_code?: string; cost_center_code?: string; currency_code?: string }>>([
    { account_code: '', opening_balance_debit: '', opening_balance_credit: '' }
  ])
  const [accountOptions, setAccountOptions] = useState<Array<{ id: string; code: string; name?: string }>>([])
  const [accountLoading, setAccountLoading] = useState(false)
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; code: string; name?: string }>>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [ccOptions, setCcOptions] = useState<Array<{ id: string; code: string; name?: string }>>([])
  const [ccLoading, setCcLoading] = useState(false)
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(['EGP','SAR','AED','USD','EUR','KWD','QAR','BHD'])
  const [balanceGuard, setBalanceGuard] = useState(true)
  const [perCurrencyGuard, setPerCurrencyGuard] = useState(false)
  // Unified select options for account/project/cc (styled like transactions)
  // SearchableSelect needs flat options for inline dropdown, and treeOptions for drilldown modal
  const [accountSelectOptions, setAccountSelectOptions] = useState<SearchableSelectOption[]>([])
  const [accountTreeOptions, setAccountTreeOptions] = useState<SearchableSelectOption[]>([])
  const [projectFlatOptions, setProjectFlatOptions] = useState<SearchableSelectOption[]>([])
  const [projectTreeOptions, setProjectTreeOptions] = useState<SearchableSelectOption[]>([])
  const [ccFlatOptions, setCcFlatOptions] = useState<SearchableSelectOption[]>([])
  const [ccTreeOptions, setCcTreeOptions] = useState<SearchableSelectOption[]>([])
  // Manual table column configuration (CRUD-style)
  type ManualColKey = 'account_code' | 'opening_balance_debit' | 'opening_balance_credit' | 'amount' | 'project_code' | 'cost_center_code' | 'currency_code' | '__actions'
  const [manualColConfig, setManualColConfig] = useState<Array<{ key: ManualColKey; labelAr: string; labelEn: string; visible: boolean; width?: number }>>([])
  // Entry mode and review
  const [useAmountMode, setUseAmountMode] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [normalizedPreview, setNormalizedPreview] = useState<any[]>([])
  // Review columns (visibility/order/width)
  const [reviewColConfig, setReviewColConfig] = useState<Array<{ key: string; labelAr: string; labelEn: string; visible: boolean; width?: number }>>([])
  // Debounce timers
  const [accTimer, setAccTimer] = useState<any>(null)
  const [projTimer, setProjTimer] = useState<any>(null)
  const [ccTimer, setCCTimer] = useState<any>(null)
  // Row-level errors for unified CRUD validation
  const [rowErrors, setRowErrors] = useState<Array<{ account_code?: string; project_code?: string; cost_center_code?: string }>>([])
  const [submitForApproval, setSubmitForApproval] = useState<boolean>(true)
  // Templates
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; rows: any[] }>>([])
  const [templateName, setTemplateName] = useState('')
  // Column visibility settings
  const [manualCols, setManualCols] = useState<{ project: boolean; costCenter: boolean; currency: boolean }>({ project: true, costCenter: true, currency: true })
  const [showColSettings, setShowColSettings] = useState(false)

  // Language Toggle
  const toggleLanguage = useCallback(() => {
    const newLang = ArabicLanguageService.getCurrentLanguage() === 'en' ? 'ar' : 'en'
    ArabicLanguageService.setLanguage(newLang)
    window.location.reload() // Reload to apply changes
  }, [])

  // Load templates prefs and currencies
  useEffect(() => {
    try {
      const raw = localStorage.getItem('obi_manual_templates')
      if (raw) setTemplates(JSON.parse(raw))
      const pref = localStorage.getItem('obi_manual_prefs')
      if (pref) {
        const p = JSON.parse(pref)
        if (typeof p.useAmountMode==='boolean') setUseAmountMode(p.useAmountMode)
        if (p.manualCols) setManualCols(p.manualCols)
      }
    } catch {}
    // fetch currencies
    (async ()=>{
      try { setCurrencyOptions(await OpeningBalanceImportService.fetchCurrencies()) } catch {}
    })()
  }, [])

  // Initialize preview column config when headers change
  useEffect(() => {
    if (!uploadHeaders || uploadHeaders.length === 0) return
    try {
      const saved = localStorage.getItem('obi.preview.columns')
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{ key: string; visible: boolean; width?: number }>
        // Merge with current headers, keep order from saved where possible
        const existingKeys = new Set(uploadHeaders)
        const kept = parsed.filter(c => existingKeys.has(c.key))
        const missing = uploadHeaders.filter(h => !kept.some(c => c.key === h)).map(h => ({ key: h, visible: true }))
        setPreviewColConfig([...kept, ...missing])
      } else {
        setPreviewColConfig(uploadHeaders.map(h => ({ key: h, visible: true })))
      }
    } catch {
      setPreviewColConfig(uploadHeaders.map(h => ({ key: h, visible: true })))
    }
  }, [uploadHeaders])

  // Initialize review column config when mode changes
  useEffect(() => {
    const base: Array<{ key: string; labelAr: string; labelEn: string; visible: boolean }>= useAmountMode
      ? [
          { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
          { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount', visible: true },
          { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
          { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
          { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
        ]
      : [
          { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
          { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit', visible: true },
          { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit', visible: true },
          { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
          { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
          { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
        ]
    try {
      const saved = localStorage.getItem('obi.review.columns')
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{ key: string; labelAr: string; labelEn: string; visible: boolean; width?: number }>
        const keys = new Set(base.map(b=> b.key))
        const kept = parsed.filter(c => keys.has(c.key)).map(c => {
          if (c.key==='amount') return { ...c, visible: useAmountMode ? c.visible : false }
          if (c.key==='opening_balance_debit' || c.key==='opening_balance_credit') return { ...c, visible: useAmountMode ? false : c.visible }
          return c
        })
        const missing = base.filter(b => !kept.some(k=> k.key===b.key)).map(b => ({ ...b }))
        setReviewColConfig([...kept, ...missing])
      } else {
        setReviewColConfig(base)
      }
    } catch { setReviewColConfig(base) }
  }, [useAmountMode])

  // Persist review column config
  useEffect(()=>{ try { if (reviewColConfig.length) localStorage.setItem('obi.review.columns', JSON.stringify(reviewColConfig)) } catch {} }, [reviewColConfig])

  // Header drag-reorder and drag-resize utilities
  const makeDragHandlers = <T extends { width?: number }>(get: ()=> T[], set: (updater: (prev: T[])=>T[])=>void) => ({
    onDragStart: (fromIdx: number) => (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', String(fromIdx))
    },
    onDragOver: (_toIdx: number) => (e: React.DragEvent) => { e.preventDefault() },
    onDrop: (toIdx: number) => (e: React.DragEvent) => {
      const from = parseInt(e.dataTransfer.getData('text/plain')||'-1',10)
      if (!Number.isFinite(from) || from<0) return
      if (from === toIdx) return
      set((prev)=>{ const arr=[...prev]; const [m]=arr.splice(from,1); arr.splice(toIdx,0,m); return arr })
    },
    onStartResize: (idx: number) => (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation()
      const startX = e.clientX
      const startW = (get()[idx]?.width ?? 160)
      const mm = (me: MouseEvent) => {
        const dw = me.clientX - startX
        const w = Math.max(80, startW + dw)
        set(prev => prev.map((c,i)=> i===idx ? ({...c, width: w}) : c))
      }
      const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
      window.addEventListener('mousemove', mm)
      window.addEventListener('mouseup', mu)
    }
  })

  const previewHdr = makeDragHandlers(()=>previewColConfig, (updater)=> setPreviewColConfig(prev=> updater(prev)))
  const manualHdr = makeDragHandlers(()=>manualColConfig, (updater)=> setManualColConfig(prev=> updater(prev)))
  const reviewHdr = makeDragHandlers(()=>reviewColConfig, (updater)=> setReviewColConfig(prev=> updater(prev)))

  // Header context menu state
  const [hdrMenu, setHdrMenu] = useState<{ anchor: HTMLElement | null; scope: 'preview'|'manual'|'review' | null; key: string | null }>({ anchor: null, scope: null, key: null })
  const openHeaderMenu = (e: React.MouseEvent, scope: 'preview'|'manual'|'review', key: string) => {
    e.preventDefault()
    setHdrMenu({ anchor: e.currentTarget as HTMLElement, scope, key })
  }
  const closeHeaderMenu = () => setHdrMenu({ anchor: null, scope: null, key: null })

  const hideCol = () => {
    if (!hdrMenu.scope || !hdrMenu.key) return
    if (hdrMenu.scope==='preview') setPreviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? {...c, visible:false}: c))
    if (hdrMenu.scope==='manual') setManualColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? {...c, visible:false}: c))
    if (hdrMenu.scope==='review') setReviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? {...c, visible:false}: c))
    closeHeaderMenu()
  }
  const showOnlyCol = () => {
    if (!hdrMenu.scope || !hdrMenu.key) return
    if (hdrMenu.scope==='preview') setPreviewColConfig(prev=> prev.map(c=> ({...c, visible: c.key===hdrMenu.key})))
    if (hdrMenu.scope==='manual') setManualColConfig(prev=> prev.map(c=> ({...c, visible: c.key===hdrMenu.key})))
    if (hdrMenu.scope==='review') setReviewColConfig(prev=> prev.map(c=> ({...c, visible: c.key===hdrMenu.key})))
    closeHeaderMenu()
  }
  const resetWidthCol = () => {
    if (!hdrMenu.scope || !hdrMenu.key) return
    if (hdrMenu.scope==='preview') setPreviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: undefined}): c))
    if (hdrMenu.scope==='manual') setManualColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: undefined}): c))
    if (hdrMenu.scope==='review') setReviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: undefined}): c))
    closeHeaderMenu()
  }
  const autosizeCol = () => {
    if (!hdrMenu.scope || !hdrMenu.key) return
    if (hdrMenu.scope==='preview') {
      const vals = previewRows.slice(0,100).map(r=> (r as any)[hdrMenu.key!])
      const w = calcAutoWidth(vals)
      setPreviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: w}): c))
    }
    if (hdrMenu.scope==='manual') {
      const vals = manualRows.slice(0,100).map(r=> (r as any)[hdrMenu.key as any])
      const w = calcAutoWidth(vals, hdrMenu.key==='__actions'?180:120)
      setManualColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: w}): c))
    }
    if (hdrMenu.scope==='review') {
      const vals = normalizedPreview.slice(0,200).map(r=> (r as any)[hdrMenu.key!])
      const w = calcAutoWidth(vals)
      setReviewColConfig(prev=> prev.map(c=> c.key===hdrMenu.key? ({...c, width: w}): c))
    }
    closeHeaderMenu()
  }

  const calcAutoWidth = (values: any[], min=120, max=360) => {
    const longest = Math.max(0, ...values.map(v => String(v ?? '').length))
    return Math.min(max, Math.max(min, longest*8 + 40))
  }

  // Persist preview column config
  useEffect(() => {
    try { if (previewColConfig.length) localStorage.setItem('obi.preview.columns', JSON.stringify(previewColConfig)) } catch {}
  }, [previewColConfig])

  // Prefetch unified select options when opening manual entry
  useEffect(() => {
    if (!showManual || !orgId) return
    ;(async () => {
      try {
        const [acc, prj, cc] = await Promise.all([
          OpeningBalanceImportService.listAccountsTreeForSelect(orgId, 5000),
          OpeningBalanceImportService.listProjectsForSelect(orgId, 2000),
          OpeningBalanceImportService.listCostCentersTreeForSelect(orgId, 5000),
        ])
        // Build hierarchy from parent links for SearchableSelect drilldown
        const buildTree = (rows: any[]) => {
          const byValue = new Map<string, any>()
          rows.forEach(r => byValue.set(r.value, { ...r, children: [] as any[] }))
          const roots: any[] = []
          rows.forEach(r => {
            const node = byValue.get(r.value)
            if (r.parent && byValue.has(r.parent)) {
              byValue.get(r.parent).children.push(node)
            } else {
              roots.push(node)
            }
          })
          return roots
        }
        const toFlat = (rows: any[]) => rows.map(r => ({ value: r.value, label: r.label, searchText: r.searchText }))

        // Accounts
        setAccountTreeOptions(buildTree(acc))
        setAccountSelectOptions(toFlat(acc))
        // Projects
        setProjectTreeOptions(buildTree(prj))
        setProjectFlatOptions(toFlat(prj))
        // Cost Centers
        setCcTreeOptions(buildTree(cc))
        setCcFlatOptions(toFlat(cc))
      } catch {}
    })()
  }, [showManual, orgId])

  // Persist prefs
  useEffect(()=>{
    try { localStorage.setItem('obi_manual_prefs', JSON.stringify({ useAmountMode, manualCols })) } catch {}
  }, [useAmountMode, manualCols])

  // Initialize manual column config, respecting saved config and amount/debit-credit mode
  useEffect(() => {
    const base: Array<{ key: ManualColKey; labelAr: string; labelEn: string }> = [
      { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code' },
      { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit' },
      { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit' },
      { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
      { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code' },
      { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center' },
      { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency' },
      { key: '__actions', labelAr: 'إجراءات', labelEn: 'Actions' },
    ]
    try {
      const saved = localStorage.getItem('obi.manual.columns')
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{ key: ManualColKey; labelAr: string; labelEn: string; visible: boolean; width?: number }>
        // Enforce mode visibility
        const mapped = parsed.map(c => {
          if (c.key === 'amount') return { ...c, visible: useAmountMode ? c.visible : false }
          if (c.key === 'opening_balance_debit' || c.key === 'opening_balance_credit') return { ...c, visible: useAmountMode ? false : c.visible }
          return c
        })
        // Include any missing keys
        const keys = new Set(mapped.map(m => m.key))
        const missing = base.filter(b => !keys.has(b.key)).map(b => ({ ...b, visible: b.key === 'amount' ? useAmountMode : (b.key==='opening_balance_debit'||b.key==='opening_balance_credit' ? !useAmountMode : true) }))
        setManualColConfig([...mapped, ...missing])
      } else {
        const def = base.map(b => ({ ...b, visible: b.key === 'amount' ? useAmountMode : (b.key==='opening_balance_debit'||b.key==='opening_balance_credit' ? !useAmountMode : true) }))
        // Respect older toggles for project/cost center/currency
        const applyToggles = def.map(c => (
          c.key === 'project_code' ? { ...c, visible: manualCols.project } :
          c.key === 'cost_center_code' ? { ...c, visible: manualCols.costCenter } :
          c.key === 'currency_code' ? { ...c, visible: manualCols.currency } : c
        ))
        setManualColConfig(applyToggles)
      }
    } catch {
      const def = base.map(b => ({ ...b, visible: b.key === 'amount' ? useAmountMode : (b.key==='opening_balance_debit'||b.key==='opening_balance_credit' ? !useAmountMode : true) }))
      setManualColConfig(def)
    }
  }, [useAmountMode])

  // Persist manual column config
  useEffect(() => {
    try { if (manualColConfig.length) localStorage.setItem('obi.manual.columns', JSON.stringify(manualColConfig)) } catch {}
  }, [manualColConfig])

  // Auto-open results modal if importId is present in URL
  useEffect(() => {
    const qImportId = searchParams.get('importId') || ''
    if (qImportId) {
      (async () => {
        try {
          setCurrentImportId(qImportId)
          setLoading(true)
          const s = await OpeningBalanceImportService.getImportStatus(qImportId)
          setImportStatus(s)
          setShowResults(true)
          setShowResultsModal(true)
          // If still processing, move to step 4 and subscribe
          if (['pending','processing'].includes(s.status)) {
            setActiveStep(4)
            waitForTerminalAndShow(qImportId)
          } else {
            setActiveStep(5)
          }
        } catch (e) {
          // If not found, ignore
        } finally {
          setLoading(false)
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resolve friendly names for org/project
  useEffect(() => {
    (async () => {
      try {
        // Load organizations for step 0
        const orgs = await getOrganizations().catch(()=>[])
        setOrgOptions(orgs || [])
        if (orgId) {
          const org = await getOrganization(orgId)
          setOrgName(org ? `${org.code} - ${org.name}` : orgId)
        } else {
          setOrgName('')
        }
        if (projectId) {
          const proj = await getProject(projectId)
          setProjectName(proj ? `${proj.code} - ${proj.name}` : projectId)
        } else {
          setProjectName('')
        }
      } catch {
        setOrgName(orgId)
        setProjectName(projectId)
      }
    })()
  }, [orgId, projectId])

  // Steps Configuration (step 0: Select Organization)
  const steps = useMemo(() => [
    {
      label: isRTL ? 'اختر المؤسسة' : 'Select Organization',
      description: isRTL ? 'هذه الخطوة مطلوبة قبل اختيار السنة' : 'Required before selecting fiscal year',
      completed: !!orgId
    },
    {
      label: isRTL ? 'اختر السنة المالية' : 'Select Fiscal Year',
      description: isRTL ? 'هذه الخطوة مطلوبة قبل رفع الملف' : 'Required before uploading the file',
      completed: !!fiscalYearId
    },
    {
      label: t(texts.importProcess.uploadFile),
      description: isRTL ? 'قم برفع ملف Excel/CSV' : 'Choose Excel/CSV file to import',
      completed: !!file
    },
    {
      label: t(texts.importProcess.validateData),
      description: isRTL ? 'التحقق من صحة البيانات' : 'Validate data integrity',
      completed: !!validationResults
    },
    {
      label: t(texts.importProcess.processImport),
      description: isRTL ? 'معالجة عملية الاستيراد' : 'Process the import',
      completed: importStatus?.status === 'completed'
    },
    {
      label: t(texts.importProcess.importComplete),
      description: isRTL ? 'مراجعة النتائج النهائية' : 'Review final results',
      completed: showResults && importStatus?.status === 'completed'
    }
  ], [file, validationResults, importStatus, showResults, t, texts, isRTL, fiscalYearId, orgId])

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Enforce selecting fiscal year first
    if (!fiscalYearId) {
      try { (window as any)?.toast?.warning?.(isRTL ? 'يرجى اختيار السنة المالية أولاً' : 'Please select a fiscal year first') } catch {}
      setActiveStep(0)
      return
    }

    setFile(selectedFile)
    setActiveStep(2)

    // Capture headers + build preview rows
    try {
      const isCsv = /\.csv$/i.test(selectedFile.name)
      if (isCsv) {
        const text = await selectedFile.text()
        const lines = text.split(/\r?\n/).filter(Boolean)
        const heads = (lines[0] || '').split(',').map(h => h.replace(/^\"|\"$/g,'').trim())
        if (heads.length) setUploadHeaders(heads)
        const body = lines.slice(1).map(l => {
          const vals = l.split(',').map(v => v.replace(/^\"|\"$/g,'').trim())
          const obj: any = {}
          heads.forEach((h,i)=> obj[h]=vals[i] ?? '')
          return obj
        })
        setPreviewRows(body)
      } else {
        const buf = await selectedFile.arrayBuffer()
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'array' })
        const sh = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sh, { defval: '' }) as any[]
        if (rows[0]) setUploadHeaders(Object.keys(rows[0]))
        setPreviewRows(rows)
      }
      setShowPreview(true)
    } catch {}

    // Do not auto-validate; wait for user to review/edit first
  }, [fiscalYearId, isRTL])

  // Handle import process
  const waitForTerminalAndShow = useCallback((importId: string) => {
    let done = false
    let timer: any
    const sub = OpeningBalanceImportService.subscribeToImport({ importId, onTick: async () => {
      try {
        const s = await OpeningBalanceImportService.getImportStatus(importId)
        setImportStatus(s)
        if (['completed','failed','partially_completed'].includes(s.status)) {
          done = true
          clearTimeout(timer)
          sub?.unsubscribe?.()
          setShowResults(true)
          setShowResultsModal(true)
          setActiveStep(5)
          setLoading(false)
        }
      } catch {}
    } })
    const poll = async () => {
      if (done) return
      try {
        const s = await OpeningBalanceImportService.getImportStatus(importId)
        setImportStatus(s)
        if (['completed','failed','partially_completed'].includes(s.status)) {
          done = true
          clearTimeout(timer)
          sub?.unsubscribe?.()
          setShowResults(true)
          setShowResultsModal(true)
          setActiveStep(5)
          setLoading(false)
          return
        }
      } catch {}
      timer = setTimeout(poll, 2000)
    }
    poll()
  }, [])

  const handleImport = useCallback(async () => {
    if (!file || !orgId || !fiscalYearId) return

    setLoading(true)
    setActiveStep(4)
    
    try {
      try { (window as any)?.toast?.info?.(isRTL ? 'بدأت عملية الاستيراد' : 'Import started') } catch {}
      const result = await OpeningBalanceImportService.importFromExcel(orgId, fiscalYearId, file)
      setImportStatus(result)
      setCurrentImportId(result.importId)
      // While server processes, show indeterminate progress and wait
      if (!['completed','failed','partially_completed'].includes(result.status)) {
        waitForTerminalAndShow(result.importId)
      } else {
        setShowResults(true)
        setShowResultsModal(true)
        setActiveStep(5)
        setLoading(false)
        try {
          (window as any)?.toast?.success?.(isRTL ? 'اكتمل الاستيراد' : 'Import completed')
        } catch {}
      }
    } catch (error: any) {
      console.error('Import error:', error)
      setImportStatus({ status: 'failed', error: error?.message ?? String(error) })
      setLoading(false)
      try { (window as any)?.toast?.error?.(isRTL ? 'فشل الاستيراد' : 'Import failed') } catch {}
    }
  }, [file, orgId, fiscalYearId, waitForTerminalAndShow])

  // Header Actions
  const [wizardOpen, setWizardOpen] = useState(false)
  const headerActions = useMemo(() => (
    <>
      {/* Compact org/project info */}
      <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
          {isRTL ? 'المؤسسة' : 'Organization'}: {orgName || (isRTL ? 'غير محددة' : 'Not selected')}
        </Typography>
        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
          {isRTL ? 'المشروع' : 'Project'}: {projectName || (isRTL ? 'الكل' : 'All')}
        </Typography>
      </Box>

      <Chip size="small" color="secondary" label={isRTL ? 'الواجهة المحسّنة' : 'Enhanced UI'} sx={{ mr: 1 }} />

      {/* Manual Entry Button */}
      <UltimateButton kind="success" onClick={() => setShowManual(true)} sx={{ mr: 1 }}>
        {isRTL ? 'إدخال يدوي' : 'Manual Entry'}
      </UltimateButton>
      <UltimateButton kind="ghost" onClick={()=> setShowColSettings(true)} sx={{ mr: 1 }}>
        {isRTL ? 'الإعدادات' : 'Settings'}
      </UltimateButton>

      {/* Download: prefilled Excel */}
      <UltimateButton kind="ghost" startIcon={<DownloadIcon />} onClick={async () => {
          if (!orgId) { try { (window as any)?.toast?.error?.(isRTL ? 'يرجى اختيار المؤسسة أولاً' : 'Select organization first') } catch {}; return }
          try {
            const blob = await OpeningBalanceImportService.generateAccountsPrefilledTemplate(orgId, { includeCurrency: includeCurrencyInTemplate })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'opening_balance_current_accounts.xlsx'
            a.click()
            URL.revokeObjectURL(url)
          } catch (e: any) { alert(e?.message ?? String(e)) }
        }}
        sx={{ mr: 1 }}
      >
        {isRTL ? 'قالب الحسابات (Excel)' : 'Template (Current Accounts)'}
      </UltimateButton>

      {/* Download: prefilled CSV */}
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<DownloadIcon />}
        onClick={async () => {
          if (!orgId) { try { (window as any)?.toast?.error?.(isRTL ? 'يرجى اختيار المؤسسة أولاً' : 'Select organization first') } catch {}; return }
          try {
            const blob = await OpeningBalanceImportService.generateAccountsPrefilledCsv(orgId, { includeCurrency: includeCurrencyInTemplate })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'opening_balance_current_accounts.csv'
            a.click()
            URL.revokeObjectURL(url)
          } catch (e: any) { alert(e?.message ?? String(e)) }
        }}
        sx={{ mr: 1 }}
      >
        {isRTL ? 'قالب الحسابات (CSV)' : 'Template (Current Accounts) CSV'}
      </Button>

      {/* Download: empty template (moved from right panel) */}
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<DownloadIcon />}
        onClick={async () => {
          const blob = await OpeningBalanceImportService.generateImportTemplate()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'opening_balance_template.xlsx'
          a.click()
          URL.revokeObjectURL(url)
        }}
        sx={{ mr: 1 }}
      >
        {t(texts.importProcess.downloadTemplate)}
      </Button>

      <FormControlLabel
        control={<Checkbox checked={includeCurrencyInTemplate} onChange={(e)=> setIncludeCurrencyInTemplate(e.target.checked)} />}
        label={isRTL ? 'تضمين عمود العملة' : 'Include currency column'}
        sx={{ color: tokens.palette.primary.contrastText, mx: 1 }}
      />

      <Tooltip title={isRTL ? 'تبديل اللغة' : 'Toggle language'}>
        <IconButton color="inherit" onClick={toggleLanguage}>
          <LanguageIcon />
        </IconButton>
      </Tooltip>

      <UltimateButton kind="secondary" startIcon={<RestartAltIcon />} onClick={() => {
          setFile(null)
          setActiveStep(0)
          setImportStatus(null)
          setValidationResults(null)
          setShowResults(false)
        }}
        sx={{ ml: 1 }}
      >
        {t(texts.common.cancel)}
      </UltimateButton>
    </>
  ), [isRTL, includeCurrencyInTemplate, orgId, toggleLanguage, t, texts, orgName, projectName])

  return (
    <ProfessionalContainer
      title={t(texts.openingBalanceImport)}
      subtitle={isRTL ? 'استيراد الأرصدة الافتتاحية للمشاريع الإنشائية' : 'Import opening balances for construction projects'}
      actions={headerActions}
    >
      <Box sx={{ p: 3, ...getDirectionalStyle() }}>
        {/* Primary CTA */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button variant="contained" color="primary" size="large" onClick={()=> setWizardOpen(true)}>
            {isRTL ? 'بدء معالج الاستيراد الموحد' : 'Open Unified Import Wizard'}
          </Button>
          <Button variant="text" size="small" onClick={()=> setShowAdvanced(v=>!v)}>
            {isRTL ? (showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'عرض الخيارات المتقدمة') : (showAdvanced ? 'Hide Advanced' : 'Show Advanced')}
          </Button>
        </Box>
        {showAdvanced && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={12}>
            <Stack spacing={3}>
              <ImportStepper 
                activeStep={activeStep}
                steps={steps}
                onStepClick={(step) => setActiveStep(step)}
              />

              {/* Step Content */}
              <Card elevation={0} sx={{ 
                minHeight: 400,
                background: 'var(--surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 0
              }}>
                <CardContent sx={{ p: 4 }}>
                  {activeStep === 0 && (
                    <Fade in timeout={600}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {isRTL ? 'اختيار المؤسسة' : 'Select Organization'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ...getDirectionalStyle() }}>
                          {isRTL ? 'هذه الخطوة مطلوبة للمتابعة إلى اختيار السنة المالية' : 'This step is required before selecting the fiscal year.'}
                        </Typography>
                        <FormControl fullWidth sx={{ maxWidth: 420 }}>
                          <InputLabel>{isRTL ? 'المؤسسة' : 'Organization'}</InputLabel>
                          <Select
                            label={isRTL ? 'المؤسسة' : 'Organization'}
                            value={orgId || ''}
                            onChange={(e)=>{ const v = String(e.target.value); setOrgId(v); try{ localStorage.setItem('org_id', v) }catch{}; if (v) setActiveStep(1) }}
                          >
                            {(orgOptions||[]).map((o)=> (
                              <MenuItem key={o.id} value={o.id}>{o.code ? `${o.code} - ${o.name}` : (o.name || o.id)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {!orgId && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            {isRTL ? 'يرجى اختيار المؤسسة للمتابعة' : 'Please select an organization to continue.'}
                          </Alert>
                        )}
                        {orgId && (
                          <Box sx={{ mt: 2 }}>
                            <Button variant="contained" onClick={()=> setActiveStep(1)}>
                              {isRTL ? 'التالي: اختيار السنة' : 'Next: Select Fiscal Year'}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Fade>
                  )}

                  {activeStep === 1 && (
                    <Fade in timeout={600}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {isRTL ? 'اختيار السنة المالية' : 'Select Fiscal Year'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ...getDirectionalStyle() }}>
                          {isRTL ? 'هذه الخطوة مطلوبة للمتابعة إلى رفع الملف' : 'This step is required to proceed to file upload.'}
                        </Typography>
                        <Box sx={{ maxWidth: 420 }}>
                          <FiscalYearSelector
                            value={fiscalYearId}
                            onChange={(v)=>{ setFiscalYearId(v); if (v) setActiveStep(2) }}
                            helperText={isRTL ? 'اختر السنة المالية' : 'Select fiscal year'}
                          />
                          {!fiscalYearId && (
                            <Button sx={{ mt: 1 }} size="small" variant="outlined" onClick={()=> setShowCreateFY(true)}>
                              {isRTL ? 'إنشاء سنة مالية جديدة' : 'Create new fiscal year'}
                            </Button>
                          )}
                        </Box>
                        {!fiscalYearId && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            {isRTL ? 'يرجى اختيار السنة المالية من هنا ثم المتابعة' : 'Please select the fiscal year here, then continue.'}
                          </Alert>
                        )}
                        {fiscalYearId && (
                          <Box sx={{ mt: 2 }}>
                            <Button variant="contained" onClick={()=> setActiveStep(2)}>
                              {isRTL ? 'التالي: رفع الملف' : 'Next: Upload File'}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Fade>
                  )}

                  {activeStep === 2 && (
                    <Fade in timeout={600}>
                      <Box>
                        {!fiscalYearId && (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            {isRTL ? 'يرجى اختيار السنة المالية من الخطوة السابقة قبل المتابعة' : 'Please select a fiscal year in the previous step before proceeding.'}
                          </Alert>
                        )}
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {t(texts.importProcess.uploadFile)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, ...getDirectionalStyle() }}>
                          {isRTL 
                            ? 'قم بتحديد ملف Excel يحتوي على الأرصدة الافتتاحية للمشروع الإنشائي'
                            : 'Select an Excel file containing opening balances for your construction project'
                          }
                        </Typography>
                        
                        <Box sx={{ position: 'relative' }}>
                          <FileUploadZone 
                            onFileSelect={handleFileSelect}
                            file={file}
                            loading={(loading && activeStep === 2) || !fiscalYearId}
                          />
                          {!fiscalYearId && (
                            <Box sx={{
                              position: 'absolute', inset: 0, bgcolor: 'var(--overlay_background)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              pointerEvents: 'none', borderRadius: 3
                            }}>
                              <Typography variant="body2" color="text.secondary">
                                {isRTL ? 'اختر السنة المالية أولاً' : 'Select fiscal year first'}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {file && (
                          <Grow in timeout={400}>
                            <Alert 
                              severity="success" 
                              sx={{ mt: 2 }}
                              icon={<CheckCircleIcon />}
                            >
                              <Typography variant="body2">
                                {isRTL 
                                  ? `تم تحديد الملف: ${file.name}`
                                  : `File selected: ${file.name}`
                                }
                              </Typography>
                            </Alert>
                          </Grow>
                        )}
                      </Box>
                    </Fade>
                  )}

                  {activeStep === 3 && (
                    <Fade in timeout={600}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {t(texts.importProcess.validateData)}
                        </Typography>
                        
                        {loading ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress size={60} thickness={4} />
                            <Typography variant="body1" sx={{ mt: 2 }}>
                              {t(texts.common.loading)}
                            </Typography>
                          </Box>
                        ) : validationResults ? (
                          <Stack spacing={2}>
                            <Alert severity="success" icon={<CheckCircleIcon />}>
                              <Typography variant="body2">
                                {isRTL
                                  ? `تم التحقق من البيانات بنجاح - ${validationResults.validRecords} من ${validationResults.totalRecords} صف صالح`
                                  : `Data validation successful - ${validationResults.validRecords} of ${validationResults.totalRecords} rows valid`
                                }
                              </Typography>
                            </Alert>
                            
                            <Button
                              variant="contained"
                              size="large"
                              onClick={handleImport}
                              disabled={!fiscalYearId || loading}
                              startIcon={loading ? <CircularProgress size={18} /> : <GetAppIcon />}
                              sx={{ alignSelf: isRTL ? 'flex-start' : 'flex-start' }}
                            >
                              {loading ? (isRTL ? 'جاري التنفيذ...' : 'Processing...') : t(texts.importProcess.processImport)}
                            </Button>
                          </Stack>
                        ) : null}
                      </Box>
                    </Fade>
                  )}

                  {activeStep === 4 && (
                    <Fade in timeout={600}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {t(texts.importProcess.processImport)}
                        </Typography>

                        {/* Safety net: allow starting import here if not already started */}
                        {!importStatus && !loading && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="center" justifyContent="space-between">
                              <Typography variant="body2">
                                {isRTL ? 'لم تبدأ عملية الاستيراد بعد. اضغط لبدء العملية.' : 'Import has not started yet. Click to start.'}
                              </Typography>
                              <Button variant="contained" onClick={handleImport} disabled={!file || !orgId || !fiscalYearId}>
                                {isRTL ? 'بدء الاستيراد الآن' : 'Start Import Now'}
                              </Button>
                            </Stack>
                          </Alert>
                        )}
                        
                            {loading || (importStatus && ['pending','processing'].includes(importStatus.status)) ? (
                              <Box sx={{ py: 4 }}>
                                <LinearProgress 
                                  variant="indeterminate" 
                                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                                />
                                <Stack direction={isRTL ? 'row-reverse' : 'row'} justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                  <Typography variant="body1">
                                    {isRTL ? 'جاري معالجة الاستيراد...' : 'Processing import...'}
                                  </Typography>
                                  {(currentImportId || importStatus?.importId) && (
                                    <Chip size="small" color="info" label={(isRTL ? 'معرّف العملية: ' : 'Job ID: ') + (currentImportId || importStatus?.importId)} />
                                  )}
                                </Stack>
                                <ImportProgressTracker 
                                  status={importStatus?.status}
                                  totalRows={importStatus?.totalRows}
                                  successRows={importStatus?.successRows}
                                  failedRows={importStatus?.failedRows}
                                />
                              </Box>
                            ) : importStatus ? (
                          <Stack spacing={2}>
                            <Accordion expanded={debugOpen} onChange={()=> setDebugOpen(v=>!v)}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2">{isRTL ? 'تفاصيل التصحيح (Debug)' : 'Debug details'}</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
{JSON.stringify(importStatus, null, 2)}
                                </pre>
                              </AccordionDetails>
                            </Accordion>
                            <Alert 
                              severity={importStatus.status === 'completed' ? 'success' : 'error'}
                              icon={importStatus.status === 'completed' ? <CheckCircleIcon /> : <ErrorIcon />}
                            >
                              <Typography variant="body2">
                                {importStatus.status === 'completed'
                                  ? t(texts.importProcess.importComplete)
                                  : t(texts.importProcess.importFailed)
                                }
                              </Typography>
                            </Alert>
                            
                            {importStatus.status === 'completed' && (
                              <Button
                                variant="outlined"
                                onClick={() => setShowResultsModal(true)}
                                startIcon={<VisibilityIcon />}
                              >
                                {isRTL ? 'عرض النتائج' : 'View Results'}
                              </Button>
                            )}
                          </Stack>
                        ) : null}
                      </Box>
                    </Fade>
                  )}

                  {activeStep === 5 && showResults && (
                    <Fade in timeout={600}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                          {t(texts.importProcess.importComplete)}
                        </Typography>
                        
                        {/* Error report (if any) */}
                        {Array.isArray(importStatus?.errorReport) && importStatus.errorReport.length > 0 && (
                          <Accordion defaultExpanded sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle2">{isRTL ? 'الأخطاء' : 'Errors'}</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Code</TableCell>
                                    <TableCell>Message</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {importStatus.errorReport.slice(0,200).map((er:any, idx:number)=> (
                                    <TableRow key={idx}>
                                      <TableCell>{idx+1}</TableCell>
                                      <TableCell>{er.code || ''}</TableCell>
                                      <TableCell>{er.message || ''}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </AccordionDetails>
                          </Accordion>
                        )}

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <StatusCard
                              title={t(texts.importProcess.totalRows)}
                              value={importStatus?.totalRows || 0}
                              icon={InfoIcon}
                              color="info"
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <StatusCard
                              title={t(texts.importProcess.successRows)}
                              value={importStatus?.successRows || 0}
                              icon={CheckCircleIcon}
                              color="success"
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <StatusCard
                              title={t(texts.importProcess.failedRows)}
                              value={importStatus?.failedRows || 0}
                              icon={ErrorIcon}
                              color="error"
                            />
                          </Grid>
                        </Grid>

                        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} sx={{ mt: 2 }}>
                          <Button variant="outlined" onClick={() => {
                            // download summary json
                            const blob = new Blob([JSON.stringify(importStatus, null, 2)], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'opening_balance_import_result.json'
                            a.click()
                            URL.revokeObjectURL(url)
                          }}>{isRTL ? 'تنزيل النتائج' : 'Download Results'}</Button>
                          <Button variant="contained" color="primary" onClick={async () => {
                            try {
                              const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId()
                              const req = await OpeningBalanceImportService.requestApproval({ orgId, importId: (currentImportId || importStatus?.importId), submittedBy })
                              setApprovalRequestId(req.id)
                              try { (window as any)?.toast?.success?.(isRTL ? 'تم إرسال الطلب للموافقة' : 'Approval request submitted') } catch {}
                            } catch (e: any) {
                              try { (window as any)?.toast?.error?.(e?.message || (isRTL ? 'فشل إرسال الموافقة' : 'Failed to submit approval')) } catch {}
                            }
                          }}>{isRTL ? 'إرسال للموافقة' : 'Send for Approval'}</Button>
                        </Stack>

                        {approvalRequestId && (
                          <Box sx={{ mt: 2 }}>
                            <Button
                              variant="text"
                              onClick={() => navigate(`/approvals/inbox?target_table=opening_balances&target_id=${encodeURIComponent(currentImportId || importStatus?.importId || '')}`)}
                            >
                              {isRTL ? 'عرض طلب الموافقة في مركز الموافقات' : 'View approval request in Approvals Center'}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Fade>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
        )}
      </Box>
      {/* Unified Import Wizard (New) */}
      <OpeningBalanceImportWizard open={wizardOpen} onClose={()=> setWizardOpen(false)} />

      {/* Preview Modal */}
      <DraggableResizableDialog
        open={showPreview}
        onClose={()=> setShowPreview(false)}
        storageKey="obi.preview.modal"
        title={isRTL ? 'مراجعة البيانات قبل الاستيراد' : 'Review data before import'}
        initialWidth={1000}
        initialHeight={640}
        showLayoutButtons
        enableDockTopBottom
        rememberLayoutKey="obi.preview.modal.pref"
      >
          {/* Column mapping controls */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{isRTL ? 'تعيين الأعمدة' : 'Column Mapping'}</Typography>
            <Grid container spacing={2}>
              {[
                { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code' },
                { key: 'opening_balance_debit', labelAr: 'مدين رصيد افتتاحي', labelEn: 'Opening Balance Debit' },
                { key: 'opening_balance_credit', labelAr: 'دائن رصيد افتتاحي', labelEn: 'Opening Balance Credit' },
                { key: 'amount', labelAr: 'المبلغ (بديل)', labelEn: 'Amount (alt.)' },
                { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code' },
                { key: 'cost_center_code', labelAr: 'كود مركز التكلفة', labelEn: 'Cost Center Code' },
                { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency' },
              ].map((f)=> (
                <Grid item xs={12} sm={6} md={4} key={f.key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isRTL ? f.labelAr : f.labelEn}</InputLabel>
                    <Select
                      label={isRTL ? f.labelAr : f.labelEn}
                      value={columnMap[f.key] || ''}
                      onChange={(e)=> setColumnMap((m)=> ({ ...m, [f.key]: String(e.target.value) }))}
                    >
                      {uploadHeaders.map(h=> (
                        <MenuItem value={h} key={h}>{h}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </Box>

          {previewRows && previewRows.length ? (
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {previewColConfig.filter(c=>c.visible).map((c, idxVisible)=> {
                      const allVisible = previewColConfig.filter(v=>v.visible)
                      const idx = allVisible.findIndex(v=> v.key===c.key)
                      return (
                        <TableCell
                          key={c.key}
                          draggable
                          onDragStart={previewHdr.onDragStart(idx)}
                          onDragOver={previewHdr.onDragOver(idx)}
                          onDrop={previewHdr.onDrop(idx)}
                          onContextMenu={(e)=> openHeaderMenu(e, 'preview', c.key)}
                          onDoubleClick={()=> {
                            const sample = previewRows.slice(0, 100)
                            const vals = sample.map(r => (r as any)[c.key])
                            const w = calcAutoWidth(vals)
                            setPreviewColConfig(prev=> prev.map((col,i)=> (col.key===c.key? {...col, width: w}: col)))
                          }}
                          sx={{ position:'relative', ...(c.width ? { width: c.width } : {}) }}
                          title={isRTL ? 'اسحب لإعادة الترتيب • اسحب الحافة لتغيير العرض • نقر مزدوج لملاءمة' : 'Drag to reorder • Drag edge to resize • Double-click to autosize'}
                        >
                          {c.key}
                          <Box onMouseDown={previewHdr.onStartResize(idx)} sx={{ position:'absolute', top:0, right:0, width:8, height:'100%', cursor:'col-resize' }} />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.slice(0, 500).map((r, ri)=> (
                    <TableRow key={ri}>
                      {previewColConfig.filter(c=>c.visible).map((c)=> (
                        <TableCell key={c.key} sx={c.width ? { width: c.width } : undefined}>
                          <TextField
                            variant="standard"
                            value={r[c.key] ?? ''}
                            onChange={(e)=> {
                              const v = e.target.value
                              setPreviewRows(prev=> {
                                const copy = [...prev]
                                const row = { ...copy[ri] }
                                row[c.key] = v
                                copy[ri] = row
                                return copy
                              })
                            }}
                            fullWidth
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">{isRTL ? 'لا توجد بيانات لعرضها' : 'No data to display'}</Typography>
          )}
        <DialogActions>
          <Button onClick={()=> setShowPreview(false)}>{isRTL ? 'إغلاق' : 'Close'}</Button>
          <Button
            onClick={()=>{
              // normalize using mapping for quick client validation
              const rows = previewRows
              const total = rows.length
              let valid = 0
              const errors: any[] = []
              for (let i=0;i<rows.length;i++){
                const r = rows[i]
                const debit = Number(r[columnMap.opening_balance_debit] ?? '')
                const credit = Number(r[columnMap.opening_balance_credit] ?? '')
                const amount = Number(r[columnMap.amount] ?? '')
                const hasDC = Number.isFinite(debit) || Number.isFinite(credit)
                const hasAmount = Number.isFinite(amount)
                const acct = r[columnMap.account_code]
                if (!acct) {
                  errors.push({ code: 'missing_account', message: 'Account code missing', row: { row: i+1 } })
                  continue
                }
                if (!(hasDC || hasAmount)) {
                  errors.push({ code: 'missing_amount', message: 'No amount / debit-credit', row: { row: i+1 } })
                  continue
                }
                valid++
              }
              setValidationResults({ isValid: errors.length===0, errors, warnings: [], totalRecords: total, validRecords: valid })
              setShowPreview(false)
              setActiveStep(3)
            }}
            variant="contained"
          >
            {isRTL ? 'متابعة للتحقق' : 'Proceed to Validation'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              // download edited CSV
              const heads = uploadHeaders
              const esc = (s:any)=> {
                const t = s==null?'' : String(s)
                return /[",\n]/.test(t) ? '"' + t.replace(/"/g,'""') + '"' : t
              }
              const visible = previewColConfig.filter(c=>c.visible).map(c=> c.key)
              const lines = [visible.join(',')].concat(previewRows.map(r=> visible.map(h=> esc(r[h])).join(',')))
              const csv = lines.join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'opening_balance_review.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            {isRTL ? 'تنزيل CSV بعد التعديل' : 'Download edited CSV'}
          </Button>
        </DialogActions>
      </DraggableResizableDialog>

      {/* Manual Entry Dialog */}
      <DraggableResizableDialog
        open={showManual}
        onClose={() => setShowManual(false)}
        storageKey="obi.manual.modal"
        title={isRTL ? 'إدخال الأرصدة الافتتاحية يدوياً' : 'Manual Opening Balances Entry'}
        initialWidth={1100}
        initialHeight={700}
        showLayoutButtons
        enableDockTopBottom
        rememberLayoutKey="obi.manual.modal.pref"
      >
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2">{isRTL ? 'نمط الإدخال:' : 'Entry Mode:'}</Typography>
            <FormControlLabel control={<Switch checked={useAmountMode} onChange={e=> setUseAmountMode(e.target.checked)} />} label={useAmountMode ? (isRTL ? 'مبلغ واحد' : 'Single Amount') : (isRTL ? 'مدين/دائن' : 'Debit/Credit')} />
          </Stack>
          <Typography variant="body2" sx={{ mb: 2 }}>{isRTL ? 'أدخل أكثر من سطر عبر هذا الجدول' : 'Enter multiple rows below'}</Typography>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} sx={{ mb: 1 }}>
            <TextField size="small" value={templateName} onChange={e=> setTemplateName(e.target.value)} placeholder={isRTL ? 'اسم القالب' : 'Template name'} />
            <Button size="small" variant="outlined" onClick={()=>{
              if (!templateName.trim()) { try {(window as any)?.toast?.error?.(isRTL?'ادخل اسم القالب':'Enter template name')} catch {}; return }
              const t = { id: String(Date.now()), name: templateName.trim(), rows: manualRows }
              const next = [t, ...templates].slice(0,20)
              setTemplates(next)
              try { localStorage.setItem('obi_manual_templates', JSON.stringify(next)) } catch {}
              setTemplateName('')
              try {(window as any)?.toast?.success?.(isRTL?'تم حفظ القالب':'Template saved')} catch {}
            }}>{isRTL ? 'حفظ القالب' : 'Save Template'}</Button>
            <Autocomplete
              options={templates}
              getOptionLabel={(opt:any)=> opt?.name || ''}
              onChange={(_e,val:any)=>{ if (val) setManualRows(val.rows) }}
              renderInput={(params)=>(<TextField {...params} size="small" placeholder={isRTL?'تحميل قالب':'Load Template'} />)}
              sx={{ minWidth: 220 }}
            />
          </Stack>
          {/* Guard toggles */}
          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} sx={{ mb: 1 }}>
            <FormControlLabel control={<Switch checked={balanceGuard} onChange={e=> setBalanceGuard(e.target.checked)} />} label={isRTL ? 'فرض توازن إجمالي المدين/الدائن' : 'Enforce total debit/credit balance'} />
            {manualCols.currency && (
              <FormControlLabel control={<Switch checked={perCurrencyGuard} onChange={e=> setPerCurrencyGuard(e.target.checked)} />} label={isRTL ? 'فرض التوازن لكل عملة' : 'Enforce per-currency balance'} />
            )}
            <Button size="small" variant="outlined" onClick={()=>{
              // Export current manual rows to CSV
              const { toCsv, downloadCsv } = require('@/utils/csvExport')
              const csv = toCsv(manualRows as any)
              downloadCsv(csv, 'manual_opening_balances.csv')
            }}>{isRTL ? 'تصدير CSV' : 'Export CSV'}</Button>
          </Stack>

          {/* Balance checker */}
          <Box sx={{ mb: 1 }}>
            {(() => {
              const totals = manualRows.reduce((acc, r) => {
                const d = Number(r.opening_balance_debit || 0) || 0
                const c = Number(r.opening_balance_credit || 0) || 0
                const has = (String(r.opening_balance_debit||'').trim() !== '') || (String(r.opening_balance_credit||'').trim() !== '')
                return { debit: acc.debit + d, credit: acc.credit + c, hasDC: acc.hasDC || has }
              }, { debit: 0, credit: 0, hasDC: false } as any)
              const diff = totals.debit - totals.credit
              return (
                <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2}>
                  <Typography variant="body2">{isRTL ? 'إجمالي مدين:' : 'Total Debit:'} {totals.debit.toLocaleString('ar-EG')}</Typography>
                  <Typography variant="body2">{isRTL ? 'إجمالي دائن:' : 'Total Credit:'} {totals.credit.toLocaleString('ar-EG')}</Typography>
                  <Typography variant="body2" color={diff === 0 ? 'success.main' : 'error.main'}>
                    {isRTL ? 'الفرق:' : 'Difference:'} {diff.toLocaleString('ar-EG')}
                  </Typography>
                  {totals.hasDC && diff !== 0 && (
                    <Typography variant="body2" color={'error.main'}>
                      {isRTL ? 'يجب أن يتساوى المدين مع الدائن قبل الحفظ' : 'Debits and credits must balance before saving'}
                    </Typography>
                  )}
                </Stack>
              )
            })()}
          </Box>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {manualColConfig.filter(c=>c.visible).map((c)=> {
                const allVis = manualColConfig.filter(v=>v.visible)
                const idx = allVis.findIndex(v=> v.key===c.key)
                return (
                  <TableCell
                    key={c.key}
                    draggable
                    onDragStart={manualHdr.onDragStart(idx)}
                    onDragOver={manualHdr.onDragOver(idx)}
                    onDrop={manualHdr.onDrop(idx)}
                    onContextMenu={(e)=> openHeaderMenu(e, 'manual', c.key)}
                    onDoubleClick={()=> {
                      const sample = manualRows.slice(0, 100)
                      const vals = sample.map(r => (r as any)[c.key as any])
                      const w = calcAutoWidth(vals, c.key==='__actions'?180:120)
                      setManualColConfig(prev=> prev.map(col=> col.key===c.key? {...col, width: w}: col))
                    }}
                    sx={{ position:'relative', ...(c.width ? { width: c.width } : {}) }}
                    title={isRTL ? 'اسحب لإعادة الترتيب • اسحب الحافة لتغيير العرض • نقر مزدوج لملاءمة' : 'Drag to reorder • Drag edge to resize • Double-click to autosize'}
                  >
                    {isRTL ? c.labelAr : c.labelEn}
                    <Box onMouseDown={manualHdr.onStartResize(idx)} sx={{ position:'absolute', top:0, right:0, width:8, height:'100%', cursor:'col-resize' }} />
                  </TableCell>
                )
              })}
            </TableRow>
          </TableHead>
          <TableBody onKeyDown={(e)=>{
                if (e.key==='Enter') {
                  e.preventDefault();
                  setManualRows(r=> [...r, { account_code:'', opening_balance_debit:'', opening_balance_credit:'' }])
                }
              }}>
                {manualRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {manualColConfig.filter(c=>c.visible).map(c => (
                      <TableCell key={c.key} sx={c.width ? { width: c.width } : undefined}>
                        {/* Cell renderer per column */}
                        {c.key === 'account_code' && (
                          <SearchableSelect
                            id={`manual-account-${idx}`}
                            value={row.account_code || ''}
                            options={accountSelectOptions}
                            onChange={(val)=> setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], account_code:val}; return cc })}
                            placeholder={isRTL ? 'اختر الحساب' : 'Select account'}
                            clearable
                            required
                            showDrilldownModal
                            treeOptions={accountTreeOptions}
                            compact
                          />
                        )}
                        {c.key === 'opening_balance_debit' && (
                          <TextField size="small" type="number" value={row.opening_balance_debit as any} onChange={e=>{
                            const v=e.target.value; setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], opening_balance_debit:v}; return cc })
                          }} />
                        )}
                        {c.key === 'opening_balance_credit' && (
                          <TextField size="small" type="number" value={row.opening_balance_credit as any} onChange={e=>{
                            const v=e.target.value; setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], opening_balance_credit:v}; return cc })
                          }} />
                        )}
                        {c.key === 'amount' && (
                          <TextField size="small" type="number" value={(row as any).amount || ''} onChange={e=>{
                            const v=e.target.value; setManualRows(r=>{ const cc=[...r]; (cc[idx] as any).amount=v; return cc })
                          }} />
                        )}
                        {c.key === 'project_code' && (
                          <SearchableSelect
                            id={`manual-project-${idx}`}
                            value={row.project_code || ''}
                            options={projectFlatOptions}
                            onChange={(val)=> setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], project_code:val}; return cc })}
                            placeholder={isRTL ? 'اختر المشروع' : 'Select project'}
                            clearable
                            showDrilldownModal
                            treeOptions={projectTreeOptions}
                            compact
                          />
                        )}
                        {c.key === 'cost_center_code' && (
                          <SearchableSelect
                            id={`manual-cc-${idx}`}
                            value={row.cost_center_code || ''}
                            options={ccFlatOptions}
                            onChange={(val)=> setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], cost_center_code:val}; return cc })}
                            placeholder={isRTL ? 'اختر مركز التكلفة' : 'Select cost center'}
                            clearable
                            showDrilldownModal
                            treeOptions={ccTreeOptions}
                            compact
                          />
                        )}
                        {c.key === 'currency_code' && (
                          <SearchableSelect
                            id={`manual-currency-${idx}`}
                            value={row.currency_code || ''}
                            options={currencyOptions.map(cu=> ({ value: cu, label: cu }))}
                            onChange={(val)=> setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx], currency_code:val}; return cc })}
                            placeholder={isRTL ? 'اختر العملة' : 'Select currency'}
                            clearable
                            compact
                          />
                        )}
                        {c.key === '__actions' && (
                          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
                            <Button size="small" onClick={()=> setManualRows(r=> r.filter((_,i)=> i!==idx))}>{isRTL ? 'حذف' : 'Remove'}</Button>
                            {idx>0 && (
                              <Button size="small" variant="outlined" onClick={()=> setManualRows(r=>{ const cc=[...r]; cc[idx]={...cc[idx-1]}; return cc })}>{isRTL ? 'نسخ من السابق' : 'Copy Prev'}</Button>
                            )}
                          </Stack>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={7}>
                    <Button size="small" variant="outlined" onClick={()=> setManualRows(r=> [...r, { account_code:'', opening_balance_debit:'', opening_balance_credit:'' }])}>{isRTL ? 'إضافة سطر' : 'Add Row'}</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        <DialogActions sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button onClick={()=> setShowManual(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          {(() => {
            // Compute disabled flag and reason in the exact same order as the button logic
            let disabled = false
            let reason: string | null = null
            if (!orgId) { disabled = true; reason = isRTL ? 'يرجى اختيار المؤسسة' : 'Select organization'; }
            else if (!fiscalYearId) { disabled = true; reason = isRTL ? 'يرجى اختيار السنة المالية' : 'Select fiscal year'; }
            else if (manualRows.every(r => !r.account_code)) { disabled = true; reason = isRTL ? 'أضف سطر واحد على الأقل مع كود حساب' : 'Add at least one row with an account code'; }
            else if (!useAmountMode && balanceGuard) {
              const hasDC = manualRows.some(r => String(r.opening_balance_debit||'').trim()!=='' || String(r.opening_balance_credit||'').trim()!=='')
              if (hasDC) {
                const totalDebit = manualRows.reduce((acc,r)=> acc + (Number(r.opening_balance_debit||0)||0),0)
                const totalCredit = manualRows.reduce((acc,r)=> acc + (Number(r.opening_balance_credit||0)||0),0)
                if (Math.round((totalDebit - totalCredit) * 100) !== 0) { disabled = true; reason = isRTL ? 'يجب تساوي إجمالي المدين مع الدائن' : 'Debits must equal credits'; }
              }
            }
            if (!useAmountMode && perCurrencyGuard && manualCols.currency) {
              const map = new Map<string, {d:number,c:number}>()
              for (const r of manualRows){
                const cur = r.currency_code || 'DEFAULT'
                const d = Number(r.opening_balance_debit||0)||0
                const c = Number(r.opening_balance_credit||0)||0
                const v = map.get(cur) || { d: 0, c: 0 }
                v.d += d; v.c += c
                map.set(cur, v)
              }
              const unbalanced = Array.from(map.values()).some(v => Math.round((v.d - v.c) * 100) !== 0)
              if (unbalanced) { disabled = true; reason = isRTL ? 'يلزم التوازن لكل عملة محددة' : 'Must balance per currency'; }
            }

            return (
              <>
                <Button
                  variant="contained"
                  disabled={disabled}
                  onClick={async ()=>{
            // Validate dropdown selections (unified CRUD verification)
            const accCodes = Array.from(new Set(manualRows.map(r=> r.account_code).filter(Boolean))) as string[]
            const projCodes = Array.from(new Set(manualRows.map(r=> r.project_code).filter(Boolean))) as string[]
            const ccCodes = Array.from(new Set(manualRows.map(r=> r.cost_center_code).filter(Boolean))) as string[]
            const errs: Array<{account_code?:string; project_code?:string; cost_center_code?:string}> = manualRows.map(()=> ({}))
            try {
              // accounts
              let validAcc = new Set<string>()
              if (accCodes.length && orgId) {
                const found = await OpeningBalanceImportService.searchAccounts(orgId, '', accCodes.length+50)
                for (const a of found) validAcc.add(a.code)
                manualRows.forEach((r,idx)=>{ if (r.account_code && !validAcc.has(r.account_code)) errs[idx].account_code = isRTL ? 'كود حساب غير صالح' : 'Invalid account code' })
              }
              // projects
              if (projCodes.length && orgId) {
                const foundP = await OpeningBalanceImportService.searchProjects(orgId, '', projCodes.length+50)
                const setP = new Set(foundP.map(p=> p.code))
                manualRows.forEach((r,idx)=>{ if (r.project_code && !setP.has(r.project_code)) errs[idx].project_code = isRTL ? 'كود مشروع غير صالح' : 'Invalid project code' })
              }
              // cost centers
              if (ccCodes.length && orgId) {
                const foundC = await OpeningBalanceImportService.searchCostCenters(orgId, '', ccCodes.length+50)
                const setC = new Set(foundC.map(c=> c.code))
                manualRows.forEach((r,idx)=>{ if (r.cost_center_code && !setC.has(r.cost_center_code)) errs[idx].cost_center_code = isRTL ? 'كود مركز تكلفة غير صالح' : 'Invalid cost center code' })
              }
            } catch {}
            const hasErr = errs.some(e=> e.account_code || e.project_code || e.cost_center_code)
            setRowErrors(errs)
            if (hasErr) { try { (window as any)?.toast?.error?.(isRTL ? 'تحقق من الرموز غير الصالحة' : 'Please fix invalid codes') } catch {}; return }

            // Build normalized preview, then confirm
            const rows = manualRows.map((r:any)=> ({
              account_code: r.account_code,
              opening_balance_debit: useAmountMode ? null : (r.opening_balance_debit ?? null),
              opening_balance_credit: useAmountMode ? null : (r.opening_balance_credit ?? null),
              amount: useAmountMode ? (r.amount ?? null) : null,
              project_code: r.project_code ?? null,
              cost_center_code: r.cost_center_code ?? null,
              currency_code: r.currency_code ?? null,
            }))
            setNormalizedPreview(rows)
            setShowReview(true)
          }}>
            {isRTL ? 'حفظ وإرسال' : 'Save & Submit'}
          </Button>
          {/* Inline helper why disabled */}
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.9 }}>
            {disabled ? (reason || (isRTL ? 'مطلوب استكمال الحقول' : 'Complete required fields')) : ''}
          </Typography>
              </>
            )
          })()}
        </DialogActions>
      </DraggableResizableDialog>

      {/* Column Settings & Template Manager */}
      <DraggableResizableDialog
        open={showColSettings}
        onClose={()=> setShowColSettings(false)}
        storageKey="obi.columns.modal"
        title={isRTL ? 'إعدادات الأعمدة' : 'Column Settings'}
        initialWidth={520}
        initialHeight={360}
        showLayoutButtons
        enableDockTopBottom
        rememberLayoutKey="obi.columns.modal.pref"
      >
        <Stack spacing={1}>
          <FormControlLabel control={<Checkbox checked={manualCols.project} onChange={e=> setManualCols(c=> ({...c, project: e.target.checked}))} />} label={isRTL ? 'عرض عمود المشروع' : 'Show Project Column'} />
          <FormControlLabel control={<Checkbox checked={manualCols.costCenter} onChange={e=> setManualCols(c=> ({...c, costCenter: e.target.checked}))} />} label={isRTL ? 'عرض عمود مركز التكلفة' : 'Show Cost Center Column'} />
          <FormControlLabel control={<Checkbox checked={manualCols.currency} onChange={e=> setManualCols(c=> ({...c, currency: e.target.checked}))} />} label={isRTL ? 'عرض عمود العملة' : 'Show Currency Column'} />
        </Stack>

        {/* Global actions: Reset all / Autosize all */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={()=>{
            // Reset manual
            const manualBase: Array<{ key: ManualColKey; labelAr: string; labelEn: string }> = [
              { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code' },
              { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit' },
              { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit' },
              { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
              { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code' },
              { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center' },
              { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency' },
              { key: '__actions', labelAr: 'إجراءات', labelEn: 'Actions' },
            ]
            setManualColConfig(manualBase.map(b => ({ ...b, visible: b.key === 'amount' ? useAmountMode : (b.key==='opening_balance_debit'||b.key==='opening_balance_credit' ? !useAmountMode : true) })))
            // Reset preview
            setPreviewColConfig(uploadHeaders.map(h => ({ key: h, visible: true })))
            // Reset review
            const reviewBase = useAmountMode
              ? [
                  { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
                  { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount', visible: true },
                  { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
                  { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
                  { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
                ] : [
                  { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
                  { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit', visible: true },
                  { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit', visible: true },
                  { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
                  { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
                  { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
                ]
            setReviewColConfig(reviewBase as any)
          }}>{isRTL ? 'استعادة الكل' : 'Reset all'}</Button>

          <Button size="small" variant="outlined" onClick={()=>{
            // Autosize all based on current data
            const calc = (vals: any[], min=120, max=360)=>{
              const longest = Math.max(0, ...vals.map(v=> String(v??'').length))
              return Math.min(max, Math.max(min, longest*8 + 40))
            }
            // Manual
            setManualColConfig(prev=> prev.map(c=>{
              if (!c.visible) return c
              if (c.key==='__actions') return { ...c, width: 180 }
              const vals = manualRows.slice(0,100).map(r=> (r as any)[c.key as any])
              return { ...c, width: calc(vals) }
            }))
            // Preview
            setPreviewColConfig(prev=> prev.map(c=>{
              if (!c.visible) return c
              const vals = previewRows.slice(0,100).map(r=> (r as any)[c.key])
              return { ...c, width: calc(vals) }
            }))
            // Review
            setReviewColConfig(prev=> prev.map(c=>{
              if (!c.visible) return c
              const vals = normalizedPreview.slice(0,200).map(r=> (r as any)[c.key])
              return { ...c, width: calc(vals) }
            }))
          }}>{isRTL ? 'ملاءمة الكل' : 'Autosize all'}</Button>
        </Box>

        {/* Manual entry columns manager */}
        <Box sx={{ mt: 2 }}>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{isRTL ? 'أعمدة الإدخال اليدوي' : 'Manual Entry Columns'}</Typography>
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>{isRTL ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}</Typography>
              <Button size="small" onClick={()=>{
                // Reset manual columns to defaults for current mode
                const base: Array<{ key: ManualColKey; labelAr: string; labelEn: string }> = [
                  { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code' },
                  { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit' },
                  { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit' },
                  { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
                  { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code' },
                  { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center' },
                  { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency' },
                  { key: '__actions', labelAr: 'إجراءات', labelEn: 'Actions' },
                ]
                const def = base.map(b => ({ ...b, visible: b.key === 'amount' ? useAmountMode : (b.key==='opening_balance_debit'||b.key==='opening_balance_credit' ? !useAmountMode : true) }))
                setManualColConfig(def)
              }}>{isRTL?'استعادة الافتراضي':'Reset'}</Button>
              <Button size="small" onClick={()=>{
                // Autosize by sampling manualRows
                const sample = manualRows.slice(0, 50)
                const calcWidth = (values: any[], min=120, max=360) => {
                  const longest = Math.max(0, ...values.map(v => String(v ?? '').length))
                  return Math.min(max, Math.max(min, longest*8 + 40))
                }
                const next = manualColConfig.map(c => {
                  if (c.key==='__actions') return { ...c, width: 180 }
                  if (c.key==='account_code') return { ...c, width: 260 }
                  if (c.key==='project_code' || c.key==='cost_center_code') return { ...c, width: 240 }
                  if (c.key==='currency_code') return { ...c, width: 140 }
                  if (c.key==='opening_balance_debit' || c.key==='opening_balance_credit' || c.key==='amount') {
                    const vals = sample.map(r => c.key==='amount' ? (r as any).amount : (r as any)[c.key])
                    return { ...c, width: calcWidth(vals, 120, 220) }
                  }
                  const vals = sample.map(r => (r as any)[c.key as any])
                  return { ...c, width: calcWidth(vals) }
                })
                setManualColConfig(next)
              }}>{isRTL?'ملاءمة العرض':'Autosize'}</Button>
            </Stack>
          </Stack>
          <Stack spacing={1}>
            {manualColConfig.map((c, idx) => (
              <Stack key={c.key} direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(idx)) }} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=>{
                const from = parseInt(e.dataTransfer.getData('text/plain')||'-1',10)
                if (Number.isFinite(from) && from>=0 && from<manualColConfig.length && from!==idx) {
                  setManualColConfig(prev=>{
                    const arr=[...prev]; const [m]=arr.splice(from,1); arr.splice(idx,0,m); return arr
                  })
                }
              }} sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
                <Checkbox
                  checked={c.visible}
                  onChange={(e)=> setManualColConfig(prev=> prev.map((x,i)=> {
                    if (i!==idx) return x
                    // Enforce amount vs debit/credit rule
                    if (x.key === 'amount' && !e.target.checked) {
                      return { ...x, visible: false }
                    }
                    if ((x.key==='opening_balance_debit'||x.key==='opening_balance_credit') && useAmountMode) {
                      return x // ignore when amount mode
                    }
                    return { ...x, visible: e.target.checked }
                  }))}
                />
                <Box sx={{ flex: 1 }}>{isRTL ? c.labelAr : c.labelEn}</Box>
                <TextField size="small" type="number" label={isRTL? 'عرض(px)': 'Width(px)'} value={c.width ?? ''} onChange={(e)=>{
                  const v = parseInt(e.target.value||''); setManualColConfig(prev=> prev.map((x,i)=> i===idx? { ...x, width: Number.isFinite(v)? v : undefined } : x))
                }} sx={{ width: 140 }} />
                <Button size="small" onClick={()=> setManualColConfig(prev=> idx>0? (prev.slice(0,idx-1).concat([prev[idx], prev[idx-1]]).concat(prev.slice(idx+1))) : prev)}>{isRTL?'أعلى':'Up'}</Button>
                <Button size="small" onClick={()=> setManualColConfig(prev=> idx<prev.length-1? (prev.slice(0,idx).concat([prev[idx+1], prev[idx]]).concat(prev.slice(idx+2))) : prev)}>{isRTL?'أسفل':'Down'}</Button>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Preview columns manager */}
        <Box sx={{ mt: 2 }}>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{isRTL ? 'أعمدة المعاينة' : 'Preview Columns'}</Typography>
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
              <Button size="small" onClick={()=>{
                setPreviewColConfig(uploadHeaders.map(h => ({ key: h, visible: true })))
              }}>{isRTL?'استعادة الافتراضي':'Reset'}</Button>
              <Button size="small" onClick={()=>{
                const sample = previewRows.slice(0, 50)
                const calcWidth = (values: any[], min=120, max=360) => {
                  const longest = Math.max(0, ...values.map(v => String(v ?? '').length))
                  return Math.min(max, Math.max(min, longest*8 + 40))
                }
                const next = previewColConfig.map(c => {
                  const vals = sample.map(r => (r as any)[c.key])
                  return { ...c, width: calcWidth(vals) }
                })
                setPreviewColConfig(next)
              }}>{isRTL?'ملاءمة العرض':'Autosize'}</Button>
            </Stack>
          </Stack>
          <Stack spacing={1}>
            {previewColConfig.map((c, idx) => (
              <Stack key={c.key} direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(idx)) }} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=>{
                const from = parseInt(e.dataTransfer.getData('text/plain')||'-1',10)
                if (Number.isFinite(from) && from>=0 && from<previewColConfig.length && from!==idx) {
                  setPreviewColConfig(prev=>{
                    const arr=[...prev]; const [m]=arr.splice(from,1); arr.splice(idx,0,m); return arr
                  })
                }
              }} sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
                <Checkbox checked={c.visible} onChange={(e)=> setPreviewColConfig(prev=> prev.map((x,i)=> i===idx? { ...x, visible: e.target.checked } : x))} />
                <Box sx={{ flex: 1 }}>{c.key}</Box>
                <TextField size="small" type="number" label={isRTL? 'عرض(px)': 'Width(px)'} value={c.width ?? ''} onChange={(e)=>{
                  const v = parseInt(e.target.value||''); setPreviewColConfig(prev=> prev.map((x,i)=> i===idx? { ...x, width: Number.isFinite(v)? v : undefined } : x))
                }} sx={{ width: 140 }} />
                <Button size="small" onClick={()=> setPreviewColConfig(prev=> idx>0? (prev.slice(0,idx-1).concat([prev[idx], prev[idx-1]]).concat(prev.slice(idx+1))) : prev)}>{isRTL?'أعلى':'Up'}</Button>
                <Button size="small" onClick={()=> setPreviewColConfig(prev=> idx<prev.length-1? (prev.slice(0,idx).concat([prev[idx+1], prev[idx]]).concat(prev.slice(idx+2))) : prev)}>{isRTL?'أسفل':'Down'}</Button>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Review columns manager */}
        <Box sx={{ mt: 2 }}>
          <Stack direction={isRTL ? 'row-reverse' : 'row'} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{isRTL ? 'أعمدة المراجعة' : 'Review Columns'}</Typography>
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
              <Button size="small" onClick={()=>{
                const base = useAmountMode
                  ? [
                      { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
                      { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount', visible: true },
                      { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
                      { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
                      { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
                    ] : [
                      { key: 'account_code', labelAr: 'كود الحساب', labelEn: 'Account Code', visible: true },
                      { key: 'opening_balance_debit', labelAr: 'مدين', labelEn: 'Debit', visible: true },
                      { key: 'opening_balance_credit', labelAr: 'دائن', labelEn: 'Credit', visible: true },
                      { key: 'project_code', labelAr: 'كود المشروع', labelEn: 'Project Code', visible: true },
                      { key: 'cost_center_code', labelAr: 'مركز التكلفة', labelEn: 'Cost Center', visible: true },
                      { key: 'currency_code', labelAr: 'العملة', labelEn: 'Currency', visible: true },
                    ]
                setReviewColConfig(base as any)
              }}>{isRTL?'استعادة الافتراضي':'Reset'}</Button>
              <Button size="small" onClick={()=>{
                const sample = normalizedPreview.slice(0, 200)
                const calcWidth = (values: any[], min=120, max=360) => {
                  const longest = Math.max(0, ...values.map(v => String(v ?? '').length))
                  return Math.min(max, Math.max(min, longest*8 + 40))
                }
                const next = reviewColConfig.map(c => {
                  const vals = sample.map(r => (r as any)[c.key])
                  return { ...c, width: calcWidth(vals) }
                })
                setReviewColConfig(next)
              }}>{isRTL?'ملاءمة العرض':'Autosize'}</Button>
            </Stack>
          </Stack>
          <Stack spacing={1}>
            {reviewColConfig.map((c, idx) => (
              <Stack key={c.key} direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(idx)) }} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=>{
                const from = parseInt(e.dataTransfer.getData('text/plain')||'-1',10)
                if (Number.isFinite(from) && from>=0 && from<reviewColConfig.length && from!==idx) {
                  setReviewColConfig(prev=>{
                    const arr=[...prev]; const [m]=arr.splice(from,1); arr.splice(idx,0,m); return arr
                  })
                }
              }} sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
                <Checkbox checked={c.visible} onChange={(e)=> setReviewColConfig(prev=> prev.map((x,i)=> i===idx? { ...x, visible: e.target.checked } : x))} />
                <Box sx={{ flex: 1 }}>{isRTL ? c.labelAr : c.labelEn}</Box>
                <TextField size="small" type="number" label={isRTL? 'عرض(px)': 'Width(px)'} value={c.width ?? ''} onChange={(e)=>{
                  const v = parseInt(e.target.value||''); setReviewColConfig(prev=> prev.map((x,i)=> i===idx? { ...x, width: Number.isFinite(v)? v : undefined } : x))
                }} sx={{ width: 140 }} />
                <Button size="small" onClick={()=> setReviewColConfig(prev=> idx>0? (prev.slice(0,idx-1).concat([prev[idx], prev[idx-1]]).concat(prev.slice(idx+1))) : prev)}>{isRTL?'أعلى':'Up'}</Button>
                <Button size="small" onClick={()=> setReviewColConfig(prev=> idx<prev.length-1? (prev.slice(0,idx).concat([prev[idx+1], prev[idx]]).concat(prev.slice(idx+2))) : prev)}>{isRTL?'أسفل':'Down'}</Button>
              </Stack>
            ))}
          </Stack>
        </Box>
        <DialogActions>
          <Button onClick={()=> setShowColSettings(false)}>{isRTL ? 'تم' : 'Done'}</Button>
        </DialogActions>
      </DraggableResizableDialog>

      {/* Review & Confirm Dialog */}
      <DraggableResizableDialog
        open={showReview}
        onClose={()=> setShowReview(false)}
        storageKey="obi.review.modal"
        title={isRTL ? 'مراجعة البيانات' : 'Review Data'}
        initialWidth={1000}
        initialHeight={620}
        showLayoutButtons
        enableDockTopBottom
        rememberLayoutKey="obi.review.modal.pref"
      >
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {reviewColConfig.filter(c=>c.visible).map((c)=> {
                    const vis = reviewColConfig.filter(v=>v.visible)
                    const idx = vis.findIndex(v=> v.key===c.key)
                    return (
                      <TableCell
                        key={c.key}
                        draggable
                        onDragStart={reviewHdr.onDragStart(idx)}
                        onDragOver={reviewHdr.onDragOver(idx)}
                        onDrop={reviewHdr.onDrop(idx)}
                        onContextMenu={(e)=> openHeaderMenu(e, 'review', c.key)}
                        onDoubleClick={()=> {
                          const sample = normalizedPreview.slice(0, 200)
                          const vals = sample.map(r => (r as any)[c.key])
                          const w = calcAutoWidth(vals)
                          setReviewColConfig(prev=> prev.map(col=> col.key===c.key? {...col, width: w}: col))
                        }}
                        sx={{ position:'relative', ...(c.width ? { width: c.width } : {}) }}
                        title={isRTL ? 'اسحب لإعادة الترتيب • اسحب الحافة لتغيير العرض • نقر مزدوج لملاءمة' : 'Drag to reorder • Drag edge to resize • Double-click to autosize'}
                      >
                        {isRTL ? c.labelAr : c.labelEn}
                        <Box onMouseDown={reviewHdr.onStartResize(idx)} sx={{ position:'absolute', top:0, right:0, width:8, height:'100%', cursor:'col-resize' }} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {normalizedPreview.map((r:any, i:number)=> (
                  <TableRow key={i}>
                    {reviewColConfig.filter(c=>c.visible).map(c=> (
                      <TableCell key={c.key} sx={c.width ? { width: c.width } : undefined}>
                        {c.key==='amount' ? (r.amount || '')
                          : c.key==='opening_balance_debit' ? (r.opening_balance_debit || '')
                          : c.key==='opening_balance_credit' ? (r.opening_balance_credit || '')
                          : c.key==='project_code' ? (r.project_code || '')
                          : c.key==='cost_center_code' ? (r.cost_center_code || '')
                          : c.key==='currency_code' ? (r.currency_code || '')
                          : r.account_code}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        <DialogActions>
          <FormControlLabel control={<Checkbox checked={submitForApproval} onChange={e=> setSubmitForApproval(e.target.checked)} />} label={isRTL ? 'إرسال للموافقة مباشرة' : 'Submit for approval immediately'} />
          <Button onClick={()=> setShowReview(false)}>{isRTL ? 'تعديل' : 'Edit'}</Button>
          <Button variant="contained" onClick={async ()=>{
            setShowReview(false)
            setLoading(true)
            try {
              const result = await OpeningBalanceImportService.importFromManualRows(orgId, fiscalYearId, normalizedPreview as any)
              setImportStatus(result)
              setCurrentImportId(result.importId)
              // Optional immediate submit for approval
              if (submitForApproval) {
                try {
                  const submittedBy = await (await import('../../services/authService')).AuthService.getCurrentUserId()
                  await OpeningBalanceImportService.requestApproval({ orgId, importId: result.importId, submittedBy })
                } catch {}
              }
              if (!['completed','failed','partially_completed'].includes(result.status)) {
                setActiveStep(4)
                waitForTerminalAndShow(result.importId)
              } else {
                setShowResults(true)
                setShowResultsModal(true)
                setActiveStep(5)
              }
            } catch (e:any) {
              try { (window as any)?.toast?.error?.(e?.message || (isRTL ? 'فشل الإدخال اليدوي' : 'Manual entry failed')) } catch {}
            } finally { setLoading(false) }
          }}>{isRTL ? 'تأكيد وإرسال' : 'Confirm & Submit'}</Button>
        </DialogActions>
      </DraggableResizableDialog>

      {/* Header context menu */}
      <Menu anchorEl={hdrMenu.anchor} open={!!hdrMenu.anchor} onClose={closeHeaderMenu} anchorOrigin={{ horizontal:'right', vertical:'bottom' }} transformOrigin={{ horizontal:'right', vertical:'top' }}>
        <MenuItem onClick={autosizeCol}>{isRTL ? 'ملاءمة عرض العمود' : 'Autosize column'}</MenuItem>
        <MenuItem onClick={resetWidthCol}>{isRTL ? 'إعادة العرض الافتراضي' : 'Reset width'}</MenuItem>
        <Divider />
        <MenuItem onClick={hideCol}>{isRTL ? 'إخفاء هذا العمود' : 'Hide column'}</MenuItem>
        <MenuItem onClick={showOnlyCol}>{isRTL ? 'إظهار هذا فقط' : 'Show only this'}</MenuItem>
        <Divider />
        {/* Show hidden quick toggles (up to 10) */}
        {(() => {
          const scope = hdrMenu.scope
          const hidden: string[] = scope==='preview'
            ? previewColConfig.filter(c=>!c.visible).map(c=> c.key)
            : scope==='manual'
              ? manualColConfig.filter(c=>!c.visible).map(c=> c.key as string)
              : reviewColConfig.filter(c=>!c.visible).map(c=> c.key)
          return hidden.slice(0,10).map(hk => (
            <MenuItem key={hk} onClick={()=>{
              if (scope==='preview') setPreviewColConfig(prev=> prev.map(c=> c.key===hk? {...c, visible:true}: c))
              else if (scope==='manual') setManualColConfig(prev=> prev.map(c=> c.key===hk as any? {...c, visible:true}: c))
              else setReviewColConfig(prev=> prev.map(c=> c.key===hk? {...c, visible:true}: c))
              closeHeaderMenu()
            }}>{(isRTL?'إظهار: ':'Show: ')+hk}</MenuItem>
          ))
        })()}
      </Menu>

      {/* Results Modal */}
      <EnhancedOBImportResultsModal
        open={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        importId={currentImportId || importStatus?.importId || ''}
        orgId={orgId}
        fiscalYearId={fiscalYearId}
        uploadHeaders={uploadHeaders}
      />

      {/* Create Fiscal Year Dialog */}
      <Dialog open={showCreateFY} onClose={()=> setShowCreateFY(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isRTL ? 'إنشاء سنة مالية' : 'Create Fiscal Year'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={isRTL ? 'رقم السنة' : 'Year Number'} type="number" value={newYearNumber} onChange={e=> setNewYearNumber(parseInt(e.target.value||'0',10)||new Date().getFullYear())} fullWidth />
            <TextField label={isRTL ? 'تاريخ البداية' : 'Start Date'} type="date" value={newStartDate} onChange={e=> setNewStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={isRTL ? 'تاريخ النهاية' : 'End Date'} type="date" value={newEndDate} onChange={e=> setNewEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setShowCreateFY(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button variant="contained" disabled={!orgId || creatingFY} onClick={async ()=>{
            if (!orgId) { try { (window as any)?.toast?.error?.(isRTL ? 'يرجى اختيار المؤسسة أولاً' : 'Select organization first') } catch {}; return }
            setCreatingFY(true)
            try {
              const id = await FiscalYearService.create({ orgId, yearNumber: newYearNumber, startDate: newStartDate, endDate: newEndDate, createMonthlyPeriods: true, nameEn: `FY ${newYearNumber}` })
              setFiscalYearId(id)
              setShowCreateFY(false)
              try { (window as any)?.toast?.success?.(isRTL ? 'تم إنشاء السنة المالية' : 'Fiscal year created') } catch {}
            } catch (e:any) {
              try { (window as any)?.toast?.error?.(e?.message || (isRTL ? 'فشل إنشاء السنة' : 'Failed to create fiscal year')) } catch {}
            } finally { setCreatingFY(false) }
          }}>{creatingFY ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'إنشاء' : 'Create')}</Button>
        </DialogActions>
      </Dialog>
    </ProfessionalContainer>
  )
}
