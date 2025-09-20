import React, { useState, useCallback } from 'react'
import { ChevronRight, Edit2, Plus, Trash2, Play, Pause, Loader2, AlertCircle } from 'lucide-react'
import './WorkItemsTree.css'
import ui from '../Common/CommonUI.module.css'

export interface WorkItemsTreeNode {
  id: string
  code: string
  name_ar: string
  name?: string
  level: number
  parent_id?: string | null
  is_active: boolean
  project_code?: string | null
  children?: WorkItemsTreeNode[]
}

interface ButtonState { loading: boolean; success: boolean; error: boolean }

interface WorkItemsTreeProps {
  data: WorkItemsTreeNode[]
  highlightQuery?: string
  onEdit?: (node: WorkItemsTreeNode) => void
  onAdd?: (parent: WorkItemsTreeNode) => void
  onToggleStatus?: (node: WorkItemsTreeNode) => void
  onDelete?: (node: WorkItemsTreeNode) => void
  onSelect?: (node: WorkItemsTreeNode) => void
  onToggleExpand?: (node: WorkItemsTreeNode) => void | Promise<void>
  canHaveChildren?: (node: WorkItemsTreeNode) => boolean
  getChildrenCount?: (node: WorkItemsTreeNode) => number | null | undefined
  isDeleteDisabled?: (node: WorkItemsTreeNode) => boolean
  getDeleteDisabledReason?: (node: WorkItemsTreeNode) => string | undefined
  maxLevel?: number
  command?: { action: 'expandAll' | 'collapseAll'; seq: number }
  showSegmentedCode?: boolean
  onMove?: (node: WorkItemsTreeNode) => void
  onClone?: (node: WorkItemsTreeNode) => void
  selectionEnabled?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

const WorkItemsTree: React.FC<WorkItemsTreeProps> = ({
  data,
  highlightQuery,
  onEdit,
  onAdd,
  onToggleStatus,
  onDelete,
  onSelect,
  onToggleExpand,
  canHaveChildren,
  isDeleteDisabled,
  getDeleteDisabledReason,
  maxLevel = 5,
  command,
  showSegmentedCode = false,
  onMove,
  onClone,
  selectionEnabled = false,
  selectedIds,
  onToggleSelect,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const highlight = (text: string, q?: string): React.ReactNode => {
    if (!q) return text
    const query = q.trim()
    if (!query) return text
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'gi')
      const parts = text.split(re)
      const matches = text.match(re)
      const out: React.ReactNode[] = []
      for (let i = 0; i < parts.length; i++) {
        out.push(parts[i])
        if (matches && matches[i]) {
          out.push(<mark key={`m-${i}`} className="wit-highlight">{matches[i]}</mark>)
        }
      }
      return out
    } catch {
      return text
    }
  }
  const [buttonStates, setButtonStates] = useState<Record<string, ButtonState>>({})

  // External commands: expand/collapse all
  React.useEffect(() => {
    if (!command) return
    const allIds = new Set<string>()
    const collect = (nodes: WorkItemsTreeNode[]) => {
      for (const n of nodes) {
        allIds.add(n.id)
        if (n.children && n.children.length) collect(n.children)
      }
    }
    collect(data || [])
    if (command.action === 'expandAll') setExpanded(allIds)
    if (command.action === 'collapseAll') setExpanded(new Set())
  }, [command?.seq, command?.action, data])

