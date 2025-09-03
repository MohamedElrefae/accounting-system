import React, { useEffect, useMemo, useState } from 'react'
import styles from './WorkItemUsage.module.css'
import { getOrganizations, type Organization } from '../../services/organization'
import { getActiveProjects, type Project } from '../../services/projects'
import { getWorkItemUsage, type WorkItemUsageRow } from '../../services/reports/work-item-usage'
import ResizableTable from '../../components/Common/ResizableTable'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { useToast } from '../../contexts/ToastContext'

const WorkItemUsagePage: React.FC = () => {
  const { showToast } = useToast()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [onlyWithTx, setOnlyWithTx] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState<'all' | 'posted' | 'unposted'>('all')
  const [rows, setRows] = useState<WorkItemUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [o, p] = await Promise.all([
          getOrganizations().catch(() => []),
          getActiveProjects().catch(() => [])
        ])
        setOrgs(o)
        setProjects(p)
        // Default org
        const defOrg = o[0]?.id || ''
        setOrgId(defOrg)
        const data = await getWorkItemUsage({ orgId: defOrg, search, onlyWithTx, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, status })
        setRows(data)
      } catch (e: any) {
        showToast(e.message || 'Failed to load Work Item Usage', { severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const reload = async (org: string, proj?: string) => {
    setLoading(true)
    try {
      const data = await getWorkItemUsage({
        orgId: org || undefined,
        projectId: proj || undefined,
        search,
        onlyWithTx,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status,
      })
      setRows(data)
    } catch (e: any) {
      showToast(e.message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const tableData = useMemo(() => {
    const projMap = new Map(projects.map(p => [p.id, p]))
    return rows.map(r => ({
      code: r.code,
      name: r.name || r.name_ar || '',
      scope: r.project_id ? `مشروع: ${projMap.get(r.project_id)?.code || ''}` : 'مؤسسة',
      tx_count: r.tx_count,
      total_amount: r.total_amount,
      original: r,
    }))
  }, [rows, projects])

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'text' },
      { key: 'name', header: 'الاسم', type: 'text' },
      { key: 'scope', header: 'النطاق', type: 'text' },
      { key: 'tx_count', header: 'عدد القيود', type: 'number' },
      { key: 'total_amount', header: 'إجمالي المبلغ', type: 'number' },
    ])
    return prepareTableData(columns, tableData)
  }, [tableData])

  const columns = useMemo(() => ([
    { key: 'code', label: 'الكود', width: 240, visible: true, type: 'text' as const },
    { key: 'name', label: 'الاسم', width: 320, visible: true, type: 'text' as const },
    { key: 'scope', label: 'النطاق', width: 160, visible: true, type: 'text' as const },
    { key: 'tx_count', label: 'عدد القيود', width: 140, visible: true, type: 'number' as const },
    { key: 'total_amount', label: 'إجمالي المبلغ', width: 160, visible: true, type: 'number' as const },
  ]), [])

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.title}>Work Item Usage / استخدام عناصر الأعمال</div>
        <div className={styles.toolbar}>
          <select className={styles.select} value={orgId} onChange={async (e) => { const v = String(e.target.value); setOrgId(v); await reload(v, projectId || undefined) }}>
            <option value="">جميع المؤسسات</option>
            {orgs.map(o => (<option key={o.id} value={o.id}>{o.code} - {o.name}</option>))}
          </select>
          <select className={styles.select} value={projectId} onChange={async (e) => { const v = String(e.target.value); setProjectId(v); await reload(orgId, v || undefined) }}>
            <option value="">كتالوج المؤسسة + جميع المشاريع</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
          </select>
          <input className={styles.input} placeholder="بحث الكود/الاسم" value={search} onChange={async (e) => { const v = e.target.value; setSearch(v); await reload(orgId, projectId || undefined) }} />
          <input className={styles.input} type="date" value={dateFrom} onChange={async (e) => { setDateFrom(e.target.value); await reload(orgId, projectId || undefined) }} />
          <input className={styles.input} type="date" value={dateTo} onChange={async (e) => { setDateTo(e.target.value); await reload(orgId, projectId || undefined) }} />
          <button
            className={`${styles.button} ${styles.resetBtn}`}
            title="مسح جميع الفلاتر"
            onClick={async () => {
              setSearch('')
              setDateFrom('')
              setDateTo('')
              setOnlyWithTx(false)
              setStatus('all')
              setOrgId('')
              setProjectId('')
              await reload('', undefined)
            }}
          >🔄</button>
          <label>
            <input type="checkbox" checked={onlyWithTx} onChange={async (e) => { setOnlyWithTx(e.target.checked); await reload(orgId, projectId || undefined) }} /> عناصر بها معاملات فقط
          </label>
          <select className={styles.select} value={status} onChange={async (e) => { const v = e.target.value as 'all'|'posted'|'unposted'; setStatus(v); await reload(orgId, projectId || undefined) }}>
            <option value="all">جميع الحالات</option>
            <option value="posted">مرحلة فقط</option>
            <option value="unposted">غير مرحلة فقط</option>
          </select>
          <ExportButtons data={exportData} config={{ title: `Work Item Usage${dateFrom || dateTo ? ` (${dateFrom || '...'} → ${dateTo || '...'})` : ''}${status !== 'all' ? (status === 'posted' ? ' — Posted' : ' — Unposted') : ''}`, rtlLayout: true, useArabicNumerals: true }} size="small" />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableWrap}>
          <ResizableTable
            columns={columns as any}
            data={tableData as any}
            isLoading={loading}
            emptyMessage="لا توجد بيانات"
            onColumnResize={() => {}}
            renderCell={(_value: any, column: any, row: any) => {
              if (column.key === 'code') {
                return (
                  <button
                    className="ultimate-btn ultimate-btn-edit"
                    title="عرض القيود"
                    onClick={() => {
                      const id = row.original?.work_item_id
                      if (id) {
                        try { window.open(`/transactions/all?workItemId=${id}`, '_blank', 'noopener'); } catch { window.location.href = `/transactions/all?workItemId=${id}` }
                      }
                    }}
                  >
                    <div className="btn-content"><span className="btn-text">{row.code}</span></div>
                  </button>
                )
              }
              return undefined
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default WorkItemUsagePage

