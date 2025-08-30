import React, { useEffect, useMemo, useState } from 'react';
import ExportButtons from '../../components/Common/ExportButtons';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import TreeView from '../../components/TreeView/TreeView';
import './AccountsTree.css';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../contexts/ToastContext';
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../../components/Common/UnifiedCRUDForm';
import { createAccountFormConfig } from '../../components/Accounts/AccountFormConfig';
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel';
import { getOrganizations } from '../../services/organization';
import { useHasPermission } from '../../hooks/useHasPermission';

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

function getInitialOrgId(): string | '' {
  try {
    const v = localStorage.getItem('org_id');
    if (v && v.length > 0) return v;
  } catch {}
  return '';
}

// Enum mapping functions to convert frontend values to database enum types
function mapAccountTypeToDbEnum(frontendType: string): string {
  const mapping: { [key: string]: string } = {
    'assets': 'asset',
    'liabilities': 'liability', 
    'equity': 'equity',
    'revenue': 'revenue',
    'expenses': 'expense'
  };
  return mapping[frontendType] || frontendType;
}

function mapStatusToDbEnum(isActive: boolean): string {
  return isActive ? 'active' : 'inactive';
}

const AccountsTreePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'level'>('code');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState<AncestorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<{ id: string; code: string; name: string; name_ar?: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [balanceMode, setBalanceMode] = useState<'posted' | 'all'>('posted');

  // Organizations selector
  const [organizations, setOrganizations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string>(getInitialOrgId());

  // Edit/Add dialog state (must be before unifiedConfig)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'add'>('edit');
  const [draft, setDraft] = useState<Partial<AccountItem>>({});
  const [saving, setSaving] = useState(false);

  // Draggable panel state for the unified form
  // Remember preference
  const [rememberPanel, setRememberPanel] = useState<boolean>(() => {
    try { const v = localStorage.getItem('accountsTreePanelRemember'); return v ? v === 'true' : true; } catch { return true; }
  });

  // Defaults; actual restore happens when dialog opens (per-mode)
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 940, height: 640 });
  const [panelMax, setPanelMax] = useState<boolean>(false);
  const [panelDocked, setPanelDocked] = useState<boolean>(false);
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right');

  // Parent accounts list for unified form config
  const parentAccountsLite = useMemo(() => {
    return accounts.map(a => ({
      id: a.id,
      code: a.code,
      name_ar: a.name_ar || a.name,
      name_en: a.name,
      level: a.level,
      account_type: (a.account_type || '') as string,
      statement_type: '',
      parent_id: a.parent_id,
      is_active: a.status === 'active',
      allow_transactions: a.level >= 3,
    }));
  }, [accounts]);

  const formRef = React.useRef<UnifiedCRUDFormHandle>(null);

  // Persist remember preference
  useEffect(() => {
    try { localStorage.setItem('accountsTreePanelRemember', rememberPanel ? 'true' : 'false'); } catch {}
  }, [rememberPanel]);

  // Persist panel state (per-mode) when open and remember is on
  useEffect(() => {
    if (!dialogOpen || !rememberPanel) return;
    const key = dialogMode === 'edit' ? 'accountsTreePanelState:edit' : 'accountsTreePanelState:add';
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
    const key = dialogMode === 'edit' ? 'accountsTreePanelState:edit' : 'accountsTreePanelState:add';
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

  const hasPermission = useHasPermission();
  const hasAccountsUpdate = hasPermission('accounts.update');

  const unifiedConfig = useMemo(() => {
    const existing = (dialogMode === 'edit' && draft?.id)
      ? {
          id: draft.id as string,
          code: String(draft.code || ''),
          name_ar: String(draft.name_ar || draft.name || ''),
          name_en: draft.name || '',
          level: Number(draft.level || 1),
          account_type: String(draft.account_type || ''),
          statement_type: '',
          parent_id: (draft.parent_id as string) || null,
          is_active: (draft.status || 'active') === 'active',
          allow_transactions: (typeof (draft as any).allow_transactions === 'boolean')
            ? (draft as any).allow_transactions
            : (((draft.level as number) || 1) >= 3),
        }
      : undefined;
    return createAccountFormConfig(dialogMode === 'edit', parentAccountsLite, existing as any, true, !!hasAccountsUpdate);
  }, [dialogMode, draft, parentAccountsLite, hasAccountsUpdate]);

  const { showToast } = useToast();

  // Cache for delete-eligibility info to reduce RPC traffic
  const [deleteFlags, setDeleteFlags] = useState<Record<string, { has_transactions: boolean; is_standard: boolean }>>({});

  async function fetchCanDeleteFlags(accountIds: string[]) {
    if (!orgId || accountIds.length === 0) return;
    // Filter out ids we already have
    const pending = accountIds.filter(id => !deleteFlags[id]);
    if (pending.length === 0) return;

    const updates: Record<string, { has_transactions: boolean; is_standard: boolean }> = {};

    // Process in small parallel batches to reduce latency but avoid hammering the backend
    const BATCH_SIZE = 6;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const slice = pending.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(slice.map(async (id) => {
        try {
          const { data, error } = await supabase.rpc('can_delete_account', {
            p_org_id: orgId,
            p_account_id: id,
          });
          if (!error && Array.isArray(data) && data.length > 0) {
            const row = data[0] as any;
            return [id, { has_transactions: !!row.has_transactions, is_standard: !!row.is_standard }] as const;
          }
        } catch {}
        return [id, null] as const;
      }));

      for (const [id, val] of results) {
        if (val) updates[id] = val;
      }
    }

    if (Object.keys(updates).length) {
      setDeleteFlags(prev => ({ ...prev, ...updates }));
      // Also merge onto accounts so UI logic sees them immediately
      setAccounts(prev => prev.map(a => updates[a.id] ? { ...(a as any), ...updates[a.id] } : a));
    }
  }

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
    loadProjects().catch(() => {});
  }, []);

  useEffect(() => {
    // When org or project changes or search cleared, reload roots
    if (!orgId) return;
    if (!searchTerm) {
      loadRoots().catch(() => {});
    } else {
      performSearch().catch(() => {});
    }
  }, [orgId, selectedProject]);

  useEffect(() => {
    // server-driven search
    if (!orgId) return;
    if (!searchTerm) {
      loadRoots().catch(() => {});
    } else {
      performSearch().catch(() => {});
    }
  }, [searchTerm, orgId]);

  async function loadRoots() {
    setLoading(true);
    if (!orgId) { setLoading(false); return; }
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', orgId)
      .is('parent_id', null)
      .order('code', { ascending: true });
    if (selectedProject) {
      query = query.eq('project_id', selectedProject);
    }
    const { data, error } = await query;
    if (!error) {
      const rows = (data || []).map(mapRow);
      setAccounts(rows);
      setExpanded(new Set());
      // Hydrate delete flags for visible roots
      fetchCanDeleteFlags(rows.map(r => r.id)).catch(() => {});
    }
    setLoading(false);
  }

  async function loadChildren(parentId: string) {
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', orgId)
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
    // Hydrate delete flags for loaded children
    fetchCanDeleteFlags(children.map(c => c.id)).catch(() => {});
    newSet.add(node.id);
    setExpanded(newSet);
  }

  async function handleSelectAccount(node: AccountItem) {
      const { data, error } = await supabase.rpc('get_account_ancestors', {
        p_org_id: orgId,
      p_account_id: node.id,
    });
    if (!error) setBreadcrumbs((data || []) as AncestorItem[]);
  }

  // Shared action handlers for both views (Tree and Table)
  const handleEdit = async (node: AccountItem) => {
    setDialogMode('edit');
    // fetch freshest allow_transactions from accounts table
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, allow_transactions')
        .eq('id', node.id)
        .single();
      const allow = !error && data ? !!(data as any).allow_transactions : undefined;
      setDraft({ ...node, ...(allow !== undefined ? { allow_transactions: allow } : {}) });
    } catch {
      setDraft({ ...node });
    }
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
      account_type: parent.account_type || ''
    });
    setDialogOpen(true);

    // Ask server for a unique next code suggestion (respects org-wide uniqueness)
    try {
      const { data, error } = await supabase.rpc('get_next_account_code', {
        p_org_id: orgId,
        p_parent_code: parent.code,
        p_style: 'auto'
      });
      if (!error && data) {
        setDraft(prev => ({ ...prev, code: String(data) }));
      }
    } catch {
      // Non-fatal: fall back to local suggestion inside the form
    }
  };

  const handleToggleStatus = async (node: AccountItem) => {
    try {
      const { error } = await supabase.rpc('toggle_account_status', {
        p_org_id: orgId,
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
        p_org_id: orgId,
        p_account_id: node.id,
      });
      if (error) throw error;
      // account_delete returns void; if it didn't throw, consider it success
      setAccounts(prev => prev.filter(a => a.id !== node.id));
      showToast('تم حذف الحساب', { severity: 'success' });
    } catch (e: any) {
      const msg = e?.message || e?.error_description || e?.hint || e?.details || '';
      console.error('account_delete failed', e, msg);
      // Provide more helpful messages for common scenarios
      const friendly =
        msg?.toLowerCase().includes('children') ? 'لا يمكن حذف الحساب لوجود حسابات فرعية.' :
        (msg?.toLowerCase().includes('foreign key') || msg?.toLowerCase().includes('related') || msg?.toLowerCase().includes('referenced')) ? 'لا يمكن حذف الحساب لوجود حركات أو بيانات مرتبطة.' :
        '';
      showToast(`فشل حذف الحساب${friendly ? `: ${friendly}` : (msg ? `: ${msg}` : '')}`, { severity: 'error' });
    }
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
      .eq('org_id', orgId)
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
        p_org_id: orgId,
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

    // Hydrate delete flags for the combined visible list
    fetchCanDeleteFlags(combined.map(c => c.id)).catch(() => {});

    // Expand all ancestor paths of matches
    const toExpand = new Set<string>();
    for (const m of matches) {
      const { data: anc } = await supabase.rpc('get_account_ancestors', {
        p_org_id: orgId,
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
          {/* Organization selector */}
          <select value={orgId} onChange={(e) => { setOrgId(e.target.value); try { localStorage.setItem('org_id', e.target.value); } catch {} }} className="filter-select">
            <option value="">اختر المؤسسة</option>
            {organizations.map(o => (
              <option key={o.id} value={o.id}>{o.code} - {o.name}</option>
            ))}
          </select>
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
            onSelect={(node) => handleSelectAccount(node as any)}
            onToggleExpand={async (node) => { toggleNode(node as any); }}
            canHaveChildren={(node) => {
              const id = (node as any).id as string;
              const item = accounts.find(a => a.id === id);
              if (!item) return false;
              return !!(item.has_active_children || item.has_children);
            }}
            getChildrenCount={(node) => accounts.filter(a => a.parent_id === (node as any).id).length}
            isDeleteDisabled={(node) => {
              const id = (node as any).id as string;
              const item = accounts.find(a => a.id === id);
              if (!item) return true;
              // Disable if parent (has children) – immediate and cheap
              if (item.has_children || item.has_active_children) return true;
              // Optional: disable if we already know it has transactions or is standard (cached on item via any extensions)
              const anyFlags = (item as any);
              if (anyFlags?.has_transactions === true) return true;
              if (anyFlags?.is_standard === true) return true;
              return false;
            }}
            getDeleteDisabledReason={(node) => {
              const id = (node as any).id as string;
              const item = accounts.find(a => a.id === id);
              if (!item) return 'غير متاح';
              if (item.has_children || item.has_active_children) return 'لا يمكن حذف حساب له فروع';
              const anyFlags = (item as any);
              if (anyFlags?.is_standard) return 'حساب قياسي (افتراضي) لا يمكن حذفه';
              if (anyFlags?.has_transactions) return 'لا يمكن حذف حساب لديه حركات';
              return 'حذف';
            }}
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
                      <td className={`table-code-cell contrast-table-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>{item.code}</td>
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
                          {(() => {
                            const anyFlags = (item as any);
                            const disabled = !!(item.has_children || item.has_active_children || anyFlags?.has_transactions || anyFlags?.is_standard);
                            const reason = item.has_children || item.has_active_children
                              ? 'لا يمكن حذف حساب له فروع'
                              : anyFlags?.is_standard
                                ? 'حساب قياسي (افتراضي) لا يمكن حذفه'
                                : anyFlags?.has_transactions
                                  ? 'لا يمكن حذف حساب لديه حركات'
                                  : 'حذف';
                            return (
                              <button
                                className="ultimate-btn ultimate-btn-delete"
                                title={reason}
                                disabled={disabled}
                                onClick={() => !disabled && handleDelete(item)}
                              >
                                <div className="btn-content"><span className="btn-text">حذف</span></div>
                              </button>
                            );
                          })()}
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

      {/* Unified Edit/Add Form */}
      {dialogOpen && (
        <DraggableResizablePanel
          title={dialogMode === 'edit' ? 'تعديل الحساب' : 'إضافة حساب جديد'}
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
                code: draft.code || '',
                name_ar: (draft.name_ar || draft.name || '') as string,
                name_en: (draft as any).name || '',
                account_type: (draft.account_type || '') as string,
                statement_type: '',
                parent_id: (draft.parent_id as string) || '',
                is_active: ((draft.status || 'active') === 'active'),
                allow_transactions: (typeof (draft as any).allow_transactions === 'boolean')
                  ? (draft as any).allow_transactions
                  : (((draft.level as number) || 1) >= 3),
                level: (draft.level as number) ?? 1,
                is_standard: (draft as any).is_standard ?? false,
              }}
            isLoading={saving}
            onSubmit={async (form) => {
              setSaving(true);
              try {
                if (dialogMode === 'edit' && draft.id) {
                  // Map frontend enum values to database enum types
                  const accountType = mapAccountTypeToDbEnum(form.account_type);
                  const status = mapStatusToDbEnum(form.is_active);
                  
                  // Prepare account update data
                  
                  const { data, error } = await supabase.rpc('account_update', {
                    p_org_id: orgId,
                    p_id: draft.id,
                    p_code: form.code,
                    p_name: form.name_en || form.name_ar,
                    p_name_ar: form.name_ar,
                    p_account_type: accountType,
                    p_level: parseInt(String(form.level)) || 1,
                    p_status: status,
                  });
                  
                  if (error) {
                    throw error;
                  }
                  
                  if (!data) {
                    throw new Error('No data returned from update function');
                  }
                  
                  const updated = data as any;
                  
                  // Immediately enforce user's allow_transactions choice with a direct update
                  try {
                    const { error: allowErr } = await supabase
                      .from('accounts')
                      .update({ allow_transactions: !!form.allow_transactions })
                      .eq('id', draft.id)
                      .eq('org_id', orgId);
                    if (allowErr) console.warn('allow_transactions update warning:', allowErr);
                  } catch {}
                  
                  // Update core fields in local state
                  setAccounts(prev => prev.map(a => (a.id === draft.id ? {
                    ...a,
                    code: updated.code || form.code,
                    name: updated.name || updated.name_ar || form.name_ar,
                    name_ar: updated.name_ar || form.name_ar,
                    level: updated.level || form.level,
                    status: updated.status || (form.is_active ? 'active' : 'inactive'),
                    account_type: updated.category || updated.account_type || accountType,
                  } : a)));

                  // Handle is_standard update separately (if permission and value changed)
                  if (hasAccountsUpdate && (form.is_standard ?? false) !== ((draft as any).is_standard ?? false)) {
                    const { error: stdErr } = await supabase
                      .from('accounts')
                      .update({ is_standard: !!form.is_standard })
                      .eq('id', draft.id)
                      .eq('org_id', orgId);
                    if (stdErr) throw stdErr;
                    setAccounts(prev => prev.map(a => a.id === draft.id ? { ...(a as any), is_standard: !!form.is_standard } : a));
                  }
                  
                  showToast('تم تحديث الحساب بنجاح', { severity: 'success' });
                } else {
                  // Map frontend enum values to database enum types
                  const accountType = mapAccountTypeToDbEnum(form.account_type);
                  const status = mapStatusToDbEnum(form.is_active);
                  
                  const { data, error } = await supabase.rpc('account_insert_child', {
                    p_org_id: orgId,
                    p_parent_id: form.parent_id || null,
                    p_code: form.code,
                    p_name: form.name_en || form.name_ar,
                    p_name_ar: form.name_ar,
                    p_account_type: accountType,
                    p_level: parseInt(String(form.level)) || 1,
                    p_status: status,
                  });
                  if (error) throw error;
                  const inserted = data as any;
                  if (inserted) {
                    // Enforce allow_transactions per user choice after insert
                    try {
                      const { error: allowErr } = await supabase
                        .from('accounts')
                        .update({ allow_transactions: !!form.allow_transactions })
                        .eq('id', inserted.id)
                        .eq('org_id', orgId);
                      if (allowErr) console.warn('allow_transactions update warning (insert):', allowErr);
                    } catch {}
                    setAccounts(prev => [...prev, inserted]);
                    // If creator has permission and requested standard, set it now
                    if (hasAccountsUpdate && (form.is_standard ?? false)) {
                      const { error: stdErr } = await supabase
                        .from('accounts')
                        .update({ is_standard: true })
                        .eq('id', inserted.id)
                        .eq('org_id', orgId);
                      if (!stdErr) {
                        setAccounts(prev => prev.map(a => a.id === inserted.id ? { ...(a as any), is_standard: true } : a));
                      }
                    }
                  }
                  showToast('تم إضافة الحساب', { severity: 'success' });
                }
                setDialogOpen(false);
              } catch (e: any) {
                const msg = e?.message || e?.error_description || e?.hint || e?.details || '';
                console.error('save failed', e, msg);
                showToast(`فشل حفظ التغييرات${msg ? `: ${msg}` : ''}`, { severity: 'error' });
                throw e;
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

export default AccountsTreePage;
