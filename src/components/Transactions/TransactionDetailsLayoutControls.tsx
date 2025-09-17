import React, { useState } from 'react';
import { Settings, Grid, Maximize2, Columns, RotateCcw, Eye, EyeOff, Building2, FileText, Layout, List, Bookmark, BookmarkCheck } from 'lucide-react';
import styles from '../Common/FormLayoutControls.module.css';

// Define the available detail sections that can be configured
export interface DetailSection {
  id: string;
  label: string;
  description?: string;
  type: 'info' | 'system' | 'audit';
  required?: boolean;
}

// Default sections available in transaction details
export const DEFAULT_DETAIL_SECTIONS: DetailSection[] = [
  // Transaction Info sections
  { id: 'basic_info', label: 'المعلومات الأساسية', type: 'info', required: true },
  { id: 'amount_info', label: 'المبلغ والمرجع', type: 'info' },
  { id: 'accounts_info', label: 'الحسابات', type: 'info', required: true },
  { id: 'approval_status', label: 'حالة الاعتماد', type: 'info' },
  { id: 'classification_info', label: 'التصنيف والفئة', type: 'info' },
  { id: 'work_items', label: 'عناصر العمل', type: 'info' },
  { id: 'org_project', label: 'المؤسسة والمشروع', type: 'info' },
  { id: 'notes_field', label: 'الملاحظات', type: 'info' },
  
  // System sections
  { id: 'system_info', label: 'معلومات النظام', type: 'system' },
  { id: 'posting_info', label: 'معلومات الترحيل', type: 'system' },
  
  // Audit sections
  { id: 'submit_notes', label: 'ملاحظات الإرسال', type: 'audit' },
  { id: 'audit_trail', label: 'سجل الإجراءات', type: 'audit' },
  { id: 'approval_history', label: 'سجل الموافقات', type: 'audit' },
];

export interface TransactionDetailsConfig {
  visibleSections: Set<string>;
  sectionOrder: string[];
  fullWidthSections: Set<string>;
  columnsPerSection: 1 | 2 | 3;
}

interface TransactionDetailsLayoutControlsProps {
  sections: DetailSection[];
  sectionOrder: string[];
  columnCount: number;
  onColumnCountChange: (count: 1 | 2 | 3) => void;
  onSectionOrderChange: (newOrder: string[]) => void;
  fullWidthSections: Set<string>;
  onFullWidthToggle: (sectionId: string) => void;
  visibleSections: Set<string>;
  onVisibilityToggle: (sectionId: string) => void;
  onResetLayout: () => void;
  onSaveLayout: () => void;
  onRememberLayout?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  showToggleButton?: boolean;
}

