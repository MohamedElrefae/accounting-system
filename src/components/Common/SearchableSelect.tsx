import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import styles from './SearchableSelect.module.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    const searchText = option.searchText || option.label;
    return searchText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get current selected option
  const selectedOption = options.find(option => option.value === value);

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
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
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
          </div>

          {/* Options */}
          <div ref={optionsRef} className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.noOptions}>لا توجد خيارات متاحة</div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={[
                    styles.option,
                    option.value === value ? styles.optionSelected : '',
                    index === highlightedIndex ? styles.optionHighlighted : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.label}
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
