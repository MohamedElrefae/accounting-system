import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AccountExplorer.module.css';
import ExportButtons from '../../components/Common/ExportButtons';
import PresetBar from '../../components/Common/PresetBar';
import { useReportPresets } from '../../hooks/useReportPresets';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager';
import ReportTreeView from '../../components/TreeView/ReportTreeView';
// Removed tableColWidths to avoid inline styles; allow auto table sizing like GL layout
import { fetchAccountExplorerNode, type AccountExplorerRow, verifyAccountSummary, fetchTransactionsDateRange } from '../../services/reports/account-explorer';
import { fetchGLTotals, type GLTotals } from '../../services/reports/gl-account-summary';
import { fetchProjects, fetchOrganizations, type LookupOption } from '../../services/lookups';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './StandardFinancialStatements.css';
import { getCompanyConfig } from '../../services/company-config';

function getInitialOrgId(): string {
  try {
    const qp = new URLSearchParams(window.location.search);
    const q = qp.get('orgId');
    if (q && q.length > 0) return q;
  } catch {}
  try {
    const v = localStorage.getItem('org_id');
    if (v && v.length > 0) return v;
  } catch {}
  return '';
}


type Mode = 'asof' | 'range';

type ViewMode = 'tree' | 'table';

const AccountExplorerPage: React.FC = () => {
  // Numbers-only (hide currency symbol) for exports
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true);
  useEffect(() => { try { const v = localStorage.getItem('ae_numbersOnly'); if (v !== null) setNumbersOnly(v === 'true'); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('ae_numbersOnly', String(numbersOnly)); } catch {} }, [numbersOnly]);
  const [mode, setMode] = useState<Mode>('asof');
  const [postedOnly, setPostedOnly] = useState<boolean>(false);
  const [hideZero, setHideZero] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string>('');
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([]);
  const [orgOptions, setOrgOptions] = useState<LookupOption[]>([]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0,10));
  const [dateFrom, setDateFrom] = useState<string>('');

  const [nodes, setNodes] = useState<AccountExplorerRow[]>([]);
  const [orgId, setOrgId] = useState<string>(getInitialOrgId());
  const [glTotals, setGlTotals] = useState<GLTotals | null>(null);
  const [, setIsTotalsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSubtotals, setShowSubtotals] = useState<boolean>(true);
  const [showGrandTotal, setShowGrandTotal] = useState<boolean>(true);
  const [showTxnCount, setShowTxnCount] = useState<boolean>(false);
  const orgSelectRef = useRef<HTMLSelectElement | null>(null);
  
  // Company name for report header
  const [companyName, setCompanyName] = useState<string>('')

  const { showToast } = useToast();

  // Presets
  const reportKey = 'account-explorer';
  const { presets, selectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey);

  useEffect(() => {
    // Parse query params from deep-links (from GL)
    try {
      const qp = new URLSearchParams(window.location.search);
      // const qOrg = qp.get('orgId');
      const qProj = qp.get('projectId');
      const qPosted = qp.get('postedOnly');
      const qMode = qp.get('mode');
      const qFrom = qp.get('dateFrom');
      const qTo = qp.get('dateTo');
      const qOrg = qp.get('orgId');
      if (qOrg) setOrgId(qOrg);
      if (qProj) setProjectId(qProj);
      if (qPosted != null) setPostedOnly(qPosted === 'true');
      if (qMode === 'asof' || qMode === 'range') setMode(qMode as Mode);
      if (qFrom) setDateFrom(qFrom);
      if (qTo) setDateTo(qTo);
    } catch {}

    // Load organizations and projects for selectors
    Promise.all([
      fetchOrganizations(),
      fetchProjects(),
    ]).then(([orgs, projs]) => {
      setOrgOptions(orgs || []);
      setProjectOptions(projs || []);
      // Auto-select if none selected: prefer sole org, else first org
      try {
        if (!orgId && Array.isArray(orgs) && orgs.length > 0) {
          const chosen = orgs[0] as LookupOption;
          if (chosen && chosen.id) {
            setOrgId(chosen.id);
            try { localStorage.setItem('org_id', chosen.id); } catch {}
          }
        }
      } catch {}
    }).catch(() => {});

    loadPresetsAndApplyLast((p) => {
      const f: any = p.filters || {};
      setMode((f.mode as Mode) || 'asof');
      setPostedOnly(typeof f.postedOnly === 'boolean' ? f.postedOnly : postedOnly);
      setHideZero(typeof f.hideZero === 'boolean' ? f.hideZero : hideZero);
      setProjectId(f.projectId || '');
      setDateFrom(f.dateFrom || '');
      setDateTo(f.dateTo || new Date().toISOString().slice(0,10));
    }).catch(() => {});
  }, []);

  // Load company name for report header
  useEffect(() => {
    (async () => {
      try {
        const config = await getCompanyConfig()
        setCompanyName(config?.company_name || '')
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try {
      const s1 = localStorage.getItem('ae_showSubtotals');
      if (s1 !== null) setShowSubtotals(s1 === 'true');
      const s2 = localStorage.getItem('ae_showGrandTotal');
      if (s2 !== null) setShowGrandTotal(s2 === 'true');
      const s3 = localStorage.getItem('ae_showTxnCount');
      if (s3 !== null) setShowTxnCount(s3 === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    // Default: load roots and expand L1
    loadRoots().then(() => {}).catch(() => {});
  }, [mode, postedOnly, projectId, dateTo, dateFrom, orgId]);

  // Auto-set default date range from first to last transaction for current filters
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchTransactionsDateRange({
          orgId: orgId || null,
          projectId: projectId || null,
          postedOnly: postedOnly,
        });
        if (r && (r.min_date || r.max_date)) {
          if (!dateFrom || dateFrom.length === 0) setDateFrom(r.min_date || '');
          if (!dateTo || dateTo.length === 0) setDateTo(r.max_date || new Date().toISOString().slice(0,10));
        }
      } catch {}
    })();
  }, [orgId, projectId, postedOnly]);

  // Fetch global totals from server for current filters
  useEffect(() => {
    (async () => {
      try {
        if (!orgId && !projectId) {
          // Still compute based on available filters (both can be null)
        }
        setIsTotalsLoading(true);
        const totals = await fetchGLTotals({
          dateFrom: mode === 'range' ? (dateFrom || null) : null,
          dateTo: dateTo || null,
          orgId: orgId || null,
          projectId: projectId || null,
          postedOnly: postedOnly,
        });
        setGlTotals(totals);
      } catch {
        setGlTotals(null);
      } finally {
        setIsTotalsLoading(false);
      }
    })();
  }, [mode, postedOnly, projectId, dateTo, dateFrom, orgId]);

  useEffect(() => { try { localStorage.setItem('ae_showSubtotals', String(showSubtotals)); } catch {} }, [showSubtotals]);
  useEffect(() => { try { localStorage.setItem('ae_showGrandTotal', String(showGrandTotal)); } catch {} }, [showGrandTotal]);
  useEffect(() => { try { localStorage.setItem('ae_showTxnCount', String(showTxnCount)); } catch {} }, [showTxnCount]);

  // Persist view mode
  useEffect(() => {
    try { localStorage.setItem('accountExplorer_viewMode', viewMode); } catch {}
  }, [viewMode]);
  useEffect(() => {
    try {
      const v = localStorage.getItem('accountExplorer_viewMode');
      if (v === 'tree' || v === 'table') setViewMode(v);
    } catch {}
  }, []);

  async function loadRoots() {
    try {
      if (!orgId) { setNodes([]); return; }
      // Try with current filters first
      let rows = await fetchAccountExplorerNode({
        orgId: orgId || null,
        parentId: null,
        dateFrom: mode === 'range' ? (dateFrom || null) : null,
        dateTo,
        postedOnly,
        projectId: projectId || null,
        mode,
      });
      // If nothing, relax filters progressively: allow unposted, then switch to as-of
      if ((!rows || rows.length === 0) && postedOnly) {
        rows = await fetchAccountExplorerNode({
          orgId: orgId || null,
          parentId: null,
          dateFrom: mode === 'range' ? (dateFrom || null) : null,
          dateTo,
          postedOnly: false,
          projectId: projectId || null,
          mode,
        });
      }
      if ((!rows || rows.length === 0) && mode === 'range') {
        rows = await fetchAccountExplorerNode({
          orgId: orgId || null,
          parentId: null,
          dateFrom: null,
          dateTo,
          postedOnly: false,
          projectId: projectId || null,
          mode: 'asof',
        });
      }
      setNodes(rows);
      // expand L1 by default
      setExpanded(new Set((rows || []).map(r => r.id)));
    } catch (e:any) {
      showToast(e?.message || 'فشل تحميل البيانات', { severity: 'error' });
    }
  }

  async function loadChildren(parentId: string) {
    // fetch and merge immediate children for a given parent
    try {
      let rows = await fetchAccountExplorerNode({
        orgId: orgId || null,
        parentId,
        dateFrom: mode === 'range' ? (dateFrom || null) : null,
        dateTo,
        postedOnly,
        projectId: projectId || null,
        mode,
      });
      if ((!rows || rows.length === 0) && postedOnly) {
        rows = await fetchAccountExplorerNode({
          orgId: orgId || null,
          parentId,
          dateFrom: mode === 'range' ? (dateFrom || null) : null,
          dateTo,
          postedOnly: false,
          projectId: projectId || null,
          mode,
        });
      }
      if ((!rows || rows.length === 0) && mode === 'range') {
        rows = await fetchAccountExplorerNode({
          orgId: orgId || null,
          parentId,
          dateFrom: null,
          dateTo,
          postedOnly: false,
          projectId: projectId || null,
          mode: 'asof',
        });
      }
      // merge, de-dup by id
      setNodes(prev => {
        const map = new Map(prev.map(x => [x.id, x] as const));
        for (const r of (rows || [])) map.set(r.id, r);
        return Array.from(map.values());
      });
    } catch (e:any) {
      showToast(e?.message || 'فشل تحميل البيانات', { severity: 'error' });
    }
  }

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    let arr = nodes;
    if (hideZero) {
      arr = arr.filter(r => {
        if (mode === 'asof') {
          const closing = Number(r.closing_debit || 0) + Number(r.closing_credit || 0);
          const tx = Number(r.transaction_count || 0);
          return !(closing === 0 && tx === 0);
        } else {
          const opening = Number(r.opening_debit || 0) + Number(r.opening_credit || 0);
          const period = Number(r.period_debits || 0) + Number(r.period_credits || 0);
          const tx = Number(r.transaction_count || 0);
          return !(opening === 0 && period === 0 && tx === 0);
        }
      });
    }
    if (!t) return arr;
    return arr.filter(n => (n.code || '').toLowerCase().includes(t) || (n.name_ar || n.name || '').toLowerCase().includes(t));
  }, [nodes, searchTerm]);

  // Expand to a target level (1..N) by lazy-loading as needed
  async function expandToLevel(targetLevel: number) {
    // Start from roots; BFS per level, loading children when needed
    // Ensure roots are loaded
    await loadRoots();
    let currentParents = nodes.filter(n => n.parent_id === null);
    const newExpanded = new Set<string>();
    for (let level = 1; level < targetLevel; level++) {
      // expand current parents
      for (const p of currentParents) {
        newExpanded.add(p.id);
        // load children if not already present
        const have = nodes.some(n => n.parent_id === p.id);
        if (!have) {
          await loadChildren(p.id);
        }
      }
      // next generation
      currentParents = nodes.filter(n => n.parent_id && newExpanded.has(n.parent_id));
    }
    setExpanded(newExpanded);
  }

  // Recursively fetch the full subtree from a selected node
  async function fetchFullSubtree(startId: string): Promise<AccountExplorerRow[]> {
    const acc: AccountExplorerRow[] = [];
    const byId = new Map(nodes.map(n => [n.id, n] as const));
    const queue: string[] = [startId];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      let nd = byId.get(id);
      if (!nd) {
        // If node not present locally (shouldn't happen for selected), try fetch parent immediate children to populate
        const pid = nodes.find(n => n.id === id)?.parent_id;
        if (pid) await loadChildren(pid);
        nd = nodes.find(n => n.id === id);
      }
      if (nd) acc.push(nd);
      // load children from RPC, push into queue
      const children = await fetchAccountExplorerNode({
        orgId: orgId || null,
        parentId: id,
        dateFrom: mode === 'range' ? (dateFrom || null) : null,
        dateTo,
        postedOnly,
        projectId: projectId || null,
        mode,
      });
      // merge into local cache map
      for (const c of children) {
        if (!byId.has(c.id)) {
          byId.set(c.id, c);
          setNodes(prev => {
            const m = new Map(prev.map(x => [x.id, x] as const));
            m.set(c.id, c);
            return Array.from(m.values());
          });
        }
        queue.push(c.id);
      }
    }
    return acc;
  }

  const computeVisibleTreeRows = () => {
    const byId = new Map(nodes.map(n => [n.id, n] as const));
    const children = new Map<string | null, string[]>();
    nodes.forEach(n => {
      const k = n.parent_id as string | null;
      const arr = children.get(k) || [];
      arr.push(n.id);
      children.set(k, arr);
    });
    const visible: AccountExplorerRow[] = [];
    const dfs = (id: string | null) => {
      const ids = children.get(id) || [];
      for (const childId of ids) {
        const node = byId.get(childId)!;
        visible.push(node);
        if (expanded.has(childId)) dfs(childId);
      }
    };
    dfs(null);
    return visible;
  };

  const visibleTreeRows = useMemo(() => viewMode === 'tree' ? computeVisibleTreeRows() : [], [viewMode, expanded, nodes]);

  // Health-check totals for current view/filters
  const computeHealthTotals = useMemo(() => {
    const rows = viewMode === 'tree' ? visibleTreeRows : filtered;
    const acc = {
      opening_debit: 0,
      opening_credit: 0,
      period_debits: 0,
      period_credits: 0,
      closing_debit: 0,
      closing_credit: 0,
    };
    for (const r of rows) {
      acc.opening_debit += Number(r.opening_debit || 0);
      acc.opening_credit += Number(r.opening_credit || 0);
      acc.period_debits += Number(r.period_debits || 0);
      acc.period_credits += Number(r.period_credits || 0);
      acc.closing_debit += Number(r.closing_debit || 0);
      acc.closing_credit += Number(r.closing_credit || 0);
    }
    return acc;
  }, [viewMode, visibleTreeRows, filtered]);

  // Export visible subtree helper
  const exportVisible = async (format: 'excel' | 'csv') => {
    if (!visibleTreeRows.length) return;
    const cols = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'text' },
      { key: 'name', header: 'اسم الحساب', type: 'text' },
      ...(mode === 'range' ? [
        { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      ] : [
        { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      ])
    ])
    const rows = visibleTreeRows.map(r => ({
      code: r.code,
      name: r.name_ar || r.name,
      opening_debit: Number(r.opening_debit || 0),
      opening_credit: Number(r.opening_credit || 0),
      period_debits: Number(r.period_debits || 0),
      period_credits: Number(r.period_credits || 0),
      closing_debit: Number(r.closing_debit || 0),
      closing_credit: Number(r.closing_credit || 0),
    }));
    const data = prepareTableData(cols, rows);
    const proj = projectOptions.find(p => p.id === projectId);
    const title = (() => {
      const chips: string[] = [];
      chips.push('تصدير التفريع الظاهر');
      chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
      if (postedOnly) chips.push('قيود معتمدة فقط');
      if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
      if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
      if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
      return chips.join(' — ');
    })();
    if (format === 'excel') await exportToExcel(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
    else await exportToCSV(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (['INPUT','TEXTAREA','SELECT'].includes(active.tagName) || active.isContentEditable);
      if (isTyping) return;
      // View toggles
      if (e.key.toLowerCase() === 'e') { setViewMode('tree'); return; }
      if (e.key.toLowerCase() === 't') { setViewMode('table'); return; }
      // Collapse all
      if (e.key.toLowerCase() === 'c') { setExpanded(new Set()); return; }
      // Expand selected branch
      if (e.key.toLowerCase() === 'x') {
        if (!selectedId) return;
        (async () => {
          const queue = [selectedId];
          const newSet = new Set(expanded);
          while (queue.length) {
            const id = queue.shift()!;
            newSet.add(id);
            const have = nodes.some(n => n.parent_id === id);
            if (!have) await loadChildren(id);
            const kids = nodes.filter(n => n.parent_id === id).map(n => n.id);
            queue.push(...kids);
          }
          setExpanded(newSet);
        })();
        return;
      }
      // Expand to levels 1-5
      if (['1','2','3','4','5'].includes(e.key)) {
        const lvl = parseInt(e.key, 10);
        expandToLevel(lvl).catch(() => {});
        return;
      }
      // Export visible
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') { exportVisible('excel'); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') { exportVisible('csv'); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, expanded, nodes, mode, postedOnly, hideZero, projectId, dateFrom, dateTo, viewMode]);

  // Legacy-style PDF export: capture the on-screen content inside #ae-report-content and paginate into A4 PDF
  async function exportAEToPDF() {
    const element = document.getElementById('ae-report-content') as HTMLElement | null;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (doc) => {
          const el = doc.getElementById('ae-report-content') as HTMLElement | null;
          if (el) {
            el.style.direction = 'rtl';
            el.style.textAlign = 'right';
            el.style.fontFamily = 'Arial, sans-serif';
            el.style.fontSize = '14px';
            el.style.lineHeight = '1.5';
            el.style.color = '#000000';
            (el.style as any).WebkitFontSmoothing = 'antialiased';
            (el.style as any).MozOsxFontSmoothing = 'grayscale';
            
            // Show the statement header for PDF capture
            const header = el.querySelector('.statement-header') as HTMLElement;
            if (header) {
              header.style.display = 'block';
            }
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pdfHeight - 20) {
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      } else {
        let yPos = 0;
        const pageHeight = pdfHeight - 20;
        while (yPos < imgHeight) {
          pdf.addImage(imgData, 'PNG', 10, 10 - yPos, imgWidth, imgHeight);
          yPos += pageHeight;
          if (yPos < imgHeight) pdf.addPage();
        }
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const filenameBase = 'مستكشف_الحسابات';
      pdf.save(`${filenameBase}_${currentDate}.pdf`);
    } catch (err) {
      console.error('AE PDF export failed', err);
      alert('فشل في تصدير PDF');
    }
  }

  const exportData = useMemo(() => {
    // Optionally export only currently visible nodes in tree when tree view is active
    const computeVisibleTreeRows = () => {
      const byId = new Map(nodes.map(n => [n.id, n] as const));
      const children = new Map<string | null, string[]>();
      nodes.forEach(n => {
        const k = n.parent_id as string | null;
        const arr = children.get(k) || [];
        arr.push(n.id);
        children.set(k, arr);
      });
      const visible: AccountExplorerRow[] = [];
      const dfs = (id: string | null) => {
        const ids = children.get(id) || [];
        for (const childId of ids) {
          const node = byId.get(childId)!;
          visible.push(node);
          if (expanded.has(childId)) dfs(childId);
        }
      };
      dfs(null);
      return visible;
    };

    const sourceRows = viewMode === 'tree' ? computeVisibleTreeRows() : filtered;
    // Build columns once
    const cols = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'text' },
      { key: 'name', header: 'اسم الحساب', type: 'text' },
      ...(mode === 'range' ? [
        { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      ] : [
        { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
        { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      ])
    ])
    const rows = sourceRows.map(r => ({
      code: r.code,
      name: r.name_ar || r.name,
      opening_debit: Number(r.opening_debit || 0),
      opening_credit: Number(r.opening_credit || 0),
      period_debits: Number(r.period_debits || 0),
      period_credits: Number(r.period_credits || 0),
      closing_debit: Number(r.closing_debit || 0),
      closing_credit: Number(r.closing_credit || 0),
    }));
    return prepareTableData(cols, rows);
  }, [filtered, mode, viewMode, expanded, nodes]);

  const navigateToGL = (row: AccountExplorerRow, hasChildren: boolean) => {
    const params = new URLSearchParams();
    params.set('accountId', row.id);
    if (orgId) params.set('orgId', orgId);
    if (projectId) params.set('projectId', projectId);
    if (mode === 'range' && dateFrom) params.set('dateFrom', dateFrom);
    params.set('dateTo', dateTo);
    params.set('postedOnly', String(postedOnly));
    params.set('includeOpening', String(true));
    params.set('includeChildrenInDrilldown', String(hasChildren));
    window.location.assign(`/reports/general-ledger?${params.toString()}`);
  };

return (
    <div className={styles.container} dir="rtl">
      {/* Dedicated Export PDF (legacy approach, not using universal export) */}
      <div className="export-controls">
        <button onClick={exportAEToPDF} className="export-pdf-btn" title="تصدير إلى PDF">
          <span className="export-icon">📄</span>
          تصدير PDF
        </button>
      </div>
      
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>مستكشف الحسابات (شجري)</h1>
          <div className={styles.subtleRow}>
            {orgId && (
              <span className={styles.modeChip}>
                المؤسسة: {(() => { const o = orgOptions.find(x => x.id === orgId); return o ? (o.code ? `${o.code} — ` : '') + (o.name_ar || o.name) : orgId; })()}
                {' '}
                <button
                  type="button"
                  onClick={() => { try { orgSelectRef.current?.focus(); } catch {} }}
                  className={styles.linkButton}
                  title="تغيير المؤسسة"
                >
                  تغيير
                </button>
              </span>
            )}
            <span className={styles.modeChip}>الوضع: {mode === 'asof' ? 'أرصدة حتى تاريخ' : 'حركة خلال فترة'}</span>
            {postedOnly && <span className={styles.modeChip}>قيود معتمدة فقط</span>}
            {hideZero && <span className={styles.modeChip}>إخفاء الأرصدة الصفرية</span>}
            {(showSubtotals || showGrandTotal) && (
              <span className={styles.modeChip}>المجاميع: {showSubtotals ? 'فروع' : ''}{showSubtotals && showGrandTotal ? ' + ' : ''}{showGrandTotal ? 'كلي' : ''}</span>
            )}
            {showTxnCount && <span className={styles.modeChip}>عرض عدد القيود</span>}
          </div>
          {glTotals && (
            <div className={styles.subtleRow}>
              {mode === 'range' && (
                <>
                  <span className={styles.modeChip}>افتتاحي — مدين: {glTotals.opening_debit.toLocaleString('ar-EG')} | دائن: {glTotals.opening_credit.toLocaleString('ar-EG')}</span>
                  <span className={styles.modeChip}>الفترة — مدين: {glTotals.period_debits.toLocaleString('ar-EG')} | دائن: {glTotals.period_credits.toLocaleString('ar-EG')}</span>
                </>
              )}
              <span className={styles.modeChip}>ختامي — مدين: {glTotals.closing_debit.toLocaleString('ar-EG')} | دائن: {glTotals.closing_credit.toLocaleString('ar-EG')}</span>
              <span className={styles.modeChip}>عدد القيود: {Number(glTotals.transaction_count || 0).toLocaleString('ar-EG')}</span>
            </div>
          )}
          {/* Full subtree export for selected node */}
          <div>
            <button
              className={styles.viewModeBtn}
              disabled={!selectedId}
              onClick={async () => {
                if (!selectedId) return;
                const rows = await fetchFullSubtree(selectedId);
                const cols = createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم الحساب', type: 'text' },
                  ...(mode === 'range' ? [
                    { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ] : [
                    { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ])
                ])
                const tableRows = rows.map(r => ({
                  code: r.code,
                  name: r.name_ar || r.name,
                  opening_debit: Number(r.opening_debit || 0),
                  opening_credit: Number(r.opening_credit || 0),
                  period_debits: Number(r.period_debits || 0),
                  period_credits: Number(r.period_credits || 0),
                  closing_debit: Number(r.closing_debit || 0),
                  closing_credit: Number(r.closing_credit || 0),
                }));
                const data = prepareTableData(cols, tableRows);
                const proj = projectOptions.find(p => p.id === projectId);
                const title = (() => {
                  const chips: string[] = [];
                  chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
                  if (postedOnly) chips.push('قيود معتمدة فقط');
                  if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
                  if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
                  if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
                  return `تفريع الحساب (كامل) — ${chips.join(' — ')}`;
                })();
                await exportToExcel(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
              }}
              title={!selectedId ? 'اختر حساباً من الشجرة أولاً' : 'تصدير التفريع الكامل (Excel)'}
>
              تصدير التفريع (Excel)
            </button>
            <button
              className={styles.viewModeBtn}
              disabled={!selectedId}
              onClick={async () => {
                if (!selectedId) return;
                const rows = await fetchFullSubtree(selectedId);
                const cols = createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم الحساب', type: 'text' },
                  ...(mode === 'range' ? [
                    { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ] : [
                    { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ])
                ])
                const tableRows = rows.map(r => ({
                  code: r.code,
                  name: r.name_ar || r.name,
                  opening_debit: Number(r.opening_debit || 0),
                  opening_credit: Number(r.opening_credit || 0),
                  period_debits: Number(r.period_debits || 0),
                  period_credits: Number(r.period_credits || 0),
                  closing_debit: Number(r.closing_debit || 0),
                  closing_credit: Number(r.closing_credit || 0),
                }));
                const data = prepareTableData(cols, tableRows);
                const proj = projectOptions.find(p => p.id === projectId);
                const title = (() => {
                  const chips: string[] = [];
                  chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
                  if (postedOnly) chips.push('قيود معتمدة فقط');
                  if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
                  if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
                  if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
                  return `تفريع الحساب (كامل) — ${chips.join(' — ')}`;
                })();
                await exportToCSV(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
              }}
              title={!selectedId ? 'اختر حساباً من الشجرة أولاً' : 'تصدير التفريع الكامل (CSV)'}
            >
              تصدير التفريع (CSV)
            </button>
          </div>
        </div>
        <div className={styles.pageActions}>
          <div className={styles.smallScale}>
            <PresetBar
              presets={presets}
              selectedPresetId={selectedPresetId}
              newPresetName={newPresetName}
              onChangePreset={async (id) => {
                await selectPresetAndApply(String(id), (p) => {
                  const f: any = p.filters || {};
                  setMode((f.mode as Mode) || mode);
                  setPostedOnly(typeof f.postedOnly === 'boolean' ? f.postedOnly : postedOnly);
                  setHideZero(typeof f.hideZero === 'boolean' ? f.hideZero : hideZero);
                  setProjectId(f.projectId || projectId);
                  setDateFrom(f.dateFrom || dateFrom);
                  setDateTo(f.dateTo || dateTo);
                });
              }}
              onChangeName={(v) => setNewPresetName(v)}
              onSave={async () => {
                if (!newPresetName.trim()) return;
                const saved = await saveCurrentPreset({
                  name: newPresetName.trim(),
                  filters: {
                    mode,
                    postedOnly,
                    hideZero,
                    projectId,
                    dateFrom,
                    dateTo,
                  },
                });
                if (saved) setNewPresetName('');
              }}
              onDelete={async () => { if (!selectedPresetId) return; await deleteSelectedPreset(); }}
              wrapperClassName={styles.presetBar}
              selectClassName={styles.presetSelect}
              inputClassName={styles.presetInput}
              buttonClassName={styles.presetButton}
              placeholder={'اسم التهيئة'}
              saveLabel={'حفظ'}
              deleteLabel={'حذف'}
            />
          </div>
          <div style={{display:'flex', gap: '8px', alignItems: 'center'}}>
            <button className={styles.viewModeBtn} onClick={() => setNumbersOnly(v => !v)} title="أرقام فقط في التصدير">
              {numbersOnly ? 'أرقام فقط: تشغيل' : 'أرقام فقط: إيقاف'}
            </button>
            <ExportButtons
            data={exportData}
            config={{
              title: (() => {
                const chips: string[] = [];
                chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
                if (postedOnly) chips.push('قيود معتمدة فقط');
                if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
                const proj = projectOptions.find(p => p.id === projectId);
                if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
                if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
                return `مستكشف الحسابات — ${chips.join(' — ')}`;
              })(),
              orientation: 'landscape', useArabicNumerals: true, rtlLayout: true
            }}
            size="small"
            layout="horizontal"
          />
        </div>
        </div>
      </header>

      <div className={styles.controlsContainer}>
        <div className={styles.searchAndFilters}>
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="البحث في الحسابات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          {/* Organization selector */}
          <select ref={orgSelectRef} value={orgId} onChange={(e) => { setOrgId(e.target.value); try { localStorage.setItem('org_id', e.target.value); } catch {} }} className={styles.filterSelect}>
            <option value="">اختر المؤسسة...</option>
            {orgOptions.map(o => (
              <option key={o.id} value={o.id}>{o.code ? `${o.code} - ` : ''}{o.name_ar || o.name}</option>
            ))}
          </select>

          {/* Filters moved to the unified filter bar above. Keeping only search here. */}
        </div>

        <div className={styles.viewModeToggle}>
          <div className={styles.expandControls}>
            <span className={styles.label}>توسيع:</span>
            <button className={styles.viewModeBtn} onClick={() => expandToLevel(1)}>L1</button>
            <button className={styles.viewModeBtn} onClick={() => expandToLevel(2)}>L2</button>
            <button className={styles.viewModeBtn} onClick={() => expandToLevel(3)}>L3</button>
            <button className={styles.viewModeBtn} onClick={() => setExpanded(new Set())}>طي الكل</button>
            <button className={styles.viewModeBtn} disabled={!selectedId} onClick={async () => {
              if (!selectedId) return;
              // Expand ancestors path first
              const idToExpand = selectedId;
              // Ensure children of selected are loaded and recursively expand
              const queue = [idToExpand];
              const newSet = new Set(expanded);
              while (queue.length) {
                const id = queue.shift()!;
                newSet.add(id);
                const have = nodes.some(n => n.parent_id === id);
                if (!have) await loadChildren(id);
                const kids = nodes.filter(n => n.parent_id === id).map(n => n.id);
                queue.push(...kids);
              }
              setExpanded(newSet);
            }}>توسيع الفرع المحدد</button>
          </div>

          {viewMode === 'tree' && (
            <div className={styles.visibleTools}>
              <button
                className={styles.viewModeBtn}
                disabled={(viewMode === 'tree' ? visibleTreeRows.length === 0 : filtered.length === 0)}
                onClick={() => {
                  const t = computeHealthTotals;
                  if (mode === 'range') {
                    showToast(
                      `مجموعات التحقق — افتتاحي (مدين: ${t.opening_debit.toLocaleString('ar-EG')}, دائن: ${t.opening_credit.toLocaleString('ar-EG')}) — الفترة (مدين: ${t.period_debits.toLocaleString('ar-EG')}, دائن: ${t.period_credits.toLocaleString('ar-EG')}) — ختامي (مدين: ${t.closing_debit.toLocaleString('ar-EG')}, دائن: ${t.closing_credit.toLocaleString('ar-EG')})`,
                      { severity: 'info' }
                    );
                  } else {
                    showToast(
                      `مجموعات التحقق — ختامي (مدين: ${t.closing_debit.toLocaleString('ar-EG')}, دائن: ${t.closing_credit.toLocaleString('ar-EG')})`,
                      { severity: 'info' }
                    );
                  }
                }}
                title={'عرض مجموعات التحقق الحالية'}
              >
                تحقق المجاميع
              </button>
              <label className={styles.filterCheckbox}>
                <input type="checkbox" checked={showSubtotals} onChange={(e)=>setShowSubtotals(e.target.checked)} />
                إظهار مجموعات الفروع
              </label>
              <label className={styles.filterCheckbox}>
                <input type="checkbox" checked={showGrandTotal} onChange={(e)=>setShowGrandTotal(e.target.checked)} />
                إظهار المجموع الكلي
              </label>
              <label className={styles.filterCheckbox}>
                <input type="checkbox" checked={showTxnCount} onChange={(e)=>setShowTxnCount(e.target.checked)} />
                إظهار عدد القيود
              </label>
              <span className={styles.label}>العقد الظاهرة: {visibleTreeRows.length.toLocaleString('ar-EG')}</span>
              <button className={styles.viewModeBtn} disabled={visibleTreeRows.length === 0} onClick={async () => {
                if (!visibleTreeRows.length) return;
                const cols = createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم الحساب', type: 'text' },
                  ...(mode === 'range' ? [
                    { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ] : [
                    { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ])
                ])
                const rows = visibleTreeRows.map(r => ({
                  code: r.code,
                  name: r.name_ar || r.name,
                  opening_debit: Number(r.opening_debit || 0),
                  opening_credit: Number(r.opening_credit || 0),
                  period_debits: Number(r.period_debits || 0),
                  period_credits: Number(r.period_credits || 0),
                  closing_debit: Number(r.closing_debit || 0),
                  closing_credit: Number(r.closing_credit || 0),
                }));
                const data = prepareTableData(cols, rows);
                const proj = projectOptions.find(p => p.id === projectId);
                const title = (() => {
                  const chips: string[] = [];
                  chips.push('تصدير التفريع الظاهر');
                  chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
                  if (postedOnly) chips.push('قيود معتمدة فقط');
                  if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
                  if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
                  if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
                  return chips.join(' — ');
                })();
                await exportToExcel(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
              }}>تصدير الظاهر (Excel)</button>
              <button className={styles.viewModeBtn} disabled={visibleTreeRows.length === 0} onClick={async () => {
                if (!visibleTreeRows.length) return;
                const cols = createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم الحساب', type: 'text' },
                  ...(mode === 'range' ? [
                    { key: 'opening_debit', header: 'رصيد افتتاحي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'opening_credit', header: 'رصيد افتتاحي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_debits', header: 'مدين الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'period_credits', header: 'دائن الفترة', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ] : [
                    { key: 'closing_debit', header: 'رصيد ختامي مدين', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                    { key: 'closing_credit', header: 'رصيد ختامي دائن', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
                  ])
                ])
                const rows = visibleTreeRows.map(r => ({
                  code: r.code,
                  name: r.name_ar || r.name,
                  opening_debit: Number(r.opening_debit || 0),
                  opening_credit: Number(r.opening_credit || 0),
                  period_debits: Number(r.period_debits || 0),
                  period_credits: Number(r.period_credits || 0),
                  closing_debit: Number(r.closing_debit || 0),
                  closing_credit: Number(r.closing_credit || 0),
                }));
                const data = prepareTableData(cols, rows);
                const proj = projectOptions.find(p => p.id === projectId);
                const title = (() => {
                  const chips: string[] = [];
                  chips.push('تصدير التفريع الظاهر');
                  chips.push(mode === 'asof' ? 'الوضع: أرصدة حتى تاريخ' : 'الوضع: حركة خلال فترة');
                  if (postedOnly) chips.push('قيود معتمدة فقط');
                  if (hideZero) chips.push('إخفاء الأرصدة الصفرية');
                  if (proj) chips.push(`المشروع: ${proj.code ? proj.code + ' - ' : ''}${proj.name_ar || proj.name}`);
                  if (mode === 'range') chips.push(`الفترة: ${dateFrom || '—'} → ${dateTo}`); else chips.push(`حتى: ${dateTo}`);
                  return chips.join(' — ');
                })();
                await exportToCSV(data as any, { title, orientation: 'landscape', useArabicNumerals: true, rtlLayout: true });
              }}>تصدير الظاهر (CSV)</button>
            </div>
          )}

          <button className={`${styles.viewModeBtn} ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>عرض شجرة</button>
          <button className={`${styles.viewModeBtn} ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>عرض جدول</button>
        </div>

        {viewMode === 'table' && (
          <div className={styles.visibleTools}>
            <button
              className={styles.viewModeBtn}
              disabled={filtered.length === 0}
              onClick={() => {
                const t = computeHealthTotals;
                if (mode === 'range') {
                  showToast(
                    `مجموعات التحقق — افتتاحي (مدين: ${t.opening_debit.toLocaleString('ar-EG')}, دائن: ${t.opening_credit.toLocaleString('ar-EG')}) — الفترة (مدين: ${t.period_debits.toLocaleString('ar-EG')}, دائن: ${t.period_credits.toLocaleString('ar-EG')}) — ختامي (مدين: ${t.closing_debit.toLocaleString('ar-EG')}, دائن: ${t.closing_credit.toLocaleString('ar-EG')})`,
                    { severity: 'info' }
                  );
                } else {
                  showToast(
                    `مجموعات التحقق — ختامي (مدين: ${t.closing_debit.toLocaleString('ar-EG')}, دائن: ${t.closing_credit.toLocaleString('ar-EG')})`,
                    { severity: 'info' }
                  );
                }
              }}
              title={'عرض مجموعات التحقق الحالية (جدول)'}
            >
              تحقق المجاميع (جدول)
            </button>
          </div>
        )}
      </div>

      {/* PDF Capture container with report header (hidden from UI, visible in PDF only) */}
      <div id="ae-report-content" className="financial-report-content">
        <div className="statement-header" style={{display: 'none'}}>
          <h1 className="company-name">{companyName || 'الشركة'}</h1>
          <h2 className="statement-title">مستكشف الحسابات</h2>
          <h3 className="statement-period">
            الفترة: {mode === 'range' ? `${dateFrom || '—'} ← ${dateTo}` : `حتى ${dateTo}`}
            {orgId && ` | المؤسسة: ${orgOptions.find(o => o.id === orgId)?.name_ar || orgOptions.find(o => o.id === orgId)?.name || orgId}`}
            {projectId && ` | المشروع: ${projectOptions.find(p => p.id === projectId)?.name_ar || projectOptions.find(p => p.id === projectId)?.name || projectId}`}
            {postedOnly && ' | قيود معتمدة فقط'}
          </h3>
        </div>

      <div className={styles.contentArea}>
        {!orgId && (
          <div className={styles.notice}>
            من فضلك اختر المؤسسة من القائمة أعلى الصفحة لعرض شجرة الحسابات.
          </div>
        )}
        {orgId && nodes.length === 0 && (
          <div className={styles.notice}>
            لا توجد بيانات لعرضها. جرّب تغيير عوامل التصفية أو مدى التاريخ أو إظهار الأرصدة الصفرية.
          </div>
        )}
        {viewMode === 'tree' ? (
        <ReportTreeView
          data={filtered.map(n => ({
            id: n.id,
            code: n.code,
            name_ar: n.name_ar || n.name,
            name_en: n.name || n.name_ar || '',
            level: n.level,
            parent_id: n.parent_id,
            is_active: n.status === 'active',
            account_type: n.category || undefined,
            opening_debit: n.opening_debit,
            opening_credit: n.opening_credit,
            period_debits: n.period_debits,
            period_credits: n.period_credits,
            closing_debit: n.closing_debit,
            closing_credit: n.closing_credit,
            transaction_count: n.transaction_count,
          }) as any)}
          onToggleExpand={async (node: any) => {
            const id = node.id as string;
            if (!expanded.has(id)) await loadChildren(id);
            const ns = new Set(expanded);
            if (ns.has(id)) ns.delete(id); else ns.add(id);
            setExpanded(ns);
          }}
          onSelect={(node: any) => setSelectedId(node.id)}
          canHaveChildren={(node: any) => {
            const found = nodes.find(x => x.id === node.id);
            return !!(found?.has_active_children || found?.has_children);
          }}
          getChildrenCount={(node: any) => nodes.filter(x => x.parent_id === node.id).length}
          maxLevel={8}
          onOpenGL={(node: any) => {
            const found = nodes.find(x => x.id === node.id);
            const hasKids = !!(found?.has_active_children || found?.has_children);
            if (found) navigateToGL(found, hasKids);
          }}
          selectedId={selectedId}
          mode={mode}
          showSubtotals={showSubtotals}
          showGrandTotal={showGrandTotal}
        />
) : (
          <div className={styles.accountsTableView}>
            <table className={styles.accountsTable}>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>اسم الحساب</th>
                  <th>نوع الحساب</th>
                  <th>المستوى</th>
                  {showTxnCount && <th>عدد القيود</th>}
                  <th>{mode === 'range' ? 'افتتاحي مدين' : 'ختامي مدين'}</th>
                  <th>{mode === 'range' ? 'افتتاحي دائن' : 'ختامي دائن'}</th>
                  {mode === 'range' ? (
                    <>
                      <th>مدين الفترة</th>
                      <th>دائن الفترة</th>
                    </>
                  ) : (
                    <>
                      <th></th>
                      <th></th>
                    </>
                  )}
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const hasKids = !!(r.has_active_children || r.has_children);
                  return (
                    <tr key={r.id} data-inactive={r.status !== 'active'}>
                      <td className={`${styles.tableCodeCell} contrast-table-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>{r.code}</td>
                      <td>{r.name_ar || r.name}</td>
                      <td className={styles.tableCenter}>{r.category || '—'}</td>
                      <td className={styles.tableCenter}>{r.level}</td>
                      {showTxnCount && <td className={styles.tableCenter}>{Number(r.transaction_count || 0).toLocaleString('ar-EG')}</td>}
                      <td className={styles.tableRight}>{Number((mode==='range'? r.opening_debit : r.closing_debit) || 0).toLocaleString('ar-EG')}</td>
                      <td className={styles.tableRight}>{Number((mode==='range'? r.opening_credit : r.closing_credit) || 0).toLocaleString('ar-EG')}</td>
                      {mode === 'range' ? (
                        <>
                          <td className={styles.tableRight}>{Number(r.period_debits || 0).toLocaleString('ar-EG')}</td>
                          <td className={styles.tableRight}>{Number(r.period_credits || 0).toLocaleString('ar-EG')}</td>
                        </>
                      ) : (
                        <>
                          <td></td>
                          <td></td>
                        </>
                      )}
                      <td>
                        <div className={styles.treeNodeActions}>
                          <button className="ultimate-btn ultimate-btn-edit" title="فتح القيود" onClick={() => navigateToGL(r, hasKids)}>
                            <div className="btn-content"><span className="btn-text">فتح القيود</span></div>
                          </button>
                          <button
                            className="ultimate-btn ultimate-btn-secondary"
                            title="تحقق (GL)"
                            onClick={async () => {
                              try {
                                const v = await verifyAccountSummary({
                                  accountId: r.id,
                                  dateFrom: mode === 'range' ? (dateFrom || null) : null,
                                  dateTo,
                                  orgId: orgId || null,
                                  projectId: projectId || null,
                                  postedOnly,
                                });
                                if (!v) { showToast('لم يتم العثور على بيانات تحقق لهذا الحساب', { severity: 'warning' }); return; }
                                const diffs: string[] = [];
                                const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');
                                if ((Number(r.opening_debit||0)) !== Number(v.opening_debit||0) || (Number(r.opening_credit||0)) !== Number(v.opening_credit||0)) {
                                  diffs.push(`افتتاحي: واجهة (مدين ${fmt(Number(r.opening_debit||0))}, دائن ${fmt(Number(r.opening_credit||0))}) ≠ خادم (مدين ${fmt(v.opening_debit)}, دائن ${fmt(v.opening_credit)})`);
                                }
                                if ((Number(r.period_debits||0)) !== Number(v.period_debits||0) || (Number(r.period_credits||0)) !== Number(v.period_credits||0)) {
                                  diffs.push(`الفترة: واجهة (مدين ${fmt(Number(r.period_debits||0))}, دائن ${fmt(Number(r.period_credits||0))}) ≠ خادم (مدين ${fmt(v.period_debits)}, دائن ${fmt(v.period_credits)})`);
                                }
                                if ((Number(r.closing_debit||0)) !== Number(v.closing_debit||0) || (Number(r.closing_credit||0)) !== Number(v.closing_credit||0)) {
                                  diffs.push(`الختامي: واجهة (مدين ${fmt(Number(r.closing_debit||0))}, دائن ${fmt(Number(r.closing_credit||0))}) ≠ خادم (مدين ${fmt(v.closing_debit)}, دائن ${fmt(v.closing_credit)})`);
                                }
                                if (diffs.length === 0) {
                                  showToast(`التحقق ناجح: الأرقام متطابقة مع دفتر الأستاذ لهذا الحساب (${r.code})`, { severity: 'success' });
                                } else {
                                  showToast(diffs.join(' — '), { severity: 'warning' });
                                }
                              } catch (e:any) {
                                showToast(e?.message || 'فشل التحقق من الحساب', { severity: 'error' });
                              }
                            }}
                          >
                            <div className="btn-content"><span className="btn-text">تحقق (GL)</span></div>
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
      </div>
      {/* End PDF capture container */}
    </div>
  );
};

export default AccountExplorerPage;
