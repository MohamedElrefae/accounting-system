import React, { useEffect, useMemo, useState, useCallback } from 'react'
import styles from './ProfitLoss.module.css'
import './StandardFinancialStatements.css'
import { supabase } from '../../utils/supabase'
import { getCompanyConfig } from '../../services/company-config'
import { fetchProjects, fetchOrganizations } from '../../services/lookups'
import { fetchTransactionsDateRange } from '../../services/reports/account-explorer'
import { 
  fetchTransactionClassificationSummary, 
  fetchClassificationAccountBreakdown,
  fetchClassificationTimeline,
  type ClassificationSummaryRow,
} from '../../services/reports/classification-report'
import ExportButtons from '../../components/Common/ExportButtons'
import ReportSyncStatus from '../../components/Common/ReportSyncStatus'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { useUniversalReportSync, type SyncControlSettings } from '../../hooks/useUniversalReportSync'

function todayISO() {
  return new Date().toISOString().slice(0,10)
}

function startOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0,10)
}

const TransactionClassificationReports: React.FC = () => {
  const [companyName, setCompanyName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [projects, setProjects] = useState<{ id: string; code?: string; name?: string; name_ar?: string }[]>([])
  const [organizations, setOrganizations] = useState<{ id: string; code?: string; name?: string; name_ar?: string }[]>([])
  const [dateFrom, setDateFrom] = useState<string>(startOfMonthISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  const [includeUnclassified, setIncludeUnclassified] = useState<boolean>(true)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [rows, setRows] = useState<ClassificationSummaryRow[]>([])
  const [totals, setTotals] = useState<any>({ total_transactions: 0, total_amount: 0, classifications_count: 0, posted_transactions: 0, unposted_transactions: 0, posted_amount: 0, unposted_amount: 0 })
  
  // Focus mode and multi-select state
  const [focusMode, setFocusMode] = useState<boolean>(false)
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([])
  const [allClassifications, setAllClassifications] = useState<{ id: string; name: string }[]>([])
  
  // Drilldown state
  const [expandedClassification, setExpandedClassification] = useState<string | null>(null)
  // Removed unused state variables for accountBreakdown and timeline
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false)
  const [transactionDetails, setTransactionDetails] = useState<any[]>([])

  // Define load function first
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters = {
        dateFrom, 
        dateTo, 
        projectId: projectId || null, 
        orgId: orgId || null,
        postedOnly, 
        includeUnclassified,
        classificationIds: focusMode && selectedClassifications.length > 0 ? selectedClassifications : undefined
      }
      const { rows, totals } = await fetchTransactionClassificationSummary(filters)
      setRows(rows)
      setTotals(totals)
    } catch (e: any) {
      setError(e?.message || 'Failed to load classification report')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, projectId, orgId, postedOnly, includeUnclassified, focusMode, selectedClassifications])

  // Enterprise sync configuration for transaction classification reports
  const enterpriseSyncConfig: SyncControlSettings = {
    mode: 'realtime', // Start in real-time mode
    pauseOnHighVolume: true, // Auto-pause when transaction rate is high
    maxUpdatesPerMinute: 25, // Conservative limit for classification reports
    pauseOnUserActivity: true, // Pause when user is actively working
    allowedTriggers: ['data_change', 'manual'], // Only allow data changes and manual triggers
    businessHoursOnly: false, // Allow sync 24/7
    batchSize: 50 // Process max 50 records per sync for performance
  }

  // Universal Sync Hook with enterprise controls
  const syncState = useUniversalReportSync({
    reportId: 'transaction_classification_report',
    tablesToWatch: ['transactions', 'transaction_classifications', 'accounts', 'projects'],
    enableRealTime: true,
    enableUserPresence: true,
    updateInterval: 1500, // 1.5 second delay for pending updates
    syncControl: enterpriseSyncConfig,
    onDataChange: () => {
      // Only reload if not paused and sync mode allows it
      if (!syncState.isPaused && syncState.syncMode !== 'off') {
        console.log('📊 Classification data changed - reloading...')
        load()
      }
    },
    onSyncPaused: (reason) => {
      console.log('⏸️ Sync paused:', reason)
      // You could show a toast notification here
    },
    onSyncResumed: () => {
      console.log('▶️ Sync resumed')
      // You could show a toast notification here
    },
    onUserUpdate: (event) => {
      console.log('👥 User activity:', event.type, event.metadata?.action)
    }
  })

  // Manual update trigger
  const handleManualUpdate = useCallback(() => {
    syncState.triggerUpdate({ source: 'manual_refresh', timestamp: Date.now() })
    load()
  }, [syncState, load])

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getCompanyConfig()
        setCompanyName(cfg?.company_name || '')
      } catch {}
      try {
        const [projectList, orgList] = await Promise.all([
          fetchProjects(),
          fetchOrganizations()
        ])
        setProjects(projectList.map(p => ({ 
          id: p.id, 
          code: p.code || undefined, 
          name: p.name,
          name_ar: p.name_ar || undefined 
        })))
        setOrganizations(orgList.map(o => ({ 
          id: o.id, 
          code: o.code || undefined, 
          name: o.name,
          name_ar: o.name_ar || undefined 
        })))
        
        // Load all classifications for multi-select
        const { data: classData } = await supabase.from('transaction_classifications').select('id, name').order('name')
        setAllClassifications(classData || [])
      } catch {}
    })()
  }, [])

  // Auto-set full available date range for selected project
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchTransactionsDateRange({ orgId: null, projectId: projectId || null, postedOnly })
        if (r && r.min_date && r.max_date) {
          setDateFrom(r.min_date)
          setDateTo(r.max_date)
        }
      } catch {}
    })()
  }, [projectId, postedOnly])
  
  // Load detailed breakdown for expanded classification
  const loadClassificationDetails = async (classificationId: string | null) => {
    setBreakdownLoading(true)
    try {
      const filters = { dateFrom, dateTo, projectId: projectId || null, orgId: orgId || null, postedOnly }
      const [, , transactions] = await Promise.all([
        fetchClassificationAccountBreakdown(classificationId, filters),
        fetchClassificationTimeline(classificationId, filters),
        fetchClassificationTransactions(classificationId, filters)
      ])
      // Only use transactions for now since we don't need breakdown and timeline data
      setTransactionDetails(transactions)
    } catch (e: any) {
      console.error('Failed to load classification details:', e)
    } finally {
      setBreakdownLoading(false)
    }
  }

  useEffect(() => { load() }, [dateFrom, dateTo, projectId, orgId, postedOnly, includeUnclassified, focusMode, selectedClassifications])
  
  // Handle classification row expansion
  const toggleClassificationExpansion = async (classificationId: string | null) => {
    if (expandedClassification === classificationId) {
      setExpandedClassification(null)
      setTransactionDetails([])
    } else {
      setExpandedClassification(classificationId)
      await loadClassificationDetails(classificationId)
    }
  }
  
  // Multi-select handlers
  const toggleClassificationSelection = (classificationId: string) => {
    setSelectedClassifications(prev => 
      prev.includes(classificationId) 
        ? prev.filter(id => id !== classificationId)
        : [...prev, classificationId]
    )
  }
  
  const selectAllClassifications = () => {
    const allIds = [...allClassifications.map(c => c.id), '__unclassified__']
    setSelectedClassifications(allIds)
  }
  
  const clearClassificationSelection = () => {
    setSelectedClassifications([])
  }
  
  // Fixed 6 columns for transaction details (like GL report)
  // const transactionColumns = [
  //   { key: 'entry_date', label: 'تاريخ القيد' },
  //   { key: 'description', label: 'الوصف' },
  //   { key: 'debit_account_code', label: 'حساب المدين' },
  //   { key: 'credit_account_code', label: 'حساب الدائن' },
  //   { key: 'amount', label: 'المبلغ' },
  //   { key: 'project_name', label: 'المشروع' }
  // ]
  
  // Fetch transaction details for a classification
  const fetchClassificationTransactions = async (classificationId: string | null, filters: any) => {
    let q = supabase
      .from('transactions')
      .select(`
        id, entry_date, description, amount, is_posted, created_at, classification_id,
        debit_account:debit_account_id(code, name, name_ar),
        credit_account:credit_account_id(code, name, name_ar),
        project:project_id(name, name_ar),
        created_by_user:created_by(username),
        classification:classification_id(name)
      `)
      .order('entry_date', { ascending: false })
      .limit(100)
    
    if (filters.dateFrom) q = q.gte('entry_date', filters.dateFrom)
    if (filters.dateTo) q = q.lte('entry_date', filters.dateTo)
    if (filters.projectId) q = q.eq('project_id', filters.projectId)
    if (filters.postedOnly) q = q.eq('is_posted', true)
    
    if (classificationId === null) {
      q = q.is('classification_id', null)
    } else {
      q = q.eq('classification_id', classificationId)
    }
    
    const { data, error } = await q
    if (error) throw error
    
    return (data || []).map(tx => ({
      id: tx.id,
      entry_date: tx.entry_date,
      description: tx.description || 'بلا وصف',
      debit_account_code: tx.debit_account ? `${(tx.debit_account as any).code} - ${(tx.debit_account as any).name_ar || (tx.debit_account as any).name}` : '',
      credit_account_code: tx.credit_account ? `${(tx.credit_account as any).code} - ${(tx.credit_account as any).name_ar || (tx.credit_account as any).name}` : '',
      amount: Number(tx.amount || 0),
      is_posted: tx.is_posted ? 'معتمد' : 'غير معتمد',
      project_name: tx.project ? ((tx.project as any).name_ar || (tx.project as any).name) : '',
      classification_name: tx.classification ? (tx.classification as any).name : 'غير مصنف',
      created_by: (tx.created_by_user as any)?.username || '',
      created_at: tx.created_at
    }))
  }

  const exportData: UniversalTableData = useMemo(() => {
    const cols = createStandardColumns([
      { key: 'classification_name', header: 'التصنيف', type: 'text' as const },
      { key: 'transaction_count', header: 'عدد المعاملات', type: 'text' as const },
      { key: 'total_amount', header: 'إجمالي المبالغ', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      { key: 'avg_amount', header: 'متوسط المبلغ', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
    ])
    const rowsData = rows.map(r => ({
      classification_name: r.classification_name,
      transaction_count: r.transaction_count,
      total_amount: r.total_amount,
      avg_amount: r.avg_amount,
    }))
    return prepareTableData(cols, rowsData)
  }, [rows, numbersOnly])

  return (
    <div style={{padding: 0, background: 'var(--background)', minHeight: '100vh', direction: 'rtl', width: '100%', boxSizing: 'border-box'}}>
      {/* Advanced Filter Bar */}
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`} style={{margin: '0 0 24px 0', width: '100%'}}>
        <div className={styles.filterSection}>
          <select className={styles.filterSelect} value={orgId} onChange={e => setOrgId(e.target.value)}>
            <option value=''>كل المنظمات</option>
            {organizations.map(o => (
              <option key={o.id} value={o.id}>{(o.code ? o.code + ' — ' : '') + (o.name_ar || o.name || '')}</option>
            ))}
          </select>
          <select className={styles.filterSelect} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value=''>كل المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{(p.code ? p.code + ' — ' : '') + (p.name_ar || p.name || '')}</option>
            ))}
          </select>
          <input className={styles.filterInput} type='date' value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input className={styles.filterInput} type='date' value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button type='button' className={`${styles.featureToggle} ${postedOnly ? styles.active : ''}`} onClick={() => setPostedOnly(v => !v)} title='قيود معتمدة فقط'>✅</button>
          <button type='button' className={`${styles.featureToggle} ${includeUnclassified ? styles.active : ''}`} onClick={() => setIncludeUnclassified(v => !v)} title='تضمين غير مصنفة'>🔖</button>
          <button type='button' className={`${styles.featureToggle} ${numbersOnly ? styles.active : ''}`} onClick={() => setNumbersOnly(v => !v)} title='أرقام فقط'>#</button>
          <button type='button' className={`${styles.featureToggle} ${focusMode ? styles.active : ''}`} onClick={() => setFocusMode(v => !v)} title='وضع التركيز (تصفية متعددة)'>🎯</button>
        </div>
        <div className={styles.actionSection}>
          <ExportButtons
            data={exportData}
            config={{
              title: 'تقارير تصنيفات المعاملات',
              rtlLayout: true,
              useArabicNumerals: true,
            }}
            size='small'
          />
          <button type='button' className={`${styles.actionButton} ${styles.primary}`} onClick={load} disabled={loading}>{loading ? 'جاري التحميل...' : 'تحديث'}</button>
        </div>
      </div>

      {/* Focus Mode Multi-Select Panel */}
      {focusMode && (
        <div style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', margin: '16px 0'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0, color: 'var(--text)'}}>🎯 وضع التركيز - اختيار التصنيفات</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <button className={styles.actionButton} onClick={selectAllClassifications}>تحديد الكل</button>
              <button className={styles.actionButton} onClick={clearClassificationSelection}>إلغاء التحديد</button>
              <span style={{fontSize: '14px', color: 'var(--muted_text)'}}>محدد: {selectedClassifications.length}</span>
            </div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: selectedClassifications.includes('__unclassified__') ? 'var(--accent)20' : 'var(--field_bg)'}}>
              <input type='checkbox' checked={selectedClassifications.includes('__unclassified__')} onChange={() => toggleClassificationSelection('__unclassified__')} />
              <span>غير مصنف</span>
            </label>
            {allClassifications.map(c => (
              <label key={c.id} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: selectedClassifications.includes(c.id) ? 'var(--accent)20' : 'var(--field_bg)'}}>
                <input type='checkbox' checked={selectedClassifications.includes(c.id)} onChange={() => toggleClassificationSelection(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Real-time Sync Status with Enterprise Controls */}
      <div style={{margin: '16px 20px'}}>
        <ReportSyncStatus
          isConnected={syncState.isConnected}
          pendingUpdates={syncState.pendingUpdates}
          activeUsers={syncState.activeUsers}
          lastUpdate={syncState.lastUpdate}
          error={syncState.error}
          syncMode={syncState.syncMode}
          isPaused={syncState.isPaused}
          pauseReason={syncState.pauseReason}
          updateCount={syncState.updateCount}
          avgUpdatesPerMinute={syncState.avgUpdatesPerMinute}
          onRefresh={handleManualUpdate}
          onPauseSync={syncState.pauseSync}
          onResumeSync={syncState.resumeSync}
          onChangeSyncMode={syncState.changeSyncMode}
          className={styles.noPrint}
        />
      </div>

      <div className='standard-financial-statements'>
        <div id='financial-report-content' className='financial-report-content'>
          <div className={styles.reportHeader} style={{display:'none'}}>
            <h2>{companyName || 'الشركة'}</h2>
            <div className={styles.statementTitle}>تقارير تصنيفات المعاملات</div>
            <div className={styles.statementMeta}>
              <span>الفترة: {dateFrom} ← {dateTo}</span>
              {projectId && (<span>المشروع: {projects.find(p => p.id === projectId)?.name || projectId}</span>)}
              {postedOnly && (<span>قيود معتمدة فقط</span>)}
            </div>
          </div>

          <div className='statement-content'>
            {/* Enhanced KPI Cards with Posted/Unposted Breakdown */}
            <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', margin: '24px 0', padding: '0 20px'}}>
              <div className='kpi-card' style={{textAlign: 'center', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize: '14px', color: 'var(--muted_text)', marginBottom: '8px'}}>إجمالي المعاملات</div>
                <strong style={{fontSize: '28px', color: 'var(--text)', display: 'block', marginBottom: '8px'}}>{totals.total_transactions.toLocaleString('ar-EG')}</strong>
                <small style={{fontSize: '12px', color: 'var(--muted_text)', display: 'block'}}>معتمد: {totals.posted_transactions} | غير معتمد: {totals.unposted_transactions}</small>
              </div>
              <div className='kpi-card' style={{textAlign: 'center', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize: '14px', color: 'var(--muted_text)', marginBottom: '8px'}}>إجمالي المبالغ</div>
                <strong style={{fontSize: '28px', color: 'var(--text)', display: 'block', marginBottom: '8px'}}>{totals.total_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</strong>
                <small style={{fontSize: '12px', color: 'var(--muted_text)', display: 'block'}}>معتمد: {totals.posted_amount.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</small>
              </div>
              <div className='kpi-card' style={{textAlign: 'center', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize: '14px', color: 'var(--muted_text)', marginBottom: '8px'}}>عدد التصنيفات</div>
                <strong style={{fontSize: '28px', color: 'var(--text)', display: 'block', marginBottom: '8px'}}>{totals.classifications_count}</strong>
                <small style={{fontSize: '12px', color: 'var(--muted_text)', display: 'block'}}>{focusMode ? `مركز على: ${selectedClassifications.length}` : 'كل التصنيفات'}</small>
              </div>
              <div className='kpi-card' style={{textAlign: 'center', padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize: '14px', color: 'var(--muted_text)', marginBottom: '8px'}}>معدل الاعتماد</div>
                <strong style={{fontSize: '28px', color: 'var(--text)', display: 'block', marginBottom: '8px'}}>{totals.total_transactions > 0 ? ((totals.posted_transactions / totals.total_transactions) * 100).toFixed(1) : 0}%</strong>
                <small style={{fontSize: '12px', color: 'var(--muted_text)', display: 'block'}}>من المعاملات معتمدة</small>
              </div>
            </div>

            {/* Enhanced Classification Table with Expandable Rows */}
            <div style={{background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', margin: '0 20px'}}>
              {loading ? (
                <div style={{padding: '60px 20px', textAlign: 'center', color: 'var(--muted_text)'}}>جاري تحميل البيانات...</div>
              ) : (
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px', direction: 'rtl'}}>
                  <thead>
                    <tr style={{background: 'var(--accent)', color: 'var(--on-accent)'}}>
                      <th style={{width: '50px', padding: '16px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600'}}>تفاصيل</th>
                      <th style={{padding: '16px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', minWidth: '200px'}}>التصنيف</th>
                      <th style={{padding: '16px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '120px'}}>عدد المعاملات</th>
                      <th style={{padding: '16px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '140px'}}>إجمالي المبالغ</th>
                      <th style={{padding: '16px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '120px'}}>متوسط المبلغ</th>
                      <th style={{padding: '16px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '140px'}}>حالة الاعتماد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const isExpanded = expandedClassification === r.classification_id
                      const colSpan = 6
                      return (
                        <React.Fragment key={r.classification_id ?? 'unclassified'}>
                          <tr 
                            className={isExpanded ? styles.rowExpanded : ''}
                            onClick={() => toggleClassificationExpansion(r.classification_id)}
                            title="انقر للعرض التفصيلي"
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            aria-controls={`drill-${r.classification_id ?? 'unclassified'}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleClassificationExpansion(r.classification_id)
                              }
                            }}
                            style={{cursor: 'pointer', borderBottom: '1px solid var(--border)'}}
                          >
                            <td className={styles.chevronCell} onClick={(e) => { e.stopPropagation(); toggleClassificationExpansion(r.classification_id) }}>
                              <button
                                type="button"
                                className={`${styles.chevronBtn} ${isExpanded ? styles.chevronOpen : ''}`}
                                aria-label={isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
                                aria-expanded={isExpanded}
                                aria-controls={`drill-${r.classification_id ?? 'unclassified'}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleClassificationExpansion(r.classification_id)
                                  }
                                }}
                              />
                            </td>
                            <td style={{padding: '16px 16px', textAlign: 'right'}}><strong style={{fontSize: '15px'}}>{r.classification_name}</strong></td>
                            <td style={{padding: '16px 12px', textAlign: 'center', fontSize: '14px'}}>{r.transaction_count.toLocaleString('ar-EG')}</td>
                            <td style={{padding: '16px 12px', textAlign: 'center', fontSize: '14px', fontWeight: '600'}}>{r.total_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                            <td style={{padding: '16px 12px', textAlign: 'center', fontSize: '14px'}}>{r.avg_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                            <td style={{padding: '16px 12px', textAlign: 'center'}}>
                              <div style={{fontSize: '12px', lineHeight: '1.4'}}>
                                <div style={{color: 'var(--success)', marginBottom: '2px'}}>✅ {r.posted_count} ({r.posted_amount.toLocaleString('ar-EG', { maximumFractionDigits: 0 })})</div>
                                <div style={{color: 'var(--warning)'}}>⏳ {r.unposted_count} ({r.unposted_amount.toLocaleString('ar-EG', { maximumFractionDigits: 0 })})</div>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expandable Details Row */}
                          {isExpanded && (
                            <tr className={styles.drilldownRow}>
                              <td colSpan={colSpan}>
                                <div className={styles.drilldown}>
                                  <div className={styles.drilldownHeader}>
                                    <div>
                                      تفاصيل التصنيف: {r.classification_name}
                                      <div className={styles.subtleRow}>
                                        <span className={styles.mutedText}>
                                          المعروض: {transactionDetails.length.toLocaleString('ar-EG')} معاملة
                                        </span>
                                      </div>
                                    </div>
                                    <div className={styles.drilldownActions}>
                                      <button
                                        className={styles.presetButton}
                                        onClick={(e) => { e.stopPropagation(); toggleClassificationExpansion(r.classification_id) }}
                                      >إغلاق</button>
                                    </div>
                                  </div>
                                  {breakdownLoading ? (
                                    <div className={styles.skeletonWrap} aria-live="polite" aria-busy="true">
                                      <div className={styles.skeletonRow}>
                                        <span className={styles.skeletonBar} style={{width: '15%'}}></span>
                                        <span className={styles.skeletonBar} style={{width: '60%'}}></span>
                                        <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                        <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                      </div>
                                    </div>
                                  ) : transactionDetails.length ? (
                                    <>
                                      <table id={`drill-${r.classification_id ?? 'unclassified'}`} className={styles.subTable}>
                                        <thead>
                                          <tr>
                                            <th>التاريخ</th>
                                            <th>الوصف</th>
                                            <th>حساب المدين</th>
                                            <th>حساب الدائن</th>
                                            <th>المبلغ</th>
                                            <th>المشروع</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {transactionDetails.map(tx => (
                                            <tr key={`${tx.id}-${tx.entry_date}`}>
                                              <td>{tx.entry_date}</td>
                                              <td>{tx.description || ''}</td>
                                              <td>{tx.debit_account_code || ''}</td>
                                              <td>{tx.credit_account_code || ''}</td>
                                              <td>{Number(tx.amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                              <td>{tx.project_name || ''}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </>
                                  ) : (
                                    <>
                                      <div className={styles.footer}>لا توجد معاملات لهذا التصنيف في الفترة المحددة.</div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionClassificationReports
