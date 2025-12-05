# ⚙️ تبويب الإعدادات - Integration Guide
# Settings Tab - Complete Integration Guide

---

## 🔗 نقاط التكامل / Integration Points

### 1. استيراد المكون / Component Import
```typescript
// في UnifiedTransactionDetailsPanel.v2.tsx
import { TransactionSettingsPanel } from './TransactionSettingsPanel'
```

### 2. إضافة التبويب / Add Tab
```typescript
const tabs = useMemo(() => [
  { id: 'basic', label: 'معلومات أساسية', icon: '📄' },
  { id: 'lines', label: 'القيود', icon: '📊', badge: txLines.length },
  { id: 'approvals', label: 'الموافقات', icon: '✅', badge: approvalHistory.length },
  { id: 'documents', label: 'المستندات', icon: '📎' },
  { id: 'audit', label: 'السجلات', icon: '📜', badge: audit.length },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },  // ← جديد
], [txLines.length, approvalHistory.length, audit.length])
```

### 3. إضافة محتوى التبويب / Add Tab Content
```typescript
{/* Tab 6: Settings */}
{activeTab === 'settings' && (
  <div className="tab-content">
    <TransactionSettingsPanel
      onSettingsChange={(settings) => {
        console.log('Settings updated:', settings)
      }}
      onSave={async () => {
        showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' })
      }}
      onReset={() => {
        showToast('تم إعادة تعيين الإعدادات', { severity: 'info' })
      }}
    />
  </div>
)}
```

---

## 📦 الواجهات / Interfaces

### TransactionSettingsPanelProps
```typescript
export interface TransactionSettingsPanelProps {
  onSettingsChange?: (settings: {
    display: DisplaySettings
    tabs: TabSettings
    print: PrintSettings
  }) => void
  onSave?: () => Promise<void>
  onReset?: () => void
}
```

### DisplaySettings
```typescript
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
```

### TabSettings
```typescript
export interface TabSettings {
  basicInfo: boolean
  lineItems: boolean
  approvals: boolean
  documents: boolean
  auditTrail: boolean
  settings: boolean
}
```

### PrintSettings
```typescript
export interface PrintSettings {
  includeHeader: boolean
  includeFooter: boolean
  includePageNumbers: boolean
  includeQRCode: boolean
  paperSize: 'A4' | 'A3' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margins: number
}
```

---

## 🔄 تدفق البيانات / Data Flow

### 1. التهيئة (Initialization)
```
UnifiedTransactionDetailsPanel
    ↓
activeTab = 'settings'
    ↓
TransactionSettingsPanel
    ↓
قراءة من localStorage
    ↓
عرض الإعدادات الحالية
```

### 2. التحديث (Update)
```
المستخدم يغير إعداد
    ↓
handleDisplaySettingChange()
    ↓
setDisplaySettings()
    ↓
useEffect → localStorage.setItem()
    ↓
onSettingsChange() callback
```

### 3. الحفظ (Save)
```
المستخدم ينقر على "حفظ الإعدادات"
    ↓
handleSave()
    ↓
onSave() callback
    ↓
showToast() رسالة نجاح
```

### 4. إعادة التعيين (Reset)
```
المستخدم ينقر على "إعادة تعيين"
    ↓
تأكيد من المستخدم
    ↓
استعادة القيم الافتراضية
    ↓
حذف من localStorage
    ↓
showToast() رسالة تأكيد
```

---

## 💾 localStorage Schema

### Display Settings
```javascript
{
  "transactionSettings:display": {
    "showAccountCodes": false,
    "showTotals": true,
    "showBalanceStatus": true,
    "showCostCenters": false,
    "showProjects": true,
    "showLineApprovals": true,
    "showDocuments": true,
    "showAuditTrail": true
  }
}
```

### Tab Settings
```javascript
{
  "transactionSettings:tabs": {
    "basicInfo": true,
    "lineItems": true,
    "approvals": true,
    "documents": true,
    "auditTrail": true,
    "settings": true
  }
}
```

### Print Settings
```javascript
{
  "transactionSettings:print": {
    "includeHeader": true,
    "includeFooter": true,
    "includePageNumbers": true,
    "includeQRCode": false,
    "paperSize": "A4",
    "orientation": "portrait",
    "margins": 10
  }
}
```

---

## 🎯 حالات الاستخدام / Use Cases

### Use Case 1: استخدام إعدادات العرض
```typescript
// في مكون آخر
function TransactionTable() {
  const displaySettings = JSON.parse(
    localStorage.getItem('transactionSettings:display') || '{}'
  )

  return (
    <table>
      <thead>
        <tr>
          {displaySettings.showAccountCodes && <th>الكود</th>}
          <th>الحساب</th>
          {displaySettings.showTotals && <th>المبلغ</th>}
        </tr>
      </thead>
    </table>
  )
}
```

