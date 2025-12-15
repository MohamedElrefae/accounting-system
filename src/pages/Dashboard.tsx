import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  CircularProgress,
  Select,
  MenuItem,
  TextField,
  Alert,
  Skeleton,
  Collapse,
  IconButton,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys, fetchCategoryTotals, fetchRecentActivity, prefetchDashboardQueries } from '../services/dashboard-queries';
import { getActiveOrgId, getActiveProjectId } from '../utils/org';
import useAppStore from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import {
  AccountTree,
  Receipt,
  Assessment,
  AccountBalance,
  TrendingUp,
  ExpandMore,
} from '../components/icons/SimpleIcons';
import { 
  dashboardStats, 
  translations 
} from '../data/mockData';
import { supabase } from '../utils/supabase';
import { getActiveProjects } from '../services/projects';
import { getOrganizations } from '../services/organization';
import { getCompanyConfig } from '../services/company-config';
import type { StatCard as StatCardType } from '../types';

// Minimal shape for dashboard recent transactions
interface RecentRow {
  id: string;
  entry_date: string;
  description: string;
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  // derived fields
  type: 'income' | 'expense';
  category?: string | null; // best-effort from account category/name
}

const Dashboard: React.FC = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const t = translations[language];

  const [recent, setRecent] = React.useState<RecentRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Live stats and charts state
  const [stats, setStats] = React.useState<StatCardType[] | null>(null);
  const [chartData, setChartData] = React.useState<Array<{ month: string; revenue: number; expenses: number }>>([]);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [currencySymbol, setCurrencySymbol] = React.useState<string>('none');
  const [numberFormat, setNumberFormat] = React.useState<string>('en-US');
  const [dateFormat, setDateFormat] = React.useState<string>('YYYY-MM-DD');
  const [compactTicks, setCompactTicks] = React.useState<boolean>(true);
  const [customShortcuts, setCustomShortcuts] = React.useState<Array<{ label: string; path: string; icon?: string; accessKey?: string }>>([]);
  const [userShortcuts, setUserShortcuts] = React.useState<Array<{ label: string; path: string; icon?: string; accessKey?: string }>>([]);
  // Filters
  const [orgOptions, setOrgOptions] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [projectOptions, setProjectOptions] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [numbersOnlyDashboard, setNumbersOnlyDashboard] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [postedOnly, setPostedOnly] = React.useState<boolean>(false); // Default: show all transactions
  // Query-driven, hydrated by prefetch
  const orgIdForQuery = selectedOrgId || getActiveOrgId() || undefined;
  const projectIdForQuery = selectedProjectId || getActiveProjectId() || undefined;
  const { data: categoryTotalsQ } = useQuery({
    queryKey: dashboardQueryKeys.categoryTotals({ orgId: orgIdForQuery, projectId: projectIdForQuery, dateFrom, dateTo, postedOnly }),
    queryFn: () => fetchCategoryTotals({ orgId: orgIdForQuery, projectId: projectIdForQuery, dateFrom, dateTo, postedOnly }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: recentQData } = useQuery({
    queryKey: dashboardQueryKeys.recentActivity({ orgId: orgIdForQuery, projectId: projectIdForQuery, postedOnly }),
    queryFn: () => fetchRecentActivity({ orgId: orgIdForQuery, projectId: projectIdForQuery, postedOnly }),
    staleTime: 60 * 1000,
  });
  React.useEffect(() => { if (Array.isArray(recentQData)) setRecent(recentQData as any); }, [recentQData]);
  const qc = useQueryClient();
  React.useEffect(() => {
    const prefetch = () => { prefetchDashboardQueries(qc, { orgId: orgIdForQuery, projectId: projectIdForQuery, dateFrom, dateTo, postedOnly }); };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 1000 });
    } else {
      setTimeout(prefetch, 0);
    }
  }, [qc, orgIdForQuery, projectIdForQuery, dateFrom, dateTo, postedOnly]);
  React.useEffect(() => {
    if (categoryTotalsQ) {
      const totals = categoryTotalsQ as Record<string, number>;
      const totalAssets = Math.abs(totals['asset'] || 0);
      const totalLiabilities = Math.abs(totals['liability'] || 0);
      const totalEquity = Math.abs(totals['equity'] || 0);
      const totalRevenue = Math.abs(totals['revenue'] || 0);
      const totalExpenses = Math.abs(totals['expense'] || 0);
      const netProfit = totalRevenue - totalExpenses;
      const liveStats: StatCardType[] = [
        { id: 'assets', title: '', titleEn: language === 'ar' ? 'الأصول' : 'Assets', titleAr: 'الأصول', value: formatAmount(totalAssets), change: 0, icon: 'AccountBalance', color: 'primary' },
        { id: 'liabilities', title: '', titleEn: language === 'ar' ? 'الالتزامات' : 'Liabilities', titleAr: 'الالتزامات', value: formatAmount(totalLiabilities), change: 0, icon: 'AccountBalance', color: 'warning' },
        { id: 'equity', title: '', titleEn: language === 'ar' ? 'حقوق الملكية' : 'Equity', titleAr: 'حقوق الملكية', value: formatAmount(totalEquity), change: 0, icon: 'AccountBalance', color: 'success' },
        { id: 'revenue', title: '', titleEn: t.totalRevenue, titleAr: t.totalRevenue, value: formatAmount(totalRevenue), change: 0, icon: 'TrendingUp', color: 'success' },
        { id: 'expenses', title: '', titleEn: t.totalExpenses, titleAr: t.totalExpenses, value: formatAmount(totalExpenses), change: 0, icon: 'TrendingDown', color: 'error' },
        { id: 'profit', title: '', titleEn: language === 'ar' ? 'صافي الدخل' : 'Net Income', titleAr: 'صافي الدخل', value: formatAmount(netProfit), change: 0, icon: 'AccountBalance', color: netProfit >= 0 ? 'primary' : 'error' },
      ];
      setStats(liveStats);
      setLastUpdated(new Date());
    }
  }, [categoryTotalsQ, language, numberFormat, numbersOnlyDashboard]);
  const axisNumberFormatter = React.useMemo(() => new Intl.NumberFormat(numberFormat || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [numberFormat]);
  const compactNumberFormatter = React.useMemo(() => new Intl.NumberFormat(numberFormat || 'en-US', { notation: 'compact', maximumFractionDigits: 1 }), [numberFormat]);
  const formatAxisTick = (v: number) => {
    const num = Math.abs(Number(v) || 0);
    const useCompact = compactTicks && num >= 1000;
    const s = useCompact ? compactNumberFormatter.format(num) : axisNumberFormatter.format(num);
    return currencySymbol && currencySymbol !== 'none' ? `${s} ${currencySymbol}` : s;
  };

  const formatAmount = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    // Format number with company number_format and optional currency symbol
    const formatter = new Intl.NumberFormat(numberFormat || 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formatted = formatter.format(Math.abs(amount));
    if (numbersOnlyDashboard) return formatted;
    return currencySymbol && currencySymbol !== 'none' ? `${formatted} ${currencySymbol}` : formatted;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    // Use organization date format from company config
    switch ((dateFormat || 'YYYY-MM-DD').toUpperCase()) {
      case 'MM/DD/YYYY':
        return `${m}/${day}/${y}`;
      case 'DD/MM/YYYY':
        return `${day}/${m}/${y}`;
      case 'YYYY-MM-DD':
      default:
        return `${y}-${m}-${day}`;
    }
  };

  // Date helpers
  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  type PresetKey = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'ytd' | 'thisYear' | 'all';

  const presetRange = (preset: PresetKey): { from: string; to: string } => {
    const now = new Date();
    if (preset === 'today') {
      const s = toDateStr(now);
      return { from: s, to: s };
    }
    if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: toDateStr(d), to: toDateStr(now) };
    }
    if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: toDateStr(d), to: toDateStr(now) };
    }
    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toDateStr(start), to: toDateStr(end) };
    }
    if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDateStr(start), to: toDateStr(end) };
    }
    if (preset === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: toDateStr(start), to: toDateStr(now) };
    }
    if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: toDateStr(start), to: toDateStr(end) };
    }
    // all
    return { from: '', to: '' };
  };

  const setPreset = (preset: PresetKey) => {
    const { from, to } = presetRange(preset);
    setDateFrom(from);
    setDateTo(to);
    try {
      if (from) localStorage.setItem('dashboard_date_from', from); else localStorage.removeItem('dashboard_date_from');
      if (to) localStorage.setItem('dashboard_date_to', to); else localStorage.removeItem('dashboard_date_to');
    } catch {}
  };

  const activePreset = React.useMemo<PresetKey | null>(() => {
    const candidates: PresetKey[] = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'ytd', 'thisYear', 'all'];
    for (const key of candidates) {
      const r = presetRange(key);
      if ((r.from || '') === (dateFrom || '') && (r.to || '') === (dateTo || '')) return key;
    }
    return null;
  }, [dateFrom, dateTo]);

  // Persist compact tick preference
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('dashboard_compact_ticks');
      if (v !== null) setCompactTicks(v === 'true');
    } catch {}
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem('dashboard_compact_ticks', String(compactTicks)); } catch {}
  }, [compactTicks]);

  // Load filter bar collapsed state
  React.useEffect(() => {
    try {
      const collapsed = localStorage.getItem('dashboard_filters_collapsed');
      if (collapsed !== null) setShowFilters(collapsed !== 'true');
    } catch {}
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem('dashboard_filters_collapsed', String(!showFilters)); } catch {}
  }, [showFilters]);

  // Load per-user shortcuts from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('dashboard_user_shortcuts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setUserShortcuts(parsed);
      }
    } catch {}
  }, []);

  const manageUserShortcuts = () => {
    try {
      const current = JSON.stringify(userShortcuts || [], null, 2);
      const promptText = language === 'ar'
        ? 'ألصق اختصارات المستخدم (JSON Array)' 
        : 'Paste user shortcuts (JSON Array)';
      const input = window.prompt(promptText, current);
      if (input == null) return;
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      setUserShortcuts(parsed);
      localStorage.setItem('dashboard_user_shortcuts', JSON.stringify(parsed));
    } catch (e) {
      alert(language === 'ar' ? 'صيغة غير صحيحة للاختصارات.' : 'Invalid shortcuts JSON.');
    }
  };

  // Resolve icon string to component for custom shortcuts
  const resolveShortcutIcon = (name?: string) => {
    switch ((name || '').toLowerCase()) {
      case 'accounttree':
      case 'tree':
        return <AccountTreeIcon />;
      case 'receiptlong':
      case 'transactions':
        return <ReceiptLongIcon />;
      case 'menubook':
      case 'ledger':
        return <MenuBookIcon />;
      case 'balance':
      case 'scale':
        return <BalanceIcon />;
      case 'trendingup':
      case 'profit':
        return <TrendingUpIcon />;
      case 'accountbalance':
      case 'balancesheet':
        return <AccountBalanceIcon />;
      default:
        return undefined;
    }
  };

  // Load dashboard data from Supabase and derive type/category and aggregates
  // Prime filters (org/project/date) from storage
  React.useEffect(() => {
    try {
      const so = localStorage.getItem('dashboard_scope_org');
      const sp = localStorage.getItem('dashboard_scope_project');
      const df = localStorage.getItem('dashboard_date_from');
      const dt = localStorage.getItem('dashboard_date_to');
      const no = localStorage.getItem('dashboard_numbers_only');
      const po = localStorage.getItem('dashboard_posted_only');
      if (so) setSelectedOrgId(so);
      if (sp) setSelectedProjectId(sp);
      if (df) setDateFrom(df);
      if (dt) setDateTo(dt);
      if (no) setNumbersOnlyDashboard(no === 'true');
      if (po) setPostedOnly(po === 'true');
    } catch {}
    // load orgs and projects
    (async () => {
      try {
        const [orgs, projs] = await Promise.all([
          getOrganizations().catch(() => []),
          getActiveProjects().catch(() => [])
        ]);
        setOrgOptions((orgs || []).map((o: any) => ({ id: o.id, code: o.code, name: o.name })));
        setProjectOptions((projs || []).map((p: any) => ({ id: p.id, code: p.code, name: p.name })));
      } catch {}
    })();
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Optional scoping by org/project from localStorage
      const { getActiveOrgId, getActiveProjectId } = await import('../utils/org');
      let orgId: string | null = getActiveOrgId();
      let projectId: string | null = getActiveProjectId();
      // Override from local selections if set
      if (selectedOrgId) orgId = selectedOrgId;
      if (selectedProjectId) projectId = selectedProjectId;
      // Remember last scope for dashboard
      try {
        if (orgId) localStorage.setItem('dashboard_scope_org', orgId);
        if (projectId) localStorage.setItem('dashboard_scope_project', projectId);
      } catch {}

      // Helper to apply filters
      const applyScope = (q: any) => {
        if (orgId) q = q.eq('org_id', orgId);
        if (projectId) q = q.eq('project_id', projectId);
        return q;
      };

      // Load company config (currency and number format)
      const cfg = await getCompanyConfig();
      setCurrencySymbol(cfg.currency_symbol || 'none');
      setNumberFormat(cfg.number_format || (language === 'ar' ? 'ar-SA' : 'en-US'));
      setDateFormat(cfg.date_format || 'YYYY-MM-DD');
      setCustomShortcuts(Array.isArray((cfg as any).shortcuts) ? ((cfg as any).shortcuts as any) : []);

      // Use unified balance service for consistency with all reports
      // Get accounts for transaction categorization (support id and code lookups)
      const { data: accts, error: acctErr } = await supabase
        .from('accounts')
        .select('id, code, name, category, normal_balance');
      if (acctErr) throw acctErr;
      const acctById: Record<string, { id: string; code?: string | null; name?: string | null; category?: string | null; normal_balance?: 'debit' | 'credit' | null }> = {};
      const acctByCode: Record<string, { id: string; code?: string | null; name?: string | null; category?: string | null; normal_balance?: 'debit' | 'credit' | null }> = {};
      for (const a of accts || []) {
        const rec = { id: a.id, code: (a as any).code ?? null, name: (a as any).name ?? null, category: (a as any).category ?? null, normal_balance: (a as any).normal_balance ?? null };
        acctById[a.id] = rec;
        if ((a as any).code) acctByCode[(a as any).code] = rec;
      }

      // 1) Recent 10 transactions
      const { getReadMode } = await import('../config/featureFlags');
      const readMode = getReadMode();
      let rows: any[] = [];
      if (readMode !== 'legacy') {
        // Use enriched multi-line journals view
        let recentQ = supabase
          .from('v_gl2_journals_enriched')
          .select('journal_id, org_id, number, doc_date, posting_date, status, debit_account_code, credit_account_code, amount')
          .order('posting_date', { ascending: false, nullsFirst: false })
          .limit(10);
        recentQ = applyScope(recentQ);
        if (postedOnly) recentQ = recentQ.eq('status', 'posted');
        const { data: txRecent, error: txErr } = await recentQ as any;
        if (txErr) throw txErr;
        rows = txRecent || [];

        const recentDerived: RecentRow[] = rows.map(r => ({
          id: r.journal_id,
          entry_date: r.doc_date || r.posting_date,
          description: '',
          amount: Number(r.amount ?? 0),
          debit_account_id: r.debit_account_code,
          credit_account_id: r.credit_account_code,
          type: 'income',
          category: null,
        }));
        setRecent(recentDerived);
      } else {
        // Legacy single-line transactions table (exclude wizard drafts)
        let recentQ = supabase
          .from('transactions')
          .select('id, entry_date, description, amount, debit_account_id, credit_account_id, is_posted')
          .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);
        recentQ = applyScope(recentQ);
        if (postedOnly) recentQ = recentQ.eq('is_posted', true);
        const { data: txRecent, error: txErr } = await recentQ;
        if (txErr) throw txErr;
        rows = txRecent || [];

        const recentDerived: RecentRow[] = rows.map(r => ({
          id: r.id,
          entry_date: r.entry_date,
          description: r.description,
          amount: r.amount,
          debit_account_id: r.debit_account_id,
          credit_account_id: r.credit_account_id,
          type: 'income',
          category: null,
        }));
        setRecent(recentDerived);
      }

      // 2) Window for charts: last 6 months
      const now = new Date();
      // Date range
      let startStr = '';
      if (dateFrom) startStr = dateFrom;
      else {
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        startStr = start.toISOString().slice(0, 10);
      }

      // Range data for charts (last 6 months), switch by read mode
      let txs: any[] = [];
      if (readMode !== 'legacy') {
        let rangeQ = supabase
          .from('v_gl2_journals_enriched')
          .select('journal_id, posting_date, doc_date, amount, debit_account_code, credit_account_code, status')
          .gte('posting_date', startStr)
          .order('posting_date', { ascending: true });
        if (dateTo) rangeQ = rangeQ.lte('posting_date', dateTo);
        rangeQ = applyScope(rangeQ);
        if (postedOnly) rangeQ = rangeQ.eq('status', 'posted');
        const { data: txRange, error: rangeErr } = await rangeQ as any;
        if (rangeErr) throw rangeErr;
        txs = txRange || [];
      } else {
        let rangeQ = supabase
          .from('transactions')
          .select('id, entry_date, amount, debit_account_id, credit_account_id, is_posted')
          .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
          .gte('entry_date', startStr)
          .order('entry_date', { ascending: true });
        if (dateTo) rangeQ = rangeQ.lte('entry_date', dateTo);
        rangeQ = applyScope(rangeQ);
        if (postedOnly) rangeQ = rangeQ.eq('is_posted', true);
        const { data: txRange, error: rangeErr } = await rangeQ;
        if (rangeErr) throw rangeErr;
        txs = txRange || [];
      }

      // Build monthly buckets using consistent formatting
      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString(numberFormat || (language === 'ar' ? 'ar-SA' : 'en-US'), { month: 'short', year: '2-digit' });
        monthKeys.push(key);
      }
      const revenueByMonth: number[] = Array(6).fill(0);
      const expensesByMonth: number[] = Array(6).fill(0);


      // Build revenue/expenses by month from transactions (informational)
      for (const r of txs) {
        const dateVal = (r as any).entry_date || (r as any).doc_date || (r as any).posting_date;
        const d = new Date(dateVal);
        const key = d.toLocaleString(numberFormat || (language === 'ar' ? 'ar-SA' : 'en-US'), { month: 'short', year: '2-digit' });
        const idx = monthKeys.indexOf(key);
        const creditCat = (r as any).credit_account_id ? (acctById[(r as any).credit_account_id]?.category || null) : ((r as any).credit_account_code ? (acctByCode[(r as any).credit_account_code]?.category || null) : null);
        const debitCat = (r as any).debit_account_id ? (acctById[(r as any).debit_account_id]?.category || null) : ((r as any).debit_account_code ? (acctByCode[(r as any).debit_account_code]?.category || null) : null);
        const isPosted = (r as any).is_posted ?? (String((r as any).status || '').toLowerCase() === 'posted');
        const amt = Number((r as any).amount ?? 0);
        if (idx >= 0 && (!postedOnly || isPosted)) {
          if (creditCat === 'revenue') revenueByMonth[idx] += amt;
          if (debitCat === 'expense') expensesByMonth[idx] += amt;
        }
      }
      // last updated after chart load
      setLastUpdated(new Date());

      // Compose chart data rows
      setChartData(monthKeys.map((month, i) => ({ month, revenue: revenueByMonth[i], expenses: expensesByMonth[i] })));

    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [language, postedOnly]);

  React.useEffect(() => {
    void load();
  }, [load, selectedOrgId, selectedProjectId, dateFrom, dateTo]);

  // Global refresh from other parts of app (e.g., after deletion)
  React.useEffect(() => {
    const handler = (_e: Event) => {
      void (async () => {
        await Promise.allSettled([
          qc.refetchQueries({ queryKey: dashboardQueryKeys.categoryTotals({ orgId: orgIdForQuery, projectId: projectIdForQuery, dateFrom, dateTo, postedOnly }), type: 'active' }),
          qc.refetchQueries({ queryKey: dashboardQueryKeys.recentActivity({ orgId: orgIdForQuery, projectId: projectIdForQuery, postedOnly }), type: 'active' }),
        ]);
        await load();
      })();
    };
    window.addEventListener('transactions:refresh', handler)
    return () => window.removeEventListener('transactions:refresh', handler)
  }, [qc, load, orgIdForQuery, projectIdForQuery, dateFrom, dateTo, postedOnly])
  

  return (
    <Box>
      {/* Error Banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={() => { void load(); }}>
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* Page Title */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        {t.dashboard}
      </Typography>

      {/* Statistics Cards + Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{language === 'ar' ? 'المؤشرات المالية' : 'Financial Indicators'}</Typography>
          <Chip
            size="small"
            label={postedOnly ? (language === 'ar' ? 'مرحّلة فقط' : 'Posted only') : (language === 'ar' ? 'جميع المعاملات' : 'All transactions')}
            color={postedOnly ? 'warning' : 'primary'}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch size="small" checked={compactTicks} onChange={(e) => setCompactTicks(e.target.checked)} />}
            label={language === 'ar' ? 'تقريب القيم الكبيرة' : 'Compact ticks'}
          />
          <IconButton size="small" onClick={() => setShowFilters(v => !v)} aria-label={language === 'ar' ? 'إظهار/إخفاء المرشحات' : 'Toggle filters'}>
            <ExpandMore sx={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </IconButton>
          <Chip
            size="small"
            label={postedOnly ? (language === 'ar' ? 'مرحّلة فقط' : 'Posted only') : (language === 'ar' ? 'جميع المعاملات' : 'All transactions')}
            color={postedOnly ? 'warning' : 'primary'}
            variant={postedOnly ? 'filled' : 'outlined'}
          />
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {(language === 'ar' ? 'آخر تحديث: ' : 'Last updated: ') + formatDate(lastUpdated.toISOString().slice(0, 10)) + ' ' + lastUpdated.toLocaleTimeString(numberFormat || (language === 'ar' ? 'ar-SA' : 'en-US'), { hour12: false })}
            </Typography>
          )}
          <Button variant="outlined" size="small" onClick={async () => { 
            setRefreshing(true);
            await Promise.allSettled([
              qc.refetchQueries({ queryKey: dashboardQueryKeys.categoryTotals({ orgId: orgIdForQuery, projectId: projectIdForQuery, dateFrom, dateTo, postedOnly }), type: 'active' }),
              qc.refetchQueries({ queryKey: dashboardQueryKeys.recentActivity({ orgId: orgIdForQuery, projectId: projectIdForQuery, postedOnly }), type: 'active' }),
            ]);
            await load();
            setRefreshing(false);
          }} startIcon={refreshing ? <CircularProgress size={14} /> : undefined} disabled={refreshing}>
            {language === 'ar' ? (refreshing ? 'جارِ التحديث...' : 'تحديث') : (refreshing ? 'Refreshing...' : 'Refresh')}
          </Button>
        </Box>
      </Box>
      <Collapse in={showFilters} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {/* Date presets */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>{language === 'ar' ? 'نطاق زمني سريع:' : 'Quick range:'}</Typography>
            <Button size="small" variant={activePreset === 'today' ? 'contained' : 'outlined'} onClick={() => setPreset('today')}>{language === 'ar' ? 'اليوم' : 'Today'}</Button>
            <Button size="small" variant={activePreset === 'last7' ? 'contained' : 'outlined'} onClick={() => setPreset('last7')}>{language === 'ar' ? 'آخر 7 أيام' : 'Last 7d'}</Button>
            <Button size="small" variant={activePreset === 'last30' ? 'contained' : 'outlined'} onClick={() => setPreset('last30')}>{language === 'ar' ? 'آخر 30 يوماً' : 'Last 30d'}</Button>
            <Button size="small" variant={activePreset === 'thisMonth' ? 'contained' : 'outlined'} onClick={() => setPreset('thisMonth')}>{language === 'ar' ? 'هذا الشهر' : 'This Month'}</Button>
            <Button size="small" variant={activePreset === 'lastMonth' ? 'contained' : 'outlined'} onClick={() => setPreset('lastMonth')}>{language === 'ar' ? 'الشهر الماضي' : 'Last Month'}</Button>
            <Button size="small" variant={activePreset === 'ytd' ? 'contained' : 'outlined'} onClick={() => setPreset('ytd')}>{language === 'ar' ? 'منذ بداية السنة' : 'YTD'}</Button>
            <Button size="small" variant={activePreset === 'thisYear' ? 'contained' : 'outlined'} onClick={() => setPreset('thisYear')}>{language === 'ar' ? 'هذه السنة' : 'This Year'}</Button>
            <Button size="small" variant={activePreset === 'all' ? 'contained' : 'text'} onClick={() => setPreset('all')}>{language === 'ar' ? 'الكل' : 'All'}</Button>
          </Box>

          {/* Filters row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch size="small" checked={numbersOnlyDashboard} onChange={(e) => { setNumbersOnlyDashboard(e.target.checked); try { localStorage.setItem('dashboard_numbers_only', String(e.target.checked)); } catch {} }} />}
              label={language === 'ar' ? 'أرقام فقط' : 'Numbers only'}
            />
            <FormControlLabel
              control={<Switch size="small" checked={postedOnly} onChange={(e) => { setPostedOnly(e.target.checked); try { localStorage.setItem('dashboard_posted_only', String(e.target.checked)); } catch {} }} />}
              label={language === 'ar' ? 'المرحلة فقط' : 'Posted only'}
            />
            <Select size="small" value={selectedOrgId} displayEmpty onChange={(e)=>{ setSelectedOrgId(e.target.value as string); try { localStorage.setItem('dashboard_scope_org', String(e.target.value||'')); } catch {} }}>
              <MenuItem value="">{language === 'ar' ? 'كل المؤسسات' : 'All Orgs'}</MenuItem>
              {orgOptions.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.code ? `${o.code} — ${o.name}` : o.name}</MenuItem>
              ))}
            </Select>
            <Select size="small" value={selectedProjectId} displayEmpty onChange={(e)=>{ setSelectedProjectId(e.target.value as string); try { localStorage.setItem('dashboard_scope_project', String(e.target.value||'')); } catch {} }}>
              <MenuItem value="">{language === 'ar' ? 'كل المشاريع' : 'All Projects'}</MenuItem>
              {projectOptions.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.code ? `${p.code} — ${p.name}` : p.name}</MenuItem>
              ))}
            </Select>
            <TextField label={language === 'ar' ? 'من' : 'From'} size="small" type="date" value={dateFrom} onChange={(e)=>{ setDateFrom(e.target.value); try { if (e.target.value) localStorage.setItem('dashboard_date_from', e.target.value); else localStorage.removeItem('dashboard_date_from'); } catch {} }} />
            <TextField label={language === 'ar' ? 'إلى' : 'To'} size="small" type="date" value={dateTo} onChange={(e)=>{ setDateTo(e.target.value); try { if (e.target.value) localStorage.setItem('dashboard_date_to', e.target.value); else localStorage.removeItem('dashboard_date_to'); } catch {} }} />
            <Button variant="text" size="small" onClick={() => { setSelectedOrgId(''); setSelectedProjectId(''); setDateFrom(''); setDateTo(''); try { localStorage.removeItem('dashboard_scope_org'); localStorage.removeItem('dashboard_scope_project'); localStorage.removeItem('dashboard_date_from'); localStorage.removeItem('dashboard_date_to'); } catch {} }}>{language === 'ar' ? 'إعادة التعيين' : 'Reset'}</Button>
          </Box>
        </Box>
      </Collapse>
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1.5, mb: 3, overflowX: 'auto', pb: 1,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 3 },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
      }}>
        {loading && (!stats || stats.length === 0) ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Box key={`sk-${i}`} sx={{ flex: '0 0 auto', minWidth: { xs: 200, md: 'calc(16.666% - 10px)' } }}>
              <Card><CardContent>
                <Skeleton variant="text" width={80} height={16} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={120} height={28} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width={40} height={40} />
              </CardContent></Card>
            </Box>
          ))
        ) : (
          (stats ?? dashboardStats).map((stat) => (
            <Box key={stat.id} sx={{ flex: '0 0 auto', minWidth: { xs: 200, md: 'calc(16.666% - 10px)' } }}>
              <StatCard stat={stat as any} size="small" />
            </Box>
          ))
        )}
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {/* Monthly Revenue Chart */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(66.666% - 12px)' } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t.monthlyRevenue}
                </Typography>
                <Chip
                  size="small"
                  label={postedOnly ? (language === 'ar' ? 'مرحّلة فقط' : 'Posted only') : (language === 'ar' ? 'جميع المعاملات' : 'All transactions')}
                  color={postedOnly ? 'warning' : 'primary'}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatAxisTick} />
                    <Tooltip formatter={(value: any, name: any) => [formatAmount(Number(value)), name]} />
                    <Bar dataKey="revenue" fill="#1976d2" name={language === 'ar' ? 'الإيرادات' : 'Revenue'} />
                    <Bar dataKey="expenses" fill="#f44336" name={language === 'ar' ? 'المصروفات' : 'Expenses'} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Shortcuts Panel */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(33.333% - 12px)' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {language === 'ar' ? 'اختصارات سريعة' : 'Quick Shortcuts'}
              </Typography>

              {/* Main Data */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 1 }}>
                {language === 'ar' ? 'البيانات الأساسية' : 'Main Data'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Button variant="outlined" startIcon={<AccountTree />} onClick={() => navigate('/main-data/accounts-tree')} title={language === 'ar' ? 'فتح شجرة الحسابات' : 'Open Accounts Tree'} accessKey="A" aria-label="Accounts Tree">
                  {language === 'ar' ? 'شجرة الحسابات' : 'Accounts Tree'}
                </Button>
              </Box>

              {/* Transactions */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {language === 'ar' ? 'المعاملات' : 'Transactions'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Button variant="outlined" startIcon={<Receipt />} onClick={() => navigate('/transactions/all')} title={language === 'ar' ? 'عرض جميع المعاملات' : 'View all transactions'} accessKey="T" aria-label="All Transactions">
                  {language === 'ar' ? 'كل المعاملات' : 'All Transactions'}
                </Button>
              </Box>

              {/* Reports */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {language === 'ar' ? 'التقارير' : 'Reports'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Button variant="outlined" startIcon={<Assessment />} onClick={() => navigate('/reports/general-ledger')} title={language === 'ar' ? 'عرض دفتر الأستاذ' : 'Open General Ledger'} accessKey="G" aria-label="General Ledger">
                  {language === 'ar' ? 'دفتر الأستاذ' : 'General Ledger'}
                </Button>
                <Button variant="outlined" startIcon={<AccountBalance />} onClick={() => navigate('/reports/trial-balance')} title={language === 'ar' ? 'عرض ميزان المراجعة' : 'Open Trial Balance'} accessKey="B" aria-label="Trial Balance">
                  {language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
                </Button>
                <Button variant="outlined" startIcon={<TrendingUp />} onClick={() => navigate('/reports/profit-loss')} title={language === 'ar' ? 'عرض قائمة الدخل' : 'Open Profit & Loss'} accessKey="P" aria-label="Profit and Loss">
                  {language === 'ar' ? 'قائمة الدخل' : 'Profit & Loss'}
                </Button>
                <Button variant="outlined" startIcon={<AccountBalance />} onClick={() => navigate('/reports/balance-sheet')} title={language === 'ar' ? 'عرض الميزانية' : 'Open Balance Sheet'} accessKey="S" aria-label="Balance Sheet">
                  {language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}
                </Button>
              </Box>

              {/* Custom Shortcuts from Settings */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {language === 'ar' ? 'اختصارات مخصصة' : 'Custom Shortcuts'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                {(customShortcuts || []).map((sc, idx) => (
                  <Button key={idx}
                    variant="outlined"
                    startIcon={resolveShortcutIcon(sc.icon)}
                    onClick={() => navigate(sc.path)}
                    title={sc.label}
                    accessKey={sc.accessKey || undefined}
                    aria-label={sc.label}
                  >
                    {sc.label}
                  </Button>
                ))}
                {(customShortcuts || []).length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {language === 'ar' ? 'لا توجد اختصارات مخصصة. يمكنك إضافتها من إعدادات الشركة.' : 'No custom shortcuts. Add them from Company Settings.'}
                  </Typography>
                )}
              </Box>

              {/* My Shortcuts (per user) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {language === 'ar' ? 'اختصاراتي' : 'My Shortcuts'}
                </Typography>
                <Button size="small" variant="text" onClick={manageUserShortcuts}>
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                {(userShortcuts || []).map((sc, idx) => (
                  <Button key={idx}
                    variant="outlined"
                    startIcon={resolveShortcutIcon(sc.icon)}
                    onClick={() => navigate(sc.path)}
                    title={sc.label}
                    accessKey={sc.accessKey || undefined}
                    aria-label={sc.label}
                  >
                    {sc.label}
                  </Button>
                ))}
                {(userShortcuts || []).length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {language === 'ar' ? 'يمكنك إضافة اختصاراتك الشخصية عبر زر تعديل.' : 'You can add your personal shortcuts via Edit.'}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Transactions */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t.recentTransactions}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={() => window.dispatchEvent(new CustomEvent('transactions:refresh'))}>
                {language === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
              <Button variant="outlined" size="small" onClick={() => navigate('/transactions/all')}>
                {t.viewAll}
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{language === 'ar' ? 'التاريخ' : 'Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{language === 'ar' ? 'الوصف' : 'Description'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{language === 'ar' ? 'الفئة' : 'Category'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{language === 'ar' ? 'النوع' : 'Type'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{language === 'ar' ? 'الحالة' : 'Status'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`row-sk-${i}`}>
                      <TableCell><Skeleton width={100} /></TableCell>
                      <TableCell><Skeleton width={220} /></TableCell>
                      <TableCell><Skeleton width={160} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell><Skeleton width={80} /></TableCell>
                      <TableCell align="right"><Skeleton width={120} /></TableCell>
                    </TableRow>
                  ))
                )}
                {!loading && !error && recent.length === 0 && (
                  <TableRow><TableCell colSpan={6}>{language === 'ar' ? 'لا توجد معاملات حديثة' : 'No recent transactions'}</TableCell></TableRow>
                )}
                {!loading && !error && recent.map((transaction) => {
                  // Cast to access is_posted property
                  const tx = transaction as any;
                  return (
                    <TableRow key={transaction.id} hover>
                      <TableCell>{formatDate(transaction.entry_date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.category ?? '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type === 'income' ? t.income : t.expense}
                          color={transaction.type === 'income' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tx.is_posted ? (language === 'ar' ? 'مرحّلة' : 'Posted') : (language === 'ar' ? 'غير مرحّلة' : 'Draft')}
                          color={tx.is_posted ? 'success' : 'warning'}
                          size="small"
                          variant={tx.is_posted ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: transaction.type === 'income' ? 'success.main' : 'error.main',
                          fontWeight: 600,
                        }}
                      >
                        {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;





