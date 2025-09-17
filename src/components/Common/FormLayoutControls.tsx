import React, { useState } from 'react';
import { Settings, Grid, Maximize2, Columns, RotateCcw, Eye, EyeOff, Building2, FileText, DollarSign, Bookmark, BookmarkCheck } from 'lucide-react';
import styles from './FormLayoutControls.module.css';
import type { FormField } from './UnifiedCRUDForm';

interface FormLayoutControlsProps {
  fields: FormField[];
  fieldOrder: string[];
  columnCount: number;
  onColumnCountChange: (count: 1 | 2 | 3) => void;
  onFieldOrderChange: (newOrder: string[]) => void;
  fullWidthFields: Set<string>;
  onFullWidthToggle: (fieldId: string) => void;
  visibleFields: Set<string>;
  onVisibilityToggle: (fieldId: string) => void;
  onResetLayout: () => void;
  onSaveLayout: () => void;
  onRememberLayout?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  showToggleButton?: boolean;
}

const FormLayoutControls: React.FC<FormLayoutControlsProps> = ({
  fields,
  fieldOrder,
  columnCount,
  onColumnCountChange,
  onFieldOrderChange,
  fullWidthFields,
  onFullWidthToggle,
  visibleFields,
  onVisibilityToggle,
  onResetLayout,
  onSaveLayout,
  onRememberLayout,
  isOpen,
  onToggle,
  showToggleButton = true
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'fields' | 'arrange'>('columns');
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [isLayoutRemembered, setIsLayoutRemembered] = useState(() => {
    try {
      const saved = localStorage.getItem('formLayoutPreferredConfig');
      return !!saved;
    } catch {
      return false;
    }
  });

  // Handle remember layout functionality
  const handleRememberLayout = React.useCallback(() => {
    if (onRememberLayout) {
      onRememberLayout();
      setIsLayoutRemembered(true);
    }
  }, [onRememberLayout]);
  // Remove local state - use props instead
  
  // Define filtered fields (non-internal fields)
  const filteredFields = fields.filter(field => 
    !field.id.startsWith('__')
  );
  
  // Create ordered fields list based on fieldOrder prop
  const orderedFields = React.useMemo(() => {
    if (fieldOrder.length > 0) {
      return fieldOrder.map(id => filteredFields.find(f => f.id === id)).filter((field): field is FormField => Boolean(field));
    }
    return filteredFields;
  }, [fieldOrder, filteredFields]);

  const handleDragStart = React.useCallback((e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
    // Add visual feedback
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '0.5';
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    const draggedFieldId = e.dataTransfer.getData('text/plain') || draggedField;
    
    // Reset visual feedback
    const draggedElement = document.querySelector(`[data-field-id="${draggedFieldId}"]`);
    if (draggedElement instanceof HTMLElement) {
      draggedElement.style.opacity = '1';
    }
    
    if (!draggedFieldId || draggedFieldId === targetFieldId) {
      setDraggedField(null);
      return;
    }
    
    const currentOrder = fieldOrder.length > 0 ? fieldOrder : filteredFields.map(f => f.id);
    const draggedIndex = currentOrder.indexOf(draggedFieldId);
    const targetIndex = currentOrder.indexOf(targetFieldId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedField(null);
      return;
    }
    
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedFieldId);
    
    onFieldOrderChange(newOrder);
    setDraggedField(null);
  }, [draggedField, fieldOrder, filteredFields, onFieldOrderChange]);

  const handleDragEnd = React.useCallback((e: React.DragEvent) => {
    // Reset visual feedback
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedField(null);
  }, []);


  const regularFields = React.useMemo(() => 
    orderedFields.filter(field => !fullWidthFields.has(field.id))
  , [orderedFields, fullWidthFields]);

  const fullWidthFieldsList = React.useMemo(() => 
    orderedFields.filter(field => fullWidthFields.has(field.id))
  , [orderedFields, fullWidthFields]);

  return (
    <>
      {/* Toggle Button - conditionally rendered */}
      {showToggleButton && (
        <button 
          type="button"
          className={`${styles.toggleButton} ${isOpen ? styles.active : ''}`}
          onClick={onToggle}
          title={isOpen ? 'إخفاء تحكم التخطيط' : 'عرض تحكم التخطيط'}
        >
          <Settings size={18} />
          <span>تخطيط النموذج</span>
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
              <span>إعدادات تخطيط النموذج</span>
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

              <div className={styles.headerActions}>
                <button 
                  type="button"
                  className={styles.saveButton}
                  onClick={onSaveLayout}
                  title="حفظ التخطيط"
                >
                  حفظ
                </button>
                
                {/* Remember Layout Button - Third Button */}
                {onRememberLayout && (
                  <button 
                    type="button"
                    className={`${styles.rememberButton} ${isLayoutRemembered ? styles.remembered : ''}`}
                    onClick={handleRememberLayout}
                    title={isLayoutRemembered ? 'التخطيط محفوظ' : 'حفظ كتخطيط مفضل'}
                  >
                    {isLayoutRemembered ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </button>
                )}
                
                <button 
                  type="button"
                  className={styles.resetButton}
                  onClick={onResetLayout}
                  title="إعادة تعيين التخطيط"
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

                {/* Column Layout Preview */}
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
                      {/* Full Width Fields */}
                      {fullWidthFieldsList.map(field => (
                        <div 
                          key={`preview-full-${field.id}`} 
                          className={`${styles.previewField} ${styles.fullWidth}`}
                          data-field-id={field.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, field.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, field.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.fieldPreviewHeader}>
                            <span className={styles.fieldLabel}>{field.label}</span>
                            <span className={styles.fieldTypeBadge}>{field.type}</span>
                          </div>
                          <div className={styles.fieldPreviewControls}>
                            <label className={styles.controlGroup}>
                              <input 
                                type="checkbox" 
                                checked={visibleFields.has(field.id)}
                                onChange={() => onVisibilityToggle(field.id)}
                                className={styles.previewCheckbox}
                              />
                              <span className={styles.controlIcon}>👁️</span>
                              <span className={styles.controlLabel}>مرئي</span>
                            </label>
                            <label className={styles.controlGroup}>
                              <input 
                                type="checkbox" 
                                checked={fullWidthFields.has(field.id)}
                                onChange={() => onFullWidthToggle(field.id)}
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
                      
                      {/* Regular Fields */}
                      {regularFields.map((field) => (
                        <div 
                          key={`preview-${field.id}`} 
                          className={styles.previewField}
                          style={{ 
                            gridColumn: columnCount === 1 ? '1 / -1' : 'auto' 
                          }}
                          data-field-id={field.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, field.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, field.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className={styles.fieldPreviewHeader}>
                            <span className={styles.fieldLabel}>{field.label}</span>
                            <span className={styles.fieldTypeBadge}>{field.type}</span>
                          </div>
                          <div className={styles.fieldPreviewControls}>
                            <label className={styles.controlGroup}>
                              <input 
                                type="checkbox" 
                                checked={visibleFields.has(field.id)}
                                onChange={() => onVisibilityToggle(field.id)}
                                className={styles.previewCheckbox}
                              />
                              <span className={styles.controlIcon}>👁️</span>
                              <span className={styles.controlLabel}>مرئي</span>
                            </label>
                            <label className={styles.controlGroup}>
                              <input 
                                type="checkbox" 
                                checked={fullWidthFields.has(field.id)}
                                onChange={() => onFullWidthToggle(field.id)}
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
                      <span className={styles.statLabel}>إجمالي الحقول:</span>
                      <span className={styles.statValue}>{filteredFields.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>حقول كاملة العرض:</span>
                      <span className={styles.statValue}>{fullWidthFieldsList.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statLabel}>حقول الأعمدة:</span>
                      <span className={styles.statValue}>{regularFields.length}</span>
                    </div>
                  </div>
                </div>

                {/* Field Management in Columns Tab */}
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>إدارة الحقول</h4>
                  <p className={styles.sectionDescription}>
                    اسحب الحقول لإعادة ترتيبها أو استخدم أزرار العرض لتغيير عرضها
                  </p>
                  <div className={styles.dragDropList}>
                    {orderedFields.map((field) => (
                      <div
                        key={field.id}
                        data-field-id={field.id}
                        className={`${styles.draggableField} ${
                          draggedField === field.id ? styles.dragging : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, field.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, field.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className={styles.dragHandle}>
                          <Grid size={14} />
                        </div>
                        <div className={styles.fieldInfo}>
                          <span className={styles.fieldName}>{field.label}</span>
                          <span className={styles.fieldType}>{field.type}</span>
                        </div>
                        <div className={styles.fieldBadges}>
                          {field.required && (
                            <span className={styles.requiredBadge}>مطلوب</span>
                          )}
                          {fullWidthFields.has(field.id) && (
                            <span className={styles.fullWidthBadge}>كامل العرض</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`${styles.widthToggle} ${
                            fullWidthFields.has(field.id) ? styles.fullWidthActive : ''
                          }`}
                          onClick={() => onFullWidthToggle(field.id)}
                          title={fullWidthFields.has(field.id) ? 'تغيير إلى عرض عادي' : 'تغيير إلى كامل العرض'}
                        >
                          <Maximize2 size={12} />
                          {fullWidthFields.has(field.id) ? 'كامل' : 'عادي'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className={styles.fieldsTab}>
                {/* Field Categories */}
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>تصنيف الحقول</h4>
                  <div className={styles.fieldCategories}>
                    <div className={styles.category}>
                      <div className={styles.categoryHeader}>
                        <Building2 size={16} />
                        <span>حقول الحسابات</span>
                        <span className={styles.categoryCount}>
                          {filteredFields.filter(f => f.id.includes('account')).length}
                        </span>
                      </div>
                      <div className={styles.categoryFields}>
                        {filteredFields
                          .filter(f => f.id.includes('account'))
                          .map(field => {
                            return (
                              <div key={field.id} className={styles.categoryFieldItem}>
                                <span className={styles.fieldName}>{field.label}</span>
                                <div className={styles.fieldControls}>
                                  <span className={styles.fieldType}>{field.type}</span>
                                  {field.required && (
                                    <span className={styles.requiredBadge}>مطلوب</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    
                    <div className={styles.category}>
                      <div className={styles.categoryHeader}>
                        <FileText size={16} />
                        <span>حقول النص</span>
                        <span className={styles.categoryCount}>
                          {filteredFields.filter(f => f.type === 'textarea' || f.type === 'text').length}
                        </span>
                      </div>
                      <div className={styles.categoryFields}>
                        {filteredFields
                          .filter(f => f.type === 'textarea' || f.type === 'text')
                          .map(field => {
                            return (
                              <div key={field.id} className={styles.categoryFieldItem}>
                                <span className={styles.fieldName}>{field.label}</span>
                                <div className={styles.fieldControls}>
                                  <span className={styles.fieldType}>{field.type}</span>
                                  {field.required && (
                                    <span className={styles.requiredBadge}>مطلوب</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    
                    <div className={styles.category}>
                      <div className={styles.categoryHeader}>
                        <DollarSign size={16} />
                        <span>الحقول الأخرى</span>
                        <span className={styles.categoryCount}>
                          {filteredFields.filter(f => !f.id.includes('account') && f.type !== 'textarea' && f.type !== 'text').length}
                        </span>
                      </div>
                      <div className={styles.categoryFields}>
                        {filteredFields
                          .filter(f => !f.id.includes('account') && f.type !== 'textarea' && f.type !== 'text')
                          .map(field => {
                            return (
                              <div key={field.id} className={styles.categoryFieldItem}>
                                <span className={styles.fieldName}>{field.label}</span>
                                <div className={styles.fieldControls}>
                                  <span className={styles.fieldType}>{field.type}</span>
                                  {field.required && (
                                    <span className={styles.requiredBadge}>مطلوب</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Visibility and Width Control */}
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>إدارة عرض الحقول والعروض</h4>
                  <p className={styles.sectionDescription}>
                    تحكم في الحقول المعروضة وعرضها لتحسين استخدام المساحة
                  </p>
                  <div className={styles.visibilityControls}>
                    {filteredFields.map(field => (
                      <div key={field.id} className={styles.visibilityItem}>
                        <div className={styles.fieldInfoRow}>
                          <span className={styles.visibilityLabel}>{field.label}</span>
                          <div className={styles.fieldControls}>
                            <span className={styles.fieldTypeBadge}>{field.type}</span>
                            {field.required && (
                              <span className={styles.requiredBadge}>مطلوب</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`${styles.widthToggle} ${
                            fullWidthFields.has(field.id) ? styles.fullWidthActive : ''
                          }`}
                          onClick={() => onFullWidthToggle(field.id)}
                          title={fullWidthFields.has(field.id) ? 'تغيير إلى عرض عادي' : 'تغيير إلى كامل العرض'}
                        >
                          <Maximize2 size={12} />
                          {fullWidthFields.has(field.id) ? 'كامل العرض' : 'عرض عادي'}
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
                        // Make all text areas and descriptions full width
                        filteredFields.forEach(field => {
                          if (field.type === 'textarea' || field.id.includes('description') || field.id.includes('notes')) {
                            if (!fullWidthFields.has(field.id)) {
                              onFullWidthToggle(field.id);
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
                        // Reset all fields to normal width
                        filteredFields.forEach(field => {
                          if (fullWidthFields.has(field.id)) {
                            onFullWidthToggle(field.id);
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
                        // Make required fields full width
                        filteredFields.forEach(field => {
                          if (field.required && !fullWidthFields.has(field.id)) {
                            onFullWidthToggle(field.id);
                          }
                        });
                      }}
                    >
                      توسيع الحقول المطلوبة
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'arrange' && (
              <div className={styles.arrangeTab}>
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>ترتيب الحقول</h4>
                  <p className={styles.sectionDescription}>
                    اسحب الحقول لإعادة ترتيبها في النموذج
                  </p>
                  <div className={styles.dragDropList}>
                    {orderedFields.map((field, _index) => (
                      <div
                        key={field.id}
                        data-field-id={field.id}
                        className={`${styles.draggableField} ${
                          draggedField === field.id ? styles.dragging : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, field.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, field.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className={styles.dragHandle}>
                          <Grid size={16} />
                        </div>
                        <div className={styles.fieldInfo}>
                          <span className={styles.fieldName}>{field.label}</span>
                          <span className={styles.fieldType}>{field.type}</span>
                          <span className={styles.fieldOrder}>#{_index + 1}</span>
                        </div>
                        <div className={styles.fieldBadges}>
                          {field.required && (
                            <span className={styles.requiredBadge}>مطلوب</span>
                          )}
                          {fullWidthFields.has(field.id) && (
                            <span className={styles.fullWidthBadge}>كامل العرض</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Field Visibility Controls */}
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>إدارة عرض الحقول</h4>
                  <p className={styles.sectionDescription}>
                    تحكم في الحقول المعروضة في النموذج
                  </p>
                  <div className={styles.visibilityControls}>
                    {filteredFields.map(field => (
                      <div key={field.id} className={styles.visibilityItem}>
                        <input 
                          type="checkbox" 
                          checked={visibleFields.has(field.id)}
                          onChange={() => onVisibilityToggle(field.id)}
                          className={styles.visibilityCheckbox}
                          id={`visibility-${field.id}`}
                        />
                        <label htmlFor={`visibility-${field.id}`} className={styles.visibilityLabel}>
                          {field.label}
                        </label>
                        <span className={styles.fieldTypeBadge}>{field.type}</span>
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

export default FormLayoutControls;