### Use Case 2: تطبيق إعدادات الطباعة
```typescript
// في مكون الطباعة
function PrintTransaction() {
  const printSettings = JSON.parse(
    localStorage.getItem('transactionSettings:print') || '{}'
  )

  const handlePrint = () => {
    const style = document.createElement('style')
    style.textContent = `
      @page {
        size: ${printSettings.paperSize};
        margin: ${printSettings.margins}mm;
      }
      @media print {
        body {
          ${printSettings.orientation === 'landscape' ? 'transform: rotate(90deg);' : ''}
        }
      }
    `
    document.head.appendChild(style)
    window.print()
  }

  return <button onClick={handlePrint}>طباعة</button>
}
```

### Use Case 3: تصفية التبويبات
```typescript
// في مكون التبويبات
function FilteredTabs() {
  const tabSettings = JSON.parse(
    localStorage.getItem('transactionSettings:tabs') || '{}'
  )

  const allTabs = [
    { id: 'basicInfo', label: 'معلومات أساسية' },
    { id: 'lineItems', label: 'القيود' },
    { id: 'approvals', label: 'الموافقات' },
    { id: 'documents', label: 'المستندات' },
    { id: 'auditTrail', label: 'السجلات' },
    { id: 'settings', label: 'الإعدادات' }
  ]

  const visibleTabs = allTabs.filter(tab => {
    const key = tab.id as keyof typeof tabSettings
    return tabSettings[key] !== false
  })

  return <TabsContainer tabs={visibleTabs} {...props} />
}
```

---

## 🔌 Callbacks والأحداث / Callbacks & Events

### onSettingsChange
```typescript
onSettingsChange={(settings) => {
  // يتم استدعاؤه عند تغيير أي إعداد
  console.log('Display:', settings.display)
  console.log('Tabs:', settings.tabs)
  console.log('Print:', settings.print)
  
  // يمكن استخدامه لتحديث مكونات أخرى
  updateUI(settings)
}}
```

### onSave
```typescript
onSave={async () => {
  // يتم استدعاؤه عند النقر على "حفظ الإعدادات"
  // يمكن استخدامه لحفظ الإعدادات على الخادم
  
  try {
    await saveSettingsToServer(settings)
    showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' })
  } catch (error) {
    showToast('حدث خطأ', { severity: 'error' })
  }
}}
```

### onReset
```typescript
onReset={() => {
  // يتم استدعاؤه عند إعادة تعيين الإعدادات
  // يمكن استخدامه لتحديث الواجهة
  
  refreshUI()
  showToast('تم إعادة تعيين الإعدادات', { severity: 'info' })
}}
```

---

## 🧪 الاختبار / Testing

### اختبار الحفظ / Test Save
```typescript
test('should save display settings to localStorage', () => {
  const { getByRole } = render(<TransactionSettingsPanel />)
  
  const checkbox = getByRole('checkbox', { name: /إظهار الأكواد/ })
  fireEvent.click(checkbox)
  
  const saved = JSON.parse(
    localStorage.getItem('transactionSettings:display') || '{}'
  )
  expect(saved.showAccountCodes).toBe(true)
})
```

### اختبار إعادة التعيين / Test Reset
```typescript
test('should reset settings to defaults', () => {
  localStorage.setItem('transactionSettings:display', JSON.stringify({
    showAccountCodes: true,
    showTotals: false
  }))
  
  const { getByRole } = render(<TransactionSettingsPanel />)
  const resetButton = getByRole('button', { name: /إعادة تعيين/ })
  
  fireEvent.click(resetButton)
  fireEvent.click(getByRole('button', { name: /تأكيد/ }))
  
  const saved = JSON.parse(
    localStorage.getItem('transactionSettings:display') || '{}'
  )
  expect(saved.showAccountCodes).toBe(false)
  expect(saved.showTotals).toBe(true)
})
```

### اختبار الاستجابة / Test Responsiveness
```typescript
test('should be responsive on mobile', () => {
  window.innerWidth = 500
  const { container } = render(<TransactionSettingsPanel />)
  
  const buttons = container.querySelectorAll('.btn-primary, .btn-secondary')
  buttons.forEach(btn => {
    expect(btn).toHaveStyle('width: 100%')
  })
})
```

---

## 🐛 استكشاف الأخطاء / Troubleshooting

### المشكلة: الإعدادات لا تُحفظ
```javascript
// الحل: تحقق من localStorage
console.log(localStorage.getItem('transactionSettings:display'))

// إذا كان فارغاً، تحقق من:
// 1. هل localStorage مفعل؟
// 2. هل هناك مساحة كافية؟
// 3. هل المتصفح في الوضع الخاص (Private Mode)؟
```

### المشكلة: الإعدادات لا تظهر
```javascript
// الحل: امسح localStorage وأعد التحميل
localStorage.removeItem('transactionSettings:display')
localStorage.removeItem('transactionSettings:tabs')
localStorage.removeItem('transactionSettings:print')
location.reload()
```

### المشكلة: الأنماط لا تظهر
```typescript
// الحل: تأكد من استيراد CSS
import './TransactionSettingsPanel.css'

// تحقق من:
// 1. هل الملف موجود؟
// 2. هل المسار صحيح؟
// 3. هل هناك أخطاء في الكونسول؟
```

---

## 📊 مثال على التكامل الكامل / Full Integration Example

```typescript
// UnifiedTransactionDetailsPanel.v2.tsx

import { TransactionSettingsPanel } from './TransactionSettingsPanel'

export const UnifiedTransactionDetailsPanel: React.FC<Props> = ({
  transaction,
  // ... other props
}) => {
  const [activeTab, setActiveTab] = useState('basic')
  const { showToast } = useToast()

  // Define tabs
  const tabs = useMemo(() => [
    { id: 'basic', label: 'معلومات أساسية', icon: '📄' },
    { id: 'lines', label: 'القيود', icon: '📊', badge: txLines.length },
    { id: 'approvals', label: 'الموافقات', icon: '✅', badge: approvalHistory.length },
    { id: 'documents', label: 'المستندات', icon: '📎' },
    { id: 'audit', label: 'السجلات', icon: '📜', badge: audit.length },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ], [txLines.length, approvalHistory.length, audit.length])

  return (
    <DraggableResizablePanel {...panelProps}>
      <div className="unified-transaction-details">
        {/* Header */}
        <div className="details-header">
          <h2>{transaction.entry_number}</h2>
          <div className="details-actions">
            {/* Action buttons */}
          </div>
        </div>

        {/* Tabs Container */}
        <TabsContainer
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          persistKey="transactionDetails"
        >
          {/* Tab 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="tab-content">
              {/* Basic info content */}
            </div>
          )}

          {/* Tab 2: Line Items */}
          {activeTab === 'lines' && (
            <div className="tab-content">
              {/* Line items content */}
            </div>
          )}

          {/* Tab 3: Approvals */}
          {activeTab === 'approvals' && (
            <div className="tab-content">
              {/* Approvals content */}
            </div>
          )}

          {/* Tab 4: Documents */}
          {activeTab === 'documents' && (
            <div className="tab-content">
              {/* Documents content */}
            </div>
          )}

          {/* Tab 5: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="tab-content">
              {/* Audit trail content */}
            </div>
          )}

          {/* Tab 6: Settings */}
          {activeTab === 'settings' && (
            <div className="tab-content">
              <TransactionSettingsPanel
                onSettingsChange={(settings) => {
                  console.log('Settings updated:', settings)
                  // يمكن استخدام الإعدادات لتحديث المكونات الأخرى
                }}
                onSave={async () => {
                  // يمكن حفظ الإعدادات على الخادم هنا
                  showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' })
                }}
                onReset={() => {
                  showToast('تم إعادة تعيين الإعدادات', { severity: 'info' })
                }}
              />
            </div>
          )}
        </TabsContainer>
      </div>
    </DraggableResizablePanel>
  )
}
```

---

## 🚀 الخطوات التالية / Next Steps

### 1. التحقق من التكامل
```bash
# تأكد من أن جميع الملفات موجودة
ls src/components/Transactions/TransactionSettingsPanel.*
ls src/components/Transactions/UnifiedTransactionDetailsPanel.v2.tsx
```

### 2. اختبار الميزة
```bash
# افتح التطبيق وانتقل إلى تفاصيل معاملة
# انقر على تبويب الإعدادات
# جرب تغيير الإعدادات
# تحقق من localStorage
```

### 3. التطوير المستقبلي
- [ ] إضافة إعدادات إضافية
- [ ] حفظ الإعدادات على الخادم
- [ ] إنشاء ملفات تعريف متعددة
- [ ] مشاركة الإعدادات

---

## 📞 الدعم / Support

للمزيد من المعلومات:
- **التوثيق الكامل:** `SETTINGS_TAB_IMPLEMENTATION.md`
- **دليل البدء السريع:** `SETTINGS_TAB_QUICK_START.md`
- **دليل الواجهة:** `SETTINGS_TAB_UI_GUIDE.md`
- **الملخص:** `SETTINGS_TAB_SUMMARY.md`

---

**تم الإنجاز بنجاح! ✨**
