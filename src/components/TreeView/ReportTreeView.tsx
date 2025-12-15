import React, { useState, useCallback } from 'react';
import { ChevronRight, Loader2, CheckCircle, AlertCircle, Book } from 'lucide-react';
import './TreeView.css';
import ui from '../Common/CommonUI.module.css';
import { gridColumnsForMode, type ExplorerMode } from '../Reports/AccountColumns';
import { formatArabicCurrency } from '../../utils/ArabicTextEngine';

interface ReportTreeNode {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  level: number;
  parent_id?: string | null;
  is_active: boolean;
  account_type?: string;
  opening_debit?: number | null;
  opening_credit?: number | null;
  period_debits?: number | null;
  period_credits?: number | null;
  closing_debit?: number | null;
  closing_credit?: number | null;
  transaction_count?: number | null;
  children?: ReportTreeNode[];
}

interface ButtonState { loading: boolean; success: boolean; error: boolean }

interface ReportTreeViewProps {
  data: ReportTreeNode[];
  onSelect?: (node: ReportTreeNode) => void;
  onToggleExpand?: (node: ReportTreeNode) => void | Promise<void>;
  canHaveChildren?: (node: ReportTreeNode) => boolean;
  getChildrenCount?: (node: ReportTreeNode) => number | null | undefined;
  maxLevel?: number;
  onOpenGL?: (node: ReportTreeNode) => void;
  selectedId?: string;
  mode: ExplorerMode;
  showSubtotals?: boolean;
  showGrandTotal?: boolean;
  showTxnCount?: boolean;
  showOpeningColsInRange?: boolean;
  numbersOnly?: boolean;
  currencySymbol?: string;
  // Optional controlled expansion
  expandedIds?: Set<string>;
  onExpandedChange?: (ids: Set<string>) => void;
}

