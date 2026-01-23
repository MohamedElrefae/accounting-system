import React, { useEffect, useMemo, useState } from 'react'
import styles from './WorkItems.module.css'
import { getActiveProjects, type Project } from '../../services/projects'
import { useToast } from '../../contexts/ToastContext'
import { useScope } from '../../contexts/ScopeContext'
import WorkItemsTree from '../../components/WorkItems/WorkItemsTree'
import type { WorkItemRow, WorkItemTreeNode } from '../../types/work-items'
import { listWorkItemsUnion, listWorkItemsAll, buildTreeFromUnion, createWorkItem, updateWorkItem, deleteWorkItem, toggleWorkItemActive, suggestWorkItemCode } from '../../services/work-items'
import * as XLSX from 'xlsx'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel'

const MAX_LEVEL = 5

const WorkItemsPage: React.FC = () => {
  const { showToast } = useToast()
  const { currentOrg, currentProject } = useScope()
  const [projects, setProjects] = useState<Project[]>([])
  const orgId = currentOrg?.id || ''
  const projectId = currentProject?.id || ''
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<WorkItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [treeCmd, setTreeCmd] = useState<{ action: 'expandAll' | 'collapseAll'; seq: number } | null>(null)
  const [showSegmentedCode, setShowSegmentedCode] = useState(false)
  const [moveTarget, setMoveTarget] = useState<WorkItemRow | null>(null)
  const [moveParentId, setMoveParentId] = useState<string | null>(null)
  const [moveProjectId, setMoveProjectId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [cloneFrom, setCloneFrom] = useState<WorkItemRow | null>(null)
  const [cloneProjectId, setCloneProjectId] = useState<string>('')
  const [cloneIncludeChildren, setCloneIncludeChildren] = useState<boolean>(false)
  const [cloneExecuting, setCloneExecuting] = useState<boolean>(false)
  const [cloneConflictMode, setCloneConflictMode] = useState<'overwrite_all'|'fill_missing'|'skip_existing'>('overwrite_all')
  const [clonePreview, setClonePreview] = useState<{
    create: string[];
    update: { code: string; fields?: string[] }[];
    skip: string[];
    parents: string[];
  } | null>(null)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkParentId, setBulkParentId] = useState<string | null>(null)
  const [bulkProjectId, setBulkProjectId] = useState<string | null>(null)
  // Bulk Clone state
  const [bulkCloneOpen, setBulkCloneOpen] = useState(false)
  const [bulkCloneProjectId, setBulkCloneProjectId] = useState<string>('')
  const [bulkCloneIncludeChildren, setBulkCloneIncludeChildren] = useState<boolean>(true)
  const [bulkCloneConflictMode, setBulkCloneConflictMode] = useState<'overwrite_all'|'fill_missing'|'skip_existing'>('overwrite_all')
  const [bulkCloneExecuting, setBulkCloneExecuting] = useState<boolean>(false)
  const [bulkClonePreview, setBulkClonePreview] = useState<{
    create: string[];
    update: { code: string; fields?: string[] }[];
    skip: string[];
    parents: string[];
    ignored: string[];
  } | null>(null)
  const [codeError, setCodeError] = useState<string>('')

  // Dialog state (drawer/panel)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [formOrgId, setFormOrgId] = useState<string>('')
  const [formProjectId, setFormProjectId] = useState<string>('')
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 120, y: 80 })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 720, height: 640 })
  const [panelMax, setPanelMax] = useState(false)
  const [panelDocked, setPanelDocked] = useState(false)
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right')
  const [form, setForm] = useState<{ code: string; name: string; name_ar: string; description: string; unit: string; is_active: boolean }>({
    code: '', name: '', name_ar: '', description: '', unit: '', is_active: true
  })
  const [codeTouched, setCodeTouched] = useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // Load projects for the current organization
    if (!orgId) {
      setLoading(false);
      return;
    }
    
    (async () => {
      setLoading(true)
      try {
        const projs = await getActiveProjects().catch(() => [])
        setProjects(projs)
      } finally {
        setLoading(false)
      }
    })()
  }, [orgId])

  useEffect(() => {
    // Load work items when organization or project changes
    if (!orgId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    (async () => {
      try {
        const list = (!projectId)
          ? await listWorkItemsAll(orgId, true)
          : await listWorkItemsUnion(orgId, projectId || null, true)
        setItems(list)
      } catch (e: unknown) {
        showToast((e as Error).message || 'Failed to load work items', { severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [orgId, projectId, showToast])

  const reload = async () => {
    setLoading(true)
    try {
      const chosenOrg = orgId
      const chosenProject = projectId
      const list = (!chosenProject)
        ? await listWorkItemsAll(chosenOrg, true)
        : await listWorkItemsUnion(chosenOrg, chosenProject || null, true)
      setItems(list)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to load work items', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(r => r.code.toLowerCase().includes(q) || (r.name_ar || r.name).toLowerCase().includes(q))
  }, [items, search])

  // Helper: make a safe code segment from a name (simple slug)
  const makeCodeSegment = (s: string) => {
    const base = (s || '').trim()
    if (!base) return ''
    // Replace non-alphanumeric with underscores, collapse repeats, trim underscores, uppercase
    return base
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
  }
  const suggestCode = (parentCode: string | null, name: string) => {
    const seg = makeCodeSegment(name)
    if (!seg) return parentCode || ''
    return parentCode ? `${parentCode}.${seg}` : seg
  }

  const openCreate = (parent?: WorkItemRow) => {
    setEditingId(null)
    setParentId(parent?.id || null)
    // Set form org and project based on parent or current selection
    if (parent) {
      // When adding sub-item, inherit parent's project scope
      setFormOrgId(currentOrg?.id || '')
      setFormProjectId(parent.project_id || '')
    } else {
      // When adding root item, use current project selection
      setFormOrgId(currentOrg?.id || '')
      setFormProjectId(currentProject?.id || '')
    }
    setForm({ code: '', name: '', name_ar: '', description: '', unit: '', is_active: true })
    setCodeTouched(false)
    setDialogOpen(true)
  }

  const collectDescendants = (nodes: WorkItemTreeNode[], rootId: string, out: Set<string>) => {
    for (const n of nodes) {
      if (n.parent_id === rootId) {
        out.add(n.id)
        collectDescendants(nodes, n.id, out)
      }
      if (n.children && n.children.length) {
        collectDescendants(n.children, rootId, out)
      }
    }
  }

  const buildParentOptions = (nodes: WorkItemTreeNode[], exclude?: Set<string>): SearchableSelectOption[] => {
    return (nodes || [])
      .filter(n => !(exclude && exclude.has(n.id)))
      .filter(n => (n.code.split('.').length) < MAX_LEVEL)
      .map(n => ({
        value: n.id,
        label: `${n.code} - ${n.name || n.name_ar || ''}`,
        searchText: `${n.code} ${n.name || ''} ${n.name_ar || ''}`.toLowerCase(),
        children: buildParentOptions(n.children || [], exclude)
      }))
  }

  const openEdit = (row: WorkItemRow) => {
    setEditingId(row.id)
    setParentId(row.parent_id)
    // Set form org and project based on current scope
    setFormOrgId(currentOrg?.id || '')
    setFormProjectId(currentProject?.id || '')
    setForm({
      code: row.code,
      name: row.name,
      name_ar: row.name_ar || '',
      description: row.description || '',
      unit: row.unit_of_measure || '',
      is_active: !!row.is_active
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formOrgId) { showToast('Select organization', { severity: 'warning' }); return }
    if (codeError) { showToast(codeError, { severity: 'warning' }); return }
    const depth = (form.code || '').split('.').filter(Boolean).length
    if (depth > MAX_LEVEL) { showToast(`الحد الأقصى للمستويات هو ${MAX_LEVEL}`, { severity: 'warning' }); return }
    try {
      if (editingId) {
        await updateWorkItem(editingId, {
          code: form.code,
          name: form.name,
          name_ar: form.name_ar || null,
          description: form.description || null,
          unit_of_measure: form.unit || null,
          is_active: form.is_active,
        })
        showToast('تم التحديث', { severity: 'success' })
        await reload()
      } else {
        // Enforce: child project must match parent's project (or both null)
        const parentScope = parentId ? (items.find(r => r.id === parentId)?.project_id ?? null) : null
        const effectiveProjectId = (parentScope !== null) ? parentScope : (formProjectId || null)
        await createWorkItem({
          org_id: formOrgId,
          project_id: effectiveProjectId,
          parent_id: parentId || null,
          code: form.code,
          name: form.name,
          name_ar: form.name_ar || null,
          description: form.description || null,
          unit_of_measure: form.unit || null,
          is_active: form.is_active,
        })
        showToast('تم الإنشاء', { severity: 'success' })
        await reload()
      }
      setDialogOpen(false)
    } catch (e: unknown) {
      showToast((e as Error).message || 'فشل الحفظ', { severity: 'error' })
    }
  }

  const handleToggleActive = async (row: WorkItemRow) => {
    try {
      await toggleWorkItemActive(row.id, !row.is_active, row.org_id, row.project_id)
      showToast(row.is_active ? 'تم التعطيل' : 'تم التفعيل', { severity: 'success' })
      await reload()
    } catch (e: unknown) {
      showToast((e as Error).message || 'فشل تغيير الحالة', { severity: 'error' })
    }
  }

  // Excel Template Download
  const handleDownloadTemplate = () => {
    const headers = [
      ['code', 'name', 'name_ar', 'unit_of_measure', 'description', 'is_active', 'project_code', 'position']
    ]
    const sample = [
      ['CIVIL', 'Civil', 'أعمال مدنية', '', '', true, '', 1],
      ['CIVIL.CONCRETE', 'Concrete Works', 'أعمال خرسانية', '', '', true, '', 2],
      ['CIVIL.CONCRETE.FOOTING', 'Footing', 'قواعد', 'm3', 'Footing concrete works', true, '', 1],
      ['SCAFF', 'Scaffolding', 'سقالات', 'm2', '', true, '', 2],
      ['CIVIL.CONCRETE.FOOTING', 'Footing (Override)', 'قواعد (مشروع)', 'm3', 'Override at project', true, 'GENERAL', 1]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet([...headers, ...sample])

    const readme = [
      ['Instructions'],
      ['- code: hierarchical path using dots, e.g., CIVIL.CONCRETE.FOOTING'],
      ['- parent is inferred from code (everything before last dot)'],
      ['- project_code: optional; leave empty for org-level, or use a valid project code (e.g., GENERAL) for project overrides'],
      ['- is_active: TRUE/FALSE'],
      ['- position: optional integer used for ordering siblings'],
      ['- name/name_ar/unit_of_measure/description: optional but recommended'],
      ['- Rows will be inserted or updated if code already exists in the selected scope']
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(readme)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'WorkItems')
    XLSX.utils.book_append_sheet(wb, ws2, 'README')
    XLSX.writeFile(wb, 'work_items_template.xlsx')
  }

  // Excel/CSV Import
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const ensureParentChain = async (
    org: string,
    projId: string | null,
    code: string,
    scopeMap: Map<string, string>
  ): Promise<string | null> => {
    const parts = code.split('.').filter(Boolean)
    if (parts.length > MAX_LEVEL) throw new Error(`Code depth exceeds ${MAX_LEVEL}`)
    if (!code.includes('.')) return null
    const parentCode = code.substring(0, code.lastIndexOf('.'))
    if (scopeMap.has(parentCode)) return scopeMap.get(parentCode) || null
    // Recursively ensure ancestors
    const parentParentId = await ensureParentChain(org, projId, parentCode, scopeMap)
    // Create minimal parent if missing
    const lastSeg = parentCode.split('.').pop() || parentCode
    const created = await createWorkItem({
      org_id: org,
      project_id: projId,
      parent_id: parentParentId,
      code: parentCode,
      name: lastSeg,
      name_ar: lastSeg,
      is_active: true,
      position: 0,
    })
    scopeMap.set(parentCode, created.id)
    return created.id
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const wsName = wb.SheetNames.includes('WorkItems') ? 'WorkItems' : wb.SheetNames[0]
      const ws = wb.Sheets[wsName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      if (!orgId) { showToast('اختر المؤسسة أولاً', { severity: 'warning' }); return }

      // Build project code->id map
      const projectCodeToId = new Map<string, string>()
      for (const p of projects) projectCodeToId.set((p.code || '').toUpperCase(), p.id)

      // Prepare code->id maps per scope (org-level null and per project)
      const orgScopeMap = new Map<string, string>()
      const projectScopeMaps = new Map<string, Map<string, string>>()

      // Preload existing for current org (org-level)
      const preloadOrg = items.filter(r => r.project_id === null)
      preloadOrg.forEach(r => orgScopeMap.set(r.code, r.id))
      // Preload existing for current project selection
      const allByProject = new Map<string, WorkItemRow[]>()
      for (const r of items) {
        if (r.project_id) {
          const list = allByProject.get(r.project_id) || []
          list.push(r)
          allByProject.set(r.project_id, list)
        }
      }
      for (const [pid, list] of allByProject.entries()) {
        const m = new Map<string, string>()
        list.forEach(r => m.set(r.code, r.id))
        projectScopeMaps.set(pid, m)
      }

      let inserted = 0, updated = 0, failed = 0

      for (const row of rows) {
        const rawCode = String(row.code || '').trim()
        const name = String(row.name || '').trim()
        const name_ar = String(row.name_ar || '').trim()
        const unit = String(row.unit_of_measure || '').trim()
        const desc = String(row.description || '').trim()
        const isActive = String(row.is_active || '').toLowerCase() === 'true' || row.is_active === true || row.is_active === 1
        const projectCode = String(row.project_code || '').trim().toUpperCase()
        const position = Number(row.position || 0) || 0

        if (!rawCode) { failed++; continue }
        const codeDepth = rawCode.split('.').filter(Boolean).length
        if (codeDepth > MAX_LEVEL) { failed++; continue }

        if (!rawCode) { failed++; continue }
        // Determine scope
        const scopeProjectId = projectCode
          ? (projectCodeToId.get(projectCode) || null)
          : (projectId || null)

        // Select scope map
        let scopeMap: Map<string, string>
        if (scopeProjectId) {
          scopeMap = projectScopeMaps.get(scopeProjectId) || new Map<string, string>()
          if (!projectScopeMaps.has(scopeProjectId)) projectScopeMaps.set(scopeProjectId, scopeMap)
        } else {
          scopeMap = orgScopeMap
        }

        try {
          // Ensure parent exists
          const parentId = await ensureParentChain(orgId, scopeProjectId, rawCode, scopeMap)
          // Check existing
          const existingId = scopeMap.get(rawCode)
          if (existingId) {
            await updateWorkItem(existingId, {
              name: name || rawCode.split('.').pop() || rawCode,
              name_ar: name_ar || null,
              unit_of_measure: unit || null,
              description: desc || null,
              is_active: isActive,
              position: position,
              parent_id: parentId ?? null,
            })
            updated++
          } else {
            const created = await createWorkItem({
              org_id: orgId,
              project_id: scopeProjectId,
              parent_id: parentId ?? null,
              code: rawCode,
              name: name || rawCode.split('.').pop() || rawCode,
              name_ar: name_ar || null,
              unit_of_measure: unit || null,
              description: desc || null,
              is_active: isActive,
              position: position,
            })
            scopeMap.set(rawCode, created.id)
            inserted++
          }
        } catch (err) {
          console.error('Import row failed:', row, err)
          failed++
        }
      }

      showToast(`تم الاستيراد: ${inserted} مضافة، ${updated} محدثة، ${failed} فاشلة`, { severity: failed ? 'warning' : 'success' })
      await reload()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'فشل استيراد الملف', { severity: 'error' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Export current items (org/project union) to Excel
  const handleExportExcel = () => {
    const projMap = new Map(projects.map(p => [p.id, p]))
    const rows = [
      ['code', 'name', 'name_ar', 'unit_of_measure', 'description', 'is_active', 'project_code', 'position'],
      ...items.map(r => [
        r.code,
        r.name || '',
        r.name_ar || '',
        r.unit_of_measure || '',
        r.description || '',
        r.is_active ? 'TRUE' : 'FALSE',
        r.project_id ? (projMap.get(r.project_id)?.code || '') : '',
        r.position ?? 0,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'WorkItems')
    const orgCode = currentOrg?.code || 'ORG'
    const projCode = currentProject?.code || 'CATALOG'
    XLSX.writeFile(wb, `work_items_export_${orgCode}_${projCode}.xlsx`)
  }

  // Export current items (org/project union) to CSV (round-trip)
  const handleExportCSV = () => {
    const projMap = new Map(projects.map(p => [p.id, p]))
    const rows = [
      ['code', 'name', 'name_ar', 'unit_of_measure', 'description', 'is_active', 'project_code', 'position'],
      ...items.map(r => [
        r.code,
        r.name || '',
        r.name_ar || '',
        r.unit_of_measure || '',
        r.description || '',
        r.is_active ? 'TRUE' : 'FALSE',
        r.project_id ? (projMap.get(r.project_id)?.code || '') : '',
        r.position ?? 0,
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'WorkItems')
    const orgCode = currentOrg?.code || 'ORG'
    const projCode = currentProject?.code || 'CATALOG'
    XLSX.writeFile(wb, `work_items_export_${orgCode}_${projCode}.csv`, { bookType: 'csv' })
  }

  const handleDelete = async (row: WorkItemRow) => {
    if (!confirm(`Delete ${row.code}?`)) return
    try {
      await deleteWorkItem(row.id, row.org_id, row.project_id)
      showToast('تم الحذف', { severity: 'success' })
      await reload()
    } catch (e: unknown) {
      showToast((e as Error).message || 'فشل الحذف', { severity: 'error' })
    }
  }

  // Show message if no organization is selected
  if (!currentOrg) {
    return (
      <div className={styles.container} dir="rtl">
        <div className={styles.header}>
          <div className={styles.title}>Work Items / عناصر الأعمال</div>
        </div>
        
        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>📋</div>
              <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>يرجى اختيار مؤسسة أولاً</h3>
              <p style={{ color: '#999' }}>اختر مؤسسة من شريط الأدوات العلوي لعرض عناصر الأعمال التابعة لها</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.title}>Work Items / عناصر الأعمال</div>
        <div className={styles.toolbar}>
          <div className="current-org-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            minWidth: '200px',
            textAlign: 'center',
            marginLeft: '8px'
          }}>
            {currentOrg ? `${currentOrg.code} - ${currentOrg.name}` : 'لم يتم تحديد مؤسسة'}
          </div>
          <div className="current-project-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            minWidth: '200px',
            textAlign: 'center',
            marginLeft: '8px'
          }}>
            {currentProject ? `${currentProject.code} - ${currentProject.name}` : 'بدون مشروع (كتالوج المؤسسة)'}
          </div>
          <input
            className={styles.input}
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={showSegmentedCode} onChange={(e) => setShowSegmentedCode(e.target.checked)} />
            عرض الكود كشارات
          </label>
          <button className={styles.button} title="توسيع الكل" onClick={() => setTreeCmd({ action: 'expandAll', seq: Date.now() })}>توسيع</button>
          <button className={styles.button} title="طيّ الكل" onClick={() => setTreeCmd({ action: 'collapseAll', seq: Date.now() })}>طيّ</button>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={bulkMode} onChange={(e) => { setBulkMode(e.target.checked); if (!e.target.checked) setSelectedIds(new Set()) }} />
            وضع الاختيار
          </label>
          {bulkMode && (
            <>
              <button className={styles.button} disabled={selectedIds.size === 0} onClick={() => { setBulkOpen(true); setBulkParentId(null); setBulkProjectId(projectId || null) }}>نقل جماعي</button>
              <button className={styles.button} disabled={selectedIds.size === 0} onClick={() => { setBulkCloneOpen(true); setBulkCloneProjectId(projectId || (projects[0]?.id || '')); setBulkCloneIncludeChildren(true); setBulkClonePreview(null) }}>نسخ جماعي</button>
              <button className={styles.button} onClick={() => setSelectedIds(new Set())}>مسح التحديد</button>
            </>
          )}
          <button className={styles.button} onClick={handleDownloadTemplate}>تنزيل نموذج Excel</button>
          <button className={styles.button} onClick={handleImportClick}>استيراد من Excel/CSV</button>
          <button className={styles.button} onClick={handleExportExcel}>تصدير Excel</button>
          <button className={styles.button} onClick={handleExportCSV}>تصدير CSV</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className={styles.hiddenInput} onChange={handleFileSelected} />
          <button className={styles.button} onClick={() => openCreate()}>جديد</button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.cardBody}>Loading...</div>
          ) : (
            <WorkItemsTree
              command={treeCmd || undefined}
              showSegmentedCode={showSegmentedCode}
              selectionEnabled={bulkMode}
              selectedIds={selectedIds}
              onToggleSelect={(id) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })}
              onMove={(node) => {
                const row = items.find(r => r.id === node.id) || null
                setMoveTarget(row)
                setMoveParentId(row?.parent_id || null)
                setMoveProjectId(row?.project_id || null)
                setMoveOpen(true)
              }}
              onClone={(node) => {
                const row = items.find(r => r.id === node.id) || null
                setCloneFrom(row)
                const defaultProj = projectId || (projects[0]?.id || '')
                setCloneProjectId(defaultProj)
                setCloneIncludeChildren(false)
                setCloneOpen(true)
              }}
              data={filtered.map(r => ({
                id: r.id,
                code: r.code,
                name_ar: r.name_ar || r.name,
                name: r.name,
                level: r.code.split('.').length,
                parent_id: r.parent_id,
                is_active: r.is_active,
                project_code: projects.find(p => p.id === (r.project_id || ''))?.code || null,
              }))}
              onEdit={(node) => {
                const row = items.find(r => r.id === node.id)
                if (row) openEdit(row)
              }}
              onAdd={(parent) => {
                const row = items.find(r => r.id === parent.id)
                openCreate(row || undefined)
              }}
              onToggleStatus={(node) => {
                const row = items.find(r => r.id === node.id)
                if (row) handleToggleActive(row)
              }}
              onDelete={(node) => {
                const row = items.find(r => r.id === node.id)
                if (row) handleDelete(row)
              }}
              canHaveChildren={(node) => {
                const id = node.id
                return items.some(r => r.parent_id === id) || (items.find(r => r.id === id)?.child_count ?? 0) > 0
              }}
              getChildrenCount={(node) => items.filter(r => r.parent_id === node.id).length}
              maxLevel={MAX_LEVEL}
            />
          )}
        </div>
      </div>

      <DraggableResizablePanel
        title={editingId ? 'تعديل عنصر العمل' : 'عنصر عمل جديد'}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        position={panelPosition}
        size={panelSize}
        onMove={setPanelPosition}
        onResize={setPanelSize}
        isMaximized={panelMax}
        onMaximize={() => setPanelMax(!panelMax)}
        isDocked={panelDocked}
        dockPosition={panelDockPos}
        onDock={(pos) => { setPanelDocked(true); setPanelDockPos(pos) }}
        onResetPosition={() => { setPanelPosition({ x: 120, y: 80 }); setPanelSize({ width: 720, height: 640 }); setPanelMax(false); setPanelDocked(false) }}
      >
        <div className={styles.controlsRow}>
          <label>Code</label>
          <input className={styles.input} value={form.code} onChange={(e) => {
            const val = e.target.value
            setCodeTouched(true)
            setForm({ ...form, code: val })
            const parentScope = parentId ? (items.find(x => x.id === parentId)?.project_id ?? null) : null
            const currentScope = editingId ? (items.find(x => x.id === editingId)?.project_id ?? null) : ((parentScope !== null) ? parentScope : (projectId || null))
            const depth = val.trim().split('.').filter(Boolean).length
            let err = ''
            if (depth > MAX_LEVEL) err = `لا يسمح بأكثر من ${MAX_LEVEL} مستويات`
            else {
              const duplicate = items.some(r => r.code.toLowerCase() === val.trim().toLowerCase() && (r.project_id || null) === (currentScope || null) && r.id !== editingId)
              if (duplicate) err = 'الكود موجود بالفعل في هذا النطاق'
            }
            setCodeError(err)
          }} />
        </div>
        {codeError && (<div className={styles.errorText}>{codeError}</div>)}
        <div className={styles.controlsRow}>
          <label>الأب</label>
          <SearchableSelect
            id="workitem-parent"
            value={parentId || ''}
            onChange={(val) => {
              const newParentId = val || null
              setParentId(newParentId)
              // If user hasn't edited code yet, auto-suggest code using parent prefix + name
              if (!codeTouched) {
                const parentCode = newParentId ? (items.find(r => r.id === newParentId)?.code || null) : null
                const leafName = form.name || form.name_ar || ''
                const scopeProjectId = newParentId ? (items.find(r => r.id === newParentId)?.project_id ?? null) : (projectId || null)
                ;(async () => {
                  const fromRpc = orgId ? await suggestWorkItemCode(orgId, newParentId, leafName, scopeProjectId) : ''
                  const fallback = suggestCode(parentCode, leafName)
                  const suggested = fromRpc || fallback
                  setForm(prev => ({ ...prev, code: suggested }))
                })()
              }
            }}
            options={(() => {
              const fullTree = buildTreeFromUnion(items)
              if (!editingId) return buildParentOptions(fullTree)
              const ex = new Set<string>([editingId])
              const desc = new Set<string>()
              collectDescendants(fullTree, editingId, desc)
              for (const d of desc) ex.add(d)
              return buildParentOptions(fullTree, ex)
            })()}
            placeholder="بدون أب (عنصر جذري)"
            clearable
            className={styles.input}
          />
        </div>
        <div className={styles.controlsRow}>
          <label>الاسم (AR)</label>
          <input className={styles.input} value={form.name_ar} onChange={(e) => {
            const val = e.target.value
            setForm({ ...form, name_ar: val })
            // If no English name and code not manually touched, try to suggest from Arabic too
            if (!codeTouched && !form.name) {
              const parentCode = parentId ? (items.find(r => r.id === parentId)?.code || null) : null
              const scopeProjectId = parentId ? (items.find(r => r.id === parentId)?.project_id ?? null) : (projectId || null)
              ;(async () => {
                const fromRpc = orgId ? await suggestWorkItemCode(orgId, parentId, val, scopeProjectId) : ''
                const fallback = suggestCode(parentCode, val)
                const suggested = fromRpc || fallback
                setForm(prev => ({ ...prev, code: suggested }))
              })()
            }
          }} />
        </div>
        <div className={styles.controlsRow}>
          <label>Name (EN)</label>
          <input className={styles.input} value={form.name} onChange={(e) => {
            const val = e.target.value
            // Update name
            // Also auto-suggest code if user hasn't touched it yet
            if (!codeTouched) {
              const parentCode = parentId ? (items.find(r => r.id === parentId)?.code || null) : null
              const scopeProjectId = parentId ? (items.find(r => r.id === parentId)?.project_id ?? null) : (projectId || null)
              ;(async () => {
                const fromRpc = orgId ? await suggestWorkItemCode(orgId, parentId, val, scopeProjectId) : ''
                const fallback = suggestCode(parentCode, val)
                const suggested = fromRpc || fallback
                setForm(prev => ({ ...prev, name: val, code: suggested }))
              })()
            } else {
              setForm(prev => ({ ...prev, name: val }))
            }
          }} />
        </div>
        <div className={styles.controlsRow}>
          <label>وحدة القياس</label>
          <input className={styles.input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className={styles.controlsRow}>
          <label>المؤسسة</label>
          <div className="current-org-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            width: '100%',
            textAlign: 'center'
          }}>
            {currentOrg ? `${currentOrg.code} - ${currentOrg.name}` : 'لم يتم تحديد مؤسسة'}
          </div>
        </div>
        <div className={styles.controlsRow}>
          <label>المشروع</label>
          <div className="current-project-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            width: '100%',
            textAlign: 'center'
          }}>
            {currentProject ? `${currentProject.code} - ${currentProject.name}` : 'مؤسسة (بدون مشروع)'}
          </div>
        </div>
        <div className={styles.controlsRow}>
          <label>نشط؟</label>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        </div>
        <div className={styles.controlsRow}>
          <button className={styles.button} onClick={handleSave}>حفظ</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} onClick={() => setDialogOpen(false)}>إلغاء</button>
        </div>
      </DraggableResizablePanel>

      {/* Single Move Panel */}
      <DraggableResizablePanel
        title={moveTarget ? `نقل: ${moveTarget.code}` : 'نقل'}
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        position={{ x: 160, y: 120 }}
        size={{ width: 560, height: 360 }}
        onMove={() => {}}
        onResize={() => {}}
        isMaximized={false}
        onMaximize={() => {}}
        isDocked={false}
        dockPosition={'right'}
        onDock={() => {}}
        onResetPosition={() => {}}
      >
        <div className={styles.controlsRow}>
          <label>الأب الجديد</label>
          <SearchableSelect
            id="workitem-move-parent"
            value={moveParentId || ''}
            onChange={(val) => setMoveParentId(val || null)}
            options={(() => {
              const full = buildTreeFromUnion(items)
              if (!moveTarget) return buildParentOptions(full)
              const ex = new Set<string>([moveTarget.id])
              const desc = new Set<string>()
              collectDescendants(full, moveTarget.id, desc)
              for (const d of desc) ex.add(d)
              return buildParentOptions(full, ex)
            })()}
            placeholder="بدون أب (عنصر جذري)"
            clearable
            className={styles.input}
          />
        </div>
        <div className={styles.controlsRow}>
          <label>النطاق</label>
          <select className={styles.select} value={moveProjectId || ''} onChange={(e) => setMoveProjectId(e.target.value || null)}>
            <option value="">مؤسسة</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
          </select>
        </div>
        <div className={styles.controlsRow}>
          <button className={styles.button} onClick={async () => {
            if (!moveTarget) return
            // Prevent circular move
            const full = buildTreeFromUnion(items)
            const ex = new Set<string>([moveTarget.id])
            const desc = new Set<string>()
            collectDescendants(full, moveTarget.id, desc)
            for (const d of desc) ex.add(d)
            if (moveParentId && ex.has(moveParentId)) { showToast('لا يمكن نقل عنصر تحت نسله الخاص', { severity: 'warning' }); return }
            try {
              // Enforce scope: if moving under a parent, use parent's project scope
              const parentScope = moveParentId ? (items.find(r => r.id === moveParentId)?.project_id ?? null) : (moveProjectId || null)
              await updateWorkItem(moveTarget.id, { parent_id: moveParentId || null, project_id: parentScope })
              showToast('تم النقل', { severity: 'success' })
              setMoveOpen(false)
              await reload(orgId, projectId || null)
            } catch (e: unknown) { showToast((e as Error).message || 'فشل النقل', { severity: 'error' }) }
          }}>تطبيق النقل</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} onClick={() => setMoveOpen(false)}>إلغاء</button>
        </div>
      </DraggableResizablePanel>

      {/* Clone Override Panel */}
      <DraggableResizablePanel
        title={cloneFrom ? `نسخ كـ مشروع: ${cloneFrom.code}` : 'نسخ كـ مشروع'}
        isOpen={cloneOpen}
        onClose={() => { setCloneOpen(false); setClonePreview(null) }}
        position={{ x: 220, y: 100 }}
        size={{ width: 540, height: 320 }}
        onMove={() => {}}
        onResize={() => {}}
        isMaximized={false}
        onMaximize={() => {}}
        isDocked={false}
        dockPosition={'right'}
        onDock={() => {}}
        onResetPosition={() => {}}
      >
        <div className={styles.controlsRow}>
          <label>المشروع الهدف</label>
          <select className={styles.select} value={cloneProjectId} onChange={(e) => { setCloneProjectId(e.target.value); setClonePreview(null) }} disabled={cloneExecuting}>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
          </select>
        </div>
        <div className={styles.controlsRow}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={cloneIncludeChildren} onChange={(e) => { setCloneIncludeChildren(e.target.checked); setClonePreview(null) }} disabled={cloneExecuting} />
            شمل الفروع (نسخ كامل الشجرة)
          </label>
        </div>
        <div className={styles.controlsRow}>
          <label>سياسة التعارض</label>
          <select className={styles.select} value={cloneConflictMode} onChange={(e) => { setCloneConflictMode(e.target.value as 'overwrite_all'|'fill_missing'|'skip_existing'); setClonePreview(null) }} disabled={cloneExecuting}>
            <option value="overwrite_all">استبدال الكل</option>
            <option value="fill_missing">إكمال الحقول الفارغة فقط</option>
            <option value="skip_existing">تخطي العناصر الموجودة</option>
          </select>
        </div>
        {clonePreview && (
          <div className={styles.cardBody}>
            <div>ملخص المعاينة:</div>
            <div>سيتم الإنشاء: {clonePreview.create.length}</div>
            <div>سيتم التحديث: {clonePreview.update.length}</div>
            <div>سيتم التخطي: {clonePreview.skip.length}</div>
            {!cloneIncludeChildren && clonePreview.parents.length > 0 && (
              <div>إنشاء آباء مفقودين: {clonePreview.parents.length}</div>
            )}
          </div>
        )}
        <div className={styles.controlsRow}>
          <button className={styles.button} disabled={cloneExecuting} onClick={async () => {
            if (!cloneFrom || !orgId || !cloneProjectId) { showToast('حدد المشروع', { severity: 'warning' }); return }
            try {
              // Preview only: compute without writing
              const targetItems = await listWorkItemsUnion(orgId, cloneProjectId, true)
              const targetByCode = new Map<string, WorkItemRow>(targetItems.filter(r => r.project_id === cloneProjectId).map(r => [r.code, r]))
              const toCreate: string[] = []
              const toUpdate: { code: string; fields?: string[] }[] = []
              const toSkip: string[] = []
              const parentsSet = new Set<string>()

              const candidates = cloneIncludeChildren
                ? items
                    .filter(r => (r.project_id === null) && (r.code === cloneFrom.code || r.code.startsWith(`${cloneFrom.code}.`)))
                    .sort((a, b) => a.code.length - b.code.length)
                : [cloneFrom]

              for (const src of candidates) {
                const existing = targetByCode.get(src.code)
                if (!existing) {
                  toCreate.push(src.code)
                } else {
                  if (cloneConflictMode === 'skip_existing') {
                    toSkip.push(src.code)
                  } else if (cloneConflictMode === 'fill_missing') {
                    const fields: string[] = []
                    if (!existing.name || existing.name.trim() === '') fields.push('name')
                    if (!existing.name_ar || existing.name_ar.trim() === '') fields.push('name_ar')
                    if (!(existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || String((existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || '').trim() === '') fields.push('unit_of_measure')
                    if (!existing.description || existing.description.trim() === '') fields.push('description')
                    if (fields.length > 0) toUpdate.push({ code: src.code, fields })
                    else toSkip.push(src.code)
                  } else {
                    toUpdate.push({ code: src.code })
                  }
                }
                if (!cloneIncludeChildren) {
                  // compute missing ancestor codes for single item
                  const parts = src.code.split('.')
                  for (let i = 1; i < parts.length; i++) {
                    const parentCode = parts.slice(0, i).join('.')
                    if (!targetByCode.has(parentCode)) parentsSet.add(parentCode)
                  }
                }
              }

              setClonePreview({ create: toCreate, update: toUpdate, skip: toSkip, parents: Array.from(parentsSet).filter(p => !toCreate.includes(p) && !toUpdate.some(u => u.code===p) && !toSkip.includes(p)).sort((a,b)=>a.length-b.length) })
            } catch (e: unknown) {
              showToast((e as Error).message || 'فشل المعاينة', { severity: 'error' })
            }
          }}>معاينة</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} disabled={cloneExecuting} onClick={async () => {
            if (!cloneFrom || !orgId || !cloneProjectId) { showToast('حدد المشروع', { severity: 'warning' }); return }
            let proceed = true
            if (clonePreview) {
              const created = clonePreview.create.length
              const updated = clonePreview.update.length
              const skipped = clonePreview.skip.length
              const parts: string[] = []
              if (created) parts.push(`إنشاء: ${created}`)
              if (updated) parts.push(`تحديث: ${updated}`)
              if (skipped) parts.push(`تخطي: ${skipped}`)
              proceed = window.confirm(`سيتم التنفيذ (${cloneConflictMode === 'overwrite_all' ? 'استبدال الكل' : cloneConflictMode === 'fill_missing' ? 'إكمال الفارغ' : 'تخطي الموجود'})\n${parts.join('، ') || 'لا تغييرات مرئية'}\nهل ترغب بالمتابعة؟`)
            } else if (cloneIncludeChildren || cloneConflictMode === 'overwrite_all') {
              const total = cloneIncludeChildren ? items.filter(r => (r.project_id === null) && (r.code === cloneFrom.code || r.code.startsWith(`${cloneFrom.code}.`))).length : 1
              proceed = window.confirm(`سيتم ${cloneIncludeChildren ? `نسخ الشجرة (${total} عنصر)` : 'نسخ عنصر واحد'} وقد يتم تحديث عناصر موجودة. هل تريد المتابعة؟`)
            }
            if (!proceed) return
            setCloneExecuting(true)
            try {
              // Fetch target project items to build an accurate map
              const targetItems = await listWorkItemsUnion(orgId, cloneProjectId, true)
              const targetByCode = new Map<string, WorkItemRow>(targetItems.filter(r => r.project_id === cloneProjectId).map(r => [r.code, r]))
              const scopeMap = new Map<string, string>(Array.from(targetByCode.entries()).map(([code, r]) => [code, r.id]))

              const applyOne = async (src: WorkItemRow) => {
                const parentId = await ensureParentChain(orgId, cloneProjectId, src.code, scopeMap)
                const existing = targetByCode.get(src.code)
                if (!existing) {
                  const created = await createWorkItem({
                    org_id: orgId,
                    project_id: cloneProjectId,
                    parent_id: parentId || null,
                    code: src.code,
                    name: src.name,
                    name_ar: src.name_ar || null,
                    description: src.description || null,
                    unit_of_measure: (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null,
                    is_active: src.is_active,
                  })
                  scopeMap.set(src.code, created.id)
                  targetByCode.set(src.code, created)
                  return 'created' as const
                }
                // Existing override - apply according to policy
                if (cloneConflictMode === 'skip_existing') {
                  return 'skipped' as const
                }
                if (cloneConflictMode === 'fill_missing') {
                  const upd: Partial<{ name: string; name_ar: string | null; unit_of_measure: string | null; description: string | null }> = {}
                  if (!existing.name || existing.name.trim() === '') upd.name = src.name
                  if (!existing.name_ar || existing.name_ar.trim() === '') upd.name_ar = src.name_ar || null
                  if (!(existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || String((existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || '').trim() === '') upd.unit_of_measure = (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null
                  if (!existing.description || existing.description.trim() === '') upd.description = src.description || null
                  // do not change is_active or parent_id in fill_missing mode
                  if (Object.keys(upd).length === 0) return 'skipped' as const
                  await updateWorkItem(existing.id, upd)
                  return 'updated' as const
                }
                // overwrite_all
                await updateWorkItem(existing.id, {
                  name: src.name,
                  name_ar: src.name_ar || null,
                  unit_of_measure: (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null,
                  description: src.description || null,
                  is_active: src.is_active,
                  parent_id: parentId || null,
                })
                return 'updated' as const
              }

              let created = 0, updated = 0, skipped = 0, failed = 0
              if (cloneIncludeChildren) {
                const prefix = `${cloneFrom.code}.`
                let candidates = items
                  .filter(r => (r.project_id === null) && (r.code === cloneFrom.code || r.code.startsWith(prefix)))
                  .sort((a, b) => a.code.length - b.code.length)
                candidates = candidates.filter(r => r.code.split('.').filter(Boolean).length <= MAX_LEVEL)
                for (const r of candidates) {
                  try {
                    const res = await applyOne(r)
                    if (res === 'created') created++
                    else if (res === 'updated') updated++
                    else if (res === 'skipped') skipped++
                  } catch {
                    failed++
                  }
                }
              } else {
                try {
                  const res = await applyOne(cloneFrom)
                  if (res === 'created') created++
                  else if (res === 'updated') updated++
                  else if (res === 'skipped') skipped++
                } catch {
                  failed++
                }
              }

              const parts: string[] = []
              if (created) parts.push(`${created} مضافة`)
              if (updated) parts.push(`${updated} محدثة`)
              if (skipped) parts.push(`${skipped} متخطية`)
              if (failed) parts.push(`فشل: ${failed}`)
              showToast(`تم النسخ: ${parts.join('، ') || 'لا تغييرات'}`, { severity: failed ? 'warning' : 'success' })

              setCloneOpen(false)
              setClonePreview(null)
              await reload(orgId, projectId || null)
            } catch (e: unknown) {
              showToast((e as Error).message || 'فشل النسخ', { severity: 'error' })
            } finally {
              setCloneExecuting(false)
            }
          }}>{cloneExecuting ? 'جارٍ التنفيذ…' : 'تنفيذ النسخ'}</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} disabled={cloneExecuting} onClick={() => { setCloneOpen(false); setClonePreview(null) }}>إلغاء</button>
        </div>
      </DraggableResizablePanel>

      {/* Bulk Clone Panel */}
      <DraggableResizablePanel
        title={`نسخ جماعي (${selectedIds.size})`}
        isOpen={bulkCloneOpen}
        onClose={() => { setBulkCloneOpen(false); setBulkClonePreview(null) }}
        position={{ x: 220, y: 160 }}
        size={{ width: 600, height: 420 }}
        onMove={() => {}}
        onResize={() => {}}
        isMaximized={false}
        onMaximize={() => {}}
        isDocked={false}
        dockPosition={'right'}
        onDock={() => {}}
        onResetPosition={() => {}}
      >
        <div className={styles.controlsRow}>
          <label>المشروع الهدف</label>
          <select className={styles.select} value={bulkCloneProjectId} onChange={(e) => { setBulkCloneProjectId(e.target.value); setBulkClonePreview(null) }} disabled={bulkCloneExecuting}>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
          </select>
        </div>
        <div className={styles.controlsRow}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={bulkCloneIncludeChildren} onChange={(e) => { setBulkCloneIncludeChildren(e.target.checked); setBulkClonePreview(null) }} disabled={bulkCloneExecuting} />
            شمل الفروع (نسخ كامل الشجرة)
          </label>
        </div>
        <div className={styles.controlsRow}>
          <label>سياسة التعارض</label>
          <select className={styles.select} value={bulkCloneConflictMode} onChange={(e) => { setBulkCloneConflictMode(e.target.value as 'overwrite_all'|'fill_missing'|'skip_existing'); setBulkClonePreview(null) }} disabled={bulkCloneExecuting}>
            <option value="overwrite_all">استبدال الكل</option>
            <option value="fill_missing">إكمال الحقول الفارغة فقط</option>
            <option value="skip_existing">تخطي العناصر الموجودة</option>
          </select>
        </div>
        {bulkClonePreview && (
          <div className={styles.cardBody}>
            <div>ملخص المعاينة:</div>
            <div>سيتم الإنشاء: {bulkClonePreview.create.length}</div>
            <div>سيتم التحديث: {bulkClonePreview.update.length}</div>
            <div>سيتم التخطي: {bulkClonePreview.skip.length}</div>
            {bulkClonePreview.ignored.length > 0 && (
              <div>متجاهل (ليس على مستوى المؤسسة): {bulkClonePreview.ignored.length}</div>
            )}
            {!bulkCloneIncludeChildren && bulkClonePreview.parents.length > 0 && (
              <div>إنشاء آباء مفقودين: {bulkClonePreview.parents.length}</div>
            )}
          </div>
        )}
        <div className={styles.controlsRow}>
          <button className={styles.button} disabled={bulkCloneExecuting} onClick={async () => {
            if (!orgId || !bulkCloneProjectId) { showToast('حدد المشروع', { severity: 'warning' }); return }
            try {
              const chosen = items.filter(r => selectedIds.has(r.id))
              const orgRoots = chosen.filter(r => r.project_id === null)
              const ignored = chosen.filter(r => r.project_id !== null).map(r => r.code)

              const targetItems = await listWorkItemsUnion(orgId, bulkCloneProjectId, true)
              const targetByCode = new Map<string, WorkItemRow>(targetItems.filter(r => r.project_id === bulkCloneProjectId).map(r => [r.code, r]))

              const candidateMap = new Map<string, WorkItemRow>()
              if (bulkCloneIncludeChildren) {
                for (const root of orgRoots) {
                  const prefix = `${root.code}.`
                  for (const src of items) {
                    if (src.project_id === null && (src.code === root.code || src.code.startsWith(prefix))) {
                      if (!candidateMap.has(src.code)) candidateMap.set(src.code, src)
                    }
                  }
                }
              } else {
                for (const root of orgRoots) candidateMap.set(root.code, root)
              }
              let candidates = Array.from(candidateMap.values()).sort((a, b) => a.code.length - b.code.length)
              candidates = candidates.filter(r => r.code.split('.').filter(Boolean).length <= MAX_LEVEL)

              const toCreate: string[] = []
              const toUpdate: { code: string; fields?: string[] }[] = []
              const toSkip: string[] = []
              const parentsSet = new Set<string>()

              for (const src of candidates) {
                const existing = targetByCode.get(src.code)
                if (!existing) {
                  toCreate.push(src.code)
                } else {
                  if (bulkCloneConflictMode === 'skip_existing') {
                    toSkip.push(src.code)
                  } else if (bulkCloneConflictMode === 'fill_missing') {
                    const fields: string[] = []
                    if (!existing.name || existing.name.trim() === '') fields.push('name')
                    if (!existing.name_ar || existing.name_ar.trim() === '') fields.push('name_ar')
                    if (!(existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || String((existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || '').trim() === '') fields.push('unit_of_measure')
                    if (!existing.description || existing.description.trim() === '') fields.push('description')
                    if (fields.length > 0) toUpdate.push({ code: src.code, fields })
                    else toSkip.push(src.code)
                  } else {
                    toUpdate.push({ code: src.code })
                  }
                }
              }

              if (!bulkCloneIncludeChildren) {
                for (const root of orgRoots) {
                  const parts = root.code.split('.')
                  for (let i = 1; i < parts.length; i++) {
                    const parentCode = parts.slice(0, i).join('.')
                    if (!targetByCode.has(parentCode)) parentsSet.add(parentCode)
                  }
                }
              }

              setBulkClonePreview({ create: toCreate, update: toUpdate, skip: toSkip, parents: Array.from(parentsSet).sort((a,b)=>a.length-b.length), ignored })
            } catch (e: unknown) {
              showToast((e as Error).message || 'فشل المعاينة', { severity: 'error' })
            }
          }}>معاينة</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} disabled={bulkCloneExecuting} onClick={async () => {
            if (!orgId || !bulkCloneProjectId) { showToast('حدد المشروع', { severity: 'warning' }); return }
            let proceed = true
            if (bulkClonePreview) {
              const created = bulkClonePreview.create.length
              const updated = bulkClonePreview.update.length
              const skipped = bulkClonePreview.skip.length
              const ignored = bulkClonePreview.ignored.length
              const parts: string[] = []
              if (created) parts.push(`إنشاء: ${created}`)
              if (updated) parts.push(`تحديث: ${updated}`)
              if (skipped) parts.push(`تخطي: ${skipped}`)
              if (ignored) parts.push(`متجاهل: ${ignored}`)
              proceed = window.confirm(`سيتم التنفيذ (${bulkCloneConflictMode === 'overwrite_all' ? 'استبدال الكل' : bulkCloneConflictMode === 'fill_missing' ? 'إكمال الفارغ' : 'تخطي الموجود'})\n${parts.join('، ') || 'لا تغييرات مرئية'}\nهل ترغب بالمتابعة؟`)
            } else {
              // Fallback quick estimation for confirm
              const chosen = items.filter(r => selectedIds.has(r.id))
              const orgRoots = chosen.filter(r => r.project_id === null)
              const candidateMap = new Map<string, WorkItemRow>()
              if (bulkCloneIncludeChildren) {
                for (const root of orgRoots) {
                  const prefix = `${root.code}.`
                  for (const src of items) {
                    if (src.project_id === null && (src.code === root.code || src.code.startsWith(prefix))) {
                      if (!candidateMap.has(src.code)) candidateMap.set(src.code, src)
                    }
                  }
                }
              } else {
                for (const root of orgRoots) candidateMap.set(root.code, root)
              }
              const total = candidateMap.size
              proceed = window.confirm(`سيتم ${bulkCloneIncludeChildren ? `نسخ أشجار متعددة (${total} عنصر)` : `نسخ ${total} عنصر`} وقد يتم تحديث عناصر موجودة. هل تريد المتابعة؟`)
            }
            if (!proceed) return
            setBulkCloneExecuting(true)
            try {
              const targetItems = await listWorkItemsUnion(orgId, bulkCloneProjectId, true)
              const targetByCode = new Map<string, WorkItemRow>(targetItems.filter(r => r.project_id === bulkCloneProjectId).map(r => [r.code, r]))
              const scopeMap = new Map<string, string>(Array.from(targetByCode.entries()).map(([code, r]) => [code, r.id]))

              const chosen = items.filter(r => selectedIds.has(r.id))
              const orgRoots = chosen.filter(r => r.project_id === null)
              const ignoredCount = chosen.length - orgRoots.length

              const candidateMap = new Map<string, WorkItemRow>()
              if (bulkCloneIncludeChildren) {
                for (const root of orgRoots) {
                  const prefix = `${root.code}.`
                  for (const src of items) {
                    if (src.project_id === null && (src.code === root.code || src.code.startsWith(prefix))) {
                      if (!candidateMap.has(src.code)) candidateMap.set(src.code, src)
                    }
                  }
                }
              } else {
                for (const root of orgRoots) candidateMap.set(root.code, root)
              }
              let candidates = Array.from(candidateMap.values()).sort((a, b) => a.code.length - b.code.length)
              candidates = candidates.filter(r => r.code.split('.').filter(Boolean).length <= MAX_LEVEL)

              const applyOne = async (src: WorkItemRow) => {
                const parentId = await ensureParentChain(orgId, bulkCloneProjectId, src.code, scopeMap)
                const existing = targetByCode.get(src.code)
                if (!existing) {
                  const created = await createWorkItem({
                    org_id: orgId,
                    project_id: bulkCloneProjectId,
                    parent_id: parentId || null,
                    code: src.code,
                    name: src.name,
                    name_ar: src.name_ar || null,
                    description: src.description || null,
                    unit_of_measure: (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null,
                    is_active: src.is_active,
                  })
                  scopeMap.set(src.code, created.id)
                  targetByCode.set(src.code, created)
                  return 'created' as const
                }
                if (bulkCloneConflictMode === 'skip_existing') {
                  return 'skipped' as const
                }
                if (bulkCloneConflictMode === 'fill_missing') {
                  const upd: Partial<{ name: string; name_ar: string | null; unit_of_measure: string | null; description: string | null }> = {}
                  if (!existing.name || existing.name.trim() === '') upd.name = src.name
                  if (!existing.name_ar || existing.name_ar.trim() === '') upd.name_ar = src.name_ar || null
                  if (!(existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || String((existing as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || '').trim() === '') upd.unit_of_measure = (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null
                  if (!existing.description || existing.description.trim() === '') upd.description = src.description || null
                  if (Object.keys(upd).length === 0) return 'skipped' as const
                  await updateWorkItem(existing.id, upd)
                  return 'updated' as const
                }
                await updateWorkItem(existing.id, {
                  name: src.name,
                  name_ar: src.name_ar || null,
                  unit_of_measure: (src as WorkItemRow & { unit_of_measure?: string }).unit_of_measure || null,
                  description: src.description || null,
                  is_active: src.is_active,
                  parent_id: parentId || null,
                })
                return 'updated' as const
              }

              let created = 0, updated = 0, skipped = 0, failed = 0
              for (const r of candidates) {
                try {
                  const res = await applyOne(r)
                  if (res === 'created') created++
                  else if (res === 'updated') updated++
                  else if (res === 'skipped') skipped++
                } catch {
                  failed++
                }
              }

              const parts: string[] = []
              if (created) parts.push(`${created} مضافة`)
              if (updated) parts.push(`${updated} محدثة`)
              if (skipped) parts.push(`${skipped} متخطية`)
              if (failed) parts.push(`فشل: ${failed}`)
              if (ignoredCount) parts.push(`متجاهل: ${ignoredCount}`)
              showToast(`تم النسخ: ${parts.join('، ') || 'لا تغييرات'}`, { severity: failed ? 'warning' : 'success' })

              setBulkCloneOpen(false)
              setBulkClonePreview(null)
              await reload(orgId, projectId || null)
            } catch (e: unknown) {
              showToast((e as Error).message || 'فشل النسخ', { severity: 'error' })
            } finally {
              setBulkCloneExecuting(false)
            }
          }}>{bulkCloneExecuting ? 'جارٍ التنفيذ…' : 'تنفيذ النسخ'}</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} disabled={bulkCloneExecuting} onClick={() => { setBulkCloneOpen(false); setBulkClonePreview(null) }}>إلغاء</button>
        </div>
      </DraggableResizablePanel>

      {/* Bulk Move Panel */}
      <DraggableResizablePanel
        title={`نقل جماعي (${selectedIds.size})`}
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        position={{ x: 200, y: 160 }}
        size={{ width: 580, height: 380 }}
        onMove={() => {}}
        onResize={() => {}}
        isMaximized={false}
        onMaximize={() => {}}
        isDocked={false}
        dockPosition={'right'}
        onDock={() => {}}
        onResetPosition={() => {}}
      >
        <div className={styles.controlsRow}>
          <label>الأب الجديد</label>
          <SearchableSelect
            id="workitem-bulk-parent"
            value={bulkParentId || ''}
            onChange={(val) => setBulkParentId(val || null)}
            options={(() => {
              const full = buildTreeFromUnion(items)
              const ex = new Set<string>()
              for (const id of Array.from(selectedIds)) {
                ex.add(id)
                const desc = new Set<string>()
                collectDescendants(full, id, desc)
                for (const d of desc) ex.add(d)
              }
              return buildParentOptions(full, ex)
            })()}
            placeholder="بدون أب (عنصر جذري)"
            clearable
            className={styles.input}
          />
        </div>
        <div className={styles.controlsRow}>
          <label>النطاق</label>
          <select className={styles.select} value={bulkProjectId || ''} onChange={(e) => setBulkProjectId(e.target.value || null)}>
            <option value="">مؤسسة</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
          </select>
        </div>
        <div className={styles.controlsRow}>
          <button className={styles.button} onClick={async () => {
            let moved = 0, failed = 0
            const full = buildTreeFromUnion(items)
            const invalid = new Set<string>()
            for (const id of Array.from(selectedIds)) {
              const ex = new Set<string>([id])
              const desc = new Set<string>()
              collectDescendants(full, id, desc)
              for (const d of desc) ex.add(d)
              if (bulkParentId && ex.has(bulkParentId)) { invalid.add(id); continue }
              try {
                const parentScope = bulkParentId ? (items.find(r => r.id === bulkParentId)?.project_id ?? null) : (bulkProjectId || null)
                await updateWorkItem(id, { parent_id: bulkParentId || null, project_id: parentScope })
                moved++
              } catch { failed++ }
            }
            if (invalid.size > 0) failed += invalid.size
            showToast(`تم النقل: ${moved}، فشل: ${failed}`,{ severity: failed? 'warning':'success' })
            setBulkOpen(false)
            setSelectedIds(new Set())
            await reload(orgId, projectId || null)
          }}>تطبيق النقل</button>
          <div className={styles.spacer}></div>
          <button className={styles.button} onClick={() => setBulkOpen(false)}>إلغاء</button>
        </div>
      </DraggableResizablePanel>
    </div>
  )
}

export default WorkItemsPage
