import { useState, useEffect, useMemo } from 'react'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { getAccounts, type Account } from '../../services/transactions'
import { getCompanyConfig } from '../../services/company-config'
import SearchableSelect from '../../components/Common/SearchableSelect'
import './FiscalPages.css'

interface ImportRow {
  id: string
  accountId?: string // Added for proper linkage
  accountCode: string
  debit: number
  credit: number
  currency: string
}

export default function OpeningBalanceImportRefactored() {
  const { isRTL, formatCurrency } = useArabicLanguage()
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'file'>('manual')
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('')
  const [defaultCurrency, setDefaultCurrency] = useState('SAR')

  // Account Data State
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  useEffect(() => {
    // Initial fetch for config and accounts
    const initData = async () => {
      try {
        setLoadingAccounts(true)
        console.log('🔄 OpeningBalanceImport: Starting initData...')

        // 1. Fetch Company Config for Currency
        try {
          const config = await getCompanyConfig()
          if (config && config.currency_code) {
            setDefaultCurrency(config.currency_code)
            console.log('✅ Default Currency:', config.currency_code)

            // Initialize rows with the fetched currency
            setImportRows([
              { id: '1', accountCode: '', debit: 0, credit: 0, currency: config.currency_code },
              { id: '2', accountCode: '', debit: 0, credit: 0, currency: config.currency_code }
            ])
          } else {
            // Fallback init
            setImportRows([
              { id: '1', accountCode: '', debit: 0, credit: 0, currency: 'SAR' },
              { id: '2', accountCode: '', debit: 0, credit: 0, currency: 'SAR' }
            ])
          }
        } catch (configErr) {
          console.error('❌ Failed to load company config:', configErr)
          // Fallback init
          setImportRows([
            { id: '1', accountCode: '', debit: 0, credit: 0, currency: 'SAR' },
            { id: '2', accountCode: '', debit: 0, credit: 0, currency: 'SAR' }
          ])
        }

        // 2. Fetch Accounts with timeout race
        const timeout = new Promise<Account[]>((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        })
        const accts = await Promise.race([getAccounts(), timeout])

        setAccounts(accts)
      } catch (err) {
        console.error('❌ Failed to load initial data:', err)
        setAccounts([])
      } finally {
        setLoadingAccounts(false)
      }
    }

    initData()
  }, [])

  // Filter only postable accounts and format for SearchableSelect
  const accountOptions = useMemo(() => {
    return accounts
      .filter(acc => acc.is_postable)
      .map(acc => ({
        value: acc.id,
        label: `${acc.code} - ${acc.name_ar || acc.name}`,
        searchText: `${acc.code} ${acc.name} ${acc.name_ar || ''}`
      }))
  }, [accounts])

  const handleAddRow = () => {
    const newRow: ImportRow = {
      id: Date.now().toString(),
      accountCode: '',
      debit: 0,
      credit: 0,
      currency: defaultCurrency
    }
    setImportRows([...importRows, newRow])
  }

  const handleDeleteRow = (id: string) => {
    setImportRows(importRows.filter(r => r.id !== id))
  }

  const handleRowChange = (id: string, field: keyof ImportRow, value: any) => {
    setImportRows(importRows.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  // Handle account selection specifically
  const handleAccountChange = (id: string, accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    setImportRows(importRows.map(r =>
      r.id === id ? {
        ...r,
        accountId: accountId,
        accountCode: account?.code || ''
      } : r
    ))
  }

  const totalDebit = importRows.reduce((sum, r) => sum + r.debit, 0)
  const totalCredit = importRows.reduce((sum, r) => sum + r.credit, 0)
  const isBalanced = totalDebit === totalCredit && totalDebit > 0
  const canImport = isBalanced && selectedFiscalYear !== '' && !loading

  const handleImport = () => {
    if (!canImport) return
    setLoading(true)
    setTimeout(() => {
      alert(isRTL ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="fiscal-page-header">
        <div className="fiscal-page-header-left">
          <h1 className="fiscal-page-title">{isRTL ? 'استيراد الأرصدة الافتتاحية' : 'Opening Balance Import'}</h1>
          <p className="fiscal-page-subtitle">{isRTL ? 'استيراد الأرصدة الافتتاحية للحسابات' : 'Import opening balances for accounts'}</p>
        </div>
        <div className="fiscal-page-actions">
          <button
            className="ultimate-btn ultimate-btn-primary"
            onClick={() => setImportMode(importMode === 'manual' ? 'file' : 'manual')}
          >
            <div className="btn-content">
              <span>🔄</span>
              <span>{importMode === 'manual' ? (isRTL ? 'من ملف' : 'From File') : (isRTL ? 'إدخال يدوي' : 'Manual Entry')}</span>
            </div>
          </button>
          <button
            className="ultimate-btn ultimate-btn-add"
            onClick={handleAddRow}
            disabled={importMode === 'file'}
          >
            <div className="btn-content">
              <span>➕</span>
              <span>{isRTL ? 'إضافة صف' : 'Add Row'}</span>
            </div>
          </button>
          <button
            className="ultimate-btn ultimate-btn-success"
            onClick={handleImport}
            disabled={!canImport}
            title={!isBalanced ? (isRTL ? 'البيانات غير متوازنة' : 'Data is unbalanced') : (!selectedFiscalYear ? (isRTL ? 'يرجى اختيار السنة المالية' : 'Please select fiscal year') : '')}
          >
            <div className="btn-content">
              <span>✓</span>
              <span>{loading ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد' : 'Import')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="fiscal-page-content">
        {/* Fiscal Year Selection */}
        <div className="fiscal-card fiscal-import-card">
          <div className="fiscal-card-header">
            <h3 className="fiscal-card-title">{isRTL ? 'اختر السنة المالية' : 'Select Fiscal Year'}</h3>
          </div>
          <div className="fiscal-card-content">
            <select
              className={`fiscal-filter-select fiscal-import-select-max-width ${!selectedFiscalYear ? 'border-red-300' : ''}`}
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              style={!selectedFiscalYear ? { borderColor: 'var(--error)' } : {}}
            >
              <option value="">{isRTL ? '-- اختر سنة مالية --' : '-- Select Fiscal Year --'}</option>
              <option value="2024">{isRTL ? 'السنة المالية 2024' : 'Fiscal Year 2024'}</option>
              <option value="2023">{isRTL ? 'السنة المالية 2023' : 'Fiscal Year 2023'}</option>
            </select>
            {!selectedFiscalYear && (
              <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {isRTL ? '* مطلوب اختيار السنة المالية' : '* Fiscal year is required'}
              </div>
            )}
          </div>
        </div>

        {/* Import Mode: Manual Entry */}
        {importMode === 'manual' && (
          <>
            {/* Data Entry Table */}
            <table className="fiscal-table fiscal-import-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '300px' }}>{isRTL ? 'الحساب' : 'Account'}</th>
                  <th style={{ width: '150px' }}>{isRTL ? 'مدين' : 'Debit'}</th>
                  <th style={{ width: '150px' }}>{isRTL ? 'دائن' : 'Credit'}</th>
                  <th style={{ width: '100px' }}>{isRTL ? 'العملة' : 'Currency'}</th>
                  <th style={{ width: '80px' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div className="fiscal-searchable-select-wrapper">
                        <SearchableSelect
                          id={`account-select-${row.id}`}
                          value={row.accountId || ''}
                          options={accountOptions}
                          onChange={(val) => handleAccountChange(row.id, val)}
                          placeholder={loadingAccounts
                            ? (isRTL ? 'جاري التحميل...' : 'Loading...')
                            : (isRTL ? 'ابحث عن الحساب...' : 'Search Account...')}
                          disabled={loadingAccounts}
                          compact={true}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="fiscal-import-input"
                        value={row.debit}
                        onChange={(e) => handleRowChange(row.id, 'debit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="fiscal-import-input"
                        value={row.credit}
                        onChange={(e) => handleRowChange(row.id, 'credit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td>
                      <select
                        className="fiscal-import-select"
                        value={row.currency}
                        onChange={(e) => handleRowChange(row.id, 'currency', e.target.value)}
                      >
                        <option value={defaultCurrency}>{defaultCurrency}</option>
                        {defaultCurrency !== 'SAR' && <option value="SAR">SAR</option>}
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="EGP">EGP</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="ultimate-btn ultimate-btn-delete fiscal-period-action-btn"
                        onClick={() => handleDeleteRow(row.id)}
                        title={isRTL ? 'حذف السطر' : 'Delete Row'}
                      >
                        {isRTL ? 'حذف' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="fiscal-card fiscal-import-card">
              <div className="fiscal-card-header">
                <h3 className="fiscal-card-title">{isRTL ? 'الإجماليات' : 'Totals'}</h3>
              </div>
              <div className="fiscal-card-content">
                <div className="fiscal-import-totals-grid">
                  <div className="fiscal-financial-card fiscal-financial-card-revenue">
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'إجمالي المدين' : 'Total Debit'}
                    </div>
                    <div className="fiscal-financial-card-value positive">
                      {formatCurrency(totalDebit)}
                    </div>
                  </div>
                  <div className="fiscal-financial-card fiscal-financial-card-expenses">
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'إجمالي الدائن' : 'Total Credit'}
                    </div>
                    <div className="fiscal-financial-card-value negative">
                      {formatCurrency(totalCredit)}
                    </div>
                  </div>
                  <div className={`fiscal-financial-card ${isBalanced ? 'fiscal-financial-card-revenue' : 'fiscal-financial-card-income'}`} style={!isBalanced ? { borderColor: 'var(--error)', backgroundColor: 'rgba(222, 63, 63, 0.05)' } : {}}>
                    <div className="fiscal-financial-card-label">
                      {isRTL ? 'الفرق' : 'Difference'}
                    </div>
                    <div className={`fiscal-financial-card-value ${isBalanced ? 'positive' : 'negative'}`}>
                      {formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </div>
                  </div>
                </div>
                {isBalanced && (
                  <div className="fiscal-import-status-message fiscal-import-status-balanced">
                    ✓ {isRTL ? 'البيانات متوازنة' : 'Data is balanced'}
                  </div>
                )}
                {!isBalanced && (
                  <div className="fiscal-import-status-message fiscal-import-status-unbalanced">
                    ⚠ {isRTL ? 'البيانات غير متوازنة' : 'Data is not balanced'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Import Mode: File Upload */}
        {importMode === 'file' && (
          <div className="fiscal-card">
            <div className="fiscal-card-header">
              <h3 className="fiscal-card-title">{isRTL ? 'رفع ملف' : 'Upload File'}</h3>
            </div>
            <div className="fiscal-card-content">
              <div className="fiscal-import-file-upload">
                <div className="fiscal-import-file-upload-icon">📁</div>
                <p className="fiscal-import-file-upload-text">
                  {isRTL ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag file here or click to select'}
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="fiscal-import-file-input"
                  id="file-input"
                />
                <button
                  className="ultimate-btn ultimate-btn-primary"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <div className="btn-content">
                    <span>📤</span>
                    <span>{isRTL ? 'اختر ملف' : 'Choose File'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
