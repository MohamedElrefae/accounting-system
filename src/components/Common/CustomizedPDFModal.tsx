/**
 * Customized PDF Export Modal
 * Provides full control over PDF export settings including:
 * - Column selection
 * - Headers and footers
 * - Margins and orientation
 * - Page settings
 * - Arabic RTL support
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { UniversalTableData } from '../../utils/UniversalExportManager';
import { exportToPDF } from '../../utils/UniversalExportManager';
import './CustomizedPDFModal.css';

interface CustomizedPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UniversalTableData;
  title: string;
}

interface PDFSettings {
  // Column selection
  selectedColumns: string[];
  
  // Content settings
  title: string;
  includeHeader: boolean;
  includePageNumbers: boolean;
  
  // Page settings
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'Letter';
  fitToPage: boolean;
  
  // Margins (in mm)
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Styling
  fontSize: number;
  rtlLayout: boolean;
  useArabicNumerals: boolean;
}

const CustomizedPDFModal: React.FC<CustomizedPDFModalProps> = ({
  isOpen,
  onClose,
  data,
  title
}) => {
  const [settings, setSettings] = useState<PDFSettings>({
    selectedColumns: data.columns.map(col => col.key),
    title: title,
    includeHeader: true,
    includePageNumbers: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fitToPage: true,
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    fontSize: 11,
    rtlLayout: true,
    useArabicNumerals: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [columnsQuery, setColumnsQuery] = useState('');

  // Default selected columns: only those marked visible !== false (fallback to all)
  useEffect(() => {
    if (!isOpen) return
    const visibleKeys = (data.columns || []).filter(c => (c as any).visible !== false).map(c => c.key)
    if (visibleKeys.length > 0) {
      setSettings(prev => ({ ...prev, selectedColumns: visibleKeys }))
    } else {
      setSettings(prev => ({ ...prev, selectedColumns: (data.columns || []).map(c => c.key) }))
    }
  }, [isOpen, data.columns])

  const handleSettingChange = useCallback((key: keyof PDFSettings, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleMarginChange = useCallback((side: keyof PDFSettings['margins'], value: number) => {
    setSettings(prev => ({
      ...prev,
      margins: {
        ...prev.margins,
        [side]: value
      }
    }));
  }, []);

  const filteredColumns = useMemo(() => {
    const q = columnsQuery.trim().toLowerCase();
    if (!q) return data.columns;
    return data.columns.filter(c => (c.header || c.key).toLowerCase().includes(q));
  }, [columnsQuery, data.columns]);

  const handleColumnToggle = useCallback((columnKey: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      selectedColumns: checked 
        ? [...prev.selectedColumns, columnKey]
        : prev.selectedColumns.filter(key => key !== columnKey)
    }));
  }, []);

  const handleSelectAllColumns = useCallback((checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      selectedColumns: checked ? data.columns.map(col => col.key) : []
    }));
  }, [data.columns]);

  const handleExport = useCallback(async () => {
    if (settings.selectedColumns.length === 0) {
      alert('يرجى اختيار عمود واحد على الأقل للتصدير');
      return;
    }

    setIsExporting(true);
    try {
      // Filter data based on selected columns
      const filteredColumns = data.columns.filter(col => 
        settings.selectedColumns.includes(col.key)
      );
      
      const filteredData: UniversalTableData = {
        ...data,
        columns: filteredColumns
      };

      // Export with custom settings
      await exportToPDF(filteredData, {
        title: settings.title,
        orientation: settings.orientation,
        pageSize: settings.pageSize,
        includeHeader: settings.includeHeader,
        includeFooter: settings.includePageNumbers,
        fontSize: settings.fontSize,
        rtlLayout: settings.rtlLayout,
        useArabicNumerals: settings.useArabicNumerals,
        margins: settings.margins
      });

      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('فشل في تصدير PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  }, [settings, data, onClose]);

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null;

  const allColumnsSelected = settings.selectedColumns.length === data.columns.length;
  const someColumnsSelected = settings.selectedColumns.length > 0 && !allColumnsSelected;

  return createPortal(
    <div className="customized-pdf-modal-overlay" onClick={onClose}>
      <div className={`customized-pdf-modal ${isFullscreen ? 'fullscreen' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">تخصيص تصدير PDF</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="close-button" title={isFullscreen ? 'تصغير' : 'تكبير'} onClick={() => setIsFullscreen(v => !v)}>⛶</button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-content">
          {/* Column Selection */}
          <div className="settings-section">
            <h3 className="section-title">الأعمدة للتصدير</h3>
            <div className="column-selection">
              <div className="toolbar-row">
                <div className="toolbar-actions">
                  <button className="btn" onClick={() => handleSelectAllColumns(true)}>اختيار الكل</button>
                  <button className="btn" onClick={() => handleSelectAllColumns(false)}>إلغاء الكل</button>
                  <button className="btn" onClick={() => {
                    const current = new Set(settings.selectedColumns)
                    const next: string[] = []
                    for (const c of data.columns) {
                      if (!current.has(c.key)) next.push(c.key)
                    }
                    // invert selection
                    setSettings(prev => ({ ...prev, selectedColumns: next }))
                  }}>عكس الاختيار</button>
                </div>
                <input className="search-input" placeholder="بحث عن عمود..." value={columnsQuery} onChange={e => setColumnsQuery(e.target.value)} />
              </div>
              <div className="select-all-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={allColumnsSelected}
                    ref={input => {
                      if (input) input.indeterminate = someColumnsSelected;
                    }}
                    onChange={(e) => handleSelectAllColumns(e.target.checked)}
                  />
                  اختيار الكل
                </label>
              </div>
              <div className="columns-grid">
                {filteredColumns.map(col => (
                  <label key={col.key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.selectedColumns.includes(col.key)}
                      onChange={(e) => handleColumnToggle(col.key, e.target.checked)}
                    />
                    {col.header}
                  </label>
                ))}
              </div>

              <div className="preview-panel">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {data.columns.filter(c => settings.selectedColumns.includes(c.key)).map(c => (
                        <th key={c.key}>{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows || []).slice(0, 8).map((r, idx) => (
                      <tr key={idx}>
                        {data.columns.filter(c => settings.selectedColumns.includes(c.key)).map(c => (
                          <td key={c.key}>{r[c.key] as any}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Content Settings */}
          <div className="settings-section">
            <h3 className="section-title">المحتوى</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="pdf-title">عنوان التقرير:</label>
                <input
                  id="pdf-title"
                  type="text"
                  value={settings.title}
                  onChange={(e) => handleSettingChange('title', e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.includeHeader}
                    onChange={(e) => handleSettingChange('includeHeader', e.target.checked)}
                  />
                  تضمين رأس الصفحة
                </label>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.includePageNumbers}
                    onChange={(e) => handleSettingChange('includePageNumbers', e.target.checked)}
                  />
                  تضمين أرقام الصفحات
                </label>
              </div>
            </div>
          </div>

          {/* Page Settings */}
          <div className="settings-section">
            <h3 className="section-title">إعدادات الصفحة</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="orientation">اتجاه الصفحة:</label>
                <select
                  id="orientation"
                  value={settings.orientation}
                  onChange={(e) => handleSettingChange('orientation', e.target.value as 'portrait' | 'landscape')}
                  className="select-input"
                >
                  <option value="portrait">عمودي</option>
                  <option value="landscape">أفقي</option>
                </select>
              </div>

              <div className="setting-item">
                <label htmlFor="page-size">حجم الصفحة:</label>
                <select
                  id="page-size"
                  value={settings.pageSize}
                  onChange={(e) => handleSettingChange('pageSize', e.target.value)}
                  className="select-input"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.fitToPage}
                    onChange={(e) => handleSettingChange('fitToPage', e.target.checked)}
                  />
                  ملائمة المحتوى للصفحة
                </label>
              </div>
            </div>
          </div>

          {/* Margins */}
          <div className="settings-section">
            <h3 className="section-title">الهوامش (مم)</h3>
            <div className="margins-grid">
              <div className="setting-item">
                <label htmlFor="margin-top">أعلى:</label>
                <input
                  id="margin-top"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.margins.top}
                  onChange={(e) => handleMarginChange('top', parseInt(e.target.value) || 20)}
                  className="number-input"
                />
              </div>

              <div className="setting-item">
                <label htmlFor="margin-right">يمين:</label>
                <input
                  id="margin-right"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.margins.right}
                  onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 20)}
                  className="number-input"
                />
              </div>

              <div className="setting-item">
                <label htmlFor="margin-bottom">أسفل:</label>
                <input
                  id="margin-bottom"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.margins.bottom}
                  onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value) || 20)}
                  className="number-input"
                />
              </div>

              <div className="setting-item">
                <label htmlFor="margin-left">يسار:</label>
                <input
                  id="margin-left"
                  type="number"
                  min="0"
                  max="50"
                  value={settings.margins.left}
                  onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 20)}
                  className="number-input"
                />
              </div>
            </div>
          </div>

          {/* Font and Layout Settings */}
          <div className="settings-section">
            <h3 className="section-title">النمط والتخطيط</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="font-size">حجم الخط:</label>
                <input
                  id="font-size"
                  type="number"
                  min="8"
                  max="20"
                  value={settings.fontSize}
                  onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value) || 11)}
                  className="number-input"
                />
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.rtlLayout}
                    onChange={(e) => handleSettingChange('rtlLayout', e.target.checked)}
                  />
                  تخطيط من اليمين لليسار
                </label>
              </div>

              <div className="setting-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.useArabicNumerals}
                    onChange={(e) => handleSettingChange('useArabicNumerals', e.target.checked)}
                  />
                  استخدام الأرقام العربية
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="summary">
            <span className="columns-count">
              {settings.selectedColumns.length} من {data.columns.length} عمود محدد
            </span>
          </div>
          
          <div className="footer-buttons">
            <button
              className="cancel-button"
              onClick={onClose}
              disabled={isExporting}
            >
              إلغاء
            </button>
            <button
              className="export-button"
              onClick={handleExport}
              disabled={isExporting || settings.selectedColumns.length === 0}
            >
              {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomizedPDFModal;
