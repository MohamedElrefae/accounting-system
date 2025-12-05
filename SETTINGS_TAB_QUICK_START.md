# ⚙️ تبويب الإعدادات - Quick Start Guide
# Settings Tab - Quick Reference

---

## 🚀 البدء السريع / Quick Start

### الملفات الجديدة / New Files
```
✓ src/components/Transactions/TransactionSettingsPanel.tsx
✓ src/components/Transactions/TransactionSettingsPanel.css
✓ SETTINGS_TAB_IMPLEMENTATION.md (توثيق شامل)
```

### التعديلات / Modifications
```
✓ src/components/Transactions/UnifiedTransactionDetailsPanel.v2.tsx
  - إضافة import للـ TransactionSettingsPanel
  - إضافة تبويب الإعدادات إلى قائمة التبويبات
  - إضافة محتوى التبويب الجديد
```

---

## 📋 الميزات / Features

### 1. تخصيص العرض (Display Customization)
```
☐ إظهار الأكواد مع الأسماء
☑ إظهار الإجماليات
☑ إظهار حالة التوازن
☐ إظهار مراكز التكلفة
☑ إظهار المشاريع
☑ إظهار موافقات القيود
☑ إظهار المستندات
☑ إظهار سجل التدقيق
```

### 2. تخصيص التبويبات (Tab Customization)
```
☑ معلومات أساسية
☑ القيود التفصيلية
☑ الموافقات
☑ المستندات
☑ السجلات
☑ الإعدادات
```

### 3. إعدادات الطباعة (Print Settings)
```
☑ تضمين رأس الصفحة
☑ تضمين تذييل الصفحة
☑ تضمين أرقام الصفحات
☐ تضمين رمز QR
حجم الورقة: A4 / A3 / Letter
اتجاه الصفحة: عمودي / أفقي
الهوامش: 0-50 ملم
```

---

## 💾 التخزين / Storage

جميع الإعدادات تُحفظ تلقائياً في localStorage:

```javascript
// عرض الإعدادات الحالية
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

## 🎯 الاستخدام / Usage

### في المكون الأب
```typescript
import { TransactionSettingsPanel } from './TransactionSettingsPanel'

// داخل JSX
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

### في مكون آخر
```typescript
// قراءة الإعدادات
const displaySettings = JSON.parse(
  localStorage.getItem('transactionSettings:display') || '{}'
)

// استخدام الإعدادات
if (displaySettings.showTotals) {
  // عرض الإجماليات
}

if (displaySettings.showProjects) {
  // عرض المشاريع
}
```

---

## 🎨 التصميم / Design

### الألوان / Colors
```css
--accent-primary: الأزرق الأساسي
--success: الأخضر (للرسائل الناجحة)
--error: الأحمر (للأخطاء)
--surface: خلفية السطح
--text-primary: النص الأساسي
--text-secondary: النص الثانوي
```

### الأيقونات / Icons
```
🎨 تخصيص العرض
📑 تخصيص التبويبات
🖨️ إعدادات الطباعة
```

---

## 🔄 دورة الحياة / Lifecycle

```
1. التهيئة (Initialization)
   ↓
2. قراءة من localStorage
   ↓
3. عرض الإعدادات الحالية
   ↓
4. المستخدم يغير إعداد
   ↓
5. تحديث الحالة
   ↓
6. حفظ تلقائي في localStorage
   ↓
7. إخطار المكون الأب
```

---

## 📱 الاستجابة / Responsiveness

### Desktop (> 768px)
- عرض أفقي للأزرار
- تخطيط متعدد الأعمدة

### Mobile (≤ 768px)
- عرض عمودي للأزرار
- تخطيط أحادي العمود

---

## 🌙 الوضع الليلي / Dark Mode

جميع الأنماط تدعم الوضع الليلي تلقائياً:
```css
@media (prefers-color-scheme: dark) {
  /* الأنماط الليلية */
}
```

---

## ✅ قائمة التحقق / Checklist

- [x] إنشاء مكون TransactionSettingsPanel
- [x] إضافة أنماط CSS
- [x] تكامل مع UnifiedTransactionDetailsPanel
- [x] حفظ واسترجاع من localStorage
- [x] دعم الوضع الليلي
- [x] تصميم responsive
- [x] رسائل نجاح/خطأ
- [x] توثيق شامل

---

## 🐛 استكشاف الأخطاء / Troubleshooting

### المشكلة: الإعدادات لا تُحفظ
**الحل:** تحقق من أن localStorage مفعل في المتصفح

### المشكلة: الإعدادات لا تظهر
**الحل:** امسح localStorage وأعد تحميل الصفحة
```javascript
localStorage.removeItem('transactionSettings:display')
localStorage.removeItem('transactionSettings:tabs')
localStorage.removeItem('transactionSettings:print')
```

### المشكلة: الأنماط لا تظهر بشكل صحيح
**الحل:** تأكد من استيراد ملف CSS:
```typescript
import './TransactionSettingsPanel.css'
```

---

## 📚 الموارد / Resources

- **التوثيق الكامل:** `SETTINGS_TAB_IMPLEMENTATION.md`
- **المكون الرئيسي:** `src/components/Transactions/TransactionSettingsPanel.tsx`
- **الأنماط:** `src/components/Transactions/TransactionSettingsPanel.css`
- **التكامل:** `src/components/Transactions/UnifiedTransactionDetailsPanel.v2.tsx`

---

## 🎓 أمثلة / Examples

### مثال 1: استخدام إعدادات العرض
```typescript
const displaySettings = JSON.parse(
  localStorage.getItem('transactionSettings:display') || '{}'
)

return (
  <div>
    {displaySettings.showAccountCodes && <div>الأكواد</div>}
    {displaySettings.showTotals && <div>الإجماليات</div>}
    {displaySettings.showProjects && <div>المشاريع</div>}
  </div>
)
```

### مثال 2: استخدام إعدادات الطباعة
```typescript
const printSettings = JSON.parse(
  localStorage.getItem('transactionSettings:print') || '{}'
)

const printStyle = `
  @page {
    size: ${printSettings.paperSize};
    margin: ${printSettings.margins}mm;
  }
`
```

### مثال 3: استخدام إعدادات التبويبات
```typescript
const tabSettings = JSON.parse(
  localStorage.getItem('transactionSettings:tabs') || '{}'
)

const visibleTabs = tabs.filter(tab => {
  if (tab.id === 'basicInfo') return tabSettings.basicInfo
  if (tab.id === 'lineItems') return tabSettings.lineItems
  // ... إلخ
  return true
})
```

---

## 🚀 الخطوات التالية / Next Steps

1. **اختبار الميزة**
   - افتح تفاصيل معاملة
   - انقر على تبويب الإعدادات
   - جرب تغيير الإعدادات

2. **التخصيص**
   - أضف إعدادات إضافية حسب الحاجة
   - عدّل الألوان والأيقونات
   - أضف المزيد من خيارات الطباعة

3. **التوسع**
   - حفظ الإعدادات على الخادم
   - إنشاء ملفات تعريف متعددة
   - مشاركة الإعدادات مع المستخدمين

---

## 📞 الدعم / Support

للمزيد من المعلومات، راجع التوثيق الكامل في `SETTINGS_TAB_IMPLEMENTATION.md`
