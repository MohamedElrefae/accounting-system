import React, { useState } from 'react'
import { 
  Settings, 
  X, 
  ShieldCheck, 
  Eye, 
  Layout, 
  Zap, 
  Sliders, 
  DollarSign, 
  Calendar, 
  Palette, 
  Type, 
  CheckSquare, 
  Grid3x3, 
  ArrowUpDown, 
  Save, 
  MousePointer, 
  Sparkles, 
  Gauge, 
  Database, 
  Code, 
  RotateCcw, 
  Download, 
  Upload, 
  Check, 
  GripVertical 
} from 'lucide-react'

interface WizardSettings {
  // Validation
  strictValidation: boolean
  requireBalance: boolean
  minLines: number
  maxLines: number
  warnLargeAmounts: boolean
  largeAmountThreshold: number
  allowFutureDate: boolean
  checkClosedPeriods: boolean
  
  // Display
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showLineNumbers: boolean
  highlightErrors: boolean
  animations: boolean
  showHints: boolean
  numberFormat: 'ar-EG' | 'en-US'
  thousandsSeparator: ',' | '.' | ' '
  
  // Fields
  fields: {
    entryDate: { required: boolean; visible: boolean }
    organization: { required: boolean; visible: boolean }
    referenceNumber: { required: boolean; visible: boolean }
    description: { required: boolean; visible: boolean }
    notes: { required: boolean; visible: boolean }
    project: { required: boolean; visible: boolean }
    costCenter: { required: boolean; visible: boolean }
    workItem: { required: boolean; visible: boolean }
    analysisItem: { required: boolean; visible: boolean }
    classification: { required: boolean; visible: boolean }
    subTree: { required: boolean; visible: boolean }
  }
  fieldOrder: string[]
  
  // Behavior
  autoSave: boolean
  autoSaveInterval: number
  autoFocusNext: boolean
  calculateOnInput: boolean
  showConfirmations: boolean
  keyboardShortcuts: boolean
  suggestAccounts: boolean
  autoComplete: boolean
  suggestBalance: boolean
  
  // Advanced
  prefetchAccounts: boolean
  lazyLoadExtended: boolean
  cacheEnabled: boolean
  cacheExpiry: number
  devMode: boolean
  logErrors: boolean
}

interface EnhancedSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: WizardSettings
  onSettingsChange: (settings: WizardSettings) => void
}

const defaultSettings: WizardSettings = {
  strictValidation: true,
  requireBalance: true,
  minLines: 2,
  maxLines: 50,
  warnLargeAmounts: true,
  largeAmountThreshold: 10000,
  allowFutureDate: false,
  checkClosedPeriods: true,
  theme: 'light',
  fontSize: 'medium',
  compactMode: false,
  showLineNumbers: true,
  highlightErrors: true,
  animations: true,
  showHints: true,
  numberFormat: 'ar-EG',
  thousandsSeparator: ',',
  fields: {
    entryDate: { required: true, visible: true },
    organization: { required: true, visible: true },
    referenceNumber: { required: false, visible: true },
    description: { required: true, visible: true },
    notes: { required: false, visible: true },
    project: { required: false, visible: true },
    costCenter: { required: false, visible: true },
    workItem: { required: false, visible: true },
    analysisItem: { required: false, visible: true },
    classification: { required: false, visible: true },
    subTree: { required: false, visible: true }
  },
  fieldOrder: ['entryDate', 'organization', 'referenceNumber', 'description', 'notes'],
  autoSave: true,
  autoSaveInterval: 30,
  autoFocusNext: true,
  calculateOnInput: true,
  showConfirmations: true,
  keyboardShortcuts: true,
  suggestAccounts: true,
  autoComplete: true,
  suggestBalance: true,
  prefetchAccounts: true,
  lazyLoadExtended: true,
  cacheEnabled: true,
  cacheExpiry: 24,
  devMode: false,
  logErrors: true
}

