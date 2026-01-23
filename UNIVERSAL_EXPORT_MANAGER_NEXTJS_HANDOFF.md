# Universal Export Manager  Next.js Replication Handoff (Excel + PDF + RTL/Arabic)

## Goal
Replicate **exactly** the existing working “Universal Export Manager” from this repo into the new **Next.js** app.

This export system provides:
- **Excel export** (`.xlsx`) with RTL direction support, proper data types, formats, auto filter, freeze panes, and Arabic currency formatting.
- **PDF export** with **proper Arabic/RTL rendering** using an **HTML print-based approach** (iframe + `window.print()`), not canvas screenshots.
- **CSV export** with **UTF-8 BOM** so Arabic opens correctly in Excel.
- **HTML/JSON export**.
- A reusable UI: **ExportButtons** and a **Customized PDF** modal for column selection and page settings.

## Source of Truth (Files in this repo)
These files define the system and must be mirrored (same concepts + same behavior) in the Next.js app:
- **Core engine**
  - `src/utils/UniversalExportManager.ts`
  - `src/utils/ArabicTextEngine.ts`
- **React hook API**
  - `src/hooks/useUniversalExport.ts`
- **UI components**
  - `src/components/Common/ExportButtons.tsx`
  - `src/components/Common/ExportButtons.css`
  - `src/components/Common/CustomizedPDFModal.tsx`
  - `src/components/Common/CustomizedPDFModal.css`
- **Example usage**
  - `src/pages/ExportTestPage.tsx`
  - `src/pages/admin/ExportDatabase.tsx` (real-world usage)
- **Dependencies** (from `package.json`)
  - `xlsx` (SheetJS)
  - (optional legacy/other) `jspdf`, `jspdf-autotable`, `html2canvas` exist, but the **UniversalExportManager PDF path uses HTML print**.

## Non-negotiable behavior requirements
- **PDF must render Arabic correctly**.
  - The Universal system intentionally uses **HTML + print** and Arabic web fonts, because many JS PDF libraries struggle with Arabic shaping.
- **RTL layout is first-class**.
  - Exported HTML sets `dir="rtl"` and uses CSS to align table cells appropriately.
- **Numbers/numerals are configurable**.
  - CSV must use Western numerals (by design in preprocessing).
  - Excel uses raw numeric values + Excel formats.
  - HTML/PDF can render Arabic numerals depending on `useArabicNumerals`.
- **Excel output must preserve data types**.
  - Numbers are numbers, dates become `Date` objects when possible.

## Public API Contracts (MUST MATCH)

### Universal data model

#### `UniversalTableColumn`
From `src/utils/UniversalExportManager.ts`:
- `key: string`
- `header: string`
- `type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'percentage'`
- `width?: number`
- `align?: 'left' | 'center' | 'right'`
- `format?: string`
- `currency?: string`
- `visible?: boolean`
- `excel?: {`
  - `format?: string`
  - `currencySymbol?: string`
  - `locale?: string`
  - `alignment?: 'left' | 'center' | 'right'`
  `}`

#### `UniversalTableData`
- `columns: UniversalTableColumn[]`
- `rows: any[]`
- `summary?: { totals?: Record<string, number>; counts?: Record<string, number>; averages?: Record<string, number> }`
- `metadata?: {`
  - `source?: string`
  - `generatedAt?: Date`
  - `filters?: any`
  - `userInfo?: any`
  - `prependRows?: any[][]`  
    Rows to insert **before the header** in Excel/CSV (used for summary/meta rows)
  `}`

### Export options

#### `UniversalExportOptions`
- `title: string`
- `subtitle?: string`
- `format: 'pdf' | 'excel' | 'csv' | 'html' | 'json'`
- `orientation?: 'portrait' | 'landscape'`
- `pageSize?: 'A4' | 'A3' | 'Letter'`
- `includeHeader?: boolean`
- `includeFooter?: boolean`
- `fontSize?: number`
- `fontFamily?: string`
- `useArabicNumerals?: boolean`
- `rtlLayout?: boolean`
- `margins?: { top: number; right: number; bottom: number; left: number }`
- `styling?: { primaryColor?: string; secondaryColor?: string; headerBg?: string; footerBg?: string }`
- `excel?: {`
  - `currencyFormat?: 'symbol' | 'plain' | 'custom'`
  - `customCurrencyFormat?: string`
  - `useLocaleSeparators?: boolean`
  - `freezePanes?: boolean`
  - `autoFilter?: boolean`
  - `columnFormats?: Record<string, string>`
  `}`

