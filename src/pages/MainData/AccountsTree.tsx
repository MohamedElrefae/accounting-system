import React, { useEffect, useMemo, useState } from 'react';
import ExportButtons from '../../components/Common/ExportButtons';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import TreeView from '../../components/TreeView/TreeView';
import './AccountsTree.css';
import { supabase } from '../../utils/supabase';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl, Stack, CircularProgress } from '@mui/material';
import { useToast } from '../../contexts/ToastContext';

interface AccountItem {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  level: number;
  status: 'active' | 'inactive' | string;
  parent_id: string | null;
  account_type?: string; // optional for display only
  has_children?: boolean;
  has_active_children?: boolean;
}

interface AncestorItem {
  id: string;
  code: string;
  name: string;
  level: number;
  path_text: string;
}

function getOrgId(): string {
  try {
    const v = localStorage.getItem('org_id');
    if (v && v.length > 0) return v;
  } catch {}
  return '4cbba543-eb9c-4f32-9c77-155201f7e145';
}
const ORG_ID = getOrgId();

const AccountsTreePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'level'>('code');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<AncestorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<{ id: string; code: string; name: string; name_ar?: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [balanceMode, setBalanceMode] = useState<'posted' | 'all'>('posted');

  // Edit/Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'add'>('edit');
  const [draft, setDraft] = useState<Partial<AccountItem>>({});
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadRoots().catch(() => {});
    loadProjects().catch(() => {});
  }, []);

  useEffect(() => {
    // When project changes or search cleared, reload roots
    if (!searchTerm) {
      loadRoots().catch(() => {});
    } else {
      performSearch().catch(() => {});
    }
  }, [selectedProject]);

  useEffect(() => {
    // server-driven search
    if (!searchTerm) {
      loadRoots().catch(() => {});
    } else {
      performSearch().catch(() => {});
    }
  }, [searchTerm]);

  async function loadRoots() {
    setLoading(true);
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', ORG_ID)
      .is('parent_id', null)
      .order('code', { ascending: true });
    if (selectedProject) {
      query = query.eq('project_id', selectedProject);
    }
    const { data, error } = await query;
    if (!error) {
      setAccounts((data || []).map(mapRow));
      setExpanded(new Set());
    }
    setLoading(false);
  }

  async function loadChildren(parentId: string) {
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', ORG_ID)
      .eq('parent_id', parentId)
      .order('code', { ascending: true });
    if (selectedProject) query = query.eq('project_id', selectedProject);
    const { data, error } = await query;
    if (error) return [] as AccountItem[];
    return (data || []).map(mapRow);
  }

  function mapRow(row: any): AccountItem {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      name_ar: row.name_ar || row.name,
      level: row.level,
      status: row.status,
      parent_id: row.parent_id,
      account_type: row.category || undefined,
      has_children: row.has_children,
      has_active_children: row.has_active_children,
    };
  }

  async function ensureChildrenLoaded(node: AccountItem) {
    // Load children only if none are present yet in the flat list for this parent
    const alreadyHasAnyChild = accounts.some(a => a.parent_id === node.id);
    if (alreadyHasAnyChild) return;
    const children = await loadChildren(node.id);
    if (children.length > 0) {
      setAccounts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const merged = [...prev];
        for (const c of children) {
          if (!existingIds.has(c.id)) merged.push(c);
        }
        return merged;
      });
    }
  }

  async function toggleNode(node: AccountItem) {
    const newSet = new Set(expanded);
    if (newSet.has(node.id)) {
      newSet.delete(node.id);
      setExpanded(newSet);
      return;
    }
    // expand: fetch children and merge into state if not already present
    const children = await loadChildren(node.id);
    setAccounts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const merged = [...prev];
      for (const c of children) {
        if (!existingIds.has(c.id)) merged.push(c);
      }
      return merged;
    });
    newSet.add(node.id);
    setExpanded(newSet);
  }

  async function selectAccount(node: AccountItem) {
    setSelectedAccount(node);
    const { data, error } = await supabase.rpc('get_account_ancestors', {
      p_org_id: ORG_ID,
      p_account_id: node.id,
    });
    if (!error) setBreadcrumbs((data || []) as AncestorItem[]);
  }

  // Shared action handlers for both views (Tree and Table)
  const handleEdit = (node: AccountItem) => {
    setDialogMode('edit');
    setDraft({ ...node });
    setDialogOpen(true);
  };

  const handleAdd = async (parent: AccountItem) => {
    setDialogMode('add');
    setDraft({
      id: undefined,
      code: '',
      name: '',
      name_ar: '',
      level: Math.min((parent.level || 0) + 1, 4),
      status: 'active',
      parent_id: parent.id,
      account_type: ''
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (node: AccountItem) => {
    try {
      const { error } = await supabase.rpc('toggle_account_status', {
        p_org_id: ORG_ID,
        p_account_id: node.id,
      });
      if (error) throw error;
      setAccounts(prev => prev.map(a => a.id === node.id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a));
      showToast('تم تغيير الحالة بنجاح', { severity: 'success' });
    } catch (e) {
      console.error('toggle_account_status failed', e);
      showToast('فشل تغيير حالة الحساب', { severity: 'error' });
    }
  };

  const handleDelete = async (node: AccountItem) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${node.name_ar || node.name}"؟`)) return;
    try {
      const { error } = await supabase.rpc('account_delete', {
        p_org_id: ORG_ID,
        p_account_id: node.id,
      });
      if (error) throw error;
      setAccounts(prev => prev.filter(a => a.id !== node.id));
      showToast('تم حذف الحساب', { severity: 'success' });
    } catch (e) {
      console.error('account_delete failed', e);
      showToast('فشل حذف الحساب', { severity: 'error' });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (dialogMode === 'edit' && draft.id) {
        const { data, error } = await supabase.rpc('account_update', {
          p_org_id: ORG_ID,
          p_id: draft.id,
          p_code: draft.code,
          p_name: draft.name,
          p_name_ar: draft.name_ar,
          p_account_type: draft.account_type,
          p_level: draft.level,
          p_status: draft.status,
        });
        if (error) throw error;
        const updated = (data as any) || draft;
        setAccounts(prev => prev.map(a => (a.id === draft.id ? { ...a, ...updated } as AccountItem : a)));
        showToast('تم تحديث الحساب', { severity: 'success' });
      } else if (dialogMode === 'add') {
        const { data, error } = await supabase.rpc('account_insert_child', {
          p_org_id: ORG_ID,
          p_parent_id: draft.parent_id,
          p_code: draft.code,
          p_name: draft.name,
          p_name_ar: draft.name_ar,
          p_account_type: draft.account_type,
          p_level: draft.level,
          p_status: draft.status,
        });
        if (error) throw error;
        const inserted = (data as any);
        if (inserted) {
          setAccounts(prev => [...prev, inserted]);
          showToast('تم إضافة الحساب الفرعي', { severity: 'success' });
        } else {
          // Fallback optimistic append
          setAccounts(prev => [...prev, {
            id: `tmp-${Date.now()}`,
            code: String(draft.code || ''),
            name: String(draft.name || ''),
            name_ar: (draft.name_ar as string) || String(draft.name || ''),
            level: (draft.level as number) || 1,
            status: (draft.status as any) || 'active',
            parent_id: (draft.parent_id as string) || null,
            account_type: (draft.account_type as string) || undefined,
            has_children: false,
            has_active_children: false,
          }]);
        }
      }
    } catch (e) {
      console.error('save failed', e);
      showToast('فشل حفظ التغييرات', { severity: 'error' });
    } finally {
      setSaving(false);
    }
    setDialogOpen(false);
  };

  async function loadProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, code, name, name_ar')
      .eq('status', 'active')
      .order('code', { ascending: true });
    if (!error) setProjects(data || []);
  }

  function uniqueById(items: AccountItem[]): AccountItem[] {
    const map = new Map<string, AccountItem>();
    for (const it of items) map.set(it.id, it);
    return Array.from(map.values());
  }

  async function performSearch() {
    // Fetch matches by code/name/name_ar and include project filter
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', ORG_ID)
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,name_ar.ilike.%${searchTerm}%`)
      .order('path_text', { ascending: true })
      .limit(200);
    if (selectedProject) query = query.eq('project_id', selectedProject);
    const { data, error } = await query;
    if (error) return;
    const matches = (data || []).map(mapRow);

    // For each match, fetch ancestors for context
    const ancestorSets: AccountItem[][] = [];
    for (const m of matches) {
      const { data: anc, error: ancErr } = await supabase.rpc('get_account_ancestors', {
        p_org_id: ORG_ID,
        p_account_id: m.id,
      });
      if (!ancErr) {
        const rows = (anc || []) as AncestorItem[];
        // We need full items; refetch by ids in one go would be better, but keep simple
        // Merge using existing mapRow via another query on v_accounts_tree_ui filtered by ids
        const ids = rows.map(r => r.id);
        if (ids.length) {
          const { data: ancRows } = await supabase
            .from('v_accounts_tree_ui')
            .select('*')
            .in('id', ids);
          const mapped = (ancRows || []).map(mapRow);
          ancestorSets.push(mapped);
        }
      }
    }

    // Optionally load immediate children of matches for better context
    const childrenSets: AccountItem[][] = [];
    for (const m of matches) {
      const kids = await loadChildren(m.id);
      if (kids.length) childrenSets.push(kids);
    }

    const combined = uniqueById([
      ...matches,
      ...ancestorSets.flat(),
      ...childrenSets.flat(),
    ]);
    setAccounts(combined);

    // Expand all ancestor paths of matches
    const toExpand = new Set<string>();
    for (const m of matches) {
      const { data: anc } = await supabase.rpc('get_account_ancestors', {
        p_org_id: ORG_ID,
        p_account_id: m.id,
      });
      (anc || []).forEach((r: any) => toExpand.add(r.id));
    }
    setExpanded(toExpand);
  }

  const filteredAndSorted = useMemo(() => {
    let data = accounts.filter((acc) => {
      const nameDisp = (acc.name_ar || acc.name || '').toLowerCase();
      const matchesSearch =
        acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nameDisp.includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === '' || acc.level === levelFilter;
      return matchesSearch && matchesLevel;
    });

    data.sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code.localeCompare(b.code);
        case 'name':
          return (a.name_ar || a.name).localeCompare(b.name_ar || b.name);
        case 'level':
          return a.level - b.level;
      }
    });

    return data;
  }, [accounts, searchTerm, levelFilter, sortBy]);

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'text' },
      { key: 'name', header: 'الاسم', type: 'text' },
      { key: 'level', header: 'المستوى', type: 'number' },
      { key: 'status', header: 'الحالة', type: 'text' },
    ]);
    const rows = filteredAndSorted.map((r) => ({
      code: r.code,
      name: r.name_ar || r.name,
      level: r.level,
      status: r.status,
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
          <h1 className="page-title">شجرة الحسابات</h1>
        </div>
        <div className="page-actions">
          <button className="ultimate-btn ultimate-btn-add" title="إضافة حساب جديد">
            <div className="btn-content"><span className="btn-text">+ حساب</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير الحسابات', orientation: 'landscape', useArabicNumerals: true, rtlLayout: true }}
            size="small"
            layout="horizontal"
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div style={{ padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
{breadcrumbs.map((b, i) => (
              <span key={b.id} style={{ background: 'var(--chip-bg)', padding: '4px 8px', borderRadius: 8 }}>
                {b.code} - {b.name}
                {i < breadcrumbs.length - 1 ? ' / ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="controls-container">
        <div className="search-and-filters">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="البحث في الحسابات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="icon">🔍</span>
          </div>

          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value === '' ? '' : Number(e.target.value))} className="filter-select">
            <option value="">جميع المستويات</option>
            <option value="1">المستوى 1</option>
            <option value="2">المستوى 2</option>
            <option value="3">المستوى 3</option>
            <option value="4">المستوى 4</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="code">ترتيب حسب الكود</option>
            <option value="name">ترتيب حسب الاسم</option>
            <option value="level">ترتيب حسب المستوى</option>
          </select>

          {/* Project Filter */}
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="filter-select">
            <option value="">جميع المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name_ar || p.name}</option>
            ))}
          </select>

          {/* Balance Mode (reserved for future RPC usage) */}
          <select value={balanceMode} onChange={(e) => setBalanceMode(e.target.value as any)} className="filter-select">
            <option value="posted">المنشورة فقط</option>
            <option value="all">جميع العمليات</option>
          </select>
        </div>

        <div className="view-mode-toggle">
          <button className={`view-mode-btn ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>عرض شجرة</button>
          <button className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>عرض جدول</button>
        </div>
      </div>

      <div className="content-area">
        {viewMode === 'tree' ? (
          <TreeView
            data={filteredAndSorted.map(n => ({
              ...n,
              // TreeView expects name_ar field; ensure it exists
              name_ar: (n as any).name_ar || n.name,
              is_active: n.status === 'active',
            })) as any}
            onEdit={(node) => handleEdit(node as any)}
            onAdd={(parent) => handleAdd(parent as any)}
            onToggleStatus={(node) => handleToggleStatus(node as any)}
            onDelete={(node) => handleDelete(node as any)}
            onSelect={(node) => selectAccount(node as any)}
            onToggleExpand={async (node) => { await ensureChildrenLoaded(node as any); }}
            canHaveChildren={(node) => {
              const id = (node as any).id as string;
              const item = accounts.find(a => a.id === id);
              if (!item) return false;
              return !!(item.has_active_children || item.has_children);
            }}
            getChildrenCount={(node) => accounts.filter(a => a.parent_id === (node as any).id).length}
            maxLevel={4}
          />
        ) : (
          <div className="accounts-table-view">
            <table className="accounts-table">
              <colgroup>
                <col style={{ width: '120px' }} />
                <col />
                <col style={{ width: '160px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '450px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم الحساب</th>
                  <th>نوع الحساب</th>
                  <th>المستوى</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((item) => {
                  const canAddSub = item.level < 4;
                  const isActive = item.status === 'active';
                  return (
                    <tr key={item.id} data-inactive={!isActive}>
                      <td className="table-code-cell">{item.code}</td>
                      <td>{item.name_ar || item.name}</td>
                      <td className="table-center">{item.account_type || '—'}</td>
                      <td className="table-center">{item.level}</td>
                      <td>
                        <div className="tree-node-actions">
                          <button className="ultimate-btn ultimate-btn-edit" title="تعديل" onClick={() => handleEdit(item)}> 
                            <div className="btn-content"><span className="btn-text">تعديل</span></div>
                          </button>
                          {canAddSub && (
                            <button className="ultimate-btn ultimate-btn-add" title="إضافة فرعي" onClick={() => handleAdd(item)}>
                              <div className="btn-content"><span className="btn-text">إضافة فرعي</span></div>
                            </button>
                          )}
                          <button className={`ultimate-btn ${isActive ? 'ultimate-btn-disable' : 'ultimate-btn-enable'}`} title={isActive ? 'تعطيل' : 'تفعيل'} onClick={() => handleToggleStatus(item)}>
                            <div className="btn-content"><span className="btn-text">{isActive ? 'تعطيل' : 'تفعيل'}</span></div>
                          </button>
                          <button className="ultimate-btn ultimate-btn-delete" title="حذف" onClick={() => handleDelete(item)}>
                            <div className="btn-content"><span className="btn-text">حذف</span></div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogMode === 'edit' ? 'تعديل الحساب' : 'إضافة حساب فرعي'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="الكود" value={draft.code || ''} onChange={(e) => setDraft(d => ({ ...d, code: e.target.value }))} size="small" />
            <TextField label="الاسم" value={draft.name || ''} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} size="small" />
            <TextField label="الاسم العربي" value={draft.name_ar || ''} onChange={(e) => setDraft(d => ({ ...d, name_ar: e.target.value }))} size="small" />
            <FormControl size="small">
              <InputLabel id="type-label">نوع الحساب</InputLabel>
              <Select labelId="type-label" label="نوع الحساب" value={draft.account_type || ''} onChange={(e) => setDraft(d => ({ ...d, account_type: e.target.value as string }))}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="Asset">أصل</MenuItem>
                <MenuItem value="Liability">التزامات</MenuItem>
                <MenuItem value="Equity">حقوق ملكية</MenuItem>
                <MenuItem value="Revenue">إيراد</MenuItem>
                <MenuItem value="Expense">مصروف</MenuItem>
              </Select>
            </FormControl>
            <TextField type="number" label="المستوى" inputProps={{ min: 1, max: 4 }} value={draft.level ?? 1} onChange={(e) => setDraft(d => ({ ...d, level: Math.max(1, Math.min(4, Number(e.target.value))) }))} size="small" />
            <FormControlLabel control={<Switch checked={(draft.status || 'active') === 'active'} onChange={(e) => setDraft(d => ({ ...d, status: e.target.checked ? 'active' : 'inactive' }))} />} label="نشط" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>إلغاء</Button>
          <Button variant="contained" onClick={handleDialogSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AccountsTreePage;
