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
  TextField,
  Alert,
  Skeleton,
  Collapse,
  IconButton,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys, fetchCategoryTotals, fetchRecentActivity, prefetchDashboardQueries } from '../services/dashboard-queries';
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
import { getCompanyConfig } from '../services/company-config';
import { useScope } from '../contexts/ScopeContext';
import { ScopeChips } from '../components/Scope/ScopeChips';
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
  const { language, demoMode } = useAppStore();
  const navigate = useNavigate();
  const t = translations[language];

  // Use centralized scope context for org/project selection
  const { currentOrg, currentProject, getOrgId, getProjectId } = useScope();

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
  // Date filters (org/project now from ScopeContext)
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [numbersOnlyDashboard, setNumbersOnlyDashboard] = React.useState<boolean>(false);
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [postedOnly, setPostedOnly] = React.useState<boolean>(false); // Default: show all transactions

  // Query-driven, hydrated by prefetch - now using ScopeContext
  const orgIdForQuery = getOrgId() || undefined;
  const projectIdForQuery = getProjectId() || undefined;
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

  const formatAmount = React.useCallback((amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    // Format number with company number_format and optional currency symbol
    const formatter = new Intl.NumberFormat(numberFormat || 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formatted = formatter.format(Math.abs(amount));
    if (numbersOnlyDashboard) return formatted;
    return currencySymbol && currencySymbol !== 'none' ? `${formatted} ${currencySymbol}` : formatted;
  }, [currencySymbol, numberFormat, numbersOnlyDashboard]);

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
  }, [categoryTotalsQ, formatAmount, language, numberFormat, numbersOnlyDashboard, t.totalExpenses, t.totalRevenue]);
  const axisNumberFormatter = React.useMemo(() => new Intl.NumberFormat(numberFormat || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), [numberFormat]);
  const compactNumberFormatter = React.useMemo(() => new Intl.NumberFormat(numberFormat || 'en-US', { notation: 'compact', maximumFractionDigits: 1 }), [numberFormat]);
  const formatAxisTick = (v: number) => {
    const num = Math.abs(Number(v) || 0);
    const useCompact = compactTicks && num >= 1000;
    const s = useCompact ? compactNumberFormatter.format(num) : axisNumberFormatter.format(num);
    return currencySymbol && currencySymbol !== 'none' ? `${s} ${currencySymbol}` : s;
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
  const toDateStr = React.useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  type PresetKey = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'ytd' | 'thisYear' | 'all';

  const presetRange = React.useCallback((preset: PresetKey): { from: string; to: string } => {
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
  }, [toDateStr]);

  const setPreset = (preset: PresetKey) => {
    const { from, to } = presetRange(preset);
    setDateFrom(from);
    setDateTo(to);
    try {
      if (from) localStorage.setItem('dashboard_date_from', from); else localStorage.removeItem('dashboard_date_from');
      if (to) localStorage.setItem('dashboard_date_to', to); else localStorage.removeItem('dashboard_date_to');
    } catch { }
  };

  const activePreset = React.useMemo<PresetKey | null>(() => {
    const candidates: PresetKey[] = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'ytd', 'thisYear', 'all'];
    for (const key of candidates) {
      const r = presetRange(key);
      if ((r.from || '') === (dateFrom || '') && (r.to || '') === (dateTo || '')) return key;
    }
    return null;
  }, [dateFrom, dateTo, presetRange]);

  // Persist compact tick preference
  React.useEffect(() => {
    try {
      const v = localStorage.getItem('dashboard_compact_ticks');
      if (v !== null) setCompactTicks(v === 'true');
    } catch { }
  }, []);
  React.useEffect(() => {
    try { localStorage.setItem('dashboard_compact_ticks', String(compactTicks)); } catch { }
  }, [compactTicks]);

  // Load filter bar collapsed state
  React.useEffect(() => {
    try {
      const collapsed = localStorage.getItem('dashboard_filters_collapsed');
      if (collapsed !== null) setShowFilters(collapsed !== 'true');
    } catch { }
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem('dashboard_filters_collapsed', String(!showFilters)); } catch { }
  }, [showFilters]);

  // Load per-user shortcuts from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('dashboard_user_shortcuts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setUserShortcuts(parsed);
      }
    } catch { }
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
    } catch {
      alert(language === 'ar' ? 'صيغة غير صحيحة للاختصارات.' : 'Invalid shortcuts JSON.');
    }
  };

  // Resolve icon string to component for custom shortcuts
  const resolveShortcutIcon = (name?: string) => {
    switch ((name || '').toLowerCase()) {
      case 'accounttree':
      case 'tree':
        return <AccountTree />;
      case 'receiptlong':
      case 'transactions':
        return <Receipt />;
      case 'menubook':
      case 'ledger':
        return <Assessment />;
      case 'balance':
      case 'scale':
        return <AccountBalance />;
      case 'trendingup':
      case 'profit':
        return <TrendingUp />;
      case 'accountbalance':
      case 'balancesheet':
        return <AccountBalance />;
      default:
        return undefined;
    }
  };

  // Load dashboard data from Supabase and derive type/category and aggregates
  // Prime date filters from storage (org/project now from ScopeContext)
  React.useEffect(() => {
    try {
      const df = localStorage.getItem('dashboard_date_from');
      const dt = localStorage.getItem('dashboard_date_to');
      const no = localStorage.getItem('dashboard_numbers_only');
      const po = localStorage.getItem('dashboard_posted_only');
      if (df) setDateFrom(df);
      if (dt) setDateTo(dt);
      if (no) setNumbersOnlyDashboard(no === 'true');
      if (po) setPostedOnly(po === 'true');
    } catch { }
  }, []);

  const load = React.useCallback(async () => {
    if (demoMode) {
      setError(null);
      setLoading(false);
      setLastUpdated(new Date());
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }));
      }
      setChartData(months.map((m, i) => ({ month: m, revenue: 120000 + i * 8000, expenses: 85000 + i * 5000 })));
      return;
    }

    const monitor = getConnectionMonitor();
    const isOnline = monitor.getHealth().isOnline;

    setLoading(true);
    setError(null);
    try {
      const orgId = getOrgId();
      const projectId = getProjectId();

      // 1. Load company config (hardened)
      const cfg = await getCompanyConfig();
      setCurrencySymbol(cfg.currency_symbol || 'none');
      setNumberFormat(cfg.number_format || (language === 'ar' ? 'ar-SA' : 'en-US'));
      setDateFormat(cfg.date_format || 'YYYY-MM-DD');
      setCustomShortcuts(Array.isArray((cfg as any).shortcuts) ? ((cfg as any).shortcuts as any) : []);

      // 2. Fetch Highlight Accounts (with offline fallback)
      let highlights: any[] = [];
      if (isOnline) {
        try {
          const { data: accountsData, error: accountsError } = await supabase
            .from('accounts')
            .select('id, code, name, category, normal_balance')
            .in('code', ['1101', '1102', '1201'])
            .eq('is_active', true);

          if (!accountsError && accountsData) {
            highlights = accountsData;
            const { getOfflineDB } = await import('../services/offline/core/OfflineSchema');
            await getOfflineDB().metadata.put({
              key: 'dashboard_highlights_accounts',
              value: accountsData,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('Dashboard accounts fetch failed');
        }
      } else {
        try {
          const { getOfflineDB } = await import('../services/offline/core/OfflineSchema');
          const cached = await getOfflineDB().metadata.get('dashboard_highlights_accounts');
          if (cached && Array.isArray(cached.value)) highlights = cached.value;
        } catch { }
      }

      // 3. Chart Data (Last 6 Months)
      // For now we still perform the range query but we GUARD it
      if (isOnline) {
        const { getReadMode } = await import('../config/featureFlags');
        const readMode = getReadMode();
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const startStr = start.toISOString().slice(0, 10);

        let txs: any[] = [];
        const applyScope = (q: any) => {
          if (orgId) q = q.eq('org_id', orgId);
          if (projectId) q = q.eq('project_id', projectId);
          return q;
        };

        if (readMode !== 'legacy') {
          let rangeQ = supabase
            .from('v_gl2_journals_enriched')
            .select('journal_id, posting_date, amount, debit_account_code, credit_account_code, status')
            .gte('posting_date', startStr);
          rangeQ = applyScope(rangeQ);
          if (postedOnly) rangeQ = rangeQ.eq('status', 'posted');
          const { data } = await rangeQ as any;
          txs = data || [];
        } else {
          let rangeQ = supabase
            .from('transactions')
            .select('id, entry_date, amount, debit_account_id, credit_account_id, is_posted')
            .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
            .gte('entry_date', startStr);
          rangeQ = applyScope(rangeQ);
          if (postedOnly) rangeQ = rangeQ.eq('is_posted', true);
          const { data } = await rangeQ;
          txs = data || [];
        }

        // Process monthly aggregates
        const monthKeys: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthKeys.push(d.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' }));
        }

        const revenueByMonth = Array(6).fill(0);
        const expensesByMonth = Array(6).fill(0);

        // Map account categories for mapping
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, code, category')
          .in('category', ['revenue', 'expense']);

        const acctMap: Record<string, string> = {};
        const codeMap: Record<string, string> = {};
        for (const a of accountsData || []) {
          acctMap[a.id] = a.category;
          if (a.code) codeMap[a.code] = a.category;
        }

        for (const r of txs) {
          const dateVal = (r as any).entry_date || (r as any).doc_date || (r as any).posting_date;
          if (!dateVal) continue;
          const d = new Date(dateVal);
          const key = d.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
          const idx = monthKeys.indexOf(key);
          if (idx < 0) continue;

          const amt = Number((r as any).amount ?? 0);
          const debitCat = (r as any).debit_account_id ? acctMap[(r as any).debit_account_id] : ((r as any).debit_account_code ? codeMap[(r as any).debit_account_code] : null);
          const creditCat = (r as any).credit_account_id ? acctMap[(r as any).credit_account_id] : ((r as any).credit_account_code ? codeMap[(r as any).credit_account_code] : null);

          if (creditCat === 'revenue') revenueByMonth[idx] += amt;
          if (debitCat === 'expense') expensesByMonth[idx] += amt;
        }

        setChartData(monthKeys.map((month, i) => ({ month, revenue: revenueByMonth[i], expenses: expensesByMonth[i] })));
      } else {
        // Offline chart fallback: static msg or empty
        setChartData([]);
      }

      setLastUpdated(new Date());
    } catch (e: any) {
      if (isOnline) setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, demoMode, language, postedOnly, getOrgId, getProjectId]);

  React.useEffect(() => {
    void load();
  }, [load, currentOrg, currentProject, dateFrom, dateTo]);

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
              control={<Switch size="small" checked={numbersOnlyDashboard} onChange={(e) => { setNumbersOnlyDashboard(e.target.checked); try { localStorage.setItem('dashboard_numbers_only', String(e.target.checked)); } catch { } }} />}
              label={language === 'ar' ? 'أرقام فقط' : 'Numbers only'}
            />
            <FormControlLabel
              control={<Switch size="small" checked={postedOnly} onChange={(e) => { setPostedOnly(e.target.checked); try { localStorage.setItem('dashboard_posted_only', String(e.target.checked)); } catch { } }} />}
              label={language === 'ar' ? 'المرحلة فقط' : 'Posted only'}
            />
            {/* Org/Project selection is now in TopBar via ScopeContext */}
            <ScopeChips showLabels={false} size="small" variant="outlined" />
            <TextField label={language === 'ar' ? 'من' : 'From'} size="small" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); try { if (e.target.value) localStorage.setItem('dashboard_date_from', e.target.value); else localStorage.removeItem('dashboard_date_from'); } catch { } }} InputLabelProps={{ shrink: true }} />
            <TextField label={language === 'ar' ? 'إلى' : 'To'} size="small" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); try { if (e.target.value) localStorage.setItem('dashboard_date_to', e.target.value); else localStorage.removeItem('dashboard_date_to'); } catch { } }} InputLabelProps={{ shrink: true }} />
            <Button variant="text" size="small" onClick={() => { setDateFrom(''); setDateTo(''); try { localStorage.removeItem('dashboard_date_from'); localStorage.removeItem('dashboard_date_to'); } catch { } }}>{language === 'ar' ? 'إعادة التعيين' : 'Reset Dates'}</Button>
          </Box>
        </Box>
      </Collapse>
      <Box sx={{
        display: 'flex', flexWrap: 'nowrap', gap: 1.5, mb: 3, overflowX: 'auto', pb: 1,
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