### Export convenience functions
At the bottom of `src/utils/UniversalExportManager.ts`:
- `exportUniversalData(data, options)`
- `exportToPDF(data, optionsWithoutFormat)`
- `exportToExcel(data, optionsWithoutFormat)`
- `exportToCSV(data, optionsWithoutFormat)`
- `exportToHTML(data, optionsWithoutFormat)`
- `exportToJSON(data, optionsWithoutFormat)`

### Hook
From `src/hooks/useUniversalExport.ts`:
- `useUniversalExport()` returns:
  - `exportToPDF(data, config?)`
  - `exportToExcel(data, config?)`
  - `exportToCSV(data, config?)`
  - `exportToHTML(data, config?)`
  - `exportToJSON(data, config?)`
  - `exportAll(data, config?)`
  - `isExporting: boolean`

`ExportConfig` in the hook mirrors core options (title, rtlLayout, etc.) + `excel` sub-config.

### UI

#### `ExportButtons`
From `src/components/Common/ExportButtons.tsx`:
- Props:
  - `data: UniversalTableData`
  - `config?: Partial<ExportConfig>`
  - `showAllFormats?: boolean` (default `true`)
  - `showBatchExport?: boolean` (default `false`)
  - `showCustomizedPDF?: boolean` (default `true`)
  - `layout?: 'horizontal' | 'vertical' | 'dropdown'` (default `horizontal`)
  - `size?: 'small' | 'medium' | 'large'`

It also opens `CustomizedPDFModal` when the user clicks “PDF مخصص”.

#### `CustomizedPDFModal`
From `src/components/Common/CustomizedPDFModal.tsx`:
- UI for:
  - Selecting columns (including search / select all / invert)
  - PDF settings: title, header, page numbers, orientation, page size, margins, font size, RTL, Arabic numerals
- On export:
  - Filters `data.columns` based on selection
  - Calls `exportToPDF(filteredData, settingsMappedToOptions)`

## PDF Export Strategy (MUST MATCH)

### The system’s actual PDF export path
In `UniversalExportManager.exportToPDF(...)`:
- Generates full HTML using `generateCustomizedHTML(data, options)`.
- Creates an offscreen `iframe`.
- Writes the HTML to iframe document.
- On `iframe.onload`, calls:
  - `iframe.contentWindow?.focus()`
  - `iframe.contentWindow?.print()`
- Removes iframe afterwards.
- If anything fails, it **falls back to HTML download**.

### The HTML template
Key requirements from `generateCustomizedHTML(...)`:
- `<!DOCTYPE html>`
- `<html dir="rtl|ltr" lang="ar|en">`
- CSS includes:
  - `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:...&family=Roboto:...')`
  - `@page { size: portrait|landscape; margin: ...mm ...mm ...mm ...mm }`
  - `body { font-family: 'Noto Sans Arabic' (rtl) OR 'Roboto' (ltr); direction: rtl|ltr; }`
  - Table styles: borders, zebra rows, header repeated as table header group.
  - Special numeric alignment: `.currency/.number` align opposite for RTL (`text-align: left` for numbers when RTL).
  - Print-specific rules: `thead { display: table-header-group; } tr { page-break-inside: avoid; }`
- Header block is injected into `<thead>` as a full-width row when `includeHeader !== false`.

### Value formatting in HTML
`formatValueForHTML(value, column, options)`:
- Empty becomes `—`
- Currency/number uses `toLocaleString('en-US', ...)` then optional Arabic numeral conversion
- Dates use `toLocaleDateString('ar-EG')` when RTL, else `en-US`
- Boolean becomes Arabic `نعم/لا`

## Excel Export Strategy (MUST MATCH)
Implemented inside `exportToExcel(...)`:
- Uses `xlsx`:
  - `XLSXUtils.book_new()`
  - `XLSXUtils.aoa_to_sheet(aoa)` where `aoa` includes:
    - `metadata.prependRows` (0..n)
    - `headers` row
    - `dataRows`
- Writes file with:
  - filename `${title}_${YYYY-MM-DD}.xlsx`

