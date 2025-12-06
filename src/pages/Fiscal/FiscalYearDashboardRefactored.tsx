import { useState, useEffect } from 'react'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import './FiscalPages.css'

interface FiscalYear {
  id: string
  code: string
  name: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'closed'
  totalPeriods: number
  totalTransactions: number
  totalRevenue: number
  totalExpenses: number
}

export default function FiscalYearDashboardRefactored() {
  const { isRTL, formatCurrency, formatDate } = useArabicLanguage()
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedYearId, setSelectedYearId] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      const mockYears: FiscalYear[] = [
        {
          id: '1',
          code: 'FY2024',
          name: isRTL ? 'السنة المالية 2024' : 'Fiscal Year 2024',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          status: 'active',
          totalPeriods: 4,
          totalTransactions: 623,
          totalRevenue: 1200000.00,
          totalExpenses: 850000.00
        },
        {
          id: '2',
          code: 'FY2023',
          name: isRTL ? 'السنة المالية 2023' : 'Fiscal Year 2023',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          status: 'closed',
          totalPeriods: 4,
          totalTransactions: 512,
          totalRevenue: 950000.00,
          totalExpenses: 720000.00
        }
      ]
      setFiscalYears(mockYears)
      setLoading(false)
    }, 500)
  }, [isRTL])

  const getStatusClass = (status: string) => {
    return `fiscal-status-badge fiscal-status-${status}`
  }

  const selectedYear = fiscalYears.find(y => y.id === selectedYearId)
  const netIncome = (selectedYear?.totalRevenue || 0) - (selectedYear?.totalExpenses || 0)

  if (loading) {
    return (
      <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="fiscal-page-header">
          <div className="fiscal-page-header-left">
            <h1 className="fiscal-page-title">{isRTL ? 'لوحة السنوات المالية' : 'Fiscal Year Dashboard'}</h1>
          </div>
        </div>
        <div className="fiscal-page-content">
          <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="fiscal-page-header">
        <div className="fiscal-page-header-left">
          <h1 className="fiscal-page-title">{isRTL ? 'لوحة السنوات المالية' : 'Fiscal Year Dashboard'}</h1>
          <p className="fiscal-page-subtitle">{isRTL ? 'عرض وإدارة السنوات المالية' : 'View and manage fiscal years'}</p>
        </div>
        <div className="fiscal-page-actions">
          <button className="ultimate-btn ultimate-btn-add">
            <div className="btn-content">
              <span>➕</span>
              <span>{isRTL ? 'سنة جديدة' : 'New Year'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="fiscal-page-content">
        {/* Summary Cards */}
        <div className="fiscal-grid">
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي السنوات' : 'Total Years'}</div>
            <div className="fiscal-grid-item-value">{fiscalYears.length}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'السنوات النشطة' : 'Active Years'}</div>
            <div className="fiscal-grid-item-value">{fiscalYears.filter(y => y.status === 'active').length}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي المعاملات' : 'Total Transactions'}</div>
            <div className="fiscal-grid-item-value">{fiscalYears.reduce((sum, y) => sum + y.totalTransactions, 0)}</div>
          </div>
          <div className="fiscal-grid-item">
            <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
            <div className="fiscal-grid-item-value positive">
              {formatCurrency(fiscalYears.reduce((sum, y) => sum + y.totalRevenue, 0))}
            </div>
          </div>
        </div>

        {/* Fiscal Years Table */}
        <table className="fiscal-table">
          <thead>
            <tr>
              <th>{isRTL ? 'الكود' : 'Code'}</th>
              <th>{isRTL ? 'الاسم' : 'Name'}</th>
              <th>{isRTL ? 'الفترة' : 'Period'}</th>
              <th>{isRTL ? 'الحالة' : 'Status'}</th>
              <th>{isRTL ? 'الفترات' : 'Periods'}</th>
              <th>{isRTL ? 'المعاملات' : 'Transactions'}</th>
              <th>{isRTL ? 'الإيرادات' : 'Revenue'}</th>
              <th>{isRTL ? 'المصروفات' : 'Expenses'}</th>
            </tr>
          </thead>
          <tbody>
            {fiscalYears.map(year => (
              <tr
                key={year.id}
                onClick={() => setSelectedYearId(year.id)}
                className={`fiscal-table-row-clickable ${selectedYearId === year.id ? 'fiscal-table-row-selected' : ''}`}
              >
                <td><strong>{year.code}</strong></td>
                <td>{year.name}</td>
                <td>{formatDate(year.startDate)} - {formatDate(year.endDate)}</td>
                <td>
                  <span className={getStatusClass(year.status)}>
                    {year.status.charAt(0).toUpperCase() + year.status.slice(1)}
                  </span>
                </td>
                <td>{year.totalPeriods}</td>
                <td>{year.totalTransactions}</td>
                <td className="fiscal-period-table-cell-revenue">{formatCurrency(year.totalRevenue)}</td>
                <td className="fiscal-period-table-cell-expenses">{formatCurrency(year.totalExpenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Selected Year Details */}
        {selectedYear && (
          <div className="fiscal-card fiscal-selected-year-card">
            <div className="fiscal-card-header">
              <h3 className="fiscal-card-title">
                {isRTL ? 'تفاصيل السنة المحددة' : 'Selected Year Details'}
              </h3>
            </div>
            <div className="fiscal-card-content">
              <div className="fiscal-details-grid">
                <div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'الكود:' : 'Code:'}</strong> <span className="fiscal-details-item-value">{selectedYear.code}</span>
                  </div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'الاسم:' : 'Name:'}</strong> <span className="fiscal-details-item-value">{selectedYear.name}</span>
                  </div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'الحالة:' : 'Status:'}</strong>
                    <span className={getStatusClass(selectedYear.status)}>
                      {selectedYear.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'الفترة:' : 'Period:'}</strong> <span className="fiscal-details-item-value">{formatDate(selectedYear.startDate)} - {formatDate(selectedYear.endDate)}</span>
                  </div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'الفترات:' : 'Periods:'}</strong> <span className="fiscal-details-item-value">{selectedYear.totalPeriods}</span>
                  </div>
                  <div className="fiscal-details-item">
                    <strong>{isRTL ? 'المعاملات:' : 'Transactions:'}</strong> <span className="fiscal-details-item-value">{selectedYear.totalTransactions}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="fiscal-financial-summary">
                <h4>{isRTL ? 'الملخص المالي' : 'Financial Summary'}</h4>
                <div className="fiscal-financial-grid">
                  <div className="fiscal-financial-card fiscal-financial-card-revenue">
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'الإيرادات' : 'Revenue'}
                    </div>
                    <div className="fiscal-financial-card-value positive">
                      {formatCurrency(selectedYear.totalRevenue)}
                    </div>
                  </div>
                  <div className="fiscal-financial-card fiscal-financial-card-expenses">
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'المصروفات' : 'Expenses'}
                    </div>
                    <div className="fiscal-financial-card-value negative">
                      {formatCurrency(selectedYear.totalExpenses)}
                    </div>
                  </div>
                  <div className="fiscal-financial-card fiscal-financial-card-income">
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'صافي الدخل' : 'Net Income'}
                    </div>
                    <div className={`fiscal-financial-card-value ${netIncome >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(netIncome)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
