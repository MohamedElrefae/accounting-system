/**
 * Universal Export Buttons Component
 * Provides consistent export interface across all data tables in the application
 */

import React from 'react';
import type { UniversalTableData } from '../../utils/UniversalExportManager';
import { useUniversalExport } from '../../hooks/useUniversalExport';
import type { ExportConfig } from '../../hooks/useUniversalExport';
import './ExportButtons.css';

interface ExportButtonsProps {
  data: UniversalTableData;
  config?: Partial<ExportConfig>;
  onExportStart?: (format: string) => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (format: string, error: Error) => void;
  showAllFormats?: boolean;
  showBatchExport?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical' | 'dropdown';
  className?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  data,
  config,
  onExportStart,
  onExportComplete,
  onExportError,
  showAllFormats = true,
  showBatchExport = false,
  disabled = false,
  size = 'medium',
  layout = 'horizontal',
  className = ''
}) => {
  const exportMethods = useUniversalExport({
    onExportStart,
    onExportComplete,
    onExportError
  });

  const handleExport = async (format: string) => {
    console.log(`📤 Export button clicked for format: ${format}`);
    console.log(`📤 Disabled: ${disabled}, isExporting: ${exportMethods.isExporting}`);
    console.log(`📤 Data:`, data);
    console.log(`📤 Config:`, config);
    
    if (disabled || exportMethods.isExporting) {
      console.log(`⚠️ Export blocked - disabled: ${disabled}, isExporting: ${exportMethods.isExporting}`);
      return;
    }

    try {
      switch (format) {
        case 'pdf':
          console.log('📄 Calling exportToPDF...');
          await exportMethods.exportToPDF(data, config);
          break;
        case 'excel':
          console.log('📊 Calling exportToExcel...');
          await exportMethods.exportToExcel(data, config);
          break;
        case 'csv':
          console.log('📋 Calling exportToCSV...');
          await exportMethods.exportToCSV(data, config);
          break;
        case 'html':
          console.log('🌐 Calling exportToHTML...');
          await exportMethods.exportToHTML(data, config);
          break;
        case 'json':
          console.log('🔧 Calling exportToJSON...');
          await exportMethods.exportToJSON(data, config);
          break;
        case 'all':
          console.log('📦 Calling exportAll...');
          await exportMethods.exportAll(data, config);
          break;
      }
    } catch (error) {
      console.error(`Export failed for format ${format}:`, error);
    }
  };

  const exportButtons = [
    {
      format: 'pdf',
      label: 'تصدير PDF',
      icon: '📄',
      className: 'export-btn-pdf',
      show: showAllFormats
    },
    {
      format: 'excel',
      label: 'تصدير Excel',
      icon: '📊',
      className: 'export-btn-excel',
      show: showAllFormats
    },
    {
      format: 'csv',
      label: 'تصدير CSV',
      icon: '📋',
      className: 'export-btn-csv',
      show: showAllFormats
    },
    {
      format: 'html',
      label: 'تصدير HTML',
      icon: '🌐',
      className: 'export-btn-html',
      show: showAllFormats
    },
    {
      format: 'json',
      label: 'تصدير JSON',
      icon: '🔧',
      className: 'export-btn-json',
      show: showAllFormats
    }
  ];

  const renderButton = (button: typeof exportButtons[0]) => (
    <button
      key={button.format}
      className={`export-btn ${button.className} export-btn-${size}`}
      onClick={() => handleExport(button.format)}
      disabled={disabled || exportMethods.isExporting}
      title={button.label}
    >
      {exportMethods.isExporting ? (
        <span className="export-spinner">⏳</span>
      ) : (
        <span className="export-icon">{button.icon}</span>
      )}
      <span className="export-label">{button.label}</span>
    </button>
  );

  const renderDropdown = () => (
    <div className="export-dropdown">
      <button
        className={`export-btn export-btn-dropdown export-btn-${size}`}
        disabled={disabled || exportMethods.isExporting}
      >
        {exportMethods.isExporting ? (
          <span className="export-spinner">⏳</span>
        ) : (
          <span className="export-icon">📤</span>
        )}
        <span className="export-label">تصدير</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      <div className="export-dropdown-menu">
        {exportButtons.filter(btn => btn.show).map(button => (
          <button
            key={button.format}
            className={`export-dropdown-item ${button.className}`}
            onClick={() => handleExport(button.format)}
            disabled={disabled || exportMethods.isExporting}
          >
            <span className="export-icon">{button.icon}</span>
            <span className="export-label">{button.label}</span>
          </button>
        ))}
        {showBatchExport && (
          <button
            className="export-dropdown-item export-btn-batch"
            onClick={() => handleExport('all')}
            disabled={disabled || exportMethods.isExporting}
          >
            <span className="export-icon">📦</span>
            <span className="export-label">تصدير جميع الصيغ</span>
          </button>
        )}
      </div>
    </div>
  );

  if (layout === 'dropdown') {
    return (
      <div className={`export-buttons-wrapper ${className}`}>
        {renderDropdown()}
      </div>
    );
  }

  return (
    <div className={`export-buttons export-buttons-${layout} export-buttons-${size} ${className}`}>
      {exportButtons.filter(btn => btn.show).map(renderButton)}
      {showBatchExport && (
        <button
          className={`export-btn export-btn-batch export-btn-${size}`}
          onClick={() => handleExport('all')}
          disabled={disabled || exportMethods.isExporting}
          title="تصدير جميع الصيغ"
        >
          {exportMethods.isExporting ? (
            <span className="export-spinner">⏳</span>
          ) : (
            <span className="export-icon">📦</span>
          )}
          <span className="export-label">تصدير الكل</span>
        </button>
      )}
    </div>
  );
};

// Export default for convenience
export default ExportButtons;
