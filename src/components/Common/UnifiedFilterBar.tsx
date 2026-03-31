/**
 * UnifiedFilterBar - Centralized Filter Bar Component
 * 
 * A reusable filter bar that works with TransactionsDataContext to provide
 * consistent filtering across all pages. Supports:
 * - Configurable filter visibility
 * - RTL/Arabic support
 * - Responsive layout
 * - Consistent styling with Tailwind/shadcn theme
 * - Enhanced approval status with line-level awareness
 * - Search with icon
 * - Date range with labels
 * - Reset button with active filter count
 */

import React, { useMemo, useCallback, useState } from 'react'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import SearchableSelect, { type SearchableSelectOption } from './SearchableSelect'
import { Skeleton, Box } from '@mui/material'
import useFilterOptions from '../../hooks/useFilterOptions'
import type { FilterState } from '../../hooks/useFilterState'
import { ScopeChips } from '../Scope/ScopeChips'

export type { FilterState }

type FilterVisibilityKey = 'search' | 'dateFrom' | 'dateTo' | 'amountFrom' | 'amountTo' | 'org' | 'project' | 'account' | 'debitAccount' | 'creditAccount' | 'classification' | 'expensesCategory' | 'workItem' | 'analysisWorkItem' | 'costCenter' | 'approvalStatus' | 'item'

type FilterVisibilityState = Partial<Record<FilterVisibilityKey, boolean>>

// Approval status configuration with colors and icons
const APPROVAL_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  draft: { label: 'مسودة', color: '#6b7280', bgColor: '#f3f4f6', icon: '📝' },
  submitted: { label: 'مُرسلة', color: '#3b82f6', bgColor: '#dbeafe', icon: '📤' },
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳' },
  approved: { label: 'معتمدة', color: '#10b981', bgColor: '#d1fae5', icon: '✅' },
  posted: { label: 'مرحلة', color: '#8b5cf6', bgColor: '#ede9fe', icon: '📊' },
  revision_requested: { label: 'طلب تعديل', color: '#f97316', bgColor: '#ffedd5', icon: '🔄' },
  requires_revision: { label: 'يتطلب تعديل', color: '#f97316', bgColor: '#ffedd5', icon: '🔄' },
  rejected: { label: 'مرفوضة', color: '#ef4444', bgColor: '#fee2e2', icon: '❌' },
  cancelled: { label: 'ملغاة', color: '#9ca3af', bgColor: '#f3f4f6', icon: '🚫' },
}

export interface FilterConfig {
  showSearch?: boolean
  showDateRange?: boolean
  showAmountRange?: boolean
  showOrg?: boolean
  showProject?: boolean
  showAccount?: boolean
  showDebitAccount?: boolean
  showCreditAccount?: boolean
  showClassification?: boolean
  showExpensesCategory?: boolean
  showWorkItem?: boolean
  showAnalysisWorkItem?: boolean
  showCostCenter?: boolean
  showApprovalStatus?: boolean
  showItem?: boolean
}

export interface FilterWidths {
  search?: number
  dateFrom?: number
  dateTo?: number
  amountFrom?: number
  amountTo?: number
  org?: number
  project?: number
  account?: number
  debitAccount?: number
  creditAccount?: number
  classification?: number
  expensesCategory?: number
  workItem?: number
  analysisWorkItem?: number
  costCenter?: number
  approvalStatus?: number
  item?: number
}

interface UnifiedFilterBarProps {
  values: FilterState
  onChange: (key: keyof FilterState, value: string) => void
  onReset?: () => void
  config?: FilterConfig
  widths?: FilterWidths
  className?: string
  style?: React.CSSProperties
  preferencesKey?: string
  onApply?: () => void
  applyDisabled?: boolean
  applyLabel?: string
}

const defaultConfig: FilterConfig = {
  showSearch: true,
  showDateRange: true,
  showAmountRange: false,
  showOrg: false, // Now managed by TopBar ScopeContext
  showProject: false, // Now managed by TopBar ScopeContext
  showAccount: false,
  showDebitAccount: true,
  showCreditAccount: true,
  showClassification: true,
  showExpensesCategory: true,
  showWorkItem: true,
  showAnalysisWorkItem: true,
  showCostCenter: true,
  showApprovalStatus: true,
  showItem: true,
}

const defaultWidths: FilterWidths = {
  search: 150,
  dateFrom: 130,
  dateTo: 130,
  amountFrom: 100,
  amountTo: 100,
  org: 180,
  project: 180,
  account: 220,
  debitAccount: 220,
  creditAccount: 220,
  classification: 180,
  expensesCategory: 180,
  workItem: 180,
  analysisWorkItem: 180,
  costCenter: 180,
  approvalStatus: 140,
  item: 200,
}

