import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ExportButtons from '../../components/Common/ExportButtons';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import TreeView from '../../components/TreeView/TreeView';
import './AccountsTree.css';
import { supabase } from '../../utils/supabase';
import CurrencyFormatter from '../../components/Common/CurrencyFormatter';
import { useToast } from '../../contexts/ToastContext';
import UnifiedCRUDForm from '../../components/Common/UnifiedCRUDForm';
import { createAccountFormConfig } from '../../components/Accounts/AccountFormConfig';
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel';
import { tokens } from '../../theme/tokens';
import { useHasPermission } from '../../hooks/useHasPermission';
import { debugAccountRollups, testRollupModes, testViewDirectly, manualRollupsCalculation } from '../../utils/debug-rollups';
import { useScope } from '../../contexts/ScopeContext';

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
  name_ar?: string;
  level: number;
  path_text: string;
}
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
  const [loading, setLoading] = useState<boolean>(false);
  const [balanceMode, setBalanceMode] = useState<'posted' | 'all'>('all');
  const [rollups, setRollups] = useState<Record<string, { has_transactions: boolean; net_amount: number }>>({});

  // Use centralized scope from TopBar
  const { getOrgId, getProjectId } = useScope();
  const orgId = getOrgId() || '';
  const selectedProject = getProjectId() || '';

  // Edit/Add dialog state (must be before unifiedConfig)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'add'>('edit');
  const [draft, setDraft] = useState<Partial<AccountItem>>({});
  const [saving, setSaving] = useState(false);

  // Selected account state for action buttons
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  // Configuration options state
  const [configOptions, setConfigOptions] = useState<{
    autoExpandRoots: boolean;
    showInactiveAccounts: boolean;
    showTransactionCounts: boolean;
    defaultViewMode: 'tree' | 'table';
    exportFormat: 'excel' | 'pdf' | 'csv';
    sortPref: 'code' | 'name' | 'level';
  }>(() => {
    try {
      const saved = localStorage.getItem('accountsTreeConfig');
      return saved ? JSON.parse(saved) : {
        autoExpandRoots: false,
        showInactiveAccounts: true,
        showTransactionCounts: true,
        defaultViewMode: 'tree' as 'tree' | 'table',
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        sortPref: 'code' as 'code' | 'name' | 'level'
      };
    } catch {
      return {
        autoExpandRoots: false,
        showInactiveAccounts: true,
        showTransactionCounts: true,
        defaultViewMode: 'tree' as 'tree' | 'table',
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        sortPref: 'code' as 'code' | 'name' | 'level'
      };
    }
  });

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
      category: (a.account_type || '') as string,
      statement_type: '',
      parent_id: a.parent_id,
      is_active: a.status === 'active',
      allow_transactions: a.level >= 3,
    }));
  }, [accounts]);

  const formRef = useRef<any>(null);

  const formInitialData = useMemo(() => ({
    code: draft?.code || '',
    name_ar: (draft?.name_ar || draft?.name || '') as string,
    name_en: (draft as any)?.name || '',
    account_type: (draft as any)?.account_type || (draft as any)?.category || '',
    statement_type: '',
    parent_id: (draft?.parent_id as string) || '',
    is_active: ((draft?.status || 'active') === 'active'),
    allow_transactions: (typeof (draft as any)?.allow_transactions === 'boolean')
      ? (draft as any).allow_transactions
      : (((draft?.level as number) || 1) >= 3),
    level: (draft?.level as number) ?? 1,
    is_standard: (draft as any)?.is_standard ?? false,
  }), [draft]);

  // Persist config options
  useEffect(() => {
    try {
      localStorage.setItem('accountsTreeConfig', JSON.stringify(configOptions));
    } catch {}
  }, [configOptions]);

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
          category: String(draft.account_type || ''),
          statement_type: '',
          parent_id: (draft.parent_id as string) || null,
          is_active: (draft.status || 'active') === 'active',
          allow_transactions: (typeof (draft as AccountItem & { allow_transactions?: boolean }).allow_transactions === 'boolean')
            ? (draft as AccountItem & { allow_transactions?: boolean }).allow_transactions
            : (((draft.level as number) || 1) >= 3),
        }
      : undefined;
    return createAccountFormConfig(dialogMode === 'edit', parentAccountsLite, existing as (import('../../components/Accounts/AccountFormConfig').AccountLite | null | undefined), true, !!hasAccountsUpdate);
  }, [dialogMode, draft, parentAccountsLite, hasAccountsUpdate]);

  const { showToast } = useToast();

  // Cache for delete-eligibility info to reduce RPC traffic
  const [_deleteFlags, _setDeleteFlags] = useState<Record<string, { has_transactions: boolean; is_standard: boolean; linked_to_sub_tree: boolean }>>({});

  const fetchCanDeleteFlags = useCallback(async (accountIds: string[]) => {
    if (!orgId || accountIds.length === 0) return;
    // Default flags (actual delete enforcement is server-side; UI flags are best-effort)
    const updates: Record<string, { has_transactions: boolean; is_standard: boolean; linked_to_sub_tree: boolean }> = {};
    for (const id of accountIds) {
      updates[id] = { has_transactions: false, is_standard: false, linked_to_sub_tree: false };
    }

    // Enrich with server check: is this account linked in sub_tree (linked_account_id)?
    try {
      const { data: links, error: linkErr } = await supabase
        .from('sub_tree')
        .select('linked_account_id')
        .eq('org_id', orgId)
        .in('linked_account_id', accountIds)
        .limit(1000);
      if (!linkErr && Array.isArray(links)) {
        const linkedSet = new Set<string>((links as any[]).map(r => String(r.linked_account_id)).filter(Boolean));
        for (const id of accountIds) {
          if (linkedSet.has(id)) {
            updates[id] = { ...(updates[id] || { has_transactions: false, is_standard: false, linked_to_sub_tree: false }), linked_to_sub_tree: true };
          }
        }
      }
    } catch {}

    _setDeleteFlags(prev => ({ ...prev, ...updates }));
    // Also merge onto accounts so UI logic sees them immediately
    setAccounts(prev => prev.map(a => updates[a.id] ? { ...a, ...updates[a.id] } : a));
  }, [orgId]);

  const fetchAccountRollups = useCallback(async (accountIds: string[]) => {
    if (!orgId || accountIds.length === 0) return;
    const unique = Array.from(new Set(accountIds));

    let rollupData: any[] = [];
    // Use view-based query to avoid RPC dependency
    try {
      const viewQuery = supabase
        .from('v_accounts_activity_rollups')
        .select('id, org_id, has_transactions, net_amount, total_debit_amount, total_credit_amount, child_count')
        .eq('org_id', orgId);
      const { data: viewData, error: viewError } = await viewQuery;
      if (viewError) {
        console.error('❌ Error fetching from view:', viewError);
        return;
      }
      rollupData = viewData || [];
    } catch (err) {
      console.error('❌ Failed to fetch rollups:', err);
      return;
    }

    if (!rollupData || rollupData.length === 0) {
      const defaultMap: Record<string, { has_transactions: boolean; net_amount: number }> = {};
      unique.forEach(id => {
        defaultMap[id] = { has_transactions: false, net_amount: 0 };
      });
      setRollups(prev => ({ ...prev, ...defaultMap }));
      return;
    }

    // Filter data to only the accounts we requested
    const filteredData = rollupData.filter((r: any) => unique.includes(r.id));

    const map: Record<string, { has_transactions: boolean; net_amount: number }> = {};
    filteredData.forEach((r: any) => {
      const hasTransactions = !!r.has_transactions;
      const netAmount = Number(r.net_amount || 0);
      map[r.id] = {
        has_transactions: hasTransactions,
        net_amount: netAmount
      };
    });

    // Add default values for accounts not found in the rollups
    unique.forEach(id => {
      if (!map[id]) {
        map[id] = { has_transactions: false, net_amount: 0 };
      }
    });

    if (Object.keys(map).length) {
      setRollups(prev => ({ ...prev, ...map }));
      setAccounts(prev => prev.map(a => map[a.id] ? { ...(a as any), ...map[a.id] } : a));
    }
  }, [orgId]);

  const loadRoots = useCallback(async () => {
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
      // Hydrate rollups for visible roots
      fetchAccountRollups(rows.map(r => r.id)).catch(() => {});
    }
    setLoading(false);
  }, [fetchAccountRollups, fetchCanDeleteFlags, orgId, selectedProject]);

  const loadChildren = useCallback(async (parentId: string) => {
    let query = supabase
      .from('v_accounts_tree_ui')
      .select('*')
      .eq('org_id', orgId)
      .eq('parent_id', parentId)
      .order('code', { ascending: true });
    if (selectedProject) query = query.eq('project_id', selectedProject);
    const { data, error } = await query;
    if (error) return [] as AccountItem[];
    const mapped = (data || []).map(mapRow);
    // fetch rollups for these children
    fetchAccountRollups(mapped.map(r => r.id)).catch(() => {});
    return mapped;
  }, [fetchAccountRollups, orgId, selectedProject]);

  const performSearch = useCallback(async () => {
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
    // Hydrate rollups for combined list
    fetchAccountRollups(combined.map(c => c.id)).catch(() => {});

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
  }, [fetchAccountRollups, fetchCanDeleteFlags, loadChildren, orgId, searchTerm, selectedProject]);

  useEffect(() => {
    // When org or project changes or search cleared, reload roots
    if (!orgId) return;
    if (!searchTerm) {
      loadRoots().catch(() => {});
    } else {
      performSearch().catch(() => {});
    }
  }, [orgId, selectedProject, balanceMode, searchTerm, loadRoots, performSearch]);

  function mapRow(row: Record<string, unknown>): AccountItem {
    return {
      id: String(row.id || ''),
      code: String(row.code || ''),
      name: String((row as any).name || ''),
      name_ar: String((row as any).name_ar || (row as any).name || ''),
      level: Number(row.level || 1),
      status: String(row.status || 'active') as any,
      parent_id: (row.parent_id as string | null) ?? null,
      account_type: ((row as any).category ? String((row as any).category) : undefined),
      has_children: Boolean((row as any).has_children),
      has_active_children: Boolean((row as any).has_active_children),
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
    setSelectedAccountId(node.id);
    const { data, error } = await supabase.rpc('get_account_ancestors', {
      p_org_id: orgId,
      p_account_id: node.id,
    });
    if (!error) setBreadcrumbs((data || []) as AncestorItem[]);
  }

  // Helper functions for action buttons
  const getSelectedAccount = () => {
    if (!selectedAccountId) return null;
    return accounts.find(a => a.id === selectedAccountId) || null;
  };

  const handleTopLevelAdd = () => {
    const helpScreenshotsBypass = import.meta.env.VITE_HELP_SCREENSHOTS === 'true';
    if (!orgId && !helpScreenshotsBypass) {
      showToast('يرجى اختيار منظمة أولاً', { severity: 'warning' });
      return;
    }
    setDialogMode('add');
    setDraft({
      id: undefined,
      code: '',
      name: '',
      name_ar: '',
      level: 1,
      status: 'active',
      parent_id: null,
      account_type: ''
    });
    setDialogOpen(true);
  };

  const handleEditSelected = () => {
    const selected = getSelectedAccount();
    if (!selected) {
      showToast('يرجى اختيار حساب للتعديل', { severity: 'warning' });
      return;
    }
    handleEdit(selected);
  };

  const handleDeleteSelected = () => {
    const selected = getSelectedAccount();
    if (!selected) {
      showToast('يرجى اختيار حساب للحذف', { severity: 'warning' });
      return;
    }
    handleDelete(selected);
  };

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


  function uniqueById(items: AccountItem[]): AccountItem[] {
    const map = new Map<string, AccountItem>();
    for (const it of items) map.set(it.id, it);
    return Array.from(map.values());
  }

  const filteredAndSorted = useMemo(() => {
    const data = accounts.filter((acc) => {
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
      { key: 'has_transactions', header: 'به معاملات', type: 'boolean' },
      { key: 'net_amount', header: 'صافي', type: 'number' },
    ]);
    const rows = filteredAndSorted.map((r) => ({
      code: r.code,
      name: r.name_ar || r.name,
      level: r.level,
      status: r.status,
      has_transactions: !!(rollups[r.id]?.has_transactions),
      net_amount: rollups[r.id]?.net_amount ?? 0,
    }));
    return prepareTableData(columns, rows);
  }, [filteredAndSorted, rollups]);

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
          {/* Config Button */}
          <button 
            className="ultimate-btn ultimate-btn-primary" 
            title="إعدادات العرض" 
            onClick={() => setConfigModalOpen(true)}
          >
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات</span></div>
          </button>
          
          {/* Main Action Buttons */}
          <button 
            className="ultimate-btn ultimate-btn-add" 
            title="إضافة حساب جديد" 
            onClick={handleTopLevelAdd}
            data-tour="accounts-tree-add-top"
          >
            <div className="btn-content"><span className="btn-text">إضافة حساب جديد</span></div>
          </button>
          
          <button 
            className="ultimate-btn ultimate-btn-edit" 
            title="تعديل الحساب المحدد" 
            onClick={handleEditSelected}
            disabled={!selectedAccountId}
            data-tour="accounts-tree-edit-selected"
          >
            <div className="btn-content"><span className="btn-text">تعديل الحساب المحدد</span></div>
          </button>
          
          <button 
            className="ultimate-btn ultimate-btn-delete" 
            title="حذف الحساب المحدد" 
            onClick={handleDeleteSelected}
            disabled={!selectedAccountId}
          >
            <div className="btn-content"><span className="btn-text">حذف الحساب المحدد</span></div>
          </button>
          
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير الحسابات', orientation: 'landscape', useArabicNumerals: true, rtlLayout: true }}
            size="small"
            layout="horizontal"
          />
          {/* Debug button - remove after testing */}
          <button 
            className="ultimate-btn ultimate-btn-edit" 
            title="Debug Rollups" 
            onClick={async () => {
              if (!orgId) {
                showToast('يرجى اختيار منظمة أولاً', { severity: 'warning' });
                return;
              }
              try {
                if (import.meta.env.DEV) {
                  console.log('=== ENHANCED ROLLUPS DEBUG START ===');
                  const debugInfo = await debugAccountRollups(orgId);
                  console.log('🔍 Basic Debug Results:', debugInfo);
                }
                
                // Test view directly with visible accounts
                const visibleAccountIds = accounts.slice(0, 5).map(a => a.id);
                if (import.meta.env.DEV) console.log('\n--- Testing View Directly ---');
                const viewResults = await testViewDirectly(orgId, visibleAccountIds);
                
                // Manual calculation for comparison
                if (visibleAccountIds.length > 0) {
                  if (import.meta.env.DEV) console.log('\n--- Manual Calculation ---');
                  const manualResults = await manualRollupsCalculation(orgId, visibleAccountIds);
                  
                  // Compare results
                  if (viewResults && manualResults) {
                    if (import.meta.env.DEV) {
                      console.log('\n--- Results Comparison ---');
                      visibleAccountIds.forEach(id => {
                        const viewData = viewResults.find(v => v.id === id);
                        const manualData = manualResults[id];
                        console.log(`Account ${id}:`);
                        console.log('  View:', { has_transactions: viewData?.has_transactions, net_amount: viewData?.net_amount });
                        console.log('  Manual:', { has_transactions: manualData?.has_transactions, net_amount: manualData?.net_amount });
                        console.log('  Match:', viewData?.has_transactions === manualData?.has_transactions && Number(viewData?.net_amount || 0) === (manualData?.net_amount || 0));
                      });
                    }
                  }
                }
                
                // Also test RPC modes if available
                try {
                  if (import.meta.env.DEV) console.log('\n--- RPC Mode Testing ---');
                  await testRollupModes(orgId);
                } catch {
                  console.log('⚠️ RPC test skipped (function may not exist yet)');
                }
                
                console.log('=== ENHANCED ROLLUPS DEBUG END ===');
                showToast(`Enhanced debug complete. Found ${debugInfo.accountsWithTransactions} accounts with transactions. Check console for detailed analysis.`, { severity: 'info' });
              } catch (err) {
                console.error('Debug failed:', err);
                showToast('Debug failed - check console', { severity: 'error' });
              }
            }}
          >
            <div className="btn-content"><span className="btn-text">🔍 Debug</span></div>
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div style={{ padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
{breadcrumbs.map((b, i) => (
              <span key={b.id} style={{ background: 'var(--chip-bg)', padding: '4px 8px', borderRadius: 8 }}>
                {b.code} - {b.name_ar || b.name}
                {i < breadcrumbs.length - 1 ? ' / ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="filters-row">
        <input
          type="text"
          placeholder="بحث بالكود أو الاسم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          data-tour="accounts-tree-search"
        />

        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value === '' ? '' : Number(e.target.value))} className="filter-select">
          <option value="">جميع المستويات</option>
          <option value="1">المستوى 1</option>
          <option value="2">المستوى 2</option>
          <option value="3">المستوى 3</option>
          <option value="4">المستوى 4</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'code' | 'name' | 'level')} className="filter-select">
          <option value="code">ترتيب حسب الكود</option>
          <option value="name">ترتيب حسب الاسم</option>
          <option value="level">ترتيب حسب المستوى</option>
        </select>

        {/* Balance Mode (reserved for future RPC usage) */}
        <select value={balanceMode} onChange={(e) => setBalanceMode(e.target.value as 'posted' | 'all')} className="filter-select">
          <option value="posted">المنشورة فقط</option>
          <option value="all">جميع العمليات</option>
        </select>

        <button className={`view-mode-btn ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>عرض شجرة</button>
        <button className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>عرض جدول</button>
      </div>

      <div className="content-area">
        {viewMode === 'tree' ? (
          <TreeView
            data={filteredAndSorted.map(n => ({
              ...n,
              // TreeView expects name_ar field; ensure it exists
              name_ar: n.name_ar || n.name,
              is_active: n.status === 'active',
            }))}
            onEdit={(node) => handleEdit(node as AccountItem)}
            onAdd={(parent) => handleAdd(parent as AccountItem)}
            onToggleStatus={(node) => handleToggleStatus(node as AccountItem)}
            onDelete={(node) => handleDelete(node as AccountItem)}
            onSelect={(node) => handleSelectAccount(node as AccountItem)}
            onToggleExpand={async (node) => { toggleNode(node as AccountItem); }}
            canHaveChildren={(node) => {
              const id = (node as AccountItem).id;
              const item = accounts.find(a => a.id === id);
              if (!item) return false;
              return !!(item.has_active_children || item.has_children);
            }}
            getChildrenCount={(node) => accounts.filter(a => a.parent_id === (node as AccountItem).id).length}
            isDeleteDisabled={(node) => {
              const id = (node as AccountItem).id;
              const item = accounts.find(a => a.id === id);
              if (!item) return true;
              // Disable if parent (has children) – immediate and cheap
              if (item.has_children || item.has_active_children) return true;
              // Optional: disable if we already know it has transactions or is standard or linked in sub_tree
              const extendedItem = item as AccountItem & { has_transactions?: boolean; is_standard?: boolean; linked_to_sub_tree?: boolean };
              if (extendedItem?.has_transactions === true) return true;
              if (extendedItem?.is_standard === true) return true;
              if (extendedItem?.linked_to_sub_tree === true) return true;
              return false;
            }}
            getDeleteDisabledReason={(node) => {
              const id = (node as AccountItem).id;
              const item = accounts.find(a => a.id === id);
              if (!item) return 'غير متاح';
              if (item.has_children || item.has_active_children) return 'لا يمكن حذف حساب له فروع';
              const extendedItem = item as AccountItem & { has_transactions?: boolean; is_standard?: boolean; linked_to_sub_tree?: boolean };
              if (extendedItem?.is_standard) return 'حساب قياسي (افتراضي) لا يمكن حذفه';
              if (extendedItem?.linked_to_sub_tree) return 'مرتبط بفئة في الشجرة الفرعية — فك الارتباط أولاً';
              if (extendedItem?.has_transactions) return 'لا يمكن حذف حساب لديه حركات';
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
                          <th style={{width: '120px'}}>به معاملات</th>
                          <th style={{width: '150px'}}>الصافي</th>
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
                      <td className="table-center"><input type="checkbox" readOnly checked={!!(rollups[item.id]?.has_transactions)} /></td>
                      <td className="table-center"><CurrencyFormatter amount={rollups[item.id]?.net_amount ?? 0} /></td>
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
                            const extendedItem = item as AccountItem & { has_transactions?: boolean; is_standard?: boolean };
                            const disabled = !!(item.has_children || item.has_active_children || extendedItem?.has_transactions || extendedItem?.is_standard);
                            const reason = item.has_children || item.has_active_children
                              ? 'لا يمكن حذف حساب له فروع'
                              : extendedItem?.is_standard
                                ? 'حساب قياسي (افتراضي) لا يمكن حذفه'
                                : extendedItem?.has_transactions
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
          headerGradient={`linear-gradient(90deg, ${tokens.palette.primary.dark}, ${tokens.palette.primary.main}, ${tokens.palette.info.main})`}
          headerActions={(
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: tokens.palette.primary.contrastText, fontSize: 12, marginInlineEnd: 8 }}>
                <input type="checkbox" checked={rememberPanel} onChange={(e) => setRememberPanel(e.target.checked)} />
                تذكر التخطيط
              </label>
              <button className="ultimate-btn ultimate-btn-add" title="حفظ" onClick={() => formRef.current?.submit()} data-tour="accounts-tree-save">
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
              initialData={formInitialData}
            isLoading={saving}
            onSubmit={async (form) => {
              setSaving(true);
              try {
                if (dialogMode === 'edit' && draft.id) {
                  // Map frontend enum values to database enum types
                  const accountType = mapAccountTypeToDbEnum(String((form as any).category || ''));
                  const status = mapStatusToDbEnum(!!(form as any).is_active);
                  
                  // Prepare account update data
                  
                  const { data, error } = await supabase.rpc('account_update', {
                    p_org_id: orgId,
                    p_id: draft.id,
                    p_code: form.code,
                    p_name: form.name_ar || form.name_en || 'Unnamed Account', // Ensure name is never empty
                    p_name_ar: form.name_ar || form.name_en || 'Unnamed Account', // Ensure name_ar is never empty
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
                  
                  // Update core fields in local state - FIXED: Use form data as primary source
                  setAccounts(prev => prev.map(a => (a.id === draft.id ? {
                    ...a,
                    // Use form data (user's current input) as primary source
                    code: form.code,
                    name: form.name_en || form.name_ar,
                    name_ar: form.name_ar || form.name_en,
                    level: parseInt(String(form.level)) || 1,
                    status: form.is_active ? 'active' : 'inactive',
                    account_type: accountType,
                    // Only use server response for fields that should come from server
                    parent_id: updated.parent_id || a.parent_id,
                    org_id: updated.org_id || a.org_id,
                    is_postable: updated.is_postable !== undefined ? updated.is_postable : a.is_postable,
                    created_at: updated.created_at || a.created_at,
                    updated_at: updated.updated_at || new Date().toISOString(),
                  } : a)));

                  // ADDITIONAL FIX: Clear form after successful save to prevent data reversion
                  setDialogMode('view');
                  setDraft(null);

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
                  const accountType = mapAccountTypeToDbEnum(String((form as any).category || ''));
                  const status = mapStatusToDbEnum(!!(form as any).is_active);
                  
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
                const errCode = e?.code || e?.error?.code;
                const isDuplicateCode = (errCode === '23505') || (typeof msg === 'string' && msg.includes('accounts_code_unique_per_org'));

                console.error('save failed', e, msg);

                if (isDuplicateCode) {
                  showToast('فشل حفظ التغييرات: هذا الكود مستخدم بالفعل داخل نفس المؤسسة. الرجاء اختيار كود مختلف.', { severity: 'error' });
                  return;
                }

                showToast(`فشل حفظ التغييرات${msg ? `: ${msg}` : ''}`, { severity: 'error' });
                return;
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
      
      {/* Configuration Modal */}
      {configModalOpen && (
        <div className="config-modal-backdrop" onClick={() => setConfigModalOpen(false)}>
          <div className="config-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="config-modal-header">
              <h3>إعدادات عرض شجرة الحسابات</h3>
              <button 
                className="config-modal-close" 
                onClick={() => setConfigModalOpen(false)}
                title="إغلاق"
              >
                ×
              </button>
            </div>
            
            <div className="config-modal-body">
              <div className="config-section">
                <h4>إعدادات العرض</h4>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={configOptions.autoExpandRoots}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, autoExpandRoots: e.target.checked }))}
                    />
                    توسيع الحسابات الرئيسية تلقائياً
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={configOptions.showInactiveAccounts}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, showInactiveAccounts: e.target.checked }))}
                    />
                    إظهار الحسابات المعطلة
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={configOptions.showTransactionCounts}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, showTransactionCounts: e.target.checked }))}
                    />
                    إظهار عدد العمليات المالية
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label-block">
                    وضع العرض الافتراضي:
                    <select 
                      value={configOptions.defaultViewMode}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, defaultViewMode: e.target.value as 'tree' | 'table' }))}
                      className="config-select"
                    >
                      <option value="tree">عرض شجرة</option>
                      <option value="table">عرض جدول</option>
                    </select>
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label-block">
                    الترتيب الافتراضي:
                    <select 
                      value={configOptions.sortPref}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, sortPref: e.target.value as 'code' | 'name' | 'level' }))}
                      className="config-select"
                    >
                      <option value="code">ترتيب حسب الكود</option>
                      <option value="name">ترتيب حسب الاسم</option>
                      <option value="level">ترتيب حسب المستوى</option>
                    </select>
                  </label>
                </div>
              </div>
              
              <div className="config-section">
                <h4>إعدادات التصدير</h4>
                
                <div className="config-field">
                  <label className="config-label-block">
                    تنسيق التصدير الافتراضي:
                    <select 
                      value={configOptions.exportFormat}
                      onChange={(e) => setConfigOptions(prev => ({ ...prev, exportFormat: e.target.value as 'excel' | 'pdf' | 'csv' }))}
                      className="config-select"
                    >
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="pdf">PDF (.pdf)</option>
                      <option value="csv">CSV (.csv)</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="config-modal-footer">
              <button 
                className="ultimate-btn ultimate-btn-add"
                onClick={() => setConfigModalOpen(false)}
              >
                <div className="btn-content"><span className="btn-text">حفظ الإعدادات</span></div>
              </button>
              
              <button 
                className="ultimate-btn ultimate-btn-warning"
                onClick={() => {
                  setConfigOptions({
                    autoExpandRoots: false,
                    showInactiveAccounts: true,
                    showTransactionCounts: true,
                    defaultViewMode: 'tree',
                    exportFormat: 'excel',
                    sortPref: 'code'
                  });
                }}
              >
                <div className="btn-content"><span className="btn-text">إعادة تعيين</span></div>
              </button>
              
              <button 
                className="ultimate-btn ultimate-btn-delete"
                onClick={() => setConfigModalOpen(false)}
              >
                <div className="btn-content"><span className="btn-text">إلغاء</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsTreePage;
