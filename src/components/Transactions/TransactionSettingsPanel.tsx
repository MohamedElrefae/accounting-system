import React, { useState, useEffect } from 'react'
import { ExpandableSection } from '../Common/ExpandableSection'
import './TransactionSettingsPanel.css'

export interface DisplaySettings {
  showAccountCodes: boolean
  showTotals: boolean
  showBalanceStatus: boolean
  showCostCenters: boolean
  showProjects: boolean
  showLineApprovals: boolean
  showDocuments: boolean
  showAuditTrail: boolean
}

export interface TabSettings {
  basicInfo: boolean
  lineItems: boolean
  approvals: boolean
  documents: boolean
  auditTrail: boolean
  settings: boolean
}

export interface PrintSettings {
  includeHeader: boolean
  includeFooter: boolean
  includePageNumbers: boolean
  includeQRCode: boolean
  paperSize: 'A4' | 'A3' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margins: number
}

export interface UISettings {
  compactMode: boolean
  showLineNumbers: boolean
  highlightBalanceStatus: boolean
  autoExpandSections: boolean
  showStatusBadges: boolean
  enableDarkMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  tableRowHeight: 'compact' | 'normal' | 'spacious'
}

export interface LayoutSettings {
  infoGridColumns: 1 | 2 | 3
  showFieldLabels: boolean
  showFieldBorders: boolean
  sectionSpacing: 'compact' | 'normal' | 'spacious'
  fieldAlignment: 'right' | 'left'
  showSectionIcons: boolean
  collapsibleSections: boolean
}

export interface NotificationSettings {
  showSuccessMessages: boolean
  showErrorMessages: boolean
  showWarningMessages: boolean
  autoHideMessages: boolean
  messageDisplayTime: number
}

export interface TransactionSettingsPanelProps {
  onSettingsChange?: (settings: {
    display: DisplaySettings
    tabs: TabSettings
    print: PrintSettings
    ui: UISettings
    notifications: NotificationSettings
    layout: LayoutSettings
  }) => void
  onSave?: () => Promise<void>
  onReset?: () => void
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showAccountCodes: false,
  showTotals: true,
  showBalanceStatus: true,
  showCostCenters: false,
  showProjects: true,
  showLineApprovals: true,
  showDocuments: true,
  showAuditTrail: true,
}

const DEFAULT_TAB_SETTINGS: TabSettings = {
  basicInfo: true,
  lineItems: true,
  approvals: true,
  documents: true,
  auditTrail: true,
  settings: true,
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  includeHeader: true,
  includeFooter: true,
  includePageNumbers: true,
  includeQRCode: false,
  paperSize: 'A4',
  orientation: 'portrait',
  margins: 10,
}

const DEFAULT_UI_SETTINGS: UISettings = {
  compactMode: false,
  showLineNumbers: true,
  highlightBalanceStatus: true,
  autoExpandSections: false,
  showStatusBadges: true,
  enableDarkMode: true,
  fontSize: 'medium',
  tableRowHeight: 'normal',
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  showSuccessMessages: true,
  showErrorMessages: true,
  showWarningMessages: true,
  autoHideMessages: true,
  messageDisplayTime: 3000,
}

const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  infoGridColumns: 2,
  showFieldLabels: true,
  showFieldBorders: true,
  sectionSpacing: 'normal',
  fieldAlignment: 'right',
  showSectionIcons: true,
  collapsibleSections: true,
}

