import React, { useState } from 'react';
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel';
import UnifiedCRUDForm from '../../components/Common/UnifiedCRUDForm';
import createAccountFormConfig, { type AccountLite } from '../../components/Accounts/AccountFormConfig';

const AccountFormDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [panel, setPanel] = useState({
    position: { x: 100, y: 100 },
    size: { width: 720, height: 760 },
    isMaximized: false,
    isDocked: false,
    dockPosition: 'right' as 'left' | 'right' | 'top' | 'bottom'
  });

  const parentAccounts: AccountLite[] = [
    { id: 'p1', code: '1', name_ar: 'الأصول', level: 1, account_type: 'assets', statement_type: 'balance_sheet', is_active: true },
    { id: 'p2', code: '2', name_ar: 'الخصوم', level: 1, account_type: 'liabilities', statement_type: 'balance_sheet', is_active: true },
  ];

  const formConfig = createAccountFormConfig(true, parentAccounts, { id: 'x', code: '1-1', name_ar: 'حساب فرعي جديد لـ الأصول', level: 2, account_type: 'assets', statement_type: 'balance_sheet', is_active: true });

  const initialData = {
    code: '',
    name_ar: '',
    name_en: '',
    level: 1,
    account_type: '',
    statement_type: '',
    parent_id: '',
    is_active: true,
    allow_transactions: false,
  };

  const onSubmit = async (data: any) => {
    console.log('Demo submit', data);
  };

  const update = (u: Partial<typeof panel>) => setPanel(prev => ({ ...prev, ...u }));

  return (
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
      onResetPosition={() => update({ position: { x: 100, y: 100 }, size: { width: 720, height: 760 }, isDocked: false, isMaximized: false })}
    >
      <UnifiedCRUDForm
        config={formConfig}
        initialData={initialData}
        onSubmit={onSubmit}
        onCancel={() => setIsOpen(false)}
        showAutoFillNotification={true}
      />
    </DraggableResizablePanel>
  );
};

export default AccountFormDemo;
