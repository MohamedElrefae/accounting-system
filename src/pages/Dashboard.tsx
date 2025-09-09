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
import useAppStore from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BalanceIcon from '@mui/icons-material/Balance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
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
      if (so) setSelectedOrgId(so);
      if (sp) setSelectedProjectId(sp);
      if (df) setDateFrom(df);
      if (dt) setDateTo(dt);
      if (no) setNumbersOnlyDashboard(no === 'true');
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
      setCustomShortcuts(Array.isArray((cfg as any).shortcuts) ? ((cfg as any).shortcuts as any) : []);

      // Fetch accounts map once (include normal_balance)
      const { data: accts, error: acctErr } = await supabase
        .from('accounts')
        .select('id, name, category, normal_balance');
      if (acctErr) throw acctErr;
      const acctMap: Record<string, { id: string; name?: string | null; category?: string | null; normal_balance?: 'debit' | 'credit' | null }> = {};
      for (const a of accts || []) {
        acctMap[a.id] = { id: a.id, name: a.name, category: (a as any).category ?? null, normal_balance: (a as any).normal_balance ?? null };
      }

      // 1) Recent 10 transactions
      let recentQ = supabase
        .from('transactions')
        .select('id, entry_date, description, amount, debit_account_id, credit_account_id, is_posted')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      recentQ = applyScope(recentQ);
      const { data: txRecent, error: txErr } = await recentQ;
      if (txErr) throw txErr;
      const rows = txRecent || [];

      const recentDerived: RecentRow[] = rows.map(r => {
        const debitCat = acctMap[r.debit_account_id]?.category || null;
        const creditCat = acctMap[r.credit_account_id]?.category || null;
        // Only classify as income if credit account is revenue; classify as expense if debit account is expense.
        // Do NOT treat equity/liability/asset movements as income.
        let type: 'income' | 'expense' = 'income';
        if (debitCat === 'expense') type = 'expense';
        else if (creditCat === 'revenue') type = 'income';
        let category: string | null = null;
        if (type === 'expense') category = acctMap[r.debit_account_id]?.name ?? debitCat ?? null;
        else category = acctMap[r.credit_account_id]?.name ?? creditCat ?? null;
        return { id: r.id, entry_date: r.entry_date, description: r.description, amount: r.amount, debit_account_id: r.debit_account_id, credit_account_id: r.credit_account_id, type, category } as RecentRow;
      });
      setRecent(recentDerived);

      // 2) Window for charts: last 6 months
      const now = new Date();
      // Date range
      let startStr = '';
      if (dateFrom) startStr = dateFrom;
      else {
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        startStr = start.toISOString().slice(0, 10);
      }

      let rangeQ = supabase
        .from('transactions')
        .select('id, entry_date, amount, debit_account_id, credit_account_id, is_posted')
        .gte('entry_date', startStr)
        .order('entry_date', { ascending: true });
      if (dateTo) {
        rangeQ = rangeQ.lte('entry_date', dateTo);
      }
      rangeQ = applyScope(rangeQ);
      const { data: txRange, error: rangeErr } = await rangeQ;
      if (rangeErr) throw rangeErr;
      const txs = txRange || [];

      // Build monthly buckets
      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
        monthKeys.push(key);
      }
      const revenueByMonth: number[] = Array(6).fill(0);
      const expensesByMonth: number[] = Array(6).fill(0);

      // Running totals (natural-sign balances)
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;
      let totalRevenue = 0;
      let totalExpenses = 0;
      let pendingCount = 0;

      for (const r of txs) {
        const d = new Date(r.entry_date);
        const key = d.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
        const idx = monthKeys.indexOf(key);

        const debit = acctMap[r.debit_account_id];
        const credit = acctMap[r.credit_account_id];
        const debitCat = debit?.category || null;
        const creditCat = credit?.category || null;
        // const creditName = credit?.name || '—';

        // Natural-sign rollup per category using normal_balance
        const debitNormal = debit?.normal_balance || 'debit';
        const creditNormal = credit?.normal_balance || 'credit';
        // Debit leg
        if (debitCat) {
          const delta = (debitNormal === 'debit' ? 1 : -1) * r.amount;
          if (debitCat === 'asset') totalAssets += delta;
          else if (debitCat === 'liability') totalLiabilities += delta;
          else if (debitCat === 'equity') totalEquity += delta;
          else if (debitCat === 'revenue') totalRevenue += delta;
          else if (debitCat === 'expense') {
            totalExpenses += delta;
            if (idx >= 0) expensesByMonth[idx] += r.amount; // chart uses raw expense amounts per month
          }
        }
        // Credit leg
        if (creditCat) {
          const delta = (creditNormal === 'debit' ? -1 : 1) * r.amount;
          if (creditCat === 'asset') totalAssets += delta;
          else if (creditCat === 'liability') totalLiabilities += delta;
          else if (creditCat === 'equity') totalEquity += delta;
          else if (creditCat === 'revenue') {
            totalRevenue += delta;
            if (idx >= 0) revenueByMonth[idx] += r.amount; // chart revenue per month
          }
          // credit to expenses rarely occurs, ignore for breakdown/chart
        }

        if (r.is_posted === false) pendingCount += 1;
      }

      // Ensure natural-sign totals are positive for display
      totalAssets = Math.max(totalAssets, 0);
      totalLiabilities = Math.max(totalLiabilities, 0);
      totalEquity = Math.max(totalEquity, 0);
      totalRevenue = Math.max(totalRevenue, 0);
      totalExpenses = Math.max(totalExpenses, 0);
      const netProfit = totalRevenue - totalExpenses;

      // Compose stat cards (fallback to mock colors/icons semantics)
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

      // Compose chart data rows
      setChartData(monthKeys.map((month, i) => ({ month, revenue: revenueByMonth[i], expenses: expensesByMonth[i] })));

    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [language]);

  React.useEffect(() => {
    void load();
  }, [load, selectedOrgId, selectedProjectId, dateFrom, dateTo]);
  

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
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{language === 'ar' ? 'المؤشرات المالية' : 'Financial Indicators'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch size="small" checked={compactTicks} onChange={(e) => setCompactTicks(e.target.checked)} />}
            label={language === 'ar' ? 'تقريب القيم الكبيرة' : 'Compact ticks'}
          />
          <IconButton size="small" onClick={() => setShowFilters(v => !v)} aria-label={language === 'ar' ? 'إظهار/إخفاء المرشحات' : 'Toggle filters'}>
            <ExpandMoreIcon sx={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </IconButton>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {(language === 'ar' ? 'آخر تحديث: ' : 'Last updated: ') + new Date(lastUpdated).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </Typography>
          )}
          <Button variant="outlined" size="small" onClick={async () => { setRefreshing(true); await load(); setRefreshing(false); }} startIcon={refreshing ? <CircularProgress size={14} /> : undefined} disabled={refreshing}>
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
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {t.monthlyRevenue}
              </Typography>
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
                <Button variant="outlined" startIcon={<AccountTreeIcon />} onClick={() => navigate('/main-data/accounts-tree')} title={language === 'ar' ? 'فتح شجرة الحسابات' : 'Open Accounts Tree'} accessKey="A" aria-label="Accounts Tree">
                  {language === 'ar' ? 'شجرة الحسابات' : 'Accounts Tree'}
                </Button>
              </Box>

              {/* Transactions */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {language === 'ar' ? 'المعاملات' : 'Transactions'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => navigate('/transactions/all')} title={language === 'ar' ? 'عرض جميع المعاملات' : 'View all transactions'} accessKey="T" aria-label="All Transactions">
                  {language === 'ar' ? 'كل المعاملات' : 'All Transactions'}
                </Button>
              </Box>

              {/* Reports */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {language === 'ar' ? 'التقارير' : 'Reports'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <Button variant="outlined" startIcon={<MenuBookIcon />} onClick={() => navigate('/reports/general-ledger')} title={language === 'ar' ? 'عرض دفتر الأستاذ' : 'Open General Ledger'} accessKey="G" aria-label="General Ledger">
                  {language === 'ar' ? 'دفتر الأستاذ' : 'General Ledger'}
                </Button>
                <Button variant="outlined" startIcon={<BalanceIcon />} onClick={() => navigate('/reports/trial-balance')} title={language === 'ar' ? 'عرض ميزان المراجعة' : 'Open Trial Balance'} accessKey="B" aria-label="Trial Balance">
                  {language === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
                </Button>
                <Button variant="outlined" startIcon={<TrendingUpIcon />} onClick={() => navigate('/reports/profit-loss')} title={language === 'ar' ? 'عرض قائمة الدخل' : 'Open Profit & Loss'} accessKey="P" aria-label="Profit and Loss">
                  {language === 'ar' ? 'قائمة الدخل' : 'Profit & Loss'}
                </Button>
                <Button variant="outlined" startIcon={<AccountBalanceIcon />} onClick={() => navigate('/reports/balance-sheet')} title={language === 'ar' ? 'عرض الميزانية' : 'Open Balance Sheet'} accessKey="S" aria-label="Balance Sheet">
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
            <Button variant="outlined" size="small">
              {t.viewAll}
            </Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{'Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Description'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Category'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{'Type'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{'Amount'}</TableCell>
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
                      <TableCell align="right"><Skeleton width={120} /></TableCell>
                    </TableRow>
                  ))
                )}
                {!loading && !error && recent.length === 0 && (
                  <TableRow><TableCell colSpan={5}>{'No recent transactions'}</TableCell></TableRow>
                )}
                {!loading && !error && recent.map((transaction) => (
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;





