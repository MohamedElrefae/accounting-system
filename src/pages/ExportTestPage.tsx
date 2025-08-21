/**
 * Export Test Page
 * Test component to verify the universal export system works correctly
 * with Arabic text and various data formats
 */

import React, { useState } from 'react';
import { ExportButtons } from '../components/Common/ExportButtons';
import type { UniversalTableData } from '../utils/UniversalExportManager';
import { createStandardColumns } from '../hooks/useUniversalExport';

const ExportTestPage: React.FC = () => {
  const [selectedDataset, setSelectedDataset] = useState<'accounts' | 'transactions' | 'reports'>('accounts');

  // Sample Accounts Data
  const accountsData: UniversalTableData = {
    columns: createStandardColumns([
      { key: 'accountCode', header: 'رقم الحساب', type: 'text', width: 100 },
      { key: 'accountNameAr', header: 'اسم الحساب (عربي)', type: 'text', width: 200 },
      { key: 'accountNameEn', header: 'اسم الحساب (إنجليزي)', type: 'text', width: 200 },
      { key: 'accountType', header: 'نوع الحساب', type: 'text', width: 150 },
      { key: 'balance', header: 'الرصيد', type: 'currency', width: 120 },
      { key: 'lastUpdated', header: 'آخر تحديث', type: 'date', width: 120 },
      { key: 'isActive', header: 'نشط', type: 'boolean', width: 80 }
    ]),
    rows: [
      {
        accountCode: '1001',
        accountNameAr: 'النقدية في الصندوق',
        accountNameEn: 'Cash in Hand',
        accountType: 'أصول متداولة',
        balance: 25000.50,
        lastUpdated: new Date('2024-01-15'),
        isActive: true
      },
      {
        accountCode: '1002',
        accountNameAr: 'البنك الأهلي',
        accountNameEn: 'National Bank',
        accountType: 'أصول متداولة',
        balance: 150000.75,
        lastUpdated: new Date('2024-01-16'),
        isActive: true
      },
      {
        accountCode: '2001',
        accountNameAr: 'الموردون',
        accountNameEn: 'Suppliers',
        accountType: 'التزامات متداولة',
        balance: -45000.00,
        lastUpdated: new Date('2024-01-14'),
        isActive: true
      },
      {
        accountCode: '3001',
        accountNameAr: 'رأس المال',
        accountNameEn: 'Capital',
        accountType: 'حقوق الملكية',
        balance: 500000.00,
        lastUpdated: new Date('2024-01-01'),
        isActive: true
      },
      {
        accountCode: '4001',
        accountNameAr: 'إيرادات المبيعات',
        accountNameEn: 'Sales Revenue',
        accountType: 'إيرادات',
        balance: 750000.25,
        lastUpdated: new Date('2024-01-16'),
        isActive: true
      }
    ]
  };

  // Sample Transactions Data
  const transactionsData: UniversalTableData = {
    columns: createStandardColumns([
      { key: 'transactionId', header: 'رقم القيد', type: 'text', width: 100 },
      { key: 'date', header: 'التاريخ', type: 'date', width: 120 },
      { key: 'description', header: 'البيان', type: 'text', width: 250 },
      { key: 'debitAmount', header: 'مدين', type: 'currency', width: 120 },
      { key: 'creditAmount', header: 'دائن', type: 'currency', width: 120 },
      { key: 'reference', header: 'المرجع', type: 'text', width: 100 },
      { key: 'posted', header: 'مرحل', type: 'boolean', width: 80 }
    ]),
    rows: [
      {
        transactionId: 'JV-2024-001',
        date: new Date('2024-01-10'),
        description: 'إيداع نقدي في البنك الأهلي',
        debitAmount: 50000,
        creditAmount: 0,
        reference: 'DEP-001',
        posted: true
      },
      {
        transactionId: 'JV-2024-002',
        date: new Date('2024-01-11'),
        description: 'شراء بضاعة من مورد محمد أحمد',
        debitAmount: 0,
        creditAmount: 25000,
        reference: 'PUR-001',
        posted: true
      },
      {
        transactionId: 'JV-2024-003',
        date: new Date('2024-01-12'),
        description: 'مبيعات نقدية للعميل شركة النور',
        debitAmount: 75000,
        creditAmount: 0,
        reference: 'SAL-001',
        posted: false
      },
      {
        transactionId: 'JV-2024-004',
        date: new Date('2024-01-13'),
        description: 'دفع إيجار المكتب لشهر يناير',
        debitAmount: 0,
        creditAmount: 15000,
        reference: 'EXP-001',
        posted: true
      }
    ]
  };

  // Sample Reports Data with percentages
  const reportsData: UniversalTableData = {
    columns: createStandardColumns([
      { key: 'category', header: 'البند', type: 'text', width: 200 },
      { key: 'currentYear', header: 'السنة الحالية', type: 'currency', width: 150 },
      { key: 'previousYear', header: 'السنة السابقة', type: 'currency', width: 150 },
      { key: 'change', header: 'التغيير', type: 'currency', width: 120 },
      { key: 'changePercent', header: 'نسبة التغيير', type: 'percentage', width: 120 },
      { key: 'budgetUtilization', header: 'استخدام الموازنة', type: 'percentage', width: 120 }
    ]),
    rows: [
      {
        category: 'إجمالي الإيرادات',
        currentYear: 1500000,
        previousYear: 1200000,
        change: 300000,
        changePercent: 0.25,
        budgetUtilization: 0.95
      },
      {
        category: 'تكلفة المبيعات',
        currentYear: 900000,
        previousYear: 750000,
        change: 150000,
        changePercent: 0.20,
        budgetUtilization: 0.88
      },
      {
        category: 'إجمالي الربح',
        currentYear: 600000,
        previousYear: 450000,
        change: 150000,
        changePercent: 0.33,
        budgetUtilization: 1.10
      },
      {
        category: 'المصاريف التشغيلية',
        currentYear: 350000,
        previousYear: 300000,
        change: 50000,
        changePercent: 0.17,
        budgetUtilization: 0.92
      },
      {
        category: 'صافي الربح',
        currentYear: 250000,
        previousYear: 150000,
        change: 100000,
        changePercent: 0.67,
        budgetUtilization: 1.25
      }
    ]
  };

  const datasets = {
    accounts: accountsData,
    transactions: transactionsData,
    reports: reportsData
  };

  const datasetTitles = {
    accounts: 'دليل الحسابات',
    transactions: 'قيود اليومية',
    reports: 'التقرير المالي'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
        اختبار نظام التصدير الشامل
      </h1>

      {/* Dataset Selector */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>اختر البيانات للتصدير:</label>
        <select
          value={selectedDataset}
          onChange={(e) => setSelectedDataset(e.target.value as any)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            border: '1px solid #ddd',
            borderRadius: '0.375rem'
          }}
        >
          <option value="accounts">دليل الحسابات</option>
          <option value="transactions">قيود اليومية</option>
          <option value="reports">التقرير المالي</option>
        </select>
      </div>

      {/* Export Buttons - Horizontal Layout */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>التخطيط الأفقي</h2>
        <ExportButtons
          data={datasets[selectedDataset]}
          config={{
            title: datasetTitles[selectedDataset],
            subtitle: `تقرير تجريبي - ${new Date().toLocaleDateString('ar-EG')}`,
            useArabicNumerals: true,
            rtlLayout: true
          }}
          layout="horizontal"
          size="medium"
          showAllFormats={true}
          showBatchExport={true}
        />
      </div>

      {/* Export Buttons - Dropdown Layout */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>التخطيط المنسدل</h2>
        <ExportButtons
          data={datasets[selectedDataset]}
          config={{
            title: datasetTitles[selectedDataset],
            subtitle: `تقرير تجريبي - ${new Date().toLocaleDateString('ar-EG')}`,
            useArabicNumerals: true,
            rtlLayout: true
          }}
          layout="dropdown"
          size="medium"
          showAllFormats={true}
          showBatchExport={true}
        />
      </div>

      {/* Data Preview Table */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>معاينة البيانات</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #ddd'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                {datasets[selectedDataset].columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      borderBottom: '2px solid #ddd',
                      fontWeight: 'bold'
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datasets[selectedDataset].rows.map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  {datasets[selectedDataset].columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0.5rem',
                        textAlign: col.type === 'number' || col.type === 'currency' ? 'left' : 'right'
                      }}
                    >
                      {formatCellValue(row[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '0.5rem',
        border: '1px solid #bfdbfe'
      }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1e40af' }}>
          تعليمات الاختبار
        </h3>
        <ul style={{ lineHeight: '1.8', color: '#3730a3' }}>
          <li>اختر نوع البيانات من القائمة المنسدلة</li>
          <li>جرب التصدير بصيغ مختلفة (PDF, Excel, CSV, HTML, JSON)</li>
          <li>تحقق من دعم اللغة العربية في جميع الصيغ</li>
          <li>اختبر تصدير جميع الصيغ دفعة واحدة</li>
          <li>تأكد من عرض الأرقام العربية بشكل صحيح</li>
          <li>تحقق من محاذاة النص RTL في التقارير</li>
        </ul>
      </div>
    </div>
  );
};

// Helper function to format cell values for display
function formatCellValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP'
      }).format(value);
    case 'date':
      return new Date(value).toLocaleDateString('ar-EG');
    case 'boolean':
      return value ? 'نعم' : 'لا';
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`;
    default:
      return String(value);
  }
}

export default ExportTestPage;