export const TransactionSettingsPanel: React.FC<TransactionSettingsPanelProps> = ({
  onSettingsChange,
  onSave,
  onReset,
}) => {
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:display')
      return saved ? JSON.parse(saved) : DEFAULT_DISPLAY_SETTINGS
    } catch {
      return DEFAULT_DISPLAY_SETTINGS
    }
  })

  const [tabSettings, setTabSettings] = useState<TabSettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:tabs')
      return saved ? JSON.parse(saved) : DEFAULT_TAB_SETTINGS
    } catch {
      return DEFAULT_TAB_SETTINGS
    }
  })

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:print')
      return saved ? JSON.parse(saved) : DEFAULT_PRINT_SETTINGS
    } catch {
      return DEFAULT_PRINT_SETTINGS
    }
  })

  const [uiSettings, setUISettings] = useState<UISettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:ui')
      return saved ? JSON.parse(saved) : DEFAULT_UI_SETTINGS
    } catch {
      return DEFAULT_UI_SETTINGS
    }
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:notifications')
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATION_SETTINGS
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS
    }
  })

  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() => {
    try {
      const saved = localStorage.getItem('transactionSettings:layout')
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT_SETTINGS
    } catch {
      return DEFAULT_LAYOUT_SETTINGS
    }
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Persist settings to localStorage and dispatch custom event
  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:display', JSON.stringify(displaySettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'display', settings: displaySettings } 
      }))
    } catch {}
  }, [displaySettings])

  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:tabs', JSON.stringify(tabSettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'tabs', settings: tabSettings } 
      }))
    } catch {}
  }, [tabSettings])

  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:print', JSON.stringify(printSettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'print', settings: printSettings } 
      }))
    } catch {}
  }, [printSettings])

  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:ui', JSON.stringify(uiSettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'ui', settings: uiSettings } 
      }))
    } catch {}
  }, [uiSettings])

  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:notifications', JSON.stringify(notificationSettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'notifications', settings: notificationSettings } 
      }))
    } catch {}
  }, [notificationSettings])

  useEffect(() => {
    try {
      localStorage.setItem('transactionSettings:layout', JSON.stringify(layoutSettings))
      window.dispatchEvent(new CustomEvent('transactionSettingsChanged', { 
        detail: { type: 'layout', settings: layoutSettings } 
      }))
    } catch {}
  }, [layoutSettings])

  // Notify parent of changes
  useEffect(() => {
    onSettingsChange?.({
      display: displaySettings,
      tabs: tabSettings,
      print: printSettings,
      ui: uiSettings,
      notifications: notificationSettings,
      layout: layoutSettings,
    })
  }, [displaySettings, tabSettings, printSettings, uiSettings, notificationSettings, layoutSettings, onSettingsChange])

  const handleDisplaySettingChange = (key: keyof DisplaySettings) => {
    setDisplaySettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleTabSettingChange = (key: keyof TabSettings) => {
    setTabSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handlePrintSettingChange = (key: keyof PrintSettings, value: any) => {
    setPrintSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleUISettingChange = (key: keyof UISettings, value: any) => {
    setUISettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleNotificationSettingChange = (key: keyof NotificationSettings, value: any) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleLayoutSettingChange = (key: keyof LayoutSettings, value: any) => {
    setLayoutSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave?.()
      setSaveMessage('تم حفظ الإعدادات بنجاح')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage('حدث خطأ أثناء حفظ الإعدادات')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('هل تريد إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟')) {
      setDisplaySettings(DEFAULT_DISPLAY_SETTINGS)
      setTabSettings(DEFAULT_TAB_SETTINGS)
      setPrintSettings(DEFAULT_PRINT_SETTINGS)
      setUISettings(DEFAULT_UI_SETTINGS)
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
      setLayoutSettings(DEFAULT_LAYOUT_SETTINGS)
      try {
        localStorage.removeItem('transactionSettings:display')
        localStorage.removeItem('transactionSettings:tabs')
        localStorage.removeItem('transactionSettings:print')
        localStorage.removeItem('transactionSettings:ui')
        localStorage.removeItem('transactionSettings:notifications')
        localStorage.removeItem('transactionSettings:layout')
      } catch {}
      setSaveMessage('تم إعادة تعيين الإعدادات')
      setTimeout(() => setSaveMessage(null), 3000)
      onReset?.()
    }
  }

  return (
    <div className="transaction-settings-panel">
      {saveMessage && (
        <div className={`settings-message ${saveMessage.includes('خطأ') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}

      {/* Display Settings */}
      <ExpandableSection
        title="تخصيص العرض"
        icon="🎨"
        defaultExpanded={true}
        persistKey="settings-display"
      >
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showAccountCodes}
              onChange={() => handleDisplaySettingChange('showAccountCodes')}
            />
            <span className="checkbox-label">إظهار الأكواد مع الأسماء</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showTotals}
              onChange={() => handleDisplaySettingChange('showTotals')}
            />
            <span className="checkbox-label">إظهار الإجماليات</span>
            <span className="checkbox-description">عرض إجمالي المدين والدائن</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showBalanceStatus}
              onChange={() => handleDisplaySettingChange('showBalanceStatus')}
            />
            <span className="checkbox-label">إظهار حالة التوازن</span>
            <span className="checkbox-description">عرض حالة توازن المعاملة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showCostCenters}
              onChange={() => handleDisplaySettingChange('showCostCenters')}
            />
            <span className="checkbox-label">إظهار مراكز التكلفة</span>
            <span className="checkbox-description">عرض معلومات مراكز التكلفة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showProjects}
              onChange={() => handleDisplaySettingChange('showProjects')}
            />
            <span className="checkbox-label">إظهار المشاريع</span>
            <span className="checkbox-description">عرض معلومات المشاريع المرتبطة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showLineApprovals}
              onChange={() => handleDisplaySettingChange('showLineApprovals')}
            />
            <span className="checkbox-label">إظهار موافقات القيود</span>
            <span className="checkbox-description">عرض حالة موافقة كل قيد على حدة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showDocuments}
              onChange={() => handleDisplaySettingChange('showDocuments')}
            />
            <span className="checkbox-label">إظهار المستندات</span>
            <span className="checkbox-description">عرض الملفات المرفقة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={displaySettings.showAuditTrail}
              onChange={() => handleDisplaySettingChange('showAuditTrail')}
            />
            <span className="checkbox-label">إظهار سجل التدقيق</span>
            <span className="checkbox-description">عرض سجل جميع الإجراءات</span>
          </label>
        </div>
      </ExpandableSection>

      {/* Tab Settings */}
      <ExpandableSection
        title="تخصيص التبويبات"
        icon="📑"
        defaultExpanded={true}
        persistKey="settings-tabs"
      >
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.basicInfo}
              onChange={() => handleTabSettingChange('basicInfo')}
            />
            <span className="checkbox-label">معلومات أساسية</span>
            <span className="checkbox-description">تبويب المعلومات الأساسية للمعاملة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.lineItems}
              onChange={() => handleTabSettingChange('lineItems')}
            />
            <span className="checkbox-label">القيود التفصيلية</span>
            <span className="checkbox-description">تبويب جدول القيود</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.approvals}
              onChange={() => handleTabSettingChange('approvals')}
            />
            <span className="checkbox-label">الموافقات</span>
            <span className="checkbox-description">تبويب سجل الموافقات</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.documents}
              onChange={() => handleTabSettingChange('documents')}
            />
            <span className="checkbox-label">المستندات</span>
            <span className="checkbox-description">تبويب الملفات المرفقة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.auditTrail}
              onChange={() => handleTabSettingChange('auditTrail')}
            />
            <span className="checkbox-label">السجلات</span>
            <span className="checkbox-description">تبويب سجل التدقيق</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={tabSettings.settings}
              onChange={() => handleTabSettingChange('settings')}
            />
            <span className="checkbox-label">الإعدادات</span>
            <span className="checkbox-description">تبويب الإعدادات</span>
          </label>
        </div>
      </ExpandableSection>

      {/* Print Settings */}
      <ExpandableSection
        title="إعدادات الطباعة"
        icon="🖨️"
        defaultExpanded={false}
        persistKey="settings-print"
      >
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={printSettings.includeHeader}
              onChange={(e) => handlePrintSettingChange('includeHeader', e.target.checked)}
            />
            <span className="checkbox-label">تضمين رأس الصفحة</span>
            <span className="checkbox-description">عرض معلومات الشركة في أعلى الصفحة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={printSettings.includeFooter}
              onChange={(e) => handlePrintSettingChange('includeFooter', e.target.checked)}
            />
            <span className="checkbox-label">تضمين تذييل الصفحة</span>
            <span className="checkbox-description">عرض معلومات إضافية في أسفل الصفحة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={printSettings.includePageNumbers}
              onChange={(e) => handlePrintSettingChange('includePageNumbers', e.target.checked)}
            />
            <span className="checkbox-label">تضمين أرقام الصفحات</span>
            <span className="checkbox-description">عرض رقم الصفحة الحالية</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={printSettings.includeQRCode}
              onChange={(e) => handlePrintSettingChange('includeQRCode', e.target.checked)}
            />
            <span className="checkbox-label">تضمين رمز QR</span>
            <span className="checkbox-description">عرض رمز QR للمعاملة</span>
          </label>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>حجم الورقة</span>
              <select
                value={printSettings.paperSize}
                onChange={(e) => handlePrintSettingChange('paperSize', e.target.value)}
                className="settings-select"
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
              </select>
            </label>
          </div>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>اتجاه الصفحة</span>
              <select
                value={printSettings.orientation}
                onChange={(e) => handlePrintSettingChange('orientation', e.target.value)}
                className="settings-select"
              >
                <option value="portrait">عمودي</option>
                <option value="landscape">أفقي</option>
              </select>
            </label>
          </div>

          <div className="settings-input-group">
            <label className="settings-label">
              <span>الهوامش (ملم)</span>
              <input
                type="number"
                min="0"
                max="50"
                value={printSettings.margins}
                onChange={(e) => handlePrintSettingChange('margins', parseInt(e.target.value))}
                className="settings-input"
              />
            </label>
          </div>
        </div>
      </ExpandableSection>

      {/* UI Settings */}
      <ExpandableSection
        title="إعدادات الواجهة"
        icon="🎛️"
        defaultExpanded={false}
        persistKey="settings-ui"
      >
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.compactMode}
              onChange={(e) => handleUISettingChange('compactMode', e.target.checked)}
            />
            <span className="checkbox-label">الوضع المضغوط</span>
            <span className="checkbox-description">تقليل المسافات والحشو</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.showLineNumbers}
              onChange={(e) => handleUISettingChange('showLineNumbers', e.target.checked)}
            />
            <span className="checkbox-label">إظهار أرقام الأسطر</span>
            <span className="checkbox-description">عرض أرقام الصفوف في الجداول</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.highlightBalanceStatus}
              onChange={(e) => handleUISettingChange('highlightBalanceStatus', e.target.checked)}
            />
            <span className="checkbox-label">تمييز حالة التوازن</span>
            <span className="checkbox-description">تمييز بصري لحالة التوازن</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.autoExpandSections}
              onChange={(e) => handleUISettingChange('autoExpandSections', e.target.checked)}
            />
            <span className="checkbox-label">توسيع الأقسام تلقائياً</span>
            <span className="checkbox-description">فتح جميع الأقسام القابلة للتوسيع</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.showStatusBadges}
              onChange={(e) => handleUISettingChange('showStatusBadges', e.target.checked)}
            />
            <span className="checkbox-label">إظهار شارات الحالة</span>
            <span className="checkbox-description">عرض شارات الحالة الملونة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={uiSettings.enableDarkMode}
              onChange={(e) => handleUISettingChange('enableDarkMode', e.target.checked)}
            />
            <span className="checkbox-label">الوضع الليلي</span>
            <span className="checkbox-description">تفعيل الوضع الليلي</span>
          </label>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>حجم الخط</span>
              <select
                value={uiSettings.fontSize}
                onChange={(e) => handleUISettingChange('fontSize', e.target.value)}
                className="settings-select"
              >
                <option value="small">صغير</option>
                <option value="medium">متوسط</option>
                <option value="large">كبير</option>
              </select>
            </label>
          </div>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>ارتفاع صفوف الجدول</span>
              <select
                value={uiSettings.tableRowHeight}
                onChange={(e) => handleUISettingChange('tableRowHeight', e.target.value)}
                className="settings-select"
              >
                <option value="compact">مضغوط</option>
                <option value="normal">عادي</option>
                <option value="spacious">واسع</option>
              </select>
            </label>
          </div>
        </div>
      </ExpandableSection>

      {/* Notification Settings */}
      <ExpandableSection
        title="إعدادات الإشعارات"
        icon="🔔"
        defaultExpanded={false}
        persistKey="settings-notifications"
      >
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={notificationSettings.showSuccessMessages}
              onChange={(e) => handleNotificationSettingChange('showSuccessMessages', e.target.checked)}
            />
            <span className="checkbox-label">إظهار رسائل النجاح</span>
            <span className="checkbox-description">عرض إشعارات العمليات الناجحة</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={notificationSettings.showErrorMessages}
              onChange={(e) => handleNotificationSettingChange('showErrorMessages', e.target.checked)}
            />
            <span className="checkbox-label">إظهار رسائل الخطأ</span>
            <span className="checkbox-description">عرض إشعارات الأخطاء</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={notificationSettings.showWarningMessages}
              onChange={(e) => handleNotificationSettingChange('showWarningMessages', e.target.checked)}
            />
            <span className="checkbox-label">إظهار رسائل التحذير</span>
            <span className="checkbox-description">عرض إشعارات التحذير</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={notificationSettings.autoHideMessages}
              onChange={(e) => handleNotificationSettingChange('autoHideMessages', e.target.checked)}
            />
            <span className="checkbox-label">إخفاء الرسائل تلقائياً</span>
            <span className="checkbox-description">إغلاق الإشعارات بعد فترة زمنية</span>
          </label>

          <div className="settings-input-group">
            <label className="settings-label">
              <span>مدة عرض الرسالة (ميلي ثانية)</span>
              <input
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={notificationSettings.messageDisplayTime}
                onChange={(e) => handleNotificationSettingChange('messageDisplayTime', parseInt(e.target.value))}
                className="settings-input"
              />
            </label>
          </div>
        </div>
      </ExpandableSection>

      {/* Layout & Column Settings */}
      <ExpandableSection
        title="تخطيط العرض والأعمدة"
        icon="📐"
        defaultExpanded={false}
        persistKey="settings-layout"
      >
        <div className="settings-group">
          <div className="settings-select-group">
            <label className="settings-label">
              <span>عدد أعمدة الشبكة</span>
              <select
                value={layoutSettings.infoGridColumns}
                onChange={(e) => handleLayoutSettingChange('infoGridColumns', parseInt(e.target.value))}
                className="settings-select"
              >
                <option value={1}>عمود واحد</option>
                <option value={2}>عمودان</option>
                <option value={3}>ثلاثة أعمدة</option>
              </select>
            </label>
            <span className="checkbox-description">عدد الأعمدة في شبكة عرض المعلومات</span>
          </div>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={layoutSettings.showFieldLabels}
              onChange={(e) => handleLayoutSettingChange('showFieldLabels', e.target.checked)}
            />
            <span className="checkbox-label">إظهار تسميات الحقول</span>
            <span className="checkbox-description">عرض عناوين الحقول</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={layoutSettings.showFieldBorders}
              onChange={(e) => handleLayoutSettingChange('showFieldBorders', e.target.checked)}
            />
            <span className="checkbox-label">إظهار حدود الحقول</span>
            <span className="checkbox-description">عرض إطار حول كل حقل</span>
          </label>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>تباعد الأقسام</span>
              <select
                value={layoutSettings.sectionSpacing}
                onChange={(e) => handleLayoutSettingChange('sectionSpacing', e.target.value)}
                className="settings-select"
              >
                <option value="compact">مضغوط</option>
                <option value="normal">عادي</option>
                <option value="spacious">واسع</option>
              </select>
            </label>
            <span className="checkbox-description">المسافة بين الأقسام المختلفة</span>
          </div>

          <div className="settings-select-group">
            <label className="settings-label">
              <span>محاذاة الحقول</span>
              <select
                value={layoutSettings.fieldAlignment}
                onChange={(e) => handleLayoutSettingChange('fieldAlignment', e.target.value)}
                className="settings-select"
              >
                <option value="right">يمين</option>
                <option value="left">يسار</option>
              </select>
            </label>
            <span className="checkbox-description">اتجاه محاذاة النصوص في الحقول</span>
          </div>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={layoutSettings.showSectionIcons}
              onChange={(e) => handleLayoutSettingChange('showSectionIcons', e.target.checked)}
            />
            <span className="checkbox-label">إظهار أيقونات الأقسام</span>
            <span className="checkbox-description">عرض الأيقونات بجانب عناوين الأقسام</span>
          </label>

          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={layoutSettings.collapsibleSections}
              onChange={(e) => handleLayoutSettingChange('collapsibleSections', e.target.checked)}
            />
            <span className="checkbox-label">أقسام قابلة للطي</span>
            <span className="checkbox-description">السماح بطي وفتح الأقسام</span>
          </label>
        </div>
      </ExpandableSection>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
        <button
          className="btn-secondary"
          onClick={handleReset}
          disabled={isSaving}
        >
          إعادة تعيين
        </button>
      </div>
    </div>
  )
}