const ReportTreeView: React.FC<ReportTreeViewProps> = ({
  data,
  onSelect,
  onToggleExpand,
  canHaveChildren,
  getChildrenCount,
  onOpenGL,
  selectedId,
  mode,
  showSubtotals = true,
  showGrandTotal = true,
  showTxnCount = false,
  expandedIds,
  onExpandedChange,
  showOpeningColsInRange = true,
  numbersOnly = true,
  currencySymbol = 'none',
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [buttonStates, setButtonStates] = useState<{[k: string]: ButtonState}>({});

  const isControlled = !!expandedIds;
  const currentExpanded = isControlled ? (expandedIds as Set<string>) : expandedNodes;

  const toggleNode = useCallback((id: string) => {
    if (isControlled) {
      // When controlled, emit updated set
      // Create a new Set to ensure state change is detected upstream
      const s = new Set(currentExpanded);
      if (s.has(id)) s.delete(id); else s.add(id);
      if (onExpandedChange) onExpandedChange(s);
    } else {
      setExpandedNodes(prev => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
      });
    }
  }, [isControlled, currentExpanded, onExpandedChange]);

  const getButtonState = (id: string): ButtonState => buttonStates[id] || { loading: false, success: false, error: false };

  const withStates = async (id: string, fn: () => Promise<void> | void) => {
    try {
      setButtonStates(p => ({ ...p, [id]: { loading: true, success: false, error: false } }));
      await fn();
      setButtonStates(p => ({ ...p, [id]: { loading: false, success: true, error: false } }));
      setTimeout(() => setButtonStates(p => { const q = { ...p }; delete q[id]; return q; }), 1500);
    } catch {
      setButtonStates(p => ({ ...p, [id]: { loading: false, success: false, error: true } }));
      setTimeout(() => setButtonStates(p => { const q = { ...p }; delete q[id]; return q; }), 1500);
    }
  }

  const fmtCurrency = (n?: number | null) => numbersOnly ? Number(n || 0).toLocaleString('ar-EG') : formatArabicCurrency(Number(n || 0), currencySymbol || 'EGP');

const renderNode = (node: ReportTreeNode, depth = 0): React.ReactNode => {
    const expanded = currentExpanded.has(node.id);
    const hasLoadedChildren = !!(node.children && node.children.length);
    const mayHaveChildren = hasLoadedChildren || (canHaveChildren ? !!canHaveChildren(node) : false);
    const gridCols = gridColumnsForMode(mode, { withTxnCount: showTxnCount, periodOnly: (mode === 'range' && !showOpeningColsInRange) });

    // Helper sums for immediate children
    const childSum = (sel: (n: ReportTreeNode) => number) => (node.children || []).reduce((s, c) => s + sel(c), 0);

    const parentCls = mayHaveChildren ? `tree-parent level-${node.level}` : '';
    return (
      <div key={node.id} className="tree-node-wrapper">
        <div className={`tree-node ${parentCls} ${!node.is_active ? 'inactive' : ''} ${selectedId === node.id ? 'selected' : ''}`} style={{ gridTemplateColumns: gridCols }}>
          <div className={`tree-node-expander ${expanded ? 'expanded' : ''} ${!mayHaveChildren ? 'no-children' : ''}`}
               onClick={async () => { if (!mayHaveChildren) return; if (onToggleExpand) await onToggleExpand(node); toggleNode(node.id); }}
               style={{ marginLeft: `${depth * 20}px` }}>
            {mayHaveChildren && <ChevronRight className="expander-icon" size={16} />}
          </div>
          <div className={`tree-node-status ${node.is_active ? 'active' : 'inactive'}`} />
          <div className="tree-node-spacer" />
          <div className={`tree-node-code contrast-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>{node.code}</div>
          <div className="tree-node-name" onClick={() => onSelect && onSelect(node)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {node.name_ar || node.name}
            {!node.is_active && <span className={`status-inactive-text ${ui.inactiveText}`}>(معطل)</span>}
            {mayHaveChildren && (
              <span className={ui.textSecondarySmall} style={{ marginRight: 8 }}>
                {hasLoadedChildren ? (getChildrenCount ? getChildrenCount(node) ?? '' : '') : '…'}
              </span>
            )}
          </div>
          <div className="tree-node-type">{node.account_type || '—'}</div>
          <div className="tree-node-level"><span className={`level-badge ${ui.badgeLevel}`}>{node.level}</span></div>
          {showTxnCount && <div className="tree-node-amount table-center">{Number(node.transaction_count || 0).toLocaleString('ar-EG')}</div>}
          {mode === 'range' ? (
            <>
              {showOpeningColsInRange && (
                <>
                  <div className="tree-node-amount table-right">{fmtCurrency(node.opening_debit)}</div>
                  <div className="tree-node-amount table-right">{fmtCurrency(node.opening_credit)}</div>
                </>
              )}
              <div className="tree-node-amount table-right">{fmtCurrency(node.period_debits)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(node.period_credits)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(node.closing_debit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(node.closing_credit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(Number(node.period_debits || 0) - Number(node.period_credits || 0))}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(Number(node.closing_debit || 0) - Number(node.closing_credit || 0))}</div>
            </>
          ) : (
            <>
              <div className="tree-node-amount table-right">{fmtCurrency(node.closing_debit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(node.closing_credit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(Number(node.closing_debit || 0) - Number(node.closing_credit || 0))}</div>
            </>
          )}
          <div className="tree-node-actions">
            {onOpenGL && (
              <button
                onClick={() => withStates(`open-${node.id}`, async () => onOpenGL && onOpenGL(node))}
                className={`ultimate-btn ultimate-btn-edit ${getButtonState(`open-${node.id}`).loading ? 'loading' : ''} ${getButtonState(`open-${node.id}`).success ? 'success' : ''} ${getButtonState(`open-${node.id}`).error ? 'error' : ''}`}
                disabled={getButtonState(`open-${node.id}`).loading}
                title="فتح القيود">
                <div className="btn-content">
                  <div className={`btn-icon ${getButtonState(`open-${node.id}`).loading ? 'spinning' : ''}`}>
                    {getButtonState(`open-${node.id}`).loading ? (<Loader2 size={14} />) : getButtonState(`open-${node.id}`).success ? (<CheckCircle size={14} />) : getButtonState(`open-${node.id}`).error ? (<AlertCircle size={14} />) : (<Book size={14} />)}
                  </div>
                  <span className="btn-text">فتح القيود</span>
                </div>
              </button>
            )}
          </div>
        </div>
        {expanded && hasLoadedChildren && (
          <>
            <div className="tree-node-children">
              {node.children!.map(child => renderNode(child, depth + 1))}
            </div>
            {showSubtotals && (
              <div className="tree-node tree-subtotal" style={{ gridTemplateColumns: gridCols }}>
                <div></div>
                <div></div>
                <div></div>
                <div className="tree-node-code"></div>
                <div className="tree-node-name" style={{ fontWeight: 700 }}>مجموع الفرع</div>
                <div className="tree-node-type"></div>
                <div className="tree-node-level"></div>
                {showTxnCount && (
                  <div className="tree-node-amount table-center">{Number(childSum(c => Number(c.transaction_count || 0))).toLocaleString('ar-EG')}</div>
                )}
                {mode === 'range' ? (
                  <>
                    {showOpeningColsInRange && (
                      <>
                        <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.opening_debit || 0)))}</div>
                        <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.opening_credit || 0)))}</div>
                      </>
                    )}
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.period_debits || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.period_credits || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_debit || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_credit || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.period_debits || 0)) - childSum(c => Number(c.period_credits || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_debit || 0)) - childSum(c => Number(c.closing_credit || 0)))}</div>
                  </>
                ) : (
                  <>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_debit || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_credit || 0)))}</div>
                    <div className="tree-node-amount table-right">{fmtCurrency(childSum(c => Number(c.closing_debit || 0)) - childSum(c => Number(c.closing_credit || 0)))}</div>
                  </>
                )}
                <div></div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Build tree structure from flat data
  const buildTree = (items: ReportTreeNode[]): ReportTreeNode[] => {
    const map = new Map<string, ReportTreeNode>();
    const roots: ReportTreeNode[] = [];
    items.forEach(i => { map.set(i.id, { ...i, children: [] }); });
    items.forEach(i => {
      const n = map.get(i.id)!;
      if (i.parent_id && map.has(i.parent_id)) {
        const p = map.get(i.parent_id)!;
        if (!p.children) p.children = [];
        p.children.push(n);
      } else {
        roots.push(n);
      }
    });
    return roots;
  };

  const treeData = buildTree(data);

  // Grand totals across visible roots (first level of the built tree)
  const grandTotals = (() => {
    const roots = treeData;
    const sum = (sel: (n: ReportTreeNode) => number) => roots.reduce((s, n) => s + sel(n), 0);
    return {
      txn: sum(n => Number(n.transaction_count || 0)),
      opening_debit: sum(n => Number(n.opening_debit || 0)),
      opening_credit: sum(n => Number(n.opening_credit || 0)),
      period_debits: sum(n => Number(n.period_debits || 0)),
      period_credits: sum(n => Number(n.period_credits || 0)),
      closing_debit: sum(n => Number(n.closing_debit || 0)),
      closing_credit: sum(n => Number(n.closing_credit || 0)),
    };
  })();

  return (
    <div className="tree-view-container">
      <div className="tree-node tree-header" style={{ gridTemplateColumns: gridColumnsForMode(mode, { withTxnCount: showTxnCount, periodOnly: (mode === 'range' && !showOpeningColsInRange) }) }}>
        <div className="tree-node-expander" />
        <div className="tree-node-status" />
        <div className="tree-node-spacer" />
        <div className="tree-node-code"><span className="header-text">الكود</span></div>
        <div className="tree-node-name"><span className="header-text">اسم الحساب</span></div>
        <div className="tree-node-type"><span className="header-text">نوع الحساب</span></div>
        <div className="tree-node-level"><span className="header-text">المستوى</span></div>
        {showTxnCount && <div className="tree-node-amount"><span className="header-text">عدد القيود</span></div>}
        {mode === 'range' ? (
          <>
            {showOpeningColsInRange && (
              <>
                <div className="tree-node-amount"><span className="header-text">افتتاحي مدين</span></div>
                <div className="tree-node-amount"><span className="header-text">افتتاحي دائن</span></div>
              </>
            )}
            <div className="tree-node-amount"><span className="header-text">مدين الفترة</span></div>
            <div className="tree-node-amount"><span className="header-text">دائن الفترة</span></div>
            <div className="tree-node-amount"><span className="header-text">ختامي مدين</span></div>
            <div className="tree-node-amount"><span className="header-text">ختامي دائن</span></div>
            <div className="tree-node-amount"><span className="header-text">صافي الفترة</span></div>
            <div className="tree-node-amount"><span className="header-text">الصافي الختامي</span></div>
          </>
        ) : (
          <>
            <div className="tree-node-amount"><span className="header-text">ختامي مدين</span></div>
            <div className="tree-node-amount"><span className="header-text">ختامي دائن</span></div>
            <div className="tree-node-amount"><span className="header-text">الصافي الختامي</span></div>
          </>
        )}
        <div className="tree-node-actions"><span className="header-text">الإجراءات</span></div>
      </div>
      {treeData.map(n => renderNode(n))}
      {showGrandTotal && (
        <div className="tree-node tree-grandtotal" style={{ gridTemplateColumns: gridColumnsForMode(mode, { withTxnCount: showTxnCount, periodOnly: (mode === 'range' && !showOpeningColsInRange) }) }}>
          <div></div>
          <div></div>
          <div></div>
          <div className="tree-node-code"></div>
          <div className="tree-node-name">المجموع الكلي</div>
          <div className="tree-node-type"></div>
          <div className="tree-node-level"></div>
          {showTxnCount && <div className="tree-node-amount table-center">{Number(grandTotals.txn).toLocaleString('ar-EG')}</div>}
          {mode === 'range' ? (
            <>
              {showOpeningColsInRange && (
                <>
                  <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.opening_debit)}</div>
                  <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.opening_credit)}</div>
                </>
              )}
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.period_debits)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.period_credits)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_debit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_credit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.period_debits - grandTotals.period_credits)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_debit - grandTotals.closing_credit)}</div>
            </>
          ) : (
            <>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_debit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_credit)}</div>
              <div className="tree-node-amount table-right">{fmtCurrency(grandTotals.closing_debit - grandTotals.closing_credit)}</div>
            </>
          )}
          <div></div>
        </div>
      )}
    </div>
  );
};

export default ReportTreeView;