export const UnifiedFilterBar: React.FC<UnifiedFilterBarProps> = ({
  values,
  onChange,
  onReset,
  config = defaultConfig,
  widths = defaultWidths,
  className = '',
  style,
  preferencesKey,
  onApply,
  applyDisabled,
  applyLabel = 'تطبيق الفلاتر',
}) => {
  const { isLoading } = useTransactionsData()

  const {
    accountOptions,
    orgOptions,
    projectOptions,
    classificationOptions,
    categoryOptions,
    workItemOptions,
    analysisOptions,
    costCenterOptions,
    itemOptions,
  } = useFilterOptions()

  const cfg = useMemo(() => ({ ...defaultConfig, ...config }), [config])

  const preferenceNamespace = preferencesKey || 'unified_filter_bar'
  const widthsStorageKey = `${preferenceNamespace}:widths`
  const visibilityStorageKey = `${preferenceNamespace}:visibility`

  const loadJSON = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
    } catch {
      return fallback
    }
  }

  const persistedWidths = useMemo(() => loadJSON(widthsStorageKey, {}), [widthsStorageKey])
  const persistedVisibility = useMemo(() => loadJSON(visibilityStorageKey, {}), [visibilityStorageKey])

  const [customWidths, setCustomWidths] = useState<FilterWidths>(persistedWidths)
  const [filterVisibility, setFilterVisibility] = useState<FilterVisibilityState>(persistedVisibility)
  const [configModalOpen, setConfigModalOpen] = useState(false)

  const persistWidths = useCallback((next: FilterWidths | ((prev: FilterWidths) => FilterWidths)) => {
    setCustomWidths(prev => {
      const resolved = typeof next === 'function' ? (next as (p: FilterWidths) => FilterWidths)(prev) : next
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(widthsStorageKey, JSON.stringify(resolved || {}))
      }
      return resolved
    })
  }, [widthsStorageKey])

  const persistVisibility = useCallback((next: FilterVisibilityState | ((prev: FilterVisibilityState) => FilterVisibilityState)) => {
    setFilterVisibility(prev => {
      const resolved = typeof next === 'function' ? (next as (p: FilterVisibilityState) => FilterVisibilityState)(prev) : next
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(visibilityStorageKey, JSON.stringify(resolved || {}))
      }
      return resolved
    })
  }, [visibilityStorageKey])

  const baseWidths = useMemo(() => ({ ...defaultWidths, ...widths }), [widths])
  const resolvedWidths = useMemo(() => ({ ...baseWidths, ...customWidths }), [baseWidths, customWidths])

  const isFilterVisible = useCallback((key: FilterVisibilityKey, enabled?: boolean) => {
    if (enabled === false) return false
    const val = filterVisibility[key]
    return val === undefined ? true : val
  }, [filterVisibility])

  const handleToggleVisibility = useCallback((key: FilterVisibilityKey) => {
    persistVisibility(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))
  }, [persistVisibility])

  const handleWidthChange = useCallback((key: FilterVisibilityKey, value: number) => {
    persistWidths(prev => ({ ...prev, [key]: value }))
  }, [persistWidths])

  const resetCustomization = useCallback(() => {
    persistWidths({})
    persistVisibility({})
  }, [persistWidths, persistVisibility])

  // Build account options
  // Options now provided via useFilterOptions()

  // Enhanced approval status options with icons
  const approvalOptions: SearchableSelectOption[] = useMemo(() => [
    { value: '', label: 'جميع الحالات', searchText: '' },
    ...Object.entries(APPROVAL_STATUS_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: `${cfg.icon} ${cfg.label}`,
      searchText: `${cfg.label} ${key}`,
    }))
  ], [])

  // Count active filters for reset button badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (values.search) count++
    if (values.dateFrom) count++
    if (values.dateTo) count++
    if (values.amountFrom) count++
    if (values.amountTo) count++
    if (values.orgId) count++
    if (values.projectId) count++
    if (values.accountId) count++
    if (values.debitAccountId) count++
    if (values.creditAccountId) count++
    if (values.classificationId) count++
    if (values.expensesCategoryId) count++
    if (values.workItemId) count++
    if (values.analysisWorkItemId) count++
    if (values.costCenterId) count++
    if (values.approvalStatus) count++
    if (values.itemId) count++
    return count
  }, [values])

  // Handle search with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange('search', e.target.value)
  }, [onChange])

  // Clear search
  const handleClearSearch = useCallback(() => {
    onChange('search', '')
  }, [onChange])

  const filterControls = useMemo(() => {
    const entries: { key: FilterVisibilityKey; label: string; min: number; max: number; enabled: boolean }[] = [
      { key: 'search', label: 'بحث', min: 90, max: 260, enabled: cfg.showSearch !== false },
      { key: 'dateFrom', label: 'من التاريخ', min: 90, max: 220, enabled: cfg.showDateRange !== false },
      { key: 'dateTo', label: 'إلى التاريخ', min: 90, max: 220, enabled: cfg.showDateRange !== false },
      { key: 'approvalStatus', label: 'حالة الاعتماد', min: 120, max: 260, enabled: cfg.showApprovalStatus !== false },
      { key: 'org', label: 'المؤسسة', min: 120, max: 260, enabled: cfg.showOrg !== false },
      { key: 'project', label: 'المشروع', min: 120, max: 260, enabled: cfg.showProject !== false },
      { key: 'account', label: 'الحساب', min: 140, max: 320, enabled: cfg.showAccount !== false },
      { key: 'debitAccount', label: 'الحساب المدين', min: 140, max: 320, enabled: cfg.showDebitAccount !== false },
      { key: 'creditAccount', label: 'الحساب الدائن', min: 140, max: 320, enabled: cfg.showCreditAccount !== false },
      { key: 'classification', label: 'التصنيف', min: 140, max: 280, enabled: cfg.showClassification !== false },
      { key: 'expensesCategory', label: 'الشجرة الفرعية', min: 140, max: 280, enabled: cfg.showExpensesCategory !== false },
      { key: 'workItem', label: 'عنصر العمل', min: 140, max: 280, enabled: cfg.showWorkItem !== false },
      { key: 'analysisWorkItem', label: 'بند التحليل', min: 140, max: 280, enabled: cfg.showAnalysisWorkItem !== false },
      { key: 'costCenter', label: 'مركز التكلفة', min: 140, max: 260, enabled: cfg.showCostCenter !== false },
      { key: 'item', label: 'الصنف', min: 140, max: 280, enabled: cfg.showItem !== false },
      { key: 'amountFrom', label: 'من المبلغ', min: 80, max: 200, enabled: cfg.showAmountRange !== false },
      { key: 'amountTo', label: 'إلى المبلغ', min: 80, max: 200, enabled: cfg.showAmountRange !== false },
    ]
    return entries.filter(entry => entry.enabled)
  }, [cfg])

  if (isLoading) {
    return (
      <Box
        className={`unified-filter-bar ${className}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px',
          overflow: 'hidden',
          ...style
        }}
      >
        <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={150} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    )
  }

  const themedInputStyle: React.CSSProperties = {
    borderRadius: '0.35rem',
    border: '1px solid var(--border-color, #374151)',
    backgroundColor: 'var(--field_bg, #0f172a)',
    color: 'var(--text, #f3f4f6)',
    boxShadow: '0 0 0 1px var(--border-color, #1f2937) inset',
  }

  return (
    <div
      className={`unified-filter-bar ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.5rem',
        alignItems: 'center',
        direction: 'rtl',
        ...style
      }}
    >
      {/* Current Scope Display - Shows org/project from TopBar */}
      <ScopeChips showLabels={false} size="small" variant="filled" />

      <button
        type="button"
        className="ultimate-btn"
        onClick={() => setConfigModalOpen(true)}
        style={{ minHeight: '34px', padding: '0.35rem 0.9rem', fontWeight: 600 }}
        title="تخصيص شريط الفلاتر"
      >
        <div className="btn-content"><span className="btn-text">⚙️ عرض الفلاتر</span></div>
      </button>

      {/* Search with icon and clear button */}
      {cfg.showSearch && isFilterVisible('search') && (
        <div style={{
          position: 'relative',
          width: resolvedWidths.search,
          minWidth: 120,
        }}>
          <span style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            value={values.search || ''}
            onChange={handleSearchChange}
            placeholder="بحث..."
            className="filter-input"
            style={{
              width: '100%',
              padding: '0.5rem 2rem 0.5rem 1.5rem',
              ...themedInputStyle,
            }}
          />
          {values.search && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                left: '0.25rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '0.25rem',
                lineHeight: 1,
              }}
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Date Range with labels */}
      {cfg.showDateRange && (isFilterVisible('dateFrom') || isFilterVisible('dateTo')) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          backgroundColor: 'var(--bg-muted, #f9fafb)',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--border-color, #e5e7eb)',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>📅</span>
          {isFilterVisible('dateFrom') && (
            <>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.25rem' }}>من</span>
              <input
                type="date"
                value={values.dateFrom || ''}
                onChange={e => onChange('dateFrom', e.target.value)}
                className="filter-input"
                style={{
                  width: resolvedWidths.dateFrom,
                  padding: '0.35rem',
                  fontSize: '0.875rem',
                  ...themedInputStyle,
                }}
              />
            </>
          )}
          {isFilterVisible('dateTo') && (
            <>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>إلى</span>
              <input
                type="date"
                value={values.dateTo || ''}
                onChange={e => onChange('dateTo', e.target.value)}
                className="filter-input"
                style={{
                  width: resolvedWidths.dateTo,
                  padding: '0.35rem',
                  fontSize: '0.875rem',
                  ...themedInputStyle,
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Amount Range */}
      {cfg.showAmountRange && (isFilterVisible('amountFrom') || isFilterVisible('amountTo')) && (
        <>
          {isFilterVisible('amountFrom') && (
            <input
              type="number"
              value={values.amountFrom || ''}
              onChange={e => onChange('amountFrom', e.target.value)}
              placeholder="من مبلغ"
              className="filter-input"
              style={{
                width: resolvedWidths.amountFrom,
                padding: '0.5rem',
                ...themedInputStyle,
              }}
            />
          )}
          {isFilterVisible('amountTo') && (
            <input
              type="number"
              value={values.amountTo || ''}
              onChange={e => onChange('amountTo', e.target.value)}
              placeholder="إلى مبلغ"
              className="filter-input"
              style={{
                width: resolvedWidths.amountTo,
                padding: '0.5rem',
                ...themedInputStyle,
              }}
            />
          )}
        </>
      )}

      {/* Approval Status */}
      {cfg.showApprovalStatus && isFilterVisible('approvalStatus') && (
        <div style={{ width: resolvedWidths.approvalStatus, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.approval"
            value={values.approvalStatus || ''}
            options={approvalOptions}
            onChange={v => onChange('approvalStatus', v)}
            placeholder="حالة الاعتماد"
            clearable
          />
        </div>
      )}

      {/* Organization */}
      {cfg.showOrg && isFilterVisible('org') && (
        <div style={{ width: resolvedWidths.org, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.org"
            value={values.orgId || ''}
            options={orgOptions}
            onChange={v => onChange('orgId', v)}
            placeholder="جميع المؤسسات"
            clearable
          />
        </div>
      )}

      {/* Project */}
      {cfg.showProject && isFilterVisible('project') && (
        <div style={{ width: resolvedWidths.project, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.project"
            value={values.projectId || ''}
            options={projectOptions}
            onChange={v => onChange('projectId', v)}
            placeholder="جميع المشاريع"
            clearable
          />
        </div>
      )}

      {/* Account (Any) */}
      {cfg.showAccount && isFilterVisible('account') && (
        <div style={{ width: resolvedWidths.account, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.account"
            value={values.accountId || ''}
            options={[
              { value: '', label: 'جميع الحسابات', searchText: '' },
              ...accountOptions
            ]}
            onChange={v => onChange('accountId', v)}
            placeholder="جميع الحسابات"
            clearable
          />
        </div>
      )}

      {/* Debit Account */}
      {cfg.showDebitAccount && isFilterVisible('debitAccount') && (
        <div style={{ width: resolvedWidths.debitAccount, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.debit"
            value={values.debitAccountId || ''}
            options={[
              { value: '', label: 'جميع الحسابات المدينة', searchText: '' },
              ...accountOptions
            ]}
            onChange={v => onChange('debitAccountId', v)}
            placeholder="جميع الحسابات المدينة"
            clearable
          />
        </div>
      )}

      {/* Credit Account */}
      {cfg.showCreditAccount && isFilterVisible('creditAccount') && (
        <div style={{ width: resolvedWidths.creditAccount, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.credit"
            value={values.creditAccountId || ''}
            options={[
              { value: '', label: 'جميع الحسابات الدائنة', searchText: '' },
              ...accountOptions
            ]}
            onChange={v => onChange('creditAccountId', v)}
            placeholder="جميع الحسابات الدائنة"
            clearable
          />
        </div>
      )}

      {/* Classification */}
      {cfg.showClassification && isFilterVisible('classification') && (
        <div style={{ width: resolvedWidths.classification, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.classification"
            value={values.classificationId || ''}
            options={classificationOptions}
            onChange={v => onChange('classificationId', v)}
            placeholder="جميع التصنيفات"
            clearable
          />
        </div>
      )}

      {/* Expenses Category (Sub-tree) */}
      {cfg.showExpensesCategory && isFilterVisible('expensesCategory') && (
        <div style={{ width: resolvedWidths.expensesCategory, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.expenses"
            value={values.expensesCategoryId || ''}
            options={categoryOptions}
            onChange={v => onChange('expensesCategoryId', v)}
            placeholder="جميع الشجرة الفرعية"
            clearable
          />
        </div>
      )}

      {/* Work Item */}
      {cfg.showWorkItem && isFilterVisible('workItem') && (
        <div style={{ width: resolvedWidths.workItem, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.workitem"
            value={values.workItemId || ''}
            options={workItemOptions}
            onChange={v => onChange('workItemId', v)}
            placeholder="جميع عناصر العمل"
            clearable
          />
        </div>
      )}

      {/* Analysis Work Item */}
      {cfg.showAnalysisWorkItem && isFilterVisible('analysisWorkItem') && (
        <div style={{ width: resolvedWidths.analysisWorkItem, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.analysis"
            value={values.analysisWorkItemId || ''}
            options={analysisOptions}
            onChange={v => onChange('analysisWorkItemId', v)}
            placeholder="جميع بنود التحليل"
            clearable
          />
        </div>
      )}

      {/* Cost Center */}
      {cfg.showCostCenter && isFilterVisible('costCenter') && (
        <div style={{ width: resolvedWidths.costCenter, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.costcenter"
            value={values.costCenterId || ''}
            options={costCenterOptions}
            onChange={v => onChange('costCenterId', v)}
            placeholder="جميع مراكز التكلفة"
            clearable
          />
        </div>
      )}

      {/* Item */}
      {cfg.showItem && isFilterVisible('item') && (
        <div style={{ width: resolvedWidths.item, flexShrink: 0 }}>
          <SearchableSelect
            id="unified.filter.item"
            value={values.itemId || ''}
            options={itemOptions}
            onChange={v => onChange('itemId', v)}
            placeholder="جميع الأصناف"
            clearable
          />
        </div>
      )}

      {/* Reset Button with active filter count badge */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            className={`ultimate-btn ${applyDisabled ? 'ultimate-btn-neutral' : 'ultimate-btn-success'}`}
            style={{ minHeight: '36px', padding: '0.5rem 1.25rem' }}
            title={applyDisabled ? 'لا توجد تغييرات لتطبيقها' : 'تطبيق الفلاتر الحالية'}
          >
            <div className="btn-content"><span className="btn-text">{applyLabel}</span></div>
          </button>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={activeFilterCount === 0}
            className="ultimate-btn"
            style={{
              position: 'relative',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed',
              backgroundColor: activeFilterCount > 0 ? '#ef4444' : '#e5e7eb',
              color: activeFilterCount > 0 ? 'white' : '#9ca3af',
              border: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            title={activeFilterCount > 0 ? `مسح ${activeFilterCount} فلتر` : 'لا توجد فلاتر نشطة'}
          >
            <span>🗑️</span>
            <span>إعادة تعيين</span>
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: 'white',
                color: '#ef4444',
                borderRadius: '9999px',
                padding: '0.125rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: '1.25rem',
                textAlign: 'center',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>
      {configModalOpen && (
        <div
          className="filter-config-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setConfigModalOpen(false)}
        >
          <div
            className="filter-config-modal"
            onClick={e => e.stopPropagation()}
            style={{
              width: '90vw',
              maxWidth: 1000,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--surface, #111827)',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #374151)',
              padding: '1.5rem',
              color: 'var(--text, #f3f4f6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>تخصيص عرض الفلاتر</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => setConfigModalOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {filterControls.map(ctrl => (
                <div key={ctrl.key} style={{ border: '1px solid var(--border-color, #1f2937)', borderRadius: '10px', padding: '0.75rem', backgroundColor: 'var(--bg-muted, #111827)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isFilterVisible(ctrl.key)}
                      onChange={() => handleToggleVisibility(ctrl.key)}
                      style={{ accentColor: 'var(--accent, #3b82f6)', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>{ctrl.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      value={customWidths[ctrl.key] ?? baseWidths[ctrl.key] ?? ctrl.min}
                      onChange={e => handleWidthChange(ctrl.key, Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '45px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted_text, #9ca3af)' }}>
                      {customWidths[ctrl.key] ?? baseWidths[ctrl.key] ?? ctrl.min}px
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="ultimate-btn ultimate-btn-warning" onClick={resetCustomization}>
                <div className="btn-content"><span className="btn-text">إعادة تعيين الافتراضي</span></div>
              </button>
              <button className="ultimate-btn ultimate-btn-success" onClick={() => setConfigModalOpen(false)}>
                <div className="btn-content"><span className="btn-text">تم</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnifiedFilterBar
