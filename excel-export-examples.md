# Advanced Excel Export Features

## Overview
The enhanced universal export system now supports advanced Excel formatting options, including:
- Custom currency formatting per column
- Per-column Excel number formats
- Locale-specific separators
- Auto-filter and freeze panes
- Custom alignment per data type

## Basic Usage Examples

### 1. Plain Numeric Export (No Currency Symbols)
Perfect for data analysis where you want raw numbers:

```typescript
import { useUniversalExport, createExcelConfig } from '../hooks/useUniversalExport';

const exportConfig = {
  title: 'Financial Report - Numeric Data',
  excel: createExcelConfig.plainNumbers()
};

await exportToExcel(data, exportConfig);
```

### 2. Custom Currency Format
Use a specific currency format across all currency columns:

```typescript
import { ExcelFormats } from '../hooks/useUniversalExport';

const exportConfig = {
  title: 'Multi-Currency Report',
  excel: createExcelConfig.customCurrency(ExcelFormats.currencyUSD)
};
```

### 3. Per-Column Custom Formats
Different formatting for different columns:

```typescript
const exportConfig = {
  title: 'Detailed Financial Analysis',
  excel: createExcelConfig.customColumnFormats({
    'balance_egp': ExcelFormats.currencyEGP,
    'balance_usd': ExcelFormats.currencyUSD,
    'percentage': ExcelFormats.percentDetailed,
    'transaction_date': ExcelFormats.dateLong
  })
};
```

## Advanced Column Configuration

### Enhanced Column Definitions
```typescript
import { createStandardColumns } from '../hooks/useUniversalExport';

const columns = createStandardColumns([
  {
    key: 'account_code',
    header: 'رقم الحساب',
    type: 'text',
    width: 100,
    excel: { alignment: 'center' }
  },
  {
    key: 'balance_egp',
    header: 'الرصيد (ج.م)',
    type: 'currency',
    currency: 'EGP',
    excel: {
      format: '#,##0.00" ج.م"',
      alignment: 'right'
    }
  },
  {
    key: 'balance_usd',
    header: 'الرصيد ($)',
    type: 'currency',
    currency: 'USD',
    excel: {
      format: '[$-en-US]#,##0.00" $"',
      currencySymbol: '$',
      locale: 'en-US'
    }
  },
  {
    key: 'growth_rate',
    header: 'معدل النمو',
    type: 'percentage',
    excel: {
      format: '0.000%',
      alignment: 'center'
    }
  },
  {
    key: 'last_updated',
    header: 'آخر تحديث',
    type: 'date',
    excel: {
      format: 'dd/mm/yyyy hh:mm',
      alignment: 'center'
    }
  }
]);
```

## Complete Export Configuration

### Full-Featured Export
```typescript
const advancedExportConfig = {
  title: 'تقرير مالي شامل',
  subtitle: 'تحليل مفصل للحسابات والمعاملات',
  useArabicNumerals: false, // Use Western numerals for Excel
  rtlLayout: true,
  orientation: 'landscape' as const,
  excel: {
    currencyFormat: 'symbol' as const,
    useLocaleSeparators: true,
    freezePanes: true,
    autoFilter: true,
    columnFormats: {
      'opening_balance': '#,##0.00" ج.م (افتتاحي)"',
      'closing_balance': '#,##0.00" ج.م (ختامي)"',
      'variance_percent': '0.00%',
      'transaction_date': 'dd/mm/yyyy',
      'created_at': 'dd/mm/yyyy hh:mm:ss'
    }
  }
};

await exportToExcel(tableData, advancedExportConfig);
```

## Predefined Format Examples

### Available Excel Formats
```typescript
import { ExcelFormats } from '../hooks/useUniversalExport';

// Currency formats
ExcelFormats.currencyEGP    // '#,##0.00" ج.م"'
ExcelFormats.currencyUSD    // '[$-en-US]#,##0.00" $"'
ExcelFormats.currencyEUR    // '[$-en-US]#,##0.00" €"'
ExcelFormats.currencyPlain  // '#,##0.00'

// Date formats  
ExcelFormats.dateShort      // 'dd/mm/yyyy'
ExcelFormats.dateLong       // 'dd/mm/yyyy hh:mm'
ExcelFormats.dateArabic     // '[$-ar-EG]dd/mm/yyyy'
ExcelFormats.dateTime       // 'dd/mm/yyyy hh:mm:ss'

// Number formats
ExcelFormats.numberPlain    // '#,##0.00'
ExcelFormats.numberInteger  // '#,##0'
ExcelFormats.numberScientific // '0.00E+00'

// Percentage formats
ExcelFormats.percentSimple  // '0.00%'
ExcelFormats.percentInteger // '0%'
ExcelFormats.percentDetailed // '0.000%'
```

## Usage in Reports

### General Ledger Export
```typescript
const glExportConfig = {
  title: 'دفتر الأستاذ العام',
  excel: {
    currencyFormat: 'symbol' as const,
    freezePanes: true,
    autoFilter: true,
    columnFormats: {
      'debit': '#,##0.00" مدين"',
      'credit': '#,##0.00" دائن"',
      'running_balance': '#,##0.00" الرصيد الجاري"'
    }
  }
};
```

### Trial Balance Export  
```typescript
const tbExportConfig = {
  title: 'ميزان المراجعة',
  excel: createExcelConfig.customColumnFormats({
    'opening_debit': ExcelFormats.currencyEGP,
    'opening_credit': ExcelFormats.currencyEGP,
    'period_debit': '#,##0.00" مدين الفترة"',
    'period_credit': '#,##0.00" دائن الفترة"',
    'closing_debit': ExcelFormats.currencyEGP,
    'closing_credit': ExcelFormats.currencyEGP
  })
};
```

## Benefits

### Data Integrity
- ✅ Numbers remain as numbers (can be summed, sorted, filtered)
- ✅ Dates remain as dates (can be filtered by date range)
- ✅ Currency symbols displayed without breaking numeric operations

### User Experience
- ✅ Auto-filter enabled for easy data filtering
- ✅ Frozen panes for better navigation
- ✅ Proper alignment based on data type
- ✅ Intelligent column widths

### Flexibility
- ✅ Different currency symbols per column
- ✅ Custom number formats per column
- ✅ Locale-aware formatting
- ✅ Easy configuration presets

## Migration Guide

### From Old Export System
Replace this:
```typescript
// Old way - currency as text
{ key: 'amount', header: 'المبلغ', type: 'currency' }
```

With this:
```typescript
// New way - proper Excel formatting
{
  key: 'amount',
  header: 'المبلغ', 
  type: 'currency',
  excel: {
    format: '#,##0.00" ج.م"',
    alignment: 'right'
  }
}
```

### Quick Start Templates

#### Basic Financial Report
```typescript
const basicConfig = {
  title: 'تقرير مالي',
  excel: createExcelConfig.arabicLocale()
};
```

#### Data Analysis Export
```typescript
const analysisConfig = {
  title: 'تحليل البيانات',
  excel: createExcelConfig.plainNumbers()
};
```

#### Multi-Currency Report
```typescript
const multiCurrencyConfig = {
  title: 'تقرير متعدد العملات',
  excel: createExcelConfig.customColumnFormats({
    'amount_egp': ExcelFormats.currencyEGP,
    'amount_usd': ExcelFormats.currencyUSD,
    'exchange_rate': '0.0000'
  })
};
```
