import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import styles from './SearchableSelect.module.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
  disabled?: boolean;
  title?: string;
  children?: SearchableSelectOption[];
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  required?: boolean;
  error?: boolean;
  // Optional drilldown modal
  showDrilldownModal?: boolean;
  treeOptions?: SearchableSelectOption[];
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder = 'اختر خياراً...',
  disabled = false,
  clearable = false,
  className = '',
  required = false,
  error = false,
  showDrilldownModal = false,
  treeOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const storageKey = React.useMemo(() => id ? `searchableSelect.expanded.${id}` : null, [id]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Build visible flat list from tree with expand/collapse
  type FlatRow = SearchableSelectOption & { __depth: number; __isParent: boolean };

  const normalize = (opts: SearchableSelectOption[] | undefined | null | any): SearchableSelectOption[] => {
    // Safety guard: if opts is a Promise (async optionsProvider), return empty array
    if (opts && typeof opts.then === 'function') {
      console.warn('SearchableSelect received a Promise instead of an array. This usually means an async optionsProvider is being passed synchronously.');
      return [];
    }
    // Return empty array if opts is null, undefined, or not an array
    if (!opts || !Array.isArray(opts)) {
      return [];
    }
    return opts;
  };

  const matches = (opt: SearchableSelectOption, term: string) => {
    if (!term) return true;
    const text = (opt.searchText || opt.label || '').toLowerCase();
    return text.includes(term.toLowerCase());
  };

  const buildVisible = useCallback((
    opts: SearchableSelectOption[],
    depth: number,
    out: FlatRow[],
    _parentExpanded: boolean, // Not used but part of the signature
    term: string
  ) => {
    for (const opt of normalize(opts)) {
      const hasChildren = !!(opt.children && opt.children.length);
      const isExpanded = expanded.has(opt.value);

      const includeThis = term ? matches(opt, term) : true;
      // When searching, we show all nodes that match or have matching descendants (handled by recursion)
      if (!term) {
        out.push({ ...opt, __depth: depth, __isParent: hasChildren });
      } else if (includeThis) {
        out.push({ ...opt, __depth: depth, __isParent: hasChildren });
      }

      // Decide whether to include children
      if (hasChildren) {
        const childList: FlatRow[] = [];
        buildVisible(opt.children!, depth + 1, childList, isExpanded, term);
        if (term) {
          // In search mode, include children rows that matched themselves or had matching descendants
          if (childList.length > 0) {
            // Ensure parent row exists (already pushed if includeThis true). If not, push parent now for context.
            if (!(!term || includeThis)) {
              out.push({ ...opt, __depth: depth, __isParent: hasChildren });
            }
            out.push(...childList);
          }
        } else if (isExpanded) {
          out.push(...childList);
        }
      }
    }
  }, [expanded]);

  const visibleFlatOptions: FlatRow[] = React.useMemo(() => {
    const list: FlatRow[] = [];
    buildVisible(options, 0, list, true, searchTerm);
    return list;
  }, [options, searchTerm, buildVisible]);

  // Collect all nodes that have children (parents)
  const collectAllParents = (opts: SearchableSelectOption[], out: Set<string>) => {
    for (const opt of opts || []) {
      if (opt.children && opt.children.length) {
        out.add(opt.value);
        collectAllParents(opt.children, out);
      }
    }
  };

  // Get current selected option (search deeply in the tree so selection shows even when collapsed)
  const findOptionDeep = (opts: SearchableSelectOption[], target: string): SearchableSelectOption | undefined => {
    for (const opt of opts || []) {
      if (opt.value === target) return opt;
      if (opt.children && opt.children.length) {
        const found = findOptionDeep(opt.children, target);
        if (found) return found;
      }
    }
    return undefined;
  };
  const selectedOption = value ? findOptionDeep(options, value) : undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < visibleFlatOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && visibleFlatOptions[highlightedIndex]) {
          const row = visibleFlatOptions[highlightedIndex];
          if (row.__isParent && row.children && row.children.length && (row.disabled || !row.value || row.value.startsWith('__'))) {
            // Toggle expand for non-selectable parent or header
            toggleExpand(row.value);
          } else if (!row.disabled) {
            handleSelect(row.value);
          }
        }
        break;
      case 'ArrowLeft': // Collapse
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const row = visibleFlatOptions[highlightedIndex];
          if (row.__isParent && expanded.has(row.value)) {
            toggleExpand(row.value);
          }
        }
        break;
      case 'ArrowRight': // Expand
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const row = visibleFlatOptions[highlightedIndex];
          if (row.__isParent && row.children && row.children.length && !expanded.has(row.value)) {
            toggleExpand(row.value);
          }
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle option selection
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // Handle clear button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setSearchTerm('');
  };

  // Toggle dropdown
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHighlightedIndex(0);
    }
  };

  // Find ancestry path of current value in the tree
  const findPath = useCallback((opts: SearchableSelectOption[], target: string, trail: string[] = []): string[] | null => {
    for (const opt of opts || []) {
      const nextTrail = [...trail, opt.value];
      if (opt.value === target) return nextTrail;
      if (opt.children && opt.children.length) {
        const res = findPath(opt.children, target, nextTrail);
        if (res) return res;
      }
    }
    return null;
  }, []);

  // On open (and when not searching), expand only the ancestry of the selected value
  // If no selection, restore persisted expansion (if available)
  useEffect(() => {
    if (isOpen && !searchTerm) {
      if (!value) {
        if (storageKey) {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr)) setExpanded(new Set(arr));
              else setExpanded(new Set());
            } else {
              setExpanded(new Set());
            }
          } catch {
            setExpanded(new Set());
          }
        } else {
          setExpanded(new Set());
        }
        return;
      }
      const path = findPath(options, value) || [];
      // Exclude the selected leaf itself; expand ancestors only
      const ancestors = path.slice(0, Math.max(0, path.length - 1));
      setExpanded(new Set(ancestors));
    }
  }, [isOpen, value, options, searchTerm, storageKey, findPath]);

  const toggleExpand = (val: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };

  // Persist expand/collapse state when closing dropdown (if no active search)
  useEffect(() => {
    if (!isOpen && storageKey && !searchTerm) {
      try {
        const arr = Array.from(expanded);
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch { void 0; }
    }
  }, [isOpen, storageKey, expanded, searchTerm]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
      const highlightedElement = optionsRef.current.children[highlightedIndex + 1] as HTMLElement; // +1 for search input
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const containerClasses = [
    styles.container,
    error ? styles.error : '',
    disabled ? styles.disabled : '',
    isOpen ? styles.open : '',
    className
  ].filter(Boolean).join(' ');

  // Build tree (for modal) from provided treeOptions or options
  const treeData: SearchableSelectOption[] = treeOptions && treeOptions.length ? treeOptions : options;

  // Modal state for drilldown
  const [treeSearchTerm, setTreeSearchTerm] = useState('');
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(new Set());

  const treeMatches = (opt: SearchableSelectOption, term: string) => {
    if (!term) return true;
    const text = (opt.searchText || opt.label || '').toLowerCase();
    return text.includes(term.toLowerCase());
  };
  type TreeFlat = SearchableSelectOption & { __depth: number; __isParent: boolean };
  const buildTreeVisible = (
    opts: SearchableSelectOption[],
    depth: number,
    out: TreeFlat[],
    term: string
  ) => {
    for (const opt of opts || []) {
      const hasChildren = !!(opt.children && opt.children.length);
      const includeThis = term ? treeMatches(opt, term) : true;
      if (!term) {
        out.push({ ...opt, __depth: depth, __isParent: hasChildren });
      } else if (includeThis) {
        out.push({ ...opt, __depth: depth, __isParent: hasChildren });
      }
      if (hasChildren) {
        const childList: TreeFlat[] = [];
        buildTreeVisible(opt.children!, depth + 1, childList, term);
        if (term) {
          if (childList.length > 0) {
            if (!includeThis) {
              out.push({ ...opt, __depth: depth, __isParent: hasChildren });
            }
            out.push(...childList);
          }
        } else if (treeExpanded.has(opt.value)) {
          out.push(...childList);
        }
      }
    }
  };
  const treeFlat: TreeFlat[] = React.useMemo(() => {
    const list: TreeFlat[] = [];
    buildTreeVisible(treeData, 0, list, treeSearchTerm);
    return list;
  }, [treeData, treeExpanded, treeSearchTerm]);

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Select Button */}
      <div
        className={styles.selectButton}
        onClick={handleToggle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={id}
      >
        <span className={styles.selectedText} aria-required={required}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <div className={styles.indicators}>
          {showDrilldownModal && !disabled && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={(e) => { e.stopPropagation(); setIsTreeOpen(true); }}
              tabIndex={-1}
              aria-label="اختيار من الشجرة"
              title="اختيار من الشجرة"
            >
              🗂
            </button>
          )}
          {clearable && value && !disabled && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              tabIndex={-1}
              aria-label="مسح الاختيار"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={[styles.chevron, isOpen ? styles.chevronUp : ''].filter(Boolean).join(' ')}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {/* Search Input */}
          <div className={styles.searchContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="ابحث..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={(e) => {
                // Prevent the main keydown handler from interfering with search
                e.stopPropagation();
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  handleKeyDown(e);
                }
              }}
            />
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  const all = new Set<string>();
                  collectAllParents(options, all);
                  setExpanded(all);
                }}
                aria-label="توسيع الكل"
              >
                توسيع الكل
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  if (!value) { setExpanded(new Set()); return; }
                  const path = findPath(options, value) || [];
                  const ancestors = new Set(path.slice(0, Math.max(0, path.length - 1)));
                  setExpanded(ancestors);
                }}
                aria-label="طيّ الكل"
              >
                طيّ الكل
              </button>
            </div>
          </div>

          {/* Options */}
          <div ref={optionsRef} className={styles.optionsList}>
            {visibleFlatOptions.length === 0 ? (
              <div className={styles.noOptions}>لا توجد خيارات متاحة</div>
            ) : (
              visibleFlatOptions.map((option, index) => (
                <div
                  key={option.value + ':' + index}
                  className={[
                    styles.option,
                    option.value === value ? styles.optionSelected : '',
                    index === highlightedIndex ? styles.optionHighlighted : '',
                    option.disabled ? styles.optionDisabled : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    // If clicking caret, handled below
                    if (!option.disabled) handleSelect(option.value);
                  }}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  title={option.title}
                  style={{ paddingRight: `calc(20px + ${option.__depth * 16}px)` }}
                >
                  {option.__isParent && option.children && option.children.length ? (
                    <button
                      type="button"
                      className={styles.caret}
                      aria-label={expanded.has(option.value) ? 'طي' : 'توسيع'}
                      onClick={(e) => { e.stopPropagation(); toggleExpand(option.value); }}
                    >
                      <ChevronDown size={14} className={expanded.has(option.value) ? styles.caretOpen : styles.caretClosed} />
                    </button>
                  ) : (
                    <span className={styles.caretPlaceholder} />
                  )}
                  <span className={styles.optionLabel}>{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Drilldown Modal */}
      {showDrilldownModal && isTreeOpen && (
        <div 
          style={{
            position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
          onClick={() => setIsTreeOpen(false)}
        >
          <div
            style={{
              width: '720px', maxWidth: '95vw', maxHeight: '80vh', background: 'var(--surface)',
              borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>اختر الحساب من الشجرة</div>
              <button className={styles.clearButton} onClick={() => setIsTreeOpen(false)} aria-label="إغلاق">✖</button>
            </div>
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="ابحث..."
                value={treeSearchTerm}
                onChange={(e) => setTreeSearchTerm(e.target.value)}
                className={styles.searchInput}
                style={{ width: '100%' }}
              />
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => {
                    const all = new Set<string>();
                    const walk = (opts: SearchableSelectOption[]) => {
                      for (const o of opts || []) { if (o.children && o.children.length) { all.add(o.value); walk(o.children); } }
                    };
                    walk(treeData);
                    setTreeExpanded(all);
                  }}
                >توسيع الكل</button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setTreeExpanded(new Set())}
                >طيّ الكل</button>
              </div>
            </div>
            <div style={{ overflow: 'auto' }}>
              {treeFlat.length === 0 ? (
                <div className={styles.noOptions}>لا توجد خيارات متاحة</div>
              ) : (
                treeFlat.map((opt, idx) => (
                  <div
                    key={opt.value + ':' + idx}
                    className={[
                      styles.option,
                      opt.value === value ? styles.optionSelected : ''
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      // Only allow selecting non-disabled (postable) items
                      if (!opt.disabled && opt.value && !opt.value.startsWith('__')) {
                        onChange(opt.value);
                        setIsTreeOpen(false);
                      } else if (opt.__isParent) {
                        // toggle expand if parent clicked
                        setTreeExpanded(prev => {
                          const next = new Set(prev);
                          if (next.has(opt.value)) next.delete(opt.value); else next.add(opt.value);
                          return next;
                        });
                      }
                    }}
                    title={opt.title}
                    style={{ paddingRight: `calc(20px + ${opt.__depth * 16}px)` }}
                  >
                    {opt.__isParent && opt.children && opt.children.length ? (
                      <button
                        type="button"
                        className={styles.caret}
                        onClick={(e) => { e.stopPropagation(); setTreeExpanded(prev => { const n = new Set(prev); if (n.has(opt.value)) n.delete(opt.value); else n.add(opt.value); return n; }); }}
                        aria-label={treeExpanded.has(opt.value) ? 'طي' : 'توسيع'}
                      >
                        <ChevronDown size={14} className={treeExpanded.has(opt.value) ? styles.caretOpen : styles.caretClosed} />
                      </button>
                    ) : (
                      <span className={styles.caretPlaceholder} />
                    )}
                    <span className={styles.optionLabel}>{opt.label}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.actionButton} onClick={() => setIsTreeOpen(false)} title="إغلاق">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