export const EnhancedSettingsPanel: React.FC<EnhancedSettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState('validation')
  
  const updateSetting = <K extends keyof WizardSettings>(key: K, value: WizardSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }
  
  const updateField = (field: string, property: 'required' | 'visible', value: boolean) => {
    onSettingsChange({
      ...settings,
      fields: {
        ...settings.fields,
        [field]: {
          ...settings.fields[field as keyof typeof settings.fields],
          [property]: value
        }
      }
    })
  }
  
  const resetToDefaults = () => {
    onSettingsChange(defaultSettings)
  }
  
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'wizard-settings.json'
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }
  
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          onSettingsChange({ ...defaultSettings, ...imported })
        } catch (error) {
          console.error('Failed to import settings:', error)
        }
      }
      reader.readAsText(file)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '800px',
        height: '85vh',
        maxHeight: '700px',
        background: '#ffffff',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <style>{`
          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
          }
          
          .settings-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 18px;
            font-weight: 600;
          }
          
          .close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .settings-tabs {
            display: flex;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            padding: 0 24px;
            overflow-x: auto;
          }
          
          .tab-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 12px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            white-space: nowrap;
          }
          
          .tab-btn:hover {
            color: #374151;
            background: rgba(59, 130, 246, 0.05);
          }
          
          .tab-btn.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
            background: rgba(59, 130, 246, 0.05);
          }
          
          .settings-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }
          
          .settings-section {
            margin-bottom: 32px;
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          
          .setting-label {
            flex: 1;
          }
          
          .setting-title {
            font-weight: 500;
            color: #374151;
            margin-bottom: 4px;
          }
          
          .setting-description {
            font-size: 13px;
            color: #6b7280;
          }
          
          .setting-control {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .toggle-switch {
            position: relative;
            width: 44px;
            height: 24px;
            background: #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .toggle-switch.active {
            background: #3b82f6;
          }
          
          .toggle-switch::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.2s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          
          .toggle-switch.active::after {
            transform: translateX(20px);
          }
          
          .number-input {
            width: 80px;
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            text-align: center;
          }
          
          .select-input {
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            min-width: 120px;
          }
          
          .slider-container {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .slider {
            width: 120px;
            height: 4px;
            background: #e5e7eb;
            border-radius: 2px;
            appearance: none;
            outline: none;
          }
          
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border-radius: 50%;
            cursor: pointer;
          }
          
          .slider-value {
            font-size: 13px;
            color: #6b7280;
            min-width: 60px;
            text-align: left;
          }
          
          .settings-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer-left {
            display: flex;
            gap: 8px;
          }
          
          .footer-right {
            display: flex;
            gap: 8px;
          }
          
          .action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            border-radius: 6px;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
          }
          
          .action-btn:hover {
            background: #f3f4f6;
          }
          
          .action-btn.primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }
          
          .action-btn.primary:hover {
            background: #2563eb;
          }
          
          .action-btn.danger {
            color: #ef4444;
            border-color: #ef4444;
          }
          
          .action-btn.danger:hover {
            background: #fef2f2;
          }
          
          .field-config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
            margin-bottom: 8px;
          }
          
          .field-name {
            font-weight: 500;
            color: #374151;
          }
          
          .field-controls {
            display: flex;
            gap: 8px;
          }
          
          .draggable-field {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin-bottom: 6px;
            cursor: move;
          }
          
          .draggable-field:hover {
            background: #f3f4f6;
          }
        `}</style>
        
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={24} />
            <h2 style={{ margin: 0 }}>إعدادات المعاملة</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            <ShieldCheck size={16} />
            قواعد التحقق
          </button>
          <button 
            className={`tab-btn ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            <Eye size={16} />
            العرض
          </button>
          <button 
            className={`tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            <Layout size={16} />
            الحقول
          </button>
          <button 
            className={`tab-btn ${activeTab === 'behavior' ? 'active' : ''}`}
            onClick={() => setActiveTab('behavior')}
          >
            <Zap size={16} />
            السلوك
          </button>
          <button 
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <Sliders size={16} />
            متقدم
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'validation' && (
            <>
              <div className="settings-section">
                <div className="section-header">
                  <ShieldCheck size={18} />
                  قواعد التحقق الأساسية
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">التحقق الصارم</div>
                    <div className="setting-description">فرض قواعد تحقق صارمة على جميع الحقول</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.strictValidation ? 'active' : ''}`}
                      onClick={() => updateSetting('strictValidation', !settings.strictValidation)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">إجبار التوازن</div>
                    <div className="setting-description">يجب أن تكون المعاملة متوازنة قبل الحفظ</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.requireBalance ? 'active' : ''}`}
                      onClick={() => updateSetting('requireBalance', !settings.requireBalance)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">الحد الأدنى للسطور</div>
                    <div className="setting-description">الحد الأدنى لعدد السطور في المعاملة</div>
                  </div>
                  <div className="setting-control">
                    <input 
                      type="number" 
                      className="number-input"
                      value={settings.minLines}
                      onChange={(e) => updateSetting('minLines', parseInt(e.target.value))}
                      min={2}
                      max={10}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">الحد الأقصى للسطور</div>
                    <div className="setting-description">الحد الأقصى لعدد السطور في المعاملة</div>
                  </div>
                  <div className="setting-control">
                    <input 
                      type="number" 
                      className="number-input"
                      value={settings.maxLines}
                      onChange={(e) => updateSetting('maxLines', parseInt(e.target.value))}
                      min={10}
                      max={100}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-section">
                <div className="section-header">
                  <DollarSign size={18} />
                  تحذيرات المبالغ
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">تحذير المبالغ الكبيرة</div>
                    <div className="setting-description">عرض تحذير عند إدخال مبالغ كبيرة غير معتادة</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.warnLargeAmounts ? 'active' : ''}`}
                      onClick={() => updateSetting('warnLargeAmounts', !settings.warnLargeAmounts)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">حد المبلغ الكبير</div>
                    <div className="setting-description">الحد الذي يعتبر المبلغ عنده كبيراً</div>
                  </div>
                  <div className="setting-control">
                    <input 
                      type="number" 
                      className="number-input"
                      value={settings.largeAmountThreshold}
                      onChange={(e) => updateSetting('largeAmountThreshold', parseFloat(e.target.value))}
                      disabled={!settings.warnLargeAmounts}
                      style={{ opacity: settings.warnLargeAmounts ? 1 : 0.6 }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-section">
                <div className="section-header">
                  <Calendar size={18} />
                  التحقق من التاريخ
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">السماح بتاريخ مستقبلي</div>
                    <div className="setting-description">السماح بإدخال تواريخ مستقبلية</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.allowFutureDate ? 'active' : ''}`}
                      onClick={() => updateSetting('allowFutureDate', !settings.allowFutureDate)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">التحقق من الفترات المغلقة</div>
                    <div className="setting-description">منع الإدخال في فترات محاسبية مغلقة</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.checkClosedPeriods ? 'active' : ''}`}
                      onClick={() => updateSetting('checkClosedPeriods', !settings.checkClosedPeriods)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'display' && (
            <>
              <div className="settings-section">
                <div className="section-header">
                  <Palette size={18} />
                  المظهر العام
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">السمة</div>
                    <div className="setting-description">اختر شكل المظهر</div>
                  </div>
                  <div className="setting-control">
                    <select 
                      className="select-input"
                      value={settings.theme}
                      onChange={(e) => updateSetting('theme', e.target.value as any)}
                    >
                      <option value="light">☀️ فاتح</option>
                      <option value="dark">🌙 داكن</option>
                      <option value="auto">⚙️ تلقائي</option>
                    </select>
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">حجم الخط</div>
                    <div className="setting-description">حجم النص في الواجهة</div>
                  </div>
                  <div className="setting-control">
                    <select 
                      className="select-input"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', e.target.value as any)}
                    >
                      <option value="small">صغير</option>
                      <option value="medium">متوسط</option>
                      <option value="large">كبير</option>
                    </select>
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">الوضع المدمج</div>
                    <div className="setting-description">تقليل المسافات والحواشي لعرض المزيد من المحتوى</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.compactMode ? 'active' : ''}`}
                      onClick={() => updateSetting('compactMode', !settings.compactMode)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-section">
                <div className="section-header">
                  <Eye size={18} />
                  عناصر العرض
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">إظهار أرقام السطور</div>
                    <div className="setting-description">عرض أرقام السطور في جدول القيود</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.showLineNumbers ? 'active' : ''}`}
                      onClick={() => updateSetting('showLineNumbers', !settings.showLineNumbers)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">تمييز الأخطاء</div>
                    <div className="setting-description">تمييز الحقول التي تحتوي على أخطاء بألوان واضحة</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.highlightErrors ? 'active' : ''}`}
                      onClick={() => updateSetting('highlightErrors', !settings.highlightErrors)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">الرسوم المتحركة</div>
                    <div className="setting-description">تفعيل الانتقالات والرسوم المتحركة</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.animations ? 'active' : ''}`}
                      onClick={() => updateSetting('animations', !settings.animations)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">إظهار التلميحات</div>
                    <div className="setting-description">عرض نصائح وإرشادات للمستخدم</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.showHints ? 'active' : ''}`}
                      onClick={() => updateSetting('showHints', !settings.showHints)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'fields' && (
            <>
              <div className="settings-section">
                <div className="section-header">
                  <CheckSquare size={18} />
                  الحقول المطلوبة
                </div>
                {Object.entries(settings.fields).map(([key, config]) => (
                  <div key={key} className="field-config-item">
                    <div className="field-name">
                      {getFieldLabel(key)}
                    </div>
                    <div className="field-controls">
                      <div 
                        className={`toggle-switch ${config.required ? 'active' : ''}`}
                        onClick={() => updateField(key, 'required', !config.required)}
                      />
                      <div 
                        className={`toggle-switch ${config.visible ? 'active' : ''}`}
                        onClick={() => updateField(key, 'visible', !config.visible)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {activeTab === 'behavior' && (
            <>
              <div className="settings-section">
                <div className="section-header">
                  <Save size={18} />
                  الحفظ التلقائي
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">تفعيل الحفظ التلقائي</div>
                    <div className="setting-description">حفظ المسودة تلقائياً أثناء العمل</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.autoSave ? 'active' : ''}`}
                      onClick={() => updateSetting('autoSave', !settings.autoSave)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">الفاصل الزمني للحفظ</div>
                    <div className="setting-description">المدة بالثواني بين عمليات الحفظ التلقائي</div>
                  </div>
                  <div className="setting-control">
                    <div className="slider-container">
                      <input 
                        type="range" 
                        className="slider"
                        value={settings.autoSaveInterval}
                        onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
                        min={10}
                        max={300}
                        step={10}
                        disabled={!settings.autoSave}
                      />
                      <span className="slider-value">{settings.autoSaveInterval} ثانية</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'advanced' && (
            <>
              <div className="settings-section">
                <div className="section-header">
                  <Gauge size={18} />
                  الأداء
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">التحميل المسبق للحسابات</div>
                    <div className="setting-description">تحميل قائمة الحسابات مسبقاً لتسريع الأداء</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.prefetchAccounts ? 'active' : ''}`}
                      onClick={() => updateSetting('prefetchAccounts', !settings.prefetchAccounts)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">التحميل الكسول للحقول الموسعة</div>
                    <div className="setting-description">تحميل الحقول الإضافية عند الحاجة فقط</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.lazyLoadExtended ? 'active' : ''}`}
                      onClick={() => updateSetting('lazyLoadExtended', !settings.lazyLoadExtended)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="settings-section">
                <div className="section-header">
                  <Code size={18} />
                  المطورين
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">وضع التطوير</div>
                    <div className="setting-description">إظهار معلومات تقنية إضافية</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.devMode ? 'active' : ''}`}
                      onClick={() => updateSetting('devMode', !settings.devMode)}
                    />
                  </div>
                </div>
                <div className="setting-item">
                  <div className="setting-label">
                    <div className="setting-title">تسجيل الأخطاء</div>
                    <div className="setting-description">تسجيل الأخطاء والتحذيرات في وحدة التحكم</div>
                  </div>
                  <div className="setting-control">
                    <div 
                      className={`toggle-switch ${settings.logErrors ? 'active' : ''}`}
                      onClick={() => updateSetting('logErrors', !settings.logErrors)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="settings-footer">
          <div className="footer-left">
            <button 
              className="action-btn"
              onClick={resetToDefaults}
            >
              <RotateCcw size={16} />
              استعادة الافتراضيات
            </button>
            <button 
              className="action-btn"
              onClick={exportSettings}
            >
              <Download size={16} />
              تصدير
            </button>
            <label className="action-btn" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              استيراد
              <input 
                type="file" 
                accept=".json" 
                onChange={importSettings}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <div className="footer-right">
            <button 
              className="action-btn"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button 
              className="action-btn primary"
              onClick={onClose}
            >
              <Check size={16} />
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const getFieldLabel = (fieldKey: string): string => {
  const labels: Record<string, string> = {
    entryDate: 'تاريخ القيد',
    organization: 'المؤسسة',
    referenceNumber: 'رقم المرجع',
    description: 'الوصف',
    notes: 'ملاحظات إضافية',
    project: 'المشروع',
    costCenter: 'مركز التكلفة',
    workItem: 'عنصر العمل',
    analysisItem: 'عنصر التحليل',
    classification: 'التصنيف',
    subTree: 'الشجرة الفرعية'
  }
  return labels[fieldKey] || fieldKey
}

export default EnhancedSettingsPanel