### Excel-specific behaviors
- **Header row styling** (bold + shaded background)
- Optional **autoFilter** on header row (`worksheet['!autofilter']`)
- Optional **freeze panes** (default enabled unless `freezePanes === false`)
  - Accounts for `prependRows` so freeze starts below the header.
- **Column widths**:
  - Derived from `col.width` or heuristics by type
  - Arabic headers widen more (`headerLength * 1.2`)
- **RTL direction**: `worksheet['!dir'] = 'rtl'` when `rtlLayout`.
- Cell formats (`cell.z`) per column type:
  - Currency format uses:
    - global config (`options.excel.currencyFormat`)
    - per-column overrides (`options.excel.columnFormats[col.key]` or `col.excel.format`)
  - Currency symbols: default EGP uses `ج.م`
  - Date formatting: `dd/mm/yyyy` unless overridden
  - Percentage: `0.00%`

## CSV Export Strategy (MUST MATCH)
Implemented inside `exportToCSV(...)`:
- Includes optional `metadata.prependRows` before header.
- Uses BOM: `\uFEFF` + content.
- `csvEscape` wraps values containing comma/newline/quotes.

## Arabic Text Engine (MUST MATCH)
`src/utils/ArabicTextEngine.ts` provides:
- Detect Arabic characters
- Remove diacritics and tatweel
- Remove RTL control characters
- Convert numerals Arabic <-> Western
- `formatCurrency` and `formatDate`
- `formatForExport(text, ExportOptions)` to remove RTL marks and escape for CSV/HTML

## Next.js Implementation Guidance (Replicate; do not redesign)

### Folder mapping suggestion (Next.js)
You can mirror the same folder layout inside Next.js (recommended):
- `src/utils/ArabicTextEngine.ts`
- `src/utils/UniversalExportManager.ts`
- `src/hooks/useUniversalExport.ts`
- `src/components/common/ExportButtons.tsx`
- `src/components/common/ExportButtons.module.css` (or keep a global CSS file)
- `src/components/common/CustomizedPDFModal.tsx`
- `src/components/common/CustomizedPDFModal.module.css`

### Client-side only constraint (critical)
The export system uses:
- `document.createElement('iframe')`
- `window.print()`
- `Blob`, `URL.createObjectURL`

Therefore, in Next.js:
- Export components/hooks must be **client components** (`'use client'`).
- Do not run export code in Server Components.

### Dependencies to install in Next.js
At minimum:
- `xlsx`

Optional (only if you also port the alternate PDF utilities):
- `jspdf`, `jspdf-autotable`, `html2canvas`

### RTL + fonts in Next.js
- Ensure Arabic pages set `dir="rtl"` and `lang="ar"` at the HTML root when Arabic.
- **PDF/print HTML** already imports fonts from Google inside the exported document.
  - Keep it identical to avoid regressions.

## Usage examples to replicate

### Simple table export using `ExportButtons`
Pattern used in `src/pages/ExportTestPage.tsx`:
- Build columns via `createStandardColumns(...)`
- Pass `UniversalTableData` into `ExportButtons`
- Provide config:
  - `title`
  - `subtitle`
  - `useArabicNumerals: true`
  - `rtlLayout: true`

### Programmatic export using hook
Pattern used in `src/pages/admin/ExportDatabase.tsx`:
- `const exportMethods = useUniversalExport()`
- `await exportMethods.exportToExcel(data, { title, rtlLayout, useArabicNumerals, orientation: 'landscape' })`

## Acceptance checklist (must pass)
- ExportButtons renders and works in RTL.
- Customized PDF modal:
  - Select all / unselect all / invert selection
  - Search columns
  - Exports PDF and closes
- Excel:
  - RTL direction enabled in sheet
  - Header styling is present
  - Freeze panes works even with `prependRows`
  - Currency columns show `ج.م` and keep numeric values
- CSV:
  - Opens in Excel without garbled Arabic (BOM is present)
- PDF:
  - Arabic text shows correctly
  - Table header repeats on pages
  - Margins/orientation/page size behave

## Notes / Known pitfalls
- **Do not replace** the HTML print PDF approach with jsPDF unless you also solve Arabic shaping; this system was chosen specifically because it works.
- Next.js App Router requires **client components** for browser APIs.
- Keep numeral handling consistent:
  - CSV forces western numerals.
  - Excel uses raw numeric values and Excel formats.

