import React, { useMemo, useState } from 'react';
import ExportButtons from '../../components/Common/ExportButtons';
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport';
import TreeView from '../../components/TreeView/TreeView';
import './AccountsTree.css';

// Temporary types to match expected structure. Replace with real types when wiring to Supabase
interface AccountItem {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  level: number;
  account_type?: string;
  is_active: boolean;
  parent_id?: string | null;
}

const sampleAccounts: AccountItem[] = [
  { id: '1', code: '1', name_ar: 'الأصول', name_en: 'Assets', level: 1, is_active: true, account_type: 'أصول' },
  { id: '1-1', code: '1-1', name_ar: 'الأصول المتداولة', name_en: 'Current Assets', level: 2, is_active: true, parent_id: '1', account_type: 'أصول' },
  { id: '1-1-1', code: '1-1-1', name_ar: 'النقدية وما في حكمها', name_en: 'Cash and Cash Equivalents', level: 3, is_active: true, parent_id: '1-1', account_type: 'أصول' },
  { id: '1-1-1-1', code: '1-1-1-1', name_ar: 'الصندوق - نقد', name_en: 'Cash on Hand', level: 4, is_active: true, parent_id: '1-1-1', account_type: 'أصول' },
  { id: '1-1-1-2', code: '1-1-1-2', name_ar: 'حساب جاري بنك البلاد', name_en: 'Bank AlBilad Current Account', level: 4, is_active: true, parent_id: '1-1-1', account_type: 'أصول' },
  { id: '1-1-2', code: '1-1-2', name_ar: 'الذمم المدينة', name_en: 'Accounts Receivable', level: 3, is_active: true, parent_id: '1-1', account_type: 'أصول' },
  { id: '1-2', code: '1-2', name_ar: 'الأصول الثابتة', name_en: 'Fixed Assets', level: 2, is_active: true, parent_id: '1', account_type: 'أصول' },
  { id: '2', code: '2', name_ar: 'الخصوم', name_en: 'Liabilities', level: 1, is_active: true, account_type: 'خصوم' },
  { id: '2-1', code: '2-1', name_ar: 'الخصوم المتداولة', name_en: 'Current Liabilities', level: 2, is_active: true, parent_id: '2', account_type: 'خصوم' },
  { id: '3', code: '3', name_ar: 'حقوق الملكية', name_en: 'Equity', level: 1, is_active: false, account_type: 'حقوق الملكية' },
];

const AccountsTreePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'level'>('code');
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);

  const accounts = sampleAccounts; // TODO: replace with real data from Supabase

  const filteredAndSorted = useMemo(() => {
    let data = accounts.filter((acc) => {
      const matchesSearch =
        acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.name_en && acc.name_en.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLevel = levelFilter === '' || acc.level === levelFilter;
      return matchesSearch && matchesLevel;
    });

    data.sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code.localeCompare(b.code);
        case 'name':
          return a.name_ar.localeCompare(b.name_ar);
        case 'level':
          return a.level - b.level;
      }
    });

    return data;
  }, [accounts, searchTerm, levelFilter, sortBy]);

  // Handler functions for tree actions
  const handleEdit = (node: any) => {
    console.log('Edit account:', node);
    setSelectedAccount(node);
    // TODO: Open edit form
  };

  const handleAdd = (parentNode: any) => {
    console.log('Add sub-account to:', parentNode);
    // TODO: Open add form with parent pre-selected
  };

  const handleToggleStatus = (node: any) => {
    console.log('Toggle status:', node);
    // TODO: Update account status
  };

  const handleDelete = (node: any) => {
    console.log('Delete account:', node);
    // TODO: Delete account after confirmation
  };

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'الكود', type: 'text' },
      { key: 'name_ar', header: 'الاسم بالعربية', type: 'text' },
      { key: 'name_en', header: 'الاسم بالإنجليزية', type: 'text' },
      { key: 'account_type', header: 'نوع الحساب', type: 'text' },
      { key: 'level', header: 'المستوى', type: 'number' },
      { key: 'is_active', header: 'الحالة', type: 'boolean' },
    ]);
    const rows = filteredAndSorted.map((r) => ({
      code: r.code,
      name_ar: r.name_ar,
      name_en: r.name_en || '',
      account_type: r.account_type || '',
      level: r.level,
      is_active: r.is_active,
    }));
    return prepareTableData(columns, rows);
  }, [filteredAndSorted]);

  const renderTable = () => (
    <div className="accounts-table-view">
      <table className="accounts-table">
        <thead>
          <tr>
            <th>الكود</th>
            <th>الاسم</th>
            <th>النوع</th>
            <th>المستوى</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((item) => (
            <tr key={item.id} data-inactive={!item.is_active}>
              <td className="table-code-cell">{item.code}</td>
              <td>{item.name_ar}</td>
              <td>{item.account_type || '—'}</td>
              <td className="table-center">{item.level}</td>
              <td className="table-center">
                <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'نشط' : 'غير نشط'}</span>
              </td>
              <td>
                <div className="tree-node-actions">
                  <button className="ultimate-btn ultimate-btn-edit" title="تعديل"><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  <button className="ultimate-btn ultimate-btn-add" title="إضافة فرعي"><div className="btn-content"><span className="btn-text">إضافة فرعي</span></div></button>
                  <button className={`ultimate-btn ${item.is_active ? 'ultimate-btn-delete' : 'ultimate-btn-success'}`} title={item.is_active ? 'تعطيل' : 'تفعيل'}>
                    <div className="btn-content"><span className="btn-text">{item.is_active ? 'تعطيل' : 'تفعيل'}</span></div>
                  </button>
                  <button className="ultimate-btn ultimate-btn-delete" title="حذف"><div className="btn-content"><span className="btn-text">حذف</span></div></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="accounts-page" dir="rtl">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">شجرة الحسابات</h1>
        </div>
        <div className="page-actions">
          <button className="ultimate-btn ultimate-btn-add" title="إضافة حساب جديد">
            <div className="btn-content"><span className="btn-text">+ حساب</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير الحسابات', orientation: 'landscape', useArabicNumerals: true, rtlLayout: true }}
            size="small"
            layout="horizontal"
          />
        </div>
      </div>

      <div className="controls-container">
        <div className="search-and-filters">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="البحث في الحسابات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="icon">🔍</span>
          </div>

          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value === '' ? '' : Number(e.target.value))} className="filter-select">
            <option value="">جميع المستويات</option>
            <option value="1">المستوى 1</option>
            <option value="2">المستوى 2</option>
            <option value="3">المستوى 3</option>
            <option value="4">المستوى 4</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="code">ترتيب حسب الكود</option>
            <option value="name">ترتيب حسب الاسم</option>
            <option value="level">ترتيب حسب المستوى</option>
          </select>
        </div>

        <div className="view-mode-toggle">
          <button className={`view-mode-btn ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>عرض شجرة</button>
          <button className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>عرض جدول</button>
        </div>
      </div>

      <div className="content-area">
        {viewMode === 'tree' ? (
          <TreeView
            data={filteredAndSorted}
            onEdit={handleEdit}
            onAdd={handleAdd}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            maxLevel={4}
          />
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
};

export default AccountsTreePage;
