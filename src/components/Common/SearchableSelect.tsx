import React, { useState, useRef, useEffect } from 'react';
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
  required: _required = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const storageKey = React.useMemo(() => id ? `searchableSelect.expanded.${id}` : null, [id]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Build visible flat list from tree with expand/collapse
  type FlatRow = SearchableSelectOption & { __depth: number; __isParent: boolean };

  const normalize = (opts: SearchableSelectOption[]): SearchableSelectOption[] => opts || [];

  const matches = (opt: SearchableSelectOption, term: string) => {
    if (!term) return true;
    const text = (opt.searchText || opt.label || '').toLowerCase();
    return text.includes(term.toLowerCase());
  };

  const buildVisible = (
    opts: SearchableSelectOption[],
    depth: number,
    out: FlatRow[],
    parentExpanded: boolean,
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
  };

  const visibleFlatOptions: FlatRow[] = React.useMemo(() => {
    const list: FlatRow[] = [];
    buildVisible(options, 0, list, true, searchTerm);
    return list;
  }, [options, expanded, searchTerm]);

  // Collect all nodes that have children (parents)
  const collectAllParents = (opts: SearchableSelectOption[], out: Set<string>) => {
    for (const opt of opts || []) {
      if (opt.children && opt.children.length) {
        out.add(opt.value);
        collectAllParents(opt.children, out);
      }
    }
  };

  // Get current selected option
  const selectedOption = visibleFlatOptions.find(option => option.value === value) || options.find(o => o.value === value);

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
  const findPath = (opts: SearchableSelectOption[], target: string, trail: string[] = []): string[] | null => {
    for (const opt of opts || []) {
      const nextTrail = [...trail, opt.value];
      if (opt.value === target) return nextTrail;
      if (opt.children && opt.children.length) {
        const res = findPath(opt.children, target, nextTrail);
        if (res) return res;
      }
    }
    return null;
  };

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
  }, [isOpen, value, options, searchTerm, storageKey]);

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
      } catch {}
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
        <span className={styles.selectedText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <div className={styles.indicators}>
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
                  onClick={(e) => {
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
    </div>
  );
};

export default SearchableSelect;