  const toggleNode = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [])

  const state = (k: string): ButtonState => buttonStates[k] || { loading: false, success: false, error: false }

  const withState = async (k: string, fn: () => Promise<void> | void) => {
    try {
      setButtonStates(s => ({ ...s, [k]: { loading: true, success: false, error: false } }))
      await fn()
      setButtonStates(s => ({ ...s, [k]: { loading: false, success: true, error: false } }))
      setTimeout(() => setButtonStates(s => { const n={...s}; delete n[k]; return n }), 1200)
    } catch {
      setButtonStates(s => ({ ...s, [k]: { loading: false, success: false, error: true } }))
      setTimeout(() => setButtonStates(s => { const n={...s}; delete n[k]; return n }), 1200)
    }
  }

  const renderNode = (n: WorkItemsTreeNode, depth = 0): React.ReactNode => {
    const expandedNow = expanded.has(n.id)
    const hasChildren = !!(n.children && n.children.length)
    const mayHaveChildren = hasChildren || (canHaveChildren ? !!canHaveChildren(n) : false)
    const canAdd = n.level < maxLevel

    return (
      <div key={n.id} className="wit-node-wrap">
        <div className={`wit-node ${!n.is_active ? 'inactive' : ''}`}>
          <div className="wit-select">
            {selectionEnabled && (
              <input type="checkbox" checked={!!selectedIds?.has(n.id)} onChange={() => onToggleSelect && onToggleSelect(n.id)} />
            )}
          </div>
          <div
            className={`wit-expander ${expandedNow ? 'expanded' : ''} ${!mayHaveChildren ? 'no-children' : ''} depth-${depth}`}
            onClick={async () => { if (!mayHaveChildren) return; if (onToggleExpand) await onToggleExpand(n); toggleNode(n.id) }}
          >
            {mayHaveChildren && <ChevronRight className="exp-icon" size={16} />}
          </div>
          <div className={`wit-status ${n.is_active ? 'active' : 'inactive'}`} />
          <div className={`wit-code`}>
            {showSegmentedCode ? (
              n.code.split('.').map((seg, idx, arr) => (
                <React.Fragment key={idx}>
                  <span className="seg">{highlight(seg, (highlightQuery || ''))}</span>
                  {idx < arr.length - 1 && <span className="dot">.</span>}
                </React.Fragment>
              ))
            ) : (
              <>{highlight(n.code, highlightQuery)}</>
            )}
          </div>
          <div className={`wit-name ${onSelect ? 'clickable' : ''}`} onClick={() => onSelect && onSelect(n)}>
            {highlight(n.name_ar || n.name || '', highlightQuery)}
            {(n as any).is_selectable ? (
              <span className="wit-badge selectable badge-gap">قابل للاختيار</span>
            ) : null}
            {(n as any).base_unit_of_measure ? (
              <span className="wit-badge uom badge-gap-sm">UoM: {(n as any).base_unit_of_measure}</span>
            ) : null}
            {(() => {
              const specs = (n as any).specifications
              if (!specs) return null
              try {
                const obj = typeof specs === 'string' ? JSON.parse(specs) : specs
                const keys = Object.keys(obj || {})
                if (keys.length === 0) return null
                const preview = keys.slice(0, 3).map(k => `${k}: ${String(obj[k])}`).join(' • ')
                return <span className="wit-badge spec badge-gap-sm" title={preview}>المواصفات</span>
              } catch { return null }
            })()}
          </div>
          <div className="wit-scope">{n.project_code ? (<span className="wit-badge override">مشروع: {n.project_code}</span>) : (<span className="wit-badge catalog">مؤسسة</span>)}</div>
          <div className="wit-level"><span className={`level-badge ${ui.badgeLevel}`}>{n.level}</span></div>

          <div className="wit-actions">
            <button
              onClick={() => withState(`e-${n.id}`, async () => onEdit && onEdit(n))}
              className={`ultimate-btn ultimate-btn-edit ${state(`e-${n.id}`).loading ? 'loading' : ''}`}
              title="تعديل"
            >
              <div className="btn-content">
                <div className={`btn-icon ${state(`e-${n.id}`).loading ? 'spinning' : ''}`}>
                  {state(`e-${n.id}`).loading ? <Loader2 size={14} /> : state(`e-${n.id}`).error ? <AlertCircle size={14} /> : <Edit2 size={14} />}
                </div>
                <span className="btn-text">تعديل</span>
              </div>
            </button>

            {canAdd && (
              <button
                onClick={() => withState(`a-${n.id}`, async () => onAdd && onAdd(n))}
                className={`ultimate-btn ultimate-btn-add ${state(`a-${n.id}`).loading ? 'loading' : ''}`}
                title="إضافة فرعي"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${state(`a-${n.id}`).loading ? 'spinning' : ''}`}>
                    {state(`a-${n.id}`).loading ? <Loader2 size={14} /> : <Plus size={14} />}
                  </div>
                  <span className="btn-text">إضافة فرعي</span>
                </div>
              </button>
            )}

            <button
              onClick={() => withState(`t-${n.id}`, async () => onToggleStatus && onToggleStatus(n))}
              className={`ultimate-btn ${n.is_active ? 'ultimate-btn-disable' : 'ultimate-btn-enable'} ${state(`t-${n.id}`).loading ? 'loading' : ''}`}
              title={n.is_active ? 'تعطيل' : 'تفعيل'}
            >
              <div className="btn-content">
                <div className={`btn-icon ${state(`t-${n.id}`).loading ? 'spinning' : ''}`}>
                  {state(`t-${n.id}`).loading ? <Loader2 size={14} /> : n.is_active ? <Pause size={14} /> : <Play size={14} />}
                </div>
                <span className="btn-text">{n.is_active ? 'تعطيل' : 'تفعيل'}</span>
              </div>
            </button>

            {onClone && !n.project_code && (
              <button
                onClick={() => withState(`c-${n.id}`, async () => onClone && onClone(n))}
                className={`ultimate-btn ultimate-btn-primary ${state(`c-${n.id}`).loading ? 'loading' : ''}`}
                title="نسخ لمشروع"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${state(`c-${n.id}`).loading ? 'spinning' : ''}`}>
                    {state(`c-${n.id}`).loading ? <Loader2 size={14} /> : <Edit2 size={14} />}
                  </div>
                  <span className="btn-text">نسخ لمشروع</span>
                </div>
              </button>
            )}

            {onMove && (
              <button
                onClick={() => withState(`m-${n.id}`, async () => onMove && onMove(n))}
                className={`ultimate-btn ultimate-btn-neutral ${state(`m-${n.id}`).loading ? 'loading' : ''}`}
                title="نقل إلى أب آخر"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${state(`m-${n.id}`).loading ? 'spinning' : ''}`}>
                    {state(`m-${n.id}`).loading ? <Loader2 size={14} /> : <Edit2 size={14} />}
                  </div>
                  <span className="btn-text">نقل</span>
                </div>
              </button>
            )}

            <button
              onClick={() => withState(`d-${n.id}`, async () => { if (window.confirm(`حذف "${n.name_ar || n.name}"؟`)) onDelete?.(n) })}
              className={`ultimate-btn ultimate-btn-delete ${state(`d-${n.id}`).loading ? 'loading' : ''}`}
              disabled={state(`d-${n.id}`).loading || (isDeleteDisabled ? isDeleteDisabled(n) : hasChildren)}
              title={getDeleteDisabledReason ? (getDeleteDisabledReason(n) || 'حذف') : (hasChildren ? 'لا يمكن الحذف مع وجود فروع' : 'حذف')}
            >
              <div className="btn-content">
                <div className={`btn-icon ${state(`d-${n.id}`).loading ? 'spinning' : ''}`}>
                  {state(`d-${n.id}`).loading ? <Loader2 size={14} /> : <Trash2 size={14} />}
                </div>
                <span className="btn-text">حذف</span>
              </div>
            </button>
          </div>
        </div>
        {expandedNow && hasChildren && (
          <div className="wit-children">
            {n.children!.map(c => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const buildTree = (items: WorkItemsTreeNode[]): WorkItemsTreeNode[] => {
    const map = new Map<string, WorkItemsTreeNode>()
    const roots: WorkItemsTreeNode[] = []
    items.forEach(it => map.set(it.id, { ...it, children: [] }))
    items.forEach(it => {
      const node = map.get(it.id)!
      if (it.parent_id && map.has(it.parent_id)) map.get(it.parent_id)!.children!.push(node)
      else roots.push(node)
    })
    return roots
  }

  const treeData = buildTree(data)

  return (
    <div className="wit-container">
      <div className="wit-header-row">
        <div className="wit-select" />
        <div className="wit-expander" />
        <div className="wit-status" />
        <div className="wit-code"><span className="header-text">الكود</span></div>
        <div className="wit-name"><span className="header-text">الاسم</span></div>
        <div className="wit-scope"><span className="header-text">النطاق</span></div>
        <div className="wit-level"><span className="header-text">المستوى</span></div>
        <div className="wit-actions"><span className="header-text">الإجراءات</span></div>
      </div>
      {treeData.map(n => renderNode(n))}
    </div>
  )
}

export default WorkItemsTree

