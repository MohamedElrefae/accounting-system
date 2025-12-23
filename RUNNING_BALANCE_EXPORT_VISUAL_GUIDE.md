# Running Balance Export System - Visual Guide

## User Interface Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          الرصيد الجاري                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ⚙️ إعدادات الأعمدة  │  📄 PDF  📊 Excel  📋 CSV  │  📊 تصدير متقدم    │
│                      │  Standard Export              │  Advanced Export   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Button Styling

**Standard Export Buttons:**
- Style: Default (gray)
- Layout: Horizontal group
- Icons: 📄 (PDF), 📊 (Excel), 📋 (CSV)
- Behavior: Direct export on click

**Advanced Export Button:**
- Style: Success (green) - `ultimate-btn-success`
- Icon: 📊
- Label: تصدير متقدم
- Behavior: Opens modal on click

## Advanced Export Modal

### Modal Appearance
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  تصدير متقدم مع الملخص                                    │ │
│  │                                                           │ │
│  │  اختر صيغة التصدير المطلوبة. سيتم تضمين ملخص البيانات    │ │
│  │  التالية:                                                │ │
│  │                                                           │ │
│  │  • الرصيد الافتتاحي                                       │ │
│  │  • إجمالي المدين والدائن                                 │ │
│  │  • صافي التغيير                                          │ │
│  │  • الرصيد الختامي                                        │ │
│  │  • عدد الحركات                                           │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ 📄 PDF  ⚙️ PDF مخصص  📊 Excel  📋 CSV             │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              إغلاق                                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modal Features

**Title Section:**
- Arabic: "تصدير متقدم مع الملخص"
- English: "Advanced Export with Summary"
- Prominent, clear heading

**Description Section:**
- Explains what will be included
- Lists all summary fields
- Helps user understand the export

**Summary Fields Listed:**
1. الرصيد الافتتاحي (Opening Balance)
2. إجمالي المدين والدائن (Total Debits & Credits)
3. صافي التغيير (Net Change)
4. الرصيد الختامي (Closing Balance)
5. عدد الحركات (Transaction Count)

**Export Options:**
- PDF - Standard PDF with summary
- PDF مخصص - Customized PDF (opens additional modal)
- Excel - Spreadsheet with summary
- CSV - CSV format with summary

**Close Button:**
- Label: إغلاق (Close)
- Style: Neutral button
- Full width
- Dismisses modal

## User Workflows

### Workflow 1: Quick Export (Standard)
```
User wants quick data export
    ↓
Clicks PDF/Excel/CSV button
    ↓
Export generated immediately
    ↓
File downloaded
```

### Workflow 2: Professional Report (Advanced)
```
User wants comprehensive report with summary
    ↓
Clicks "📊 تصدير متقدم" button
    ↓
Modal opens showing summary preview
    ↓
User reviews summary data
    ↓
User selects export format
    ↓
Export generated with summary
    ↓
File downloaded
```

### Workflow 3: Customized PDF (Advanced)
```
User wants customized PDF with summary
    ↓
Clicks "📊 تصدير متقدم" button
    ↓
Modal opens
    ↓
User clicks "PDF مخصص"
    ↓
PDF customization modal opens
    ↓
User configures PDF options
    ↓
PDF generated with custom settings + summary
    ↓
File downloaded
```

## Color Scheme

### Button Colors
- **Standard Export:** Gray (default)
- **Advanced Export:** Green (`ultimate-btn-success`)
- **Close Button:** Gray (neutral)

### Modal Colors
- **Background:** Dark (`var(--surface, #111827)`)
- **Border:** Gray (`var(--border-color, #374151)`)
- **Text:** Light (`var(--text, #f3f4f6)`)
- **Muted Text:** Gray (`var(--muted_text, #9ca3af)`)

### Overlay
- **Color:** Black with 50% opacity
- **Effect:** Darkens background, focuses on modal

## Responsive Design

### Desktop (> 768px)
- Modal: 500px max width
- Buttons: Horizontal layout
- Full spacing and padding

### Tablet (768px - 1024px)
- Modal: 90% width
- Buttons: Horizontal layout
- Adjusted padding

### Mobile (< 768px)
- Modal: 90% width
- Buttons: Wrap if needed
- Reduced padding
- Touch-friendly sizing

## Accessibility Features

✅ **RTL Support**
- Direction: rtl
- Text alignment: proper
- Button order: reversed

✅ **Arabic Localization**
- All labels in Arabic
- Proper text direction
- Arabic numerals support

✅ **Dark Theme**
- CSS variables for theming
- Proper contrast ratios
- Readable text

✅ **Keyboard Navigation**
- Tab through buttons
- Enter to activate
- Escape to close modal

✅ **Screen Readers**
- Semantic HTML
- Proper button labels
- Clear descriptions

## Export Summary Data Example

When user exports with Advanced Export, the following summary is included:

```
تقرير الرصيد الجاري
Advanced Export Report

حساب: 1000 - الأصول | من: 2025-01-01 | إلى: 2025-12-31

ملخص البيانات:
الرصيد الافتتاحي:        50,000.00 ج.م
إجمالي المدين:          150,000.00 ج.م
إجمالي الدائن:          120,000.00 ج.م
صافي التغيير:           30,000.00 ج.م
الرصيد الختامي:         80,000.00 ج.م
عدد الحركات:            45

[Data Table with all transactions]
```

## Performance Considerations

✅ **Modal Performance**
- Lightweight modal implementation
- No heavy dependencies
- Smooth animations
- Fast rendering

✅ **Export Performance**
- Efficient data preparation
- Optimized column filtering
- Fast file generation
- Minimal memory usage

✅ **User Experience**
- Instant modal opening
- Clear visual feedback
- Responsive buttons
- Smooth transitions

## Browser Compatibility

✅ **Supported Browsers**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

✅ **Features**
- CSS Grid/Flexbox
- CSS Variables
- Modern JavaScript
- RTL support

## Future Enhancements

🔮 **Potential Improvements**
- [ ] Batch export (all formats)
- [ ] Email export
- [ ] Scheduled reports
- [ ] Export templates
- [ ] Export history
- [ ] Comparison exports
- [ ] Advanced filtering in modal
- [ ] Export preview
