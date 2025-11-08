import React, { useEffect, useState } from 'react';
import styles from './OrganizationSettings.module.css';
import { Building2, Hash, Globe, FolderOpen, Settings } from 'lucide-react';
import { getCompanyConfig, updateCompanyConfig, type CompanyConfig } from '../../services/company-config';
import { useToast } from '../../contexts/ToastContext';
import { clearDateFormatCache } from '../../utils/dateHelpers';
import { getActiveProjects, type Project } from '../../services/projects';
import { getOrganizations, type Organization } from '../../services/organization';
import { setActiveOrgId, setActiveProjectId } from '../../utils/org';

const OrganizationSettings: React.FC = () => {
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
    default_project_id: '',
    shortcutsJSON: '[]'
  });

  const { showToast } = useToast();

  useEffect(() => { void loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const [currentConfig, projectsList, orgsList] = await Promise.all([
        getCompanyConfig(),
        getActiveProjects().catch(() => []),
        getOrganizations().catch(() => [])
      ]);
      setConfig(currentConfig);
      setProjects(projectsList);
      setOrganizations(orgsList);
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
        default_project_id: currentConfig.default_project_id || '',
        shortcutsJSON: JSON.stringify((currentConfig as any).shortcuts || [], null, 2)
      });
    } catch {
      showToast('فشل تحميل إعدادات المؤسسة', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await updateCompanyConfig({ ...formData } as any);
      clearDateFormatCache();
      // Apply defaults to local storage immediately
      try {
        setActiveOrgId(formData.default_org_id || null);
        setActiveProjectId(formData.default_project_id || null);
      } catch {}
      showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' });
      await loadConfig();
    } catch {
      showToast('فشل حفظ الإعدادات', { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const generateSampleNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const numberPart = String(1).padStart(formData.transaction_number_length, '0');
    if (formData.transaction_number_use_year_month) {
      return `${formData.transaction_number_prefix}${formData.transaction_number_separator}${year}${month}${formData.transaction_number_separator}${numberPart}`;
    } else {
      return `${formData.transaction_number_prefix}${formData.transaction_number_separator}${numberPart}`;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} dir="rtl">
        <div className={styles.loadingSpinner} />
        جاري تحميل إعدادات المؤسسة...
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><Building2 size={28} /></div>
            <div className={styles.headerText}>
              <h1>إعدادات المؤسسة</h1>
              <p>المعلومات الأساسية وتكوين الأرقام والتنسيقات</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
          <div className={styles.sectionHeader}><Building2 size={18} /><h2>معلومات المؤسسة</h2></div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="company_name">اسم المؤسسة</label>
              <input id="company_name" type="text" value={formData.company_name} onChange={e=>setFormData(p=>({...p,company_name:e.target.value}))} placeholder="أدخل اسم المؤسسة" required />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}><Hash size={18} /><h2>إعدادات أرقام المعاملات</h2></div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="transaction_number_prefix">بادئة رقم المعاملة</label>
              <input id="transaction_number_prefix" type="text" value={formData.transaction_number_prefix} onChange={e=>setFormData(p=>({...p,transaction_number_prefix:e.target.value.toUpperCase()}))} placeholder="JE" maxLength={5} required />
              <small>مثال: JE للقيود العامة، INV للفواتير</small>
            </div>
            <div className={styles.formField}>
              <label htmlFor="transaction_number_separator">الفاصل</label>
              <select id="transaction_number_separator" value={formData.transaction_number_separator} onChange={e=>setFormData(p=>({...p,transaction_number_separator:e.target.value}))}>
                <option value="-">شرطة (-)</option>
                <option value="_">شرطة سفلية (_)</option>
                <option value=".">نقطة (.)</option>
                <option value="/">/</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="transaction_number_length">طول الرقم التسلسلي</label>
              <input id="transaction_number_length" type="number" min={3} max={8} value={formData.transaction_number_length} onChange={e=>setFormData(p=>({...p,transaction_number_length: parseInt(e.target.value)||4}))} required />
              <small>عدد الأرقام في الجزء التسلسلي (مثال: 4 للحصول على 0001)</small>
            </div>
            <div className={`${styles.formField} ${styles.checkboxField}`}>
              <label>
                <input type="checkbox" checked={formData.transaction_number_use_year_month} onChange={e=>setFormData(p=>({...p,transaction_number_use_year_month:e.target.checked}))} />
                تضمين السنة والشهر في رقم المعاملة
              </label>
              <small>إذا تم التفعيل، سيتم إعادة تشغيل الترقيم التسلسلي كل شهر</small>
            </div>
          </div>
          <div className={styles.sampleBox}>
            <strong>مثال على الرقم المولد: </strong>
            <code>{generateSampleNumber()}</code>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}><Globe size={18} /><h2>إعدادات العملة والتواريخ</h2></div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="currency_code">رمز العملة</label>
              <select id="currency_code" value={formData.currency_code} onChange={e=>setFormData(p=>({...p,currency_code:e.target.value}))}>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label htmlFor="currency_symbol">رمز العملة المعروض</label>
              <select id="currency_symbol" value={formData.currency_symbol} onChange={e=>setFormData(p=>({...p,currency_symbol:e.target.value}))} required>
                <option value="none">بدون رمز (أرقام فقط)</option>
                <option value="ر.س">ر.س (ريال سعودي)</option>
                <option value="د.إ">د.إ (درهم إماراتي)</option>
                <option value="ج.م">ج.م (جنيه مصري)</option>
                <option value="$">$ (دولار)</option>
                <option value="€">€ (يورو)</option>
              </select>
              <small>اختر "بدون رمز" لعرض الأرقام فقط بدون رمز العملة</small>
            </div>
            <div className={styles.formField}>
              <label htmlFor="date_format">تنسيق التاريخ</label>
              <select id="date_format" value={formData.date_format} onChange={e=>setFormData(p=>({...p,date_format:e.target.value}))}>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (أمريكي)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (أوروبي/عربي)</option>
              </select>
              <small>يؤثر هذا على عرض التواريخ في كل الشاشات والتقارير</small>
            </div>
            <div className={styles.formField}>
              <label htmlFor="number_format">تنسيق الأرقام</label>
              <select id="number_format" value={formData.number_format} onChange={e=>setFormData(p=>({...p,number_format:e.target.value}))}>
                <option value="ar-SA">ar-SA (عربي)</option>
                <option value="en-US">en-US (إنجليزي/أمريكي)</option>
                <option value="en-GB">en-GB (إنجليزي/بريطاني)</option>
              </select>
            </div>
          </div>
        </div>

            {/* Dashboard Shortcuts */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}><Settings size={18} /><h2>اختصارات لوحة التحكم</h2></div>
              <div className={styles.formGrid}>
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="shortcutsJSON">قائمة الاختصارات (JSON)</label>
                  <textarea
                    id="shortcutsJSON"
                    value={formData.shortcutsJSON}
                    onChange={e=>setFormData(p=>({...p,shortcutsJSON:e.target.value}))}
                    placeholder='[
  { "label": "Accounts Tree", "path": "/main-data/accounts-tree", "icon": "AccountTree", "accessKey": "A" },
  { "label": "All Transactions", "path": "/transactions/all", "icon": "ReceiptLong", "accessKey": "T" }
]'
                    rows={8}
                    style={{ width: '100%', fontFamily: 'monospace' }}
                  />
                  <small>أدخل مصفوفة من العناصر: label, path, icon (اختياري), accessKey (اختياري)</small>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}><Settings size={18} /><h2>سياسة اعتماد/ترحيل المعاملات</h2></div>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>
                    <input type="checkbox" checked={(config as any)?.auto_post_on_approve || false} onChange={e=>{
                      setConfig(c=>c? ({...c, auto_post_on_approve: e.target.checked} as any) : c);
                      setFormData(p=>p); // no-op to trigger ui
                    }} /> اعتماد = ترحيل تلقائي
                  </label>
                  <small>عند التفعيل، سيتم ترحيل المعاملة مباشرة بعد اعتمادها إن كانت صالحة.</small>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}><FolderOpen size={18} /><h2>الإعدادات الافتراضية للمؤسسة والمشاريع</h2></div>
              <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="default_org_id">المؤسسة الافتراضية</label>
              <select id="default_org_id" value={formData.default_org_id} onChange={e=>setFormData(p=>({...p,default_org_id:e.target.value}))}>
                <option value="">بدون مؤسسة افتراضية</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.code} - {org.name}</option>
                ))}
              </select>
              <small>المؤسسة التي ستُختار تلقائياً في المعاملات الجديدة</small>
            </div>
            <div className={styles.formField}>
              <label htmlFor="default_project_id">المشروع الافتراضي</label>
              <select id="default_project_id" value={formData.default_project_id} onChange={e=>setFormData(p=>({...p,default_project_id:e.target.value}))}>
                <option value="">بدون مشروع افتراضي</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
                ))}
              </select>
              <small>المشروع الذي سيُختار تلقائياً في المعاملات الجديدة</small>
            </div>
          </div>
        </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveButton} disabled={saving}>
                {saving ? (<><div className={`${styles.loadingSpinner} ${styles.loadingSpinnerSmall}`} /> جاري الحفظ...</>) : (<><Settings size={16} /> حفظ الإعدادات</>)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
