import React, { useState, useEffect } from 'react'
import { Building2, Settings, Hash, Calendar, Globe, FolderOpen } from 'lucide-react'
import { getCompanyConfig, updateCompanyConfig, type CompanyConfig } from '../../services/company-config'
import { useToast } from '../../contexts/ToastContext'
import { clearDateFormatCache } from '../../utils/dateHelpers'
import { getActiveProjects, type Project } from '../../services/projects'
import { getOrganizations, type Organization } from "../../services/organization";

// Add interfaces for organizations (create a placeholder service for now)

const CompanySettings: React.FC = () => {
  const [config, setConfig] = useState<CompanyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [formData, setFormData] = useState({
    company_name: '',
    transaction_number_prefix: 'JE',
    transaction_number_use_year_month: true,
    transaction_number_length: 4,
    transaction_number_separator: '-',
    fiscal_year_start_month: 1,
    currency_code: 'SAR',
    currency_symbol: 'ر.س',
    date_format: 'YYYY-MM-DD',
    number_format: 'ar-SA',
    default_org_id: '',
    default_project_id: ''
  })

  const { showToast } = useToast()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const [currentConfig, projectsList, orgsList] = await Promise.all([
        getCompanyConfig(),
        getActiveProjects().catch(() => []),
        getOrganizations().catch(() => [])
      ])
      
      setConfig(currentConfig)
      setProjects(projectsList)
      setOrganizations(orgsList)
      
      setFormData({
        company_name: currentConfig.company_name,
        transaction_number_prefix: currentConfig.transaction_number_prefix,
        transaction_number_use_year_month: currentConfig.transaction_number_use_year_month,
        transaction_number_length: currentConfig.transaction_number_length,
        transaction_number_separator: currentConfig.transaction_number_separator,
        fiscal_year_start_month: currentConfig.fiscal_year_start_month,
        currency_code: currentConfig.currency_code,
        currency_symbol: currentConfig.currency_symbol,
        date_format: currentConfig.date_format,
        number_format: currentConfig.number_format,
        default_org_id: currentConfig.default_org_id || '',
        default_project_id: currentConfig.default_project_id || ''
      })
    } catch (error) {
      console.error('Error loading config:', error)
      showToast('فشل تحميل إعدادات الشركة', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSaving(true)
    try {
      await updateCompanyConfig(formData)
      clearDateFormatCache()
      showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' })
      await loadConfig() // Reload to get updated config
    } catch (error) {
      console.error('Error saving config:', error)
      showToast('فشل حفظ الإعدادات', { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const generateSampleNumber = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const numberPart = String(1).padStart(formData.transaction_number_length, '0')
    
    if (formData.transaction_number_use_year_month) {
      return `${formData.transaction_number_prefix}${formData.transaction_number_separator}${year}${month}${formData.transaction_number_separator}${numberPart}`
    } else {
      return `${formData.transaction_number_prefix}${formData.transaction_number_separator}${numberPart}`
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        جاري تحميل إعدادات الشركة...
      </div>
    )
  }

  return (
    <div className="company-settings" dir="rtl">
      <div className="settings-header">
        <div className="header-content">
          <div className="header-icon">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="settings-title">إعدادات الشركة</h1>
            <p className="settings-subtitle">إدارة المعلومات الأساسية للشركة وتكوين أرقام المعاملات</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        {/* Company Information */}
        <div className="settings-section">
          <div className="section-header">
            <Building2 size={20} />
            <h2>معلومات الشركة</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="company_name">اسم الشركة</label>
              <input
                type="text"
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="أدخل اسم الشركة"
                required
              />
            </div>
          </div>
        </div>

        {/* Transaction Number Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Hash size={20} />
            <h2>إعدادات أرقام المعاملات</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="transaction_number_prefix">بادئة رقم المعاملة</label>
              <input
                type="text"
                id="transaction_number_prefix"
                value={formData.transaction_number_prefix}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_number_prefix: e.target.value.toUpperCase() }))}
                placeholder="JE"
                maxLength={5}
                required
              />
              <small>مثال: JE للقيود العامة، INV للفواتير</small>
            </div>

            <div className="form-field">
              <label htmlFor="transaction_number_separator">الفاصل</label>
              <select
                id="transaction_number_separator"
                value={formData.transaction_number_separator}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_number_separator: e.target.value }))}
              >
                <option value="-">شرطة (-)</option>
                <option value="_">شرطة سفلية (_)</option>
                <option value=".">نقطة (.)</option>
                <option value="/">/</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction_number_length">طول الرقم التسلسلي</label>
              <input
                type="number"
                id="transaction_number_length"
                value={formData.transaction_number_length}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_number_length: parseInt(e.target.value) || 4 }))}
                min={3}
                max={8}
                required
              />
              <small>عدد الأرقام في الجزء التسلسلي (مثال: 4 للحصول على 0001)</small>
            </div>

            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.transaction_number_use_year_month}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_number_use_year_month: e.target.checked }))}
                />
                <span className="checkmark"></span>
                تضمين السنة والشهر في رقم المعاملة
              </label>
              <small>إذا تم التفعيل، سيتم إعادة تشغيل الترقيم التسلسلي كل شهر</small>
            </div>
          </div>

          <div className="sample-number">
            <strong>مثال على الرقم المولد: </strong>
            <code>{generateSampleNumber()}</code>
          </div>
        </div>

        {/* Currency & Format Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Globe size={20} />
            <h2>إعدادات العملة والتواريخ</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="currency_code">رمز العملة</label>
              <select
                id="currency_code"
                value={formData.currency_code}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_code: e.target.value }))}
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="currency_symbol">رمز العملة المعروض</label>
              <select
                id="currency_symbol"
                value={formData.currency_symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_symbol: e.target.value }))}
                required
              >
                <option value="none">بدون رمز (أرقام فقط)</option>
                <option value="ر.س">ر.س (ريال سعودي)</option>
                <option value="د.إ">د.إ (درهم إماراتي)</option>
                <option value="ج.م">ج.م (جنيه مصري)</option>
                <option value="$">$ (دولار)</option>
                <option value="€">€ (يورو)</option>
                <option value="custom">مخصص</option>
              </select>
              {formData.currency_symbol === 'custom' && (
                <input
                  type="text"
                  value={''}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency_symbol: e.target.value }))}
                  placeholder="أدخل رمز العملة المخصص (مثال: ر.ق أو د.ك)"
                  maxLength={10}
                  style={{ marginTop: '0.5rem' }}
                />
              )}
              <small>اختر "بدون رمز" لعرض الأرقام فقط بدون رمز العملة</small>
            </div>

            <div className="form-field">
              <label htmlFor="date_format">تنسيق التاريخ</label>
              <select
                id="date_format"
                value={formData.date_format}
                onChange={(e) => setFormData(prev => ({ ...prev, date_format: e.target.value }))}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (أمريكي)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (أوروبي/عربي)</option>
              </select>
              <small>يؤثر هذا على عرض التواريخ في كل الشاشات والتقارير</small>
            </div>

            <div className="form-field">
              <label htmlFor="number_format">تنسيق الأرقام</label>
              <select
                id="number_format"
                value={formData.number_format}
                onChange={(e) => setFormData(prev => ({ ...prev, number_format: e.target.value }))}
              >
                <option value="ar-SA">ar-SA (عربي)</option>
                <option value="en-US">en-US (إنجليزي/أمريكي)</option>
                <option value="en-GB">en-GB (إنجليزي/بريطاني)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Default Organization and Project Settings */}
        <div className="settings-section">
          <div className="section-header">
            <FolderOpen size={20} />
            <h2>الإعدادات الافتراضية للمؤسسة والمشاريع</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="default_org_id">المؤسسة الافتراضية</label>
              <select
                id="default_org_id"
                value={formData.default_org_id}
                onChange={(e) => setFormData(prev => ({ ...prev, default_org_id: e.target.value }))}
              >
                <option value="">بدون مؤسسة افتراضية</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.code} - {org.name}
                  </option>
                ))}
              </select>
              <small>المؤسسة التي ستُختار تلقائياً في المعاملات الجديدة</small>
            </div>

            <div className="form-field">
              <label htmlFor="default_project_id">المشروع الافتراضي</label>
              <select
                id="default_project_id"
                value={formData.default_project_id}
                onChange={(e) => setFormData(prev => ({ ...prev, default_project_id: e.target.value }))}
              >
                <option value="">بدون مشروع افتراضي</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
              <small>المشروع الذي سيُختار تلقائياً في المعاملات الجديدة</small>
            </div>
          </div>
        </div>

        {/* Fiscal Year Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Calendar size={20} />
            <h2>إعدادات السنة المالية</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="fiscal_year_start_month">بداية السنة المالية</label>
              <select
                id="fiscal_year_start_month"
                value={formData.fiscal_year_start_month}
                onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year_start_month: parseInt(e.target.value) }))}
              >
                <option value={1}>يناير</option>
                <option value={2}>فبراير</option>
                <option value={3}>مارس</option>
                <option value={4}>أبريل</option>
                <option value={5}>مايو</option>
                <option value={6}>يونيو</option>
                <option value={7}>يوليو</option>
                <option value={8}>أغسطس</option>
                <option value={9}>سبتمبر</option>
                <option value={10}>أكتوبر</option>
                <option value={11}>نوفمبر</option>
                <option value={12}>ديسمبر</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="save-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="loading-spinner small" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Settings size={16} />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        .company-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .settings-header {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .settings-subtitle {
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .form-field label {
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .form-field input,
        .form-field select {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-field small {
          margin-top: 0.25rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .checkbox-field label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-field input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .sample-number {
          margin: 1rem 1.5rem;
          padding: 1rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .sample-number code {
          background: #1e293b;
          color: #22d3ee;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          justify-content: flex-start;
          padding: 1.5rem 0;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner.small {
          width: 16px;
          height: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 3rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default CompanySettings
