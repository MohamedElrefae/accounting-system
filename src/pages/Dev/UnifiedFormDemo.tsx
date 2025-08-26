import React, { useState } from 'react';
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel';
import UnifiedCRUDForm, { type FormConfig, type FormField } from '../../components/Common/UnifiedCRUDForm';
import { Hash, FileText, Globe, Link, Activity } from 'lucide-react';

const UnifiedFormDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [panel, setPanel] = useState({
    position: { x: 100, y: 100 },
    size: { width: 700, height: 760 },
    isMaximized: false,
    isDocked: false,
    dockPosition: 'right' as 'left' | 'right' | 'top' | 'bottom'
  });

  const update = (u: Partial<typeof panel>) => setPanel(prev => ({ ...prev, ...u }));

  const fields: FormField[] = [
    { id: 'code', type: 'text', label: 'كود الحساب', placeholder: 'مثال: 1-1-1 أو 101', required: true, icon: <Hash size={16} /> },
    { id: 'name_ar', type: 'text', label: 'اسم الحساب بالعربية', placeholder: 'اسم الحساب باللغة العربية', required: true, icon: <FileText size={16} /> },
    { id: 'name_en', type: 'text', label: 'اسم الحساب بالإنجليزية', placeholder: 'Account name in English (optional)', icon: <Globe size={16} /> },
    { id: 'parent_id', type: 'select', label: 'الحساب الأب', options: [
      { value: '', label: '-- لا يوجد حساب أب (حساب رئيسي) --' },
      { value: 'p1', label: '1 - الأصول' },
      { value: 'p2', label: '2 - الخصوم' }
    ], icon: <Link size={16} /> },
    { id: 'level_display', type: 'text', label: 'مستوى الحساب', disabled: true, icon: <Activity size={16} />, helpText: 'يتم حساب المستوى تلقائياً بناءً على كود الحساب' },
  ];

  const formConfig: FormConfig = {
    title: '✏️ تعديل الحساب',
    subtitle: 'تعديل بيانات الحساب: undefined',
    fields,
    submitLabel: '💾 حفظ التعديلات',
    cancelLabel: '❌ إلغاء',
    layout: {
      columns: 2,
      responsive: true,
      columnBreakpoints: [
        { field: 'code' },
        { field: 'name_ar' },
        { field: 'name_en' },
        { field: 'parent_id' },
        { field: 'level_display', fullWidth: true }
      ]
    },
    customValidator: (_data) => ({ isValid: true, errors: [] }),
    autoFillLogic: (data) => {
      const res: any = {};
      if (data.code) {
        const lvl = String(data.code).split('-').filter(Boolean).length;
        res.level_display = `المستوى ${lvl} - ${lvl === 1 ? 'رئيسي - Main' : lvl === 2 ? 'فرعي - Sub' : 'تفصيلي'}`;
      }
      return res;
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)} style={{ margin: 16 }}>Open Demo Modal</button>
      <DraggableResizablePanel
        title={'تعديل الحساب'}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={panel.position}
        size={panel.size}
        isMaximized={panel.isMaximized}
        isDocked={panel.isDocked}
        dockPosition={panel.dockPosition}
        onMove={(p) => update({ position: p })}
        onResize={(s) => update({ size: s })}
        onMaximize={() => update({ isMaximized: !panel.isMaximized })}
        onDock={(dock) => update({ isDocked: true, dockPosition: dock, isMaximized: false })}
        onResetPosition={() => update({ position: { x: 100, y: 100 }, size: { width: 700, height: 760 }, isDocked: false, isMaximized: false })}
      >
        <UnifiedCRUDForm
          config={formConfig}
          initialData={{ code: '', name_ar: '', name_en: '' }}
          onSubmit={async () => { /* demo only */ }}
          onCancel={() => setIsOpen(false)}
          showAutoFillNotification={true}
        />
      </DraggableResizablePanel>
    </div>
  );
};

export default UnifiedFormDemo;