const TransactionDetailsLayoutControls: React.FC<TransactionDetailsLayoutControlsProps> = ({
  sections,
  sectionOrder,
  columnCount,
  onColumnCountChange,
  onSectionOrderChange,
  fullWidthSections,
  onFullWidthToggle,
  visibleSections,
  onVisibilityToggle,
  onResetLayout,
  onSaveLayout,
  onRememberLayout,
  isOpen,
  onToggle,
  showToggleButton = true
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'fields' | 'arrange'>('columns');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [isLayoutRemembered, setIsLayoutRemembered] = useState(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsLayoutConfig');
      return !!saved;
    } catch {
      return false;
    }
  });

  // Handle remember layout functionality
  const handleRememberLayout = React.useCallback(() => {
    console.log('Remember layout clicked, onRememberLayout:', !!onRememberLayout);
    if (onRememberLayout) {
      onRememberLayout();
      setIsLayoutRemembered(true);
      // Auto-save notification or toast could go here
    }
  }, [onRememberLayout]);
  
  // Debug log to check if prop is being passed
  React.useEffect(() => {
    console.log('TransactionDetailsLayoutControls - onRememberLayout prop:', !!onRememberLayout);
  }, [onRememberLayout]);

  // Define filtered sections (non-internal sections)
  const filteredSections = sections.filter(section => 
    !section.id.startsWith('__')
  );
  
  // Create ordered sections list based on sectionOrder prop
  const orderedSections = React.useMemo(() => {
    if (sectionOrder.length > 0) {
      return sectionOrder.map(id => filteredSections.find(s => s.id === id)).filter((section): section is DetailSection => Boolean(section));
    }
    return filteredSections;
  }, [sectionOrder, filteredSections]);

  const regularSections = React.useMemo(() => 
    orderedSections.filter(section => !fullWidthSections.has(section.id))
  , [orderedSections, fullWidthSections]);

  const fullWidthSectionsList = React.useMemo(() => 
    orderedSections.filter(section => fullWidthSections.has(section.id))
  , [orderedSections, fullWidthSections]);

  const handleDragStart = React.useCallback((e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
    // Add visual feedback
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.5';
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const draggedSectionId = e.dataTransfer.getData('text/plain') || draggedSection;
    
    // Reset visual feedback
    const draggedElement = document.querySelector(`[data-section-id="${draggedSectionId}"]`);
    if (draggedElement instanceof HTMLElement) {
      draggedElement.style.opacity = '1';
    }
    
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDraggedSection(null);
      return;
    }
    
    const currentOrder = sectionOrder.length > 0 ? sectionOrder : filteredSections.map(s => s.id);
    const draggedIndex = currentOrder.indexOf(draggedSectionId);
    const targetIndex = currentOrder.indexOf(targetSectionId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSection(null);
      return;
    }
    
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSectionId);
    
    onSectionOrderChange(newOrder);
    setDraggedSection(null);
  }, [draggedSection, sectionOrder, filteredSections, onSectionOrderChange]);

  const handleDragEnd = React.useCallback((e: React.DragEvent) => {
    // Reset visual feedback
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedSection(null);
  }, []);

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'info': return <FileText size={14} />;
      case 'system': return <Building2 size={14} />;
      case 'audit': return <List size={14} />;
      default: return <Layout size={14} />;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'info': return 'المعلومات';
      case 'system': return 'النظام';
      case 'audit': return 'المراجعة';
      default: return 'أخرى';
    }
  };

  return (
    <>
      {/* Toggle Button - conditionally rendered */}
      {showToggleButton && (
        <button 
          type="button"
          className={`${styles.toggleButton} ${isOpen ? styles.active : ''}`}
          onClick={onToggle}
          title={isOpen ? 'إخفاء إعدادات العرض' : 'عرض إعدادات العرض'}
        >
          <Settings size={18} />
          <span>إعدادات العرض</span>
          {isOpen ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className={styles.modalOverlay} onClick={onToggle}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            {/* Panel Header */}
            <div className={styles.header}>
              <div className={styles.title}>
                <Grid size={16} />
                <span>إعدادات عرض تفاصيل المعاملة</span>
              </div>
              
              <div className={styles.tabs}>
                <button 
                  type="button"
                  className={`${styles.tab} ${activeTab === 'columns' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('columns')}
                >
                  <Columns size={14} />
                  الأعمدة
                </button>
                <button 
                  type="button"
                  className={`${styles.tab} ${activeTab === 'fields' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('fields')}
                >
                  <Maximize2 size={14} />
                  الحقول
                </button>
                <button 
                  type="button"
                  className={`${styles.tab} ${activeTab === 'arrange' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('arrange')}
                >
                  <Grid size={14} />
                  ترتيب
                </button>
              </div>

              <div className={styles.headerActions} style={{border: '1px solid red', padding: '4px'}}>
                <button 
                  type="button"
                  className={styles.saveButton}
                  onClick={onSaveLayout}
                  title="حفظ الإعدادات"
                >
                  حفظ
                </button>
                
                {/* Remember Layout Button - Third Button - DEBUG */}
                <span style={{color: 'red', fontSize: '10px'}}>onRememberLayout: {onRememberLayout ? 'YES' : 'NO'}</span>
                {onRememberLayout ? (
                  <button 
                    type="button"
                    className={`${styles.rememberButton} ${isLayoutRemembered ? styles.remembered : ''}`}
                    onClick={handleRememberLayout}
                    title={isLayoutRemembered ? 'التخطيط محفوظ' : 'حفظ كتخطيط مفضل'}
                    style={{ 
                      background: isLayoutRemembered ? '#dbeafe' : '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {isLayoutRemembered ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                ) : (
                  <span style={{color: 'red'}}>NO REMEMBER PROP</span>
                )}
                
                <button 
                  type="button"
                  className={styles.resetButton}
                  onClick={onResetLayout}
                  title="إعادة تعيين الإعدادات"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className={styles.content}>
              {activeTab === 'columns' && (
                <div className={styles.columnsTab}>
                  {/* Column Count Control */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>عدد الأعمدة</h4>
                    <div className={styles.columnButtons}>
                      {[1, 2, 3].map(count => (
                        <button
                          key={count}
                          type="button"
                          className={`${styles.columnButton} ${columnCount === count ? styles.active : ''}`}
                          onClick={() => onColumnCountChange(count as 1 | 2 | 3)}
                        >
                          <div className={styles.columnPreview}>
                            {Array.from({ length: count }, (_, i) => (
                              <div key={i} className={styles.previewColumn} />
                            ))}
                          </div>
                          <span>{count} عمود</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Preview */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>معاينة التخطيط</h4>
                    <div className={styles.layoutPreview}>
                      <div 
                        className={styles.previewGrid}
                        style={{ 
                          gridTemplateColumns: columnCount === 1 ? '1fr' : 
                                             columnCount === 2 ? '1fr 1fr' : 
                                             '1fr 1fr 1fr' 
                        }}
                      >
                        {/* Full Width Sections */}
                        {fullWidthSectionsList.map(section => (
                          <div 
                            key={`preview-full-${section.id}`} 
                            className={`${styles.previewField} ${styles.fullWidth}`}
                            data-section-id={section.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, section.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, section.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className={styles.fieldPreviewHeader}>
                              <span className={styles.fieldLabel}>{section.label}</span>
                              <span className={styles.fieldTypeBadge}>{section.type}</span>
                            </div>
                            <div className={styles.fieldPreviewControls}>
                              <label className={styles.controlGroup}>
                                <input 
                                  type="checkbox" 
                                  checked={visibleSections.has(section.id)}
                                  onChange={() => onVisibilityToggle(section.id)}
                                  className={styles.previewCheckbox}
                                />
                                <span className={styles.controlIcon}>👁️</span>
                                <span className={styles.controlLabel}>مرئي</span>
                              </label>
                              <label className={styles.controlGroup}>
                                <input 
                                  type="checkbox" 
                                  checked={fullWidthSections.has(section.id)}
                                  onChange={() => onFullWidthToggle(section.id)}
                                  className={styles.previewCheckbox}
                                />
                                <span className={styles.controlIcon}>↔️</span>
                                <span className={styles.controlLabel}>كامل</span>
                              </label>
                              <div className={styles.controlGroup}>
                                <span className={styles.controlIcon}>⋮⋮</span>
                                <span className={styles.controlLabel}>سحب</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Regular Sections */}
                        {regularSections.map((section) => (
                          <div 
                            key={`preview-${section.id}`} 
                            className={styles.previewField}
                            style={{ 
                              gridColumn: columnCount === 1 ? '1 / -1' : 'auto' 
                            }}
                            data-section-id={section.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, section.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, section.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className={styles.fieldPreviewHeader}>
                              <span className={styles.fieldLabel}>{section.label}</span>
                              <span className={styles.fieldTypeBadge}>{section.type}</span>
                            </div>
                            <div className={styles.fieldPreviewControls}>
                              <label className={styles.controlGroup}>
                                <input 
                                  type="checkbox" 
                                  checked={visibleSections.has(section.id)}
                                  onChange={() => onVisibilityToggle(section.id)}
                                  className={styles.previewCheckbox}
                                />
                                <span className={styles.controlIcon}>👁️</span>
                                <span className={styles.controlLabel}>مرئي</span>
                              </label>
                              <label className={styles.controlGroup}>
                                <input 
                                  type="checkbox" 
                                  checked={fullWidthSections.has(section.id)}
                                  onChange={() => onFullWidthToggle(section.id)}
                                  className={styles.previewCheckbox}
                                />
                                <span className={styles.controlIcon}>↔️</span>
                                <span className={styles.controlLabel}>كامل</span>
                              </label>
                              <div className={styles.controlGroup}>
                                <span className={styles.controlIcon}>⋮⋮</span>
                                <span className={styles.controlLabel}>سحب</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Layout Statistics */}
                  <div className={styles.section}>
                    <div className={styles.stats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>إجمالي الأقسام:</span>
                        <span className={styles.statValue}>{filteredSections.length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>أقسام كاملة العرض:</span>
                        <span className={styles.statValue}>{fullWidthSectionsList.length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>أقسام الأعمدة:</span>
                        <span className={styles.statValue}>{regularSections.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Management in Columns Tab */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>إدارة الأقسام</h4>
                    <p className={styles.sectionDescription}>
                      اسحب الأقسام لإعادة ترتيبها أو استخدم أزرار العرض لتغيير عرضها
                    </p>
                    <div className={styles.dragDropList}>
                      {orderedSections.map((section) => (
                        <div
                          key={section.id}
                          data-section-id={section.id}
                          className={`${styles.draggableField} ${
                            draggedSection === section.id ? styles.dragging : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, section.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, section.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.dragHandle}>
                            <Grid size={14} />
                          </div>
                          <div className={styles.fieldInfo}>
                            <span className={styles.fieldName}>{section.label}</span>
                            <span className={styles.fieldType}>{section.type}</span>
                          </div>
                          <div className={styles.fieldBadges}>
                            {section.required && (
                              <span className={styles.requiredBadge}>مطلوب</span>
                            )}
                            {fullWidthSections.has(section.id) && (
                              <span className={styles.fullWidthBadge}>كامل العرض</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`${styles.widthToggle} ${
                              fullWidthSections.has(section.id) ? styles.fullWidthActive : ''
                            }`}
                            onClick={() => onFullWidthToggle(section.id)}
                            title={fullWidthSections.has(section.id) ? 'تغيير إلى عرض عادي' : 'تغيير إلى كامل العرض'}
                          >
                            <Maximize2 size={12} />
                            {fullWidthSections.has(section.id) ? 'كامل' : 'عادي'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fields' && (
                <div className={styles.fieldsTab}>
                  {/* Section Categories */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>تصنيف الأقسام</h4>
                    <div className={styles.fieldCategories}>
                      {['info', 'system', 'audit'].map(type => {
                        const typeSections = filteredSections.filter(s => s.type === type);
                        return typeSections.length > 0 && (
                          <div key={type} className={styles.category}>
                            <div className={styles.categoryHeader}>
                              {getCategoryIcon(type)}
                              <span>{getCategoryLabel(type)}</span>
                              <span className={styles.categoryCount}>
                                {typeSections.length}
                              </span>
                            </div>
                            <div className={styles.categoryFields}>
                              {typeSections.map(section => (
                                <div key={section.id} className={styles.categoryFieldItem}>
                                  <span className={styles.fieldName}>{section.label}</span>
                                  <div className={styles.fieldControls}>
                                    <span className={styles.fieldType}>{section.type}</span>
                                    {section.required && (
                                      <span className={styles.requiredBadge}>مطلوب</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section Visibility and Width Control */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>إدارة عرض الأقسام والعروض</h4>
                    <p className={styles.sectionDescription}>
                      تحكم في الأقسام المعروضة وعرضها لتحسين استخدام المساحة
                    </p>
                    <div className={styles.visibilityControls}>
                      {filteredSections.map(section => (
                        <div key={section.id} className={styles.visibilityItem}>
                          <div className={styles.fieldInfoRow}>
                            <span className={styles.visibilityLabel}>{section.label}</span>
                            <div className={styles.fieldControls}>
                              <span className={styles.fieldTypeBadge}>{section.type}</span>
                              {section.required && (
                                <span className={styles.requiredBadge}>مطلوب</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`${styles.widthToggle} ${
                              fullWidthSections.has(section.id) ? styles.fullWidthActive : ''
                            }`}
                            onClick={() => onFullWidthToggle(section.id)}
                            title={fullWidthSections.has(section.id) ? 'تغيير إلى عرض عادي' : 'تغيير إلى كامل العرض'}
                          >
                            <Maximize2 size={12} />
                            {fullWidthSections.has(section.id) ? 'كامل العرض' : 'عرض عادي'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>إجراءات سريعة</h4>
                    <div className={styles.quickActions}>
                      <button
                        type="button"
                        className={styles.quickAction}
                        onClick={() => {
                          // Make all long text sections full width
                          filteredSections.forEach(section => {
                            if (section.id.includes('notes') || section.id.includes('description') || section.id.includes('basic')) {
                              if (!fullWidthSections.has(section.id)) {
                                onFullWidthToggle(section.id);
                              }
                            }
                          });
                        }}
                      >
                        توسيع النصوص الطويلة
                      </button>
                      
                      <button
                        type="button"
                        className={styles.quickAction}
                        onClick={() => {
                          // Reset all sections to normal width
                          filteredSections.forEach(section => {
                            if (fullWidthSections.has(section.id)) {
                              onFullWidthToggle(section.id);
                            }
                          });
                        }}
                      >
                        إعادة تعيين العروض
                      </button>

                      <button
                        type="button"
                        className={styles.quickAction}
                        onClick={() => {
                          // Make required sections full width
                          filteredSections.forEach(section => {
                            if (section.required && !fullWidthSections.has(section.id)) {
                              onFullWidthToggle(section.id);
                            }
                          });
                        }}
                      >
                        توسيع الأقسام المطلوبة
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'arrange' && (
                <div className={styles.arrangeTab}>
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>ترتيب الأقسام</h4>
                    <p className={styles.sectionDescription}>
                      اسحب الأقسام لإعادة ترتيبها في عرض التفاصيل
                    </p>
                    <div className={styles.dragDropList}>
                      {orderedSections.map((section, _index) => (
                        <div
                          key={section.id}
                          data-section-id={section.id}
                          className={`${styles.draggableField} ${
                            draggedSection === section.id ? styles.dragging : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, section.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, section.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.dragHandle}>
                            <Grid size={16} />
                          </div>
                          <div className={styles.fieldInfo}>
                            <span className={styles.fieldName}>{section.label}</span>
                            <span className={styles.fieldType}>{section.type}</span>
                            <span className={styles.fieldOrder}>#{_index + 1}</span>
                          </div>
                          <div className={styles.fieldBadges}>
                            {section.required && (
                              <span className={styles.requiredBadge}>مطلوب</span>
                            )}
                            {fullWidthSections.has(section.id) && (
                              <span className={styles.fullWidthBadge}>كامل العرض</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Section Visibility Controls */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>إدارة عرض الأقسام</h4>
                    <p className={styles.sectionDescription}>
                      تحكم في الأقسام المعروضة في عرض التفاصيل
                    </p>
                    <div className={styles.visibilityControls}>
                      {filteredSections.map(section => (
                        <div key={section.id} className={styles.visibilityItem}>
                          <input 
                            type="checkbox" 
                            checked={visibleSections.has(section.id)}
                            onChange={() => onVisibilityToggle(section.id)}
                            className={styles.visibilityCheckbox}
                            id={`visibility-${section.id}`}
                          />
                          <label htmlFor={`visibility-${section.id}`} className={styles.visibilityLabel}>
                            {section.label}
                          </label>
                          <span className={styles.fieldTypeBadge}>{section.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionDetailsLayoutControls;