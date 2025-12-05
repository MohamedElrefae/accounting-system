# ⚙️ تبويب الإعدادات - Settings Tab Implementation
# Settings Tab - Enterprise UI Enhancement

**التاريخ / Date:** 30 نوفمبر 2025  
**الحالة / Status:** ✅ مكتمل / Completed

---

## 📋 نظرة عامة / Overview

تم إضافة تبويب الإعدادات (Settings) الشامل إلى لوحة تفاصيل المعاملات، مما يوفر للمستخدمين القدرة على تخصيص تجربة العرض والطباعة والتبويبات.

A comprehensive Settings tab has been added to the transaction details panel, providing users with the ability to customize display, print, and tab preferences.

---

## 🎯 الميزات الرئيسية / Key Features

### 1️⃣ تخصيص العرض (Display Settings)
```
✓ إظهار الأكواد مع الأسماء
✓ إظهار الإجماليات
✓ إظهار حالة التوازن
✓ إظهار مراكز التكلفة
✓ إظهار المشاريع
✓ إظهار موافقات القيود
✓ إظهار المستندات
✓ إظهار سجل التدقيق
```

### 2️⃣ تخصيص التبويبات (Tab Settings)
```
✓ معلومات أساسية
✓ القيود التفصيلية
✓ الموافقات
✓ المستندات
✓ السجلات
✓ الإعدادات
```

### 3️⃣ إعدادات الطباعة (Print Settings)
```
✓ تضمين رأس الصفحة
✓ تضمين تذييل الصفحة
✓ تضمين أرقام الصفحات
✓ تضمين رمز QR
✓ حجم الورقة (A4, A3, Letter)
✓ اتجاه الصفحة (عمودي/أفقي)
✓ الهوامش (0-50 ملم)
```

---

## 📁 الملفات المضافة / Added Files

### 1. TransactionSettingsPanel.tsx
**المسار:** `src/components/Transactions/TransactionSettingsPanel.tsx`

المكون الرئيسي للإعدادات يتضمن:
- إدارة حالة الإعدادات (Display, Tabs, Print)
- حفظ واسترجاع الإعدادات من localStorage
- واجهة مستخدم سهلة الاستخدام مع checkboxes و selects
- رسائل نجاح/خطأ
- وظائف الحفظ وإعادة التعيين

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
```

### 2. TransactionSettingsPanel.css
**المسار:** `src/components/Transactions/TransactionSettingsPanel.css`

أنماط شاملة تتضمن:
- تصميم responsive
- دعم الوضع الليلي (Dark Mode)
- رسوم متحركة سلسة
- تصميم احترافي متسق

---

## 🔧 التكامل / Integration

### تحديث UnifiedTransactionDetailsPanel.v2.tsx

تم إضافة التبويب الجديد إلى قائمة التبويبات:

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

وإضافة محتوى التبويب:

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

## 💾 تخزين البيانات / Data Storage

جميع الإعدادات يتم حفظها تلقائياً في localStorage:

```typescript
// Display Settings
localStorage.setItem('transactionSettings:display', JSON.stringify(displaySettings))

// Tab Settings
localStorage.setItem('transactionSettings:tabs', JSON.stringify(tabSettings))

// Print Settings
localStorage.setItem('transactionSettings:print', JSON.stringify(printSettings))
```

### القيم الافتراضية / Default Values

```typescript
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
```

---

## 🎨 واجهة المستخدم / User Interface

### تخطيط الإعدادات / Settings Layout

```
┌─────────────────────────────────────────────────────┐
│ ⚙️ إعدادات العرض                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ▼ تخصيص العرض                                      │
│   ┌───────────────────────────────────────────┐    │
│   │ ☐ إظهار الأكواد مع الأسماء               │    │
│   │   عرض رموز الحسابات بجانب أسماؤها        │    │
│   │                                           │    │
│   │ ☑ إظهار الإجماليات                      │    │
│   │   عرض إجمالي المدين والدائن             │    │
│   │                                           │    │
│   │ ☑ إظهار حالة التوازن                    │    │
│   │   عرض حالة توازن المعاملة               │    │
│   │                                           │    │
│   │ ... (المزيد من الخيارات)                 │    │
│   └───────────────────────────────────────────┘    │
│                                                     │
│ ▼ تخصيص التبويبات                                  │
│   ┌───────────────────────────────────────────┐    │
│   │ ☑ معلومات أساسية                        │    │
│   │ ☑ القيود التفصيلية                      │    │
│   │ ☑ الموافقات                             │    │
│   │ ☑ المستندات                             │    │
│   │ ☑ السجلات                               │    │
│   │ ☑ الإعدادات                             │    │
│   └───────────────────────────────────────────┘    │
│                                                     │
│ ▶ إعدادات الطباعة                                  │
│                                                     │
│ [حفظ الإعدادات] [إعادة تعيين]                     │
└─────────────────────────────────────────────────────┘
```

### مكونات الواجهة / UI Components

#### Checkbox مع وصف
```
☐ إظهار الأكواد مع الأسماء
  عرض رموز الحسابات بجانب أسماؤها
```

#### Select Dropdown
```
حجم الورقة: [A4 ▼]
اتجاه الصفحة: [عمودي ▼]
```

#### Number Input
```
الهوامش (ملم): [10]
```

#### Action Buttons
```
[حفظ الإعدادات] [إعادة تعيين]
```

---

## 🔄 دورة الحياة / Lifecycle

### 1. التهيئة (Initialization)
```
1. قراءة الإعدادات من localStorage
2. إذا لم توجد، استخدام القيم الافتراضية
3. عرض الإعدادات الحالية في الواجهة
```

### 2. التحديث (Update)
```
1. المستخدم يغير إعداد
2. تحديث الحالة (state)
3. حفظ تلقائي في localStorage
4. إخطار المكون الأب (parent component)
```

### 3. الحفظ (Save)
```
1. المستخدم ينقر على "حفظ الإعدادات"
2. استدعاء onSave callback (اختياري)
3. عرض رسالة نجاح
4. الإعدادات محفوظة بالفعل في localStorage
```

### 4. إعادة التعيين (Reset)
```
1. المستخدم ينقر على "إعادة تعيين"
2. طلب تأكيد من المستخدم
3. استعادة القيم الافتراضية
4. حذف من localStorage
5. عرض رسالة تأكيد
```

---

## 📱 الاستجابة / Responsiveness

### Desktop (> 768px)
- عرض أفقي للأزرار
- تخطيط متعدد الأعمدة

### Mobile (≤ 768px)
- عرض عمودي للأزرار
- تخطيط أحادي العمود
- حجم خط أكبر للقراءة

---

## 🌙 دعم الوضع الليلي / Dark Mode Support

جميع الألوان تستخدم متغيرات CSS:
```css
--surface
--surface-secondary
--surface-hover
--text-primary
--text-secondary
--border
--accent-primary
--success
--error
```

---

## 🚀 الاستخدام / Usage

### استيراد المكون
```typescript
import { TransactionSettingsPanel } from './TransactionSettingsPanel'
```

### الاستخدام الأساسي
```typescript
<TransactionSettingsPanel
  onSettingsChange={(settings) => {
    console.log('Settings:', settings)
  }}
  onSave={async () => {
    // Optional: Save to server
  }}
  onReset={() => {
    // Optional: Handle reset
  }}
/>
```

### الوصول إلى الإعدادات
```typescript
// في أي مكان في التطبيق
const displaySettings = JSON.parse(
  localStorage.getItem('transactionSettings:display') || '{}'
)

const tabSettings = JSON.parse(
  localStorage.getItem('transactionSettings:tabs') || '{}'
)

const printSettings = JSON.parse(
  localStorage.getItem('transactionSettings:print') || '{}'
)
```

---

## 🔌 التوسع المستقبلي / Future Extensions

### 1. حفظ الإعدادات على الخادم
```typescript
// يمكن إضافة API endpoint لحفظ الإعدادات
await saveUserSettings(userId, {
  display: displaySettings,
  tabs: tabSettings,
  print: printSettings
})
```

### 2. إعدادات إضافية
```typescript
// إضافة المزيد من الخيارات:
- تخصيص الألوان
- حجم الخط
- تنسيق التاريخ
- العملة المفضلة
```

### 3. ملفات تعريف الإعدادات (Profiles)
```typescript
// السماح بحفظ عدة ملفات تعريف
- ملف تعريف "الطباعة"
- ملف تعريف "التحليل"
- ملف تعريف "المراجعة"
```

### 4. المشاركة والاستيراد
```typescript
// تصدير/استيراد الإعدادات
- تصدير كـ JSON
- استيراد من ملف
- مشاركة مع المستخدمين الآخرين
```

---

## ✅ قائمة التحقق / Checklist

- [x] إنشاء مكون TransactionSettingsPanel
- [x] إضافة أنماط CSS شاملة
- [x] تكامل مع UnifiedTransactionDetailsPanel
- [x] حفظ واسترجاع من localStorage
- [x] دعم الوضع الليلي
- [x] تصميم responsive
- [x] رسائل نجاح/خطأ
- [x] وظائف الحفظ وإعادة التعيين
- [x] توثيق شامل

---

## 📝 ملاحظات / Notes

### الأداء
- جميع الإعدادات محفوظة محلياً (localStorage)
- لا توجد استدعاءات API إضافية
- التحديثات فورية

### الأمان
- الإعدادات محفوظة محلياً فقط
- لا يتم نقل بيانات حساسة
- يمكن إضافة تشفير إذا لزم الأمر

### التوافقية
- متوافق مع جميع المتصفحات الحديثة
- يدعم localStorage
- يدعم CSS Grid و Flexbox

---

## 🎓 أمثلة الاستخدام / Usage Examples

### مثال 1: استخدام الإعدادات في مكون آخر
```typescript
import { useEffect, useState } from 'react'

function MyComponent() {
  const [displaySettings, setDisplaySettings] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('transactionSettings:display')
    if (saved) {
      setDisplaySettings(JSON.parse(saved))
    }
  }, [])

  if (!displaySettings) return <div>جاري التحميل...</div>

  return (
    <div>
      {displaySettings.showTotals && <div>الإجماليات</div>}
      {displaySettings.showProjects && <div>المشاريع</div>}
    </div>
  )
}
```

### مثال 2: تطبيق إعدادات الطباعة
```typescript
function PrintTransaction() {
  const printSettings = JSON.parse(
    localStorage.getItem('transactionSettings:print') || '{}'
  )

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow?.document.write(`
      <style>
        @page {
          size: ${printSettings.paperSize};
          margin: ${printSettings.margins}mm;
        }
        @media print {
          body { orientation: ${printSettings.orientation}; }
        }
      </style>
      ${document.body.innerHTML}
    `)
    printWindow?.print()
  }

  return <button onClick={handlePrint}>طباعة</button>
}
```

---

## 📞 الدعم / Support

للمزيد من المعلومات أو الإبلاغ عن مشاكل، يرجى التواصل مع فريق التطوير.

For more information or to report issues, please contact the development team.
