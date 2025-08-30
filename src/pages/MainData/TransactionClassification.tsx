import React, { useEffect, useMemo, useState } from 'react';
import ExportButtons from '../../components/Common/ExportButtons';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import './AccountsTree.css'; // Reuse the same CSS for consistency
import { useToast } from '../../contexts/ToastContext';
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../../components/Common/UnifiedCRUDForm';
import { createTransactionClassificationFormConfig } from '../../components/TransactionClassification/TransactionClassificationFormConfig';
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel';
import { getOrganizations } from '../../services/organization';
import {
  getTransactionClassifications,
  createTransactionClassification,
  updateTransactionClassification,
  deleteTransactionClassification,
  getNextTransactionClassificationCode,
} from '../../services/transaction-classification';

interface TransactionClassificationItem {
  id: string;
  code: number;
  name: string;
  post_to_costs: boolean;
  org_id: string;
  created_at: string;
  updated_at: string;
}

function getInitialOrgId(): string | '' {
  try {
    const v = localStorage.getItem('org_id');
    if (v && v.length > 0) return v;
  } catch {}
  return '';
}

const TransactionClassificationPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'name'>('code');
  const [classifications, setClassifications] = useState<TransactionClassificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Organizations selector
  const [organizations, setOrganizations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string>(getInitialOrgId());

  // Edit/Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'add'>('edit');
  const [draft, setDraft] = useState<Partial<TransactionClassificationItem>>({});
  const [saving, setSaving] = useState(false);

  // Draggable panel state for the unified form
  const [rememberPanel, setRememberPanel] = useState<boolean>(() => {
    try { 
      const v = localStorage.getItem('transactionClassificationPanelRemember'); 
      return v ? v === 'true' : true; 
    } catch { 
      return true; 
    }
  });

  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 940, height: 640 });
  const [panelMax, setPanelMax] = useState<boolean>(false);
  const [panelDocked, setPanelDocked] = useState<boolean>(false);
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right');

  const formRef = React.useRef<UnifiedCRUDFormHandle>(null);

  // Persist remember preference
  useEffect(() => {
    try { 
      localStorage.setItem('transactionClassificationPanelRemember', rememberPanel ? 'true' : 'false'); 
    } catch {}
  }, [rememberPanel]);

  // Persist panel state (per-mode) when open and remember is on
  useEffect(() => {
    if (!dialogOpen || !rememberPanel) return;
    const key = dialogMode === 'edit' ? 'transactionClassificationPanelState:edit' : 'transactionClassificationPanelState:add';
    const state = {
      position: panelPosition,
      size: panelSize,
      isMaximized: panelMax,
      isDocked: panelDocked,
      dockPosition: panelDockPos,
    };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [dialogOpen, rememberPanel, dialogMode, panelPosition, panelSize, panelMax, panelDocked, panelDockPos]);

  // Restore panel state when dialog opens (per-mode)
  useEffect(() => {
    if (!dialogOpen) return;
    const key = dialogMode === 'edit' ? 'transactionClassificationPanelState:edit' : 'transactionClassificationPanelState:add';
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const st = JSON.parse(raw);
      if (st?.position) setPanelPosition(st.position);
      if (st?.size) setPanelSize(st.size);
      if (typeof st?.isMaximized === 'boolean') setPanelMax(st.isMaximized);
      if (typeof st?.isDocked === 'boolean') setPanelDocked(st.isDocked);
      if (st?.dockPosition) setPanelDockPos(st.dockPosition);
    } catch {}
  }, [dialogOpen, dialogMode]);

  // Keyboard shortcuts: Esc to close, Ctrl/Cmd+Enter to save when dialog open
  useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDialogOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.submit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dialogOpen]);

  const unifiedConfig = useMemo(() => {
    const existing = (dialogMode === 'edit' && draft?.id)
      ? {
          id: draft.id as string,
          code: Number(draft.code || 0),
          name: String(draft.name || ''),
          post_to_costs: Boolean(draft.post_to_costs || false),
        }
      : undefined;
    return createTransactionClassificationFormConfig(dialogMode === 'edit', existing as any);
  }, [dialogMode, draft]);

  const { showToast } = useToast();

  useEffect(() => {
    // Load organizations first
    (async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs.map(o => ({ id: o.id, code: o.code, name: o.name })));
        if (!getInitialOrgId() && orgs.length > 0) {
          const first = orgs[0].id;
          setOrgId(first);
          try { localStorage.setItem('org_id', first); } catch {}
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    // When org changes, reload classifications
    if (!orgId) return;
    loadClassifications().catch(() => {});
  }, [orgId]);

  async function loadClassifications() {
    setLoading(true);
    if (!orgId) { 
      setLoading(false); 
      return; 
    }
    
    try {
      const data = await getTransactionClassifications(orgId);
      setClassifications(data as TransactionClassificationItem[]);
    } catch (error) {
      console.error('Failed to load transaction classifications:', error);
      showToast('فشل تحميل تصنيفات المعاملات', { severity: 'error' });
    }
    
    setLoading(false);
  }

  // Action handlers
  const handleEdit = (item: TransactionClassificationItem) => {
    setDialogMode('edit');
    setDraft({ ...item });
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    setDialogMode('add');
    setDraft({
      id: undefined,
      code: 0,
      name: '',
      post_to_costs: false,
      org_id: orgId
    });
    setDialogOpen(true);

    // Get next available code
    try {
      const nextCode = await getNextTransactionClassificationCode(orgId);
      setDraft(prev => ({ ...prev, code: nextCode }));
    } catch (error) {
      console.error('Failed to get next code:', error);
    }
  };

  const handleDelete = async (item: TransactionClassificationItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${item.name}"؟`)) return;
    
    try {
      await deleteTransactionClassification(item.id, orgId);
      setClassifications(prev => prev.filter(c => c.id !== item.id));
      showToast('تم حذف تصنيف المعاملة', { severity: 'success' });
    } catch (error: any) {
      const msg = error?.message || '';
      console.error('Delete failed:', error);
      showToast(`فشل حذف تصنيف المعاملة${msg ? `: ${msg}` : ''}`, { severity: 'error' });
    }
  };

  const filteredAndSorted = useMemo(() => {
    let data = classifications.filter((classification) => {
      const nameMatch = classification.name.toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = classification.code.toString().includes(searchTerm);
      return nameMatch || codeMatch;
    });

    data.sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code - b.code;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.code - b.code;
      }
    });

    return data;
  }, [classifications, searchTerm, sortBy]);

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'number' },
      { key: 'name', header: 'الاسم', type: 'text' },
      { key: 'post_to_costs', header: 'ترحيل للتكاليف', type: 'text' },
    ]);
    const rows = filteredAndSorted.map((r) => ({
      code: r.code,
      name: r.name,
      post_to_costs: r.post_to_costs ? 'نعم' : 'لا',
    }));
    return prepareTableData(columns, rows);
  }, [filteredAndSorted]);

  if (loading) {
    return (
      <div className="accounts-page" dir="rtl" style={{ padding: '2rem' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="accounts-page" dir="rtl">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">تصنيفات المعاملات</h1>
        </div>
        <div className="page-actions">
          <button className="ultimate-btn ultimate-btn-add" title="إضافة تصنيف جديد" onClick={handleAdd}>
            <div className="btn-content"><span className="btn-text">+ تصنيف</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير تصنيفات المعاملات', orientation: 'landscape', useArabicNumerals: true, rtlLayout: true }}
            size="small"
            layout="horizontal"
          />
        </div>
      </div>

      <div className="controls-container">
        <div className="search-and-filters">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="البحث في التصنيفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="icon">🔍</span>
          </div>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="code">ترتيب حسب الكود</option>
            <option value="name">ترتيب حسب الاسم</option>
          </select>
        </div>

        <div className="view-mode-toggle">
          {/* Organization selector */}
          <select value={orgId} onChange={(e) => { 
            setOrgId(e.target.value); 
            try { localStorage.setItem('org_id', e.target.value); } catch {} 
          }} className="filter-select">
            <option value="">اختر المؤسسة</option>
            {organizations.map(o => (
              <option key={o.id} value={o.id}>{o.code} - {o.name}</option>
            ))}
          </select>
          <button className={`view-mode-btn active`}>عرض جدول</button>
        </div>
      </div>

      <div className="content-area">
        <div className="accounts-table-view">
          <table className="accounts-table">
            <colgroup>
              <col style={{ width: '120px' }} />
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '450px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>الكود</th>
                <th>اسم التصنيف</th>
                <th>ترحيل للتكاليف</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((item) => (
                <tr key={item.id}>
                  <td className={`table-code-cell contrast-table-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>
                    {item.code}
                  </td>
                  <td>{item.name}</td>
                  <td className="table-center">
                    <span className={`status-badge ${item.post_to_costs ? 'status-active' : 'status-inactive'}`}>
                      {item.post_to_costs ? 'نعم' : 'لا'}
                    </span>
                  </td>
                  <td>
                    <div className="tree-node-actions">
                      <button 
                        className="ultimate-btn ultimate-btn-edit" 
                        title="تعديل" 
                        onClick={() => handleEdit(item)}
                      > 
                        <div className="btn-content"><span className="btn-text">تعديل</span></div>
                      </button>
                      <button
                        className="ultimate-btn ultimate-btn-delete"
                        title="حذف"
                        onClick={() => handleDelete(item)}
                      >
                        <div className="btn-content"><span className="btn-text">حذف</span></div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Edit/Add Form */}
      {dialogOpen && (
        <DraggableResizablePanel
          title={dialogMode === 'edit' ? 'تعديل تصنيف المعاملة' : 'إضافة تصنيف معاملة جديد'}
          subtitle={draft?.code ? `الكود: ${draft.code}` : undefined}
          headerGradient={'linear-gradient(90deg, #5b21b6, #8b5cf6, #06b6d4)'}
          headerActions={(
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontSize: 12, marginInlineEnd: 8 }}>
                <input type="checkbox" checked={rememberPanel} onChange={(e) => setRememberPanel(e.target.checked)} />
                تذكر التخطيط
              </label>
              <button className="ultimate-btn ultimate-btn-add" title="حفظ" onClick={() => formRef.current?.submit()}>
                <div className="btn-content"><span className="btn-text">حفظ</span></div>
              </button>
              <button className="ultimate-btn ultimate-btn-delete" title="إلغاء" onClick={() => {
                const dirty = formRef.current?.hasUnsavedChanges?.();
                if (dirty) {
                  const ok = window.confirm('لديك تغييرات غير محفوظة. هل تريد إغلاق النافذة دون حفظ؟');
                  if (!ok) return;
                }
                setDialogOpen(false);
              }}>
                <div className="btn-content"><span className="btn-text">إلغاء</span></div>
              </button>
            </>
          )}
          isOpen={dialogOpen}
          onClose={() => {
            const dirty = formRef.current?.hasUnsavedChanges?.();
            if (dirty) {
              const ok = window.confirm('لديك تغييرات غير محفوظة. هل تريد إغلاق النافذة دون حفظ؟');
              if (!ok) return;
            }
            setDialogOpen(false);
          }}
          position={panelPosition}
          size={panelSize}
          isMaximized={panelMax}
          isDocked={panelDocked}
          dockPosition={panelDockPos}
          onMove={setPanelPosition}
          onResize={setPanelSize}
          onMaximize={() => setPanelMax(m => !m)}
          onDock={(pos) => { setPanelDocked(true); setPanelDockPos(pos); }}
          onResetPosition={() => { setPanelDocked(false); setPanelMax(false); setPanelPosition({ x: 100, y: 100 }); setPanelSize({ width: 940, height: 640 }); }}
        >
          <div style={{ padding: '1rem' }}>
            <UnifiedCRUDForm
              ref={formRef}
              config={unifiedConfig}
              initialData={{
                code: Number(draft.code || 0),
                name: String(draft.name || ''),
                post_to_costs: Boolean(draft.post_to_costs || false),
              }}
              isLoading={saving}
              onSubmit={async (form) => {
                setSaving(true);
                try {
                  if (dialogMode === 'edit' && draft.id) {
                    // Update existing classification
                    const updated = await updateTransactionClassification(draft.id, orgId, {
                      code: Number(form.code),
                      name: String(form.name),
                      post_to_costs: Boolean(form.post_to_costs)
                    });
                    
                    setClassifications(prev => prev.map(c => 
                      c.id === draft.id ? { ...c, ...updated } : c
                    ));
                    
                    showToast('تم تحديث تصنيف المعاملة بنجاح', { severity: 'success' });
                  } else {
                    // Create new classification
                    const created = await createTransactionClassification(orgId, {
                      code: Number(form.code),
                      name: String(form.name),
                      post_to_costs: Boolean(form.post_to_costs)
                    });
                    
                    setClassifications(prev => [...prev, created as TransactionClassificationItem]);
                    showToast('تم إضافة تصنيف المعاملة', { severity: 'success' });
                  }
                  setDialogOpen(false);
                } catch (error: any) {
                  const msg = error?.message || '';
                  console.error('Save failed:', error);
                  showToast(`فشل حفظ التغييرات${msg ? `: ${msg}` : ''}`, { severity: 'error' });
                  throw error;
                } finally {
                  setSaving(false);
                }
              }}
              onCancel={() => {
                const dirty = formRef.current?.hasUnsavedChanges?.();
                if (dirty) {
                  const ok = window.confirm('لديك تغييرات غير محفوظة. هل تريد إلغاء دون حفظ؟');
                  if (!ok) return;
                }
                setDialogOpen(false);
              }}
              showAutoFillNotification
            />
          </div>
        </DraggableResizablePanel>
      )}
    </div>
  );
};

export default TransactionClassificationPage;
