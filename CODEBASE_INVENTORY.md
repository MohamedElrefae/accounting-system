# Accounting Web Application - Comprehensive Software Inventory

**Generated:** 2025-11-04  
**Purpose:** Actionable inventory for refactoring/porting to multi-page architecture  
**Tech Stack:** React 18.2.0, TypeScript 5.8.3, Supabase, MUI 5.15.15, Tailwind (via theme tokens)

---

## 1. PROJECT STRUCTURE

### Root Level
```
accounting-system/
├── src/                    # Main application source
├── public/                 # Static assets
├── supabase/              # Supabase Edge Functions
├── tests/                 # E2E tests (Playwright)
├── docs/                  # Documentation & migration summaries
├── mappings/              # Data mapping configurations
├── scripts/               # Build & migration scripts
├── .vscode/               # Editor configuration
├── package.json           # Dependencies & scripts
├── vite.config.ts         # Vite bundler configuration
├── tsconfig.json          # TypeScript configuration
└── vitest.config.ts       # Test configuration
```

### Source Structure (`src/`)
```
src/
├── pages/                 # Page components (route-level)
│   ├── Dashboard.tsx
│   ├── MainData/          # Master data management
│   ├── Transactions/      # Financial transactions
│   ├── Reports/           # Financial reports
│   ├── Fiscal/            # Fiscal year management
│   ├── Inventory/         # Inventory management (feature-flagged)
│   ├── Approvals/         # Approval workflows
│   ├── Documents/         # Document management
│   ├── Projects/          # Project attachments
│   ├── admin/             # Admin pages
│   └── Dev/               # Development/demo pages
├── components/            # Reusable components
│   ├── layout/            # Layout components (Sidebar, TopBar, DashboardLayout)
│   ├── Common/            # Shared UI components
│   ├── auth/              # Authentication components
│   ├── Transactions/      # Transaction-specific components
│   ├── Reports/           # Report-specific components
│   ├── Fiscal/            # Fiscal management components
│   ├── Inventory/         # Inventory components
│   ├── Organizations/     # Organization management
│   ├── Projects/          # Project management
│   ├── Settings/          # Settings components
│   ├── admin/             # Admin components
│   ├── documents/         # Document management components
│   ├── line-items/        # Line items management
│   └── security/          # Permission guards
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── services/              # API/Business logic services
├── store/                 # Zustand global state
├── utils/                 # Utility functions
├── styles/                # Theme definitions
├── theme/                 # Theme tokens
├── types/                 # TypeScript type definitions
├── data/                  # Static data (navigation, mocks)
├── constants/             # App constants
├── config/                # Feature flags & configuration
├── schemas/               # Validation schemas
├── examples/              # Example components
├── shims/                 # MUI/React compatibility shims
├── icons/                 # Custom icon components
└── features/              # Feature modules (documents)
```

---

## 2. FEATURE INVENTORY

### 2.1 Main Data Management (`/main-data/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/main-data/accounts-tree` | Chart of Accounts management | AccountsTree, TreeView | `account-balances.ts` |
| `/main-data/sub-tree` | Sub-account categorization | SubTree | `sub-tree.ts` |
| `/main-data/work-items` | Work item hierarchy | WorkItemsTree | `work-items.ts` |
| `/main-data/cost-centers` | Cost center management | UnifiedCRUDForm | `cost-centers.ts` |
| `/main-data/analysis-work-items` | Analysis work items | AnalysisWorkItems | `analysis-work-items.ts` |
| `/main-data/transaction-classification` | Transaction categories | TransactionClassificationFormConfig | `transaction-classification.ts` |
| `/main-data/transaction-line-items` | Line item catalog | TransactionLineItems | `transaction-line-items.ts`, `line-items.ts` |
| `/main-data/organizations` | Organization setup | OrganizationManagementTabs, OrgSelector | `organization.ts`, `org-memberships.ts` |
| `/main-data/projects` | Project management | ProjectManagement | `projects.ts` |
| `/main-data/document-categories` | Document categorization | DocumentCategories | `document-categories.ts` |
| `/main-data/document-templates` | Template library | TemplateLibrary, TemplateEditor | `templates.ts` |

**Shared Logic:**
- TreeView components for hierarchical data
- UnifiedCRUDForm for consistent forms
- SearchableSelect/AsyncAutocomplete for lookups
- Permission-based access via `useHasPermission`

---

### 2.2 Transactions (`/transactions/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/transactions/my` | User's own transactions | Transactions (filtered) | `transactions.ts` |
| `/transactions/all` | All transactions | Transactions | `transactions.ts` |
| `/transactions/my-enriched` | Enhanced view with details | TransactionsEnriched | `transactions-enriched.ts` |
| `/transactions/all-enriched` | All enhanced transactions | TransactionsEnriched | `transactions-enriched.ts` |
| `/transactions/pending` | Awaiting approval | Transactions (filtered) | `transactions.ts` |
| `/transactions/:id` | Transaction details | TransactionDetails, UnifiedTransactionDetailsPanel | `transactions.ts`, `transaction-lines.ts` |
| `/transactions/line-items` | Transaction line items | TransactionLineItems | `transaction-line-items.ts` |
| `/transactions/assign-cost-analysis` | Cost allocation | AssignCostAnalysis | `cost-analysis.ts` |

**Key Components:**
- `TransactionEntryForm.tsx` - Main transaction entry with wizard
- `TransactionWizard.tsx` - Step-by-step entry
- `MultiLineEditor.tsx` - Line item editing
- `TransactionDetailsLayoutControls.tsx` - Layout customization
- `TransactionAnalysisModal.tsx` - Analysis breakdown
- `LineItemsEditor.tsx` - Generic line items editor
- `TotalsFooter.tsx` - Debit/credit totals

**Business Logic:**
- Transaction approval workflow (draft → submitted → approved/rejected)
- Multi-line transaction support (header + lines)
- Automatic transaction numbering (`getNextTransactionNumber`)
- Real-time validation with warnings/errors
- Cost center, project, work item allocation

---

### 2.3 Financial Reports (`/reports/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/reports/trial-balance` | Trial Balance report | TrialBalanceOriginal | `reports/common.ts` |
| `/reports/trial-balance-all-levels` | Hierarchical trial balance | TrialBalanceAllLevels, ReportTreeView | `reports/common.ts` |
| `/reports/general-ledger` | General Ledger report | GeneralLedger | `reports/general-ledger.ts` |
| `/reports/account-explorer` | Account balance explorer | AccountExplorer | `reports/gl-account-summary.ts` |
| `/reports/profit-loss` | P&L statement | ProfitLoss | `reports/profit-loss.ts` |
| `/reports/balance-sheet` | Balance Sheet | BalanceSheet | `reports/balance-sheet.ts` |
| `/reports/custom` | Custom report builder | CustomReports, ReportBuilder | `reports.ts` |
| `/reports/main-data/transaction-classification` | Classification usage | TransactionClassificationReports | `reports/classification-report.ts` |
| `/reports/main-data/work-item-usage` | Work item analytics | WorkItemUsage | `reports/work-item-usage.ts` |
| `/reports/main-data/analysis-item-usage` | Analysis item analytics | AnalysisItemUsage | `reports/analysis-item-usage.ts` |

**Report Components:**
- `ReportFilterBar.tsx` - Unified filter controls
- `ReportPreview.tsx` - Report preview with export
- `ReportResults.tsx` - Data grid display
- `DatasetSelector.tsx` - Data source selection
- `FilterBuilder.tsx` - Dynamic filter builder
- `GroupByBuilder.tsx` - Grouping controls
- `SortBuilder.tsx` - Sort configuration
- `ReportTemplateSelector.tsx` - Template management
- `ExportButtons.tsx` - PDF/Excel/CSV export

**Export Utilities:**
- `utils/pdfExport.ts` - PDF generation (jsPDF)
- `utils/csvExport.ts` - CSV export
- `utils/advancedExport.ts` - Excel export (xlsx)
- `utils/UniversalExportManager.ts` - Export orchestration

---

### 2.4 Fiscal Management (`/fiscal/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/fiscal/dashboard` | Fiscal year overview | FiscalYearDashboard | `FiscalYearService.ts` |
| `/fiscal/periods` | Period management | FiscalPeriodManager | `FiscalPeriodService.ts` |
| `/fiscal/opening-balance-import` | Import opening balances | OpeningBalanceImportWizard | `OpeningBalanceImportService.ts` |
| `/fiscal/enhanced` | Enhanced fiscal hub (RTL) | EnhancedFiscalHub | `FiscalDashboardService.ts` |
| `/fiscal/enhanced/dashboard` | Enhanced dashboard | EnhancedFiscalYearDashboard | `FiscalYearManagementService.ts` |
| `/fiscal/enhanced/opening-balance-import` | Enhanced import wizard | EnhancedOpeningBalanceImport | `OpeningBalanceImportService.ts` |
| `/fiscal/enhanced/periods` | Enhanced period manager | EnhancedFiscalPeriodManager | `FiscalPeriodService.ts` |
| `/fiscal/construction` | Construction dashboard | ConstructionDashboard | `ConstructionComplianceManager.ts` |
| `/fiscal/approval-workflow` | Opening balance approval | OpeningBalanceApprovalWorkflow | `approvals.ts` |
| `/fiscal/validation-rules` | Validation rule manager | ValidationRuleManager | - |
| `/fiscal/reconciliation` | Balance reconciliation | BalanceReconciliationDashboard | - |
| `/fiscal/audit-trail` | Audit log | OpeningBalanceAuditTrail | - |
| `/fiscal/approvals` | Approval center | ApprovalNotificationCenter | `approvals.ts` |

**Fiscal Components:**
- `FiscalYearSelector.tsx` - Year picker
- `OpeningBalanceImportWizard.tsx` - Multi-step import
- `ValidationResults.tsx` - Import validation display
- `ImportProgressTracker.tsx` - Progress indicator
- `ClosingChecklistManager.tsx` - Period close checklist
- `BalanceReconciliationPanel.tsx` - Reconciliation UI
- `EnhancedOBImportResultsModal.tsx` - Import results
- `OpeningBalanceManualCrud.tsx` - Manual OB entry

**Business Services:**
- `OpeningBalanceImportService.ts` - CSV import & validation
- `OpeningBalanceDryRun.ts` - Pre-import validation
- `PeriodClosingService.ts` - Period closing logic
- `FiscalYearManagementService.ts` - Fiscal year CRUD
- `ConstructionComplianceManager.ts` - Construction-specific logic
- `ConstructionCostAllocation.ts` - Cost allocation for construction
- `ConstructionProgressIntegration.ts` - Progress tracking

---

### 2.5 Inventory Management (`/inventory/*`) [Feature-Flagged: `VITE_FEATURE_INVENTORY`]

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/inventory` | Inventory dashboard | InventoryDashboard | `inventory/config.ts` |
| `/inventory/kpis` | KPI dashboard | KPIDashboard | `inventory/reports.ts` |
| `/inventory/materials` | Materials master | Materials | `inventory/materials.ts` |
| `/inventory/locations` | Storage locations | Locations | `inventory/locations.ts` |
| `/inventory/on-hand` | Current stock levels | OnHand | `inventory/reports.ts` |
| `/inventory/movements` | Stock movements | Movements | `inventory/documents.ts` |
| `/inventory/valuation` | Inventory valuation | Valuation | `inventory/reports.ts` |
| `/inventory/ageing` | Stock ageing analysis | Ageing | `inventory/reports.ts` |
| `/inventory/movement-summary` | Movement summary | MovementSummary | `inventory/reports.ts` |
| `/inventory/movement-detail` | Movement details | MovementDetail | `inventory/reports.ts` |
| `/inventory/project-movement-summary` | Project-based movements | ProjectMovementSummary | `inventory/reports.ts` |
| `/inventory/valuation-by-project` | Project valuation | ValuationByProject | `inventory/reports.ts` |
| `/inventory/receive` | Goods receipt | Receive | `inventory/documents.ts` |
| `/inventory/issue` | Material issue | Issue | `inventory/documents.ts` |
| `/inventory/transfer` | Stock transfer | Transfer | `inventory/documents.ts` |
| `/inventory/adjust` | Inventory adjustment | Adjust | `inventory/documents.ts` |
| `/inventory/returns` | Material returns | Returns | `inventory/documents.ts` |
| `/inventory/reconciliation` | Stock reconciliation | Reconciliation | `inventory/reconciliation.ts` |
| `/inventory/settings` | Inventory config | InventorySettings | `inventory/config.ts` |
| `/inventory/documents/:id` | Document details | DocumentDetails | `inventory/documents.ts` |

**Inventory Components:**
- `MaterialSelect.tsx` - Material picker
- `LocationSelect.tsx` - Location picker
- `ProjectSelect.tsx` - Project picker
- `StatusChip.tsx` - Status indicator
- `QuickVoidForm.tsx` - Quick void action
- `DocumentActionsBar.tsx` - Document actions

---

### 2.6 Approvals & Workflows (`/approvals/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/approvals/documents` | Document approvals | DocumentApprovals | `approvals.ts` |
| `/approvals/inbox` | Approval inbox | Inbox | `approvals.ts` |
| `/approvals/workflows` | Workflow configuration | Workflows | `approvals.ts` |
| `/approvals/test` | Workflow testing | TestWorkflow | `approvals.ts` |

---

### 2.7 Documents (`/documents`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/documents` | Document library | Documents | `documents.ts` |

**Document Components:**
- `DocumentDetailsDrawer.tsx` - Document preview drawer
- `DocumentDetailsPanel.tsx` - Document info panel
- `AttachDocumentsPanel.tsx` - Document attachment UI
- `DocumentPickerDialog.tsx` - File picker
- `CategorySelectDialog.tsx` - Category assignment
- `DocumentPermissionsDialog.tsx` - Permission management
- `FolderPermissionsDialog.tsx` - Folder permissions
- `GenerateFromTemplateDialog.tsx` - Template generation
- `PdfPreview.tsx` - PDF viewer

**Document Services:**
- `documents.ts` - Document CRUD
- `document-folders.ts` - Folder management
- `document-categories.ts` - Category management
- `pdf-generator.ts` - PDF generation
- `zip.ts` - ZIP compression

---

### 2.8 Administration (`/settings/*`)

| Page/Route | Purpose | Key Components | API Services |
|------------|---------|----------------|--------------|
| `/settings/user-management` | User/role management | UserManagementSystem | Multiple admin services |
| `/settings/organization-management` | Organization config | OrganizationManagementTabs | `organization.ts` |
| `/settings/account-prefix-mapping` | Account prefix rules | AccountPrefixMapping | `account-prefix-map.ts` |
| `/settings/font-preferences` | Font & formatting | FontSettings | `font-preferences.ts` |
| `/settings/export-database` | Database export | ExportDatabase | `export-database.ts` |
| `/settings/diagnostics` | System diagnostics | Diagnostics | - |
| `/settings/profile` | User profile | Profile | - |

**Admin Components:**
- `UserDialog.tsx` - User form
- `RoleFormConfig.tsx` - Role configuration
- `PermissionMatrix.tsx` - Permission grid
- `QuickPermissionAssignment.tsx` - Quick permission UI
- `AccessRequestManagement.tsx` - Access request handling
- `DatabaseDiagnostics.tsx` - DB health check
- `SecurityDiagnostics.tsx` - Security audit
- `TestUserCreation.tsx` - User creation testing
- `InviteUserDialog.tsx` - User invitation
- `CompanySettings.tsx` - Company configuration

---

## 3. SHARED BUSINESS LOGIC

### 3.1 Authentication & Authorization

**Location:** `src/contexts/AuthContext.tsx`, `src/hooks/`

| Hook/Context | Purpose | Key Functions |
|--------------|---------|---------------|
| `AuthContext` | Auth state management | `signIn`, `signUp`, `signOut`, `refreshProfile` |
| `useAuth()` | Auth access hook | Get current user, profile, permissions |
| `usePermissions()` | Permission checker | `hasPermission`, `hasAny`, `hasAll` |
| `useHasPermission()` | Permission hook | Returns permission checker function |
| `useCan()` | Ability checker | Check user abilities |
| `useIdleLogout()` | Auto-logout | Idle timeout management |

**Permission System:**
- Role-based access control (RBAC)
- Direct user permissions (override roles)
- Super admin wildcard (`*` permission)
- Permission guards: `RequirePermission`, `PermissionGuard`, `withPermission`
- Database: `user_roles`, `role_permissions`, `user_permissions` tables

---

### 3.2 State Management

**Location:** `src/store/useAppStore.ts`, `src/contexts/`

| Store/Context | Purpose | State |
|---------------|---------|-------|
| `useAppStore` (Zustand) | Global app state | `language`, `theme`, `sidebarCollapsed`, `user`, `notifications` |
| `ThemeContext` | Theme management | `themeMode`, `toggleTheme` |
| `ToastContext` | Toast notifications | `showToast`, `hideToast` |
| `FontPreferencesContext` | Font settings | Font family, size, weight |
| `UserProfileContext` | User profile data | Extended profile info |
| `RtlCacheProvider` | RTL cache | Emotion cache for RTL |

**State Persistence:**
- Zustand persist middleware (localStorage)
- Keys: `accounting-app-store`, `unifiedForm:*`, `columnPreferences:*`

---

### 3.3 Data Fetching

**Location:** `src/services/`, React Query

**Strategy:**
- **React Query** (`@tanstack/react-query`) for server state caching
- **Supabase Client** for all API calls
- **Default staleTime:** 5 minutes
- **Retry:** 1 attempt
- **No refetch on window focus**

**Key Services by Domain:**

| Domain | Service File | Key Functions |
|--------|--------------|---------------|
| Transactions | `transactions.ts` | `listJournalsUnified`, `getTransactionWithLines`, `getNextTransactionNumber` |
| Transaction Lines | `transaction-lines.ts` | `getTransactionLines`, `createTransactionLine`, `updateTransactionLine` |
| Accounts | `account-balances.ts` | `getAccounts`, `getAccountBalances` |
| Organizations | `organization.ts` | `getOrganizations`, `createOrganization` |
| Projects | `projects.ts` | `getProjects`, `createProject` |
| Cost Centers | `cost-centers.ts` | `getCostCenters`, `createCostCenter` |
| Work Items | `work-items.ts` | `getWorkItems`, `createWorkItem` |
| Analysis Items | `analysis-work-items.ts` | `getAnalysisWorkItems` |
| Line Items | `line-items.ts` | `getLineItems`, `createLineItem` |
| Documents | `documents.ts` | `getDocuments`, `uploadDocument` |
| Templates | `templates.ts` | `getTemplates`, `createTemplate` |
| Approvals | `approvals.ts` | `submitForApproval`, `approveTransaction` |
| Reports | `reports.ts` | `generateReport`, `exportReport` |
| Fiscal | `FiscalYearService.ts` | `getFiscalYears`, `createFiscalYear` |
| Opening Balance | `OpeningBalanceImportService.ts` | `importOpeningBalances`, `validateImport` |

---

### 3.4 Helper Utilities

**Location:** `src/utils/`

| Utility | Purpose | Key Functions |
|---------|---------|---------------|
| `supabase.ts` | Supabase client | `supabase` instance, type definitions |
| `dateHelpers.ts` | Date formatting | `formatDateForSupabase`, date conversions |
| `csvExport.ts` | CSV export | `exportToCSV` |
| `pdfExport.ts` | PDF export | `generatePDF`, jsPDF helpers |
| `advancedExport.ts` | Excel export | `exportToExcel` (xlsx) |
| `UniversalExportManager.ts` | Export orchestration | Multi-format export logic |
| `i18n.ts` | Internationalization | Translation helpers |
| `ArabicTextEngine.ts` | Arabic text handling | RTL text processing |
| `audit.ts` | Audit logging | `logAuditEvent` |
| `org.ts` | Organization helpers | Organization utilities |
| `reportPresets.ts` | Report presets | Preset management |
| `reportTemplates.ts` | Report templates | Template utilities |
| `sampleDatasets.ts` | Sample data | Demo data generators |
| `financial-pdf-helper.ts` | Financial PDF | Financial report PDF generation |

---

### 3.5 Validation

**Location:** `src/schemas/`, `src/components/Common/`

- **Zod schemas:** `src/schemas/transactionSchema.ts`
- **Form validation:** Built into `UnifiedCRUDForm.tsx`
- **Real-time validation** with errors/warnings
- **Custom validators** per field

---

## 4. STATE MANAGEMENT

### 4.1 Global State (Zustand)

**File:** `src/store/useAppStore.ts`

**State:**
```typescript
{
  language: 'ar' | 'en',
  theme: 'light' | 'dark',
  sidebarCollapsed: boolean,
  notifications: Notification[],
  companyName: string,
  user: User | null
}
```

**Actions:**
- `setLanguage(language)`
- `setTheme(theme)`
- `toggleTheme()`
- `toggleLanguage()`
- `toggleSidebar()`
- `setSidebarCollapsed(collapsed)`
- `setUser(user)`

**Persistence:** LocalStorage (`accounting-app-store`)

---

### 4.2 Context-Based State

| Context | File | State | Consumers |
|---------|------|-------|-----------|
| Auth | `AuthContext.tsx` | `user`, `profile`, `permissions` | All authenticated pages |
| Theme | `ThemeContext.tsx` | `themeMode` | Entire app (MUI ThemeProvider) |
| Toast | `ToastContext.tsx` | `toasts[]` | Forms, API calls |
| FontPreferences | `FontPreferencesContext.tsx` | `fontFamily`, `fontSize`, `fontWeight` | All text rendering |
| UserProfile | `UserProfileContext.tsx` | Extended profile | Profile pages |

---

### 4.3 Server State (React Query)

**Configuration:**
```typescript
{
  refetchOnWindowFocus: false,
  retry: 1,
  staleTime: 5 * 60 * 1000 // 5 minutes
}
```

**Usage Pattern:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', filters],
  queryFn: () => fetchTransactions(filters)
});
```

**Devtools:** Enabled in dev mode (`ReactQueryDevtools`)

---

## 5. CURRENT DESIGN SYSTEM

### 5.1 Styling Approach

**Primary:** Material-UI (MUI) 5.15.15  
**Secondary:** Custom CSS variables (theme tokens)  
**RTL Support:** Emotion cache with stylis-plugin-rtl

---

### 5.2 Theme Implementation

**Files:**
- `src/styles/theme.ts` - Base theme definitions
- `src/theme/tokens.ts` - Enterprise UI tokens
- `src/themes/rtlTheme.ts` - RTL configuration
- `src/contexts/ThemeContext.tsx` - Theme provider
- `src/contexts/RtlCacheProvider.tsx` - RTL cache

**Theme Modes:**
- **Light:** `#F5F6FA` background, `#FFFFFF` surface, `#2076FF` accent
- **Dark:** `#181A20` background, `#23272F` surface, `#2076FF` accent

**Color System (Unified):**
```css
/* Light Mode */
--background: #F5F6FA
--surface: #FFFFFF
--accent: #2076FF
--text: #181C23
--muted_text: #70778A
--border: #E2E6ED

/* Dark Mode */
--background: #181A20
--surface: #23272F
--accent: #2076FF
--text: #EDEDED
--muted_text: #8D94A2
--border: #393C43
```

**Typography:**
- **English:** Segoe UI, Tahoma, Geneva, Verdana
- **Arabic:** Segoe UI, Tahoma, Arial (RTL-optimized)
- **Scale:** h1 (2.125rem) → body2 (0.75rem)

**Layout Tokens:**
```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--control-height: 40px
--control-gap: 12px
--section-gap: 16px
--container-max: 1600px
```

---

### 5.3 Shared UI Components

**Location:** `src/components/Common/`

| Component | Purpose | Props | Usage |
|-----------|---------|-------|-------|
| `UnifiedCRUDForm` | Generic CRUD form | `config`, `initialData`, `onSubmit`, `onCancel` | All forms |
| `SearchableSelect` | Async dropdown | `options`, `value`, `onChange` | Account/project pickers |
| `AsyncAutocomplete` | Async autocomplete | `fetchOptions`, `value`, `onChange` | Large datasets |
| `FilterBar` | Report filter UI | `filters`, `onFilterChange` | All reports |
| `ExportButtons` | Export actions | `data`, `filename` | Reports, tables |
| `ResizableTable` | Data grid | `columns`, `rows` | All tables |
| `VirtualizedAutocompleteListbox` | Virtual list | `options`, `value` | Large dropdowns |
| `EnhancedField` | Smart form field | `config`, `value`, `onChange` | Dynamic forms |
| `ColumnConfiguration` | Column manager | `columns`, `onUpdate` | Table customization |
| `PresetBar` | Preset manager | `presets`, `onApply` | Reports |
| `DateFormatter` | Date display | `value`, `format` | All dates |
| `CurrencyFormatter` | Currency display | `value`, `currency` | All currency |
| `ErrorBoundary` | Error handler | `children` | Page wrappers |
| `DraggableResizableDialog` | Modal | `title`, `content` | All modals |
| `DraggableResizablePanel` | Panel | `title`, `content` | Side panels |
| `AttachmentsCell` | Attachment UI | `attachments`, `onUpload` | Document tables |
| `PermissionBadge` | Permission indicator | `permissions` | Admin UI |
| `ReportSyncStatus` | Sync status | `status` | Reports |
| `UltimateButton` | Enhanced button | `variant`, `onClick` | Actions |

**Layout Components:**
- `DashboardLayout.tsx` - Main app layout
- `Sidebar.tsx` - Navigation sidebar
- `TopBar.tsx` - App bar with user menu
- `SidebarPortal.tsx` - Sidebar portal for RTL

**Specialized Components by Feature:**

| Feature | Component Files |
|---------|-----------------|
| Transactions | `TransactionEntryForm`, `TransactionWizard`, `MultiLineEditor`, `TotalsFooter` |
| Reports | `ReportFilterBar`, `ReportPreview`, `ReportResults`, `FilterBuilder`, `GroupByBuilder` |
| Fiscal | `FiscalYearSelector`, `OpeningBalanceImportWizard`, `ValidationResults` |
| Documents | `DocumentDetailsDrawer`, `DocumentPickerDialog`, `PdfPreview` |
| Line Items | `LineItemsEditor`, `LineItemFormModal`, `TransactionLineItemsSection` |
| Organizations | `OrgSelector`, `OrgMembersManagement`, `ProjectSelector` |
| Inventory | `MaterialSelect`, `LocationSelect`, `StatusChip`, `QuickVoidForm` |
| Charts | `DashboardCharts` (Recharts-based) |
| Admin | `UserDialog`, `PermissionMatrix`, `QuickPermissionAssignment` |

---

### 5.4 Icon System

**Primary:** Material-UI Icons (`@mui/icons-material`)  
**Secondary:** Lucide React (`lucide-react`)  
**Custom:** `src/icons/` (Google, Menu, ExpandLess)

---

## 6. MIDDLEWARE & SECURITY

### 6.1 Role-Based Access Control (RBAC)

**Implementation:**
- **Database Tables:** `roles`, `permissions`, `user_roles`, `role_permissions`, `user_permissions`
- **Middleware:** Row-Level Security (RLS) policies in Supabase
- **Frontend Guards:**
  - `ProtectedRoute` - Requires authentication
  - `RequirePermission` - Requires specific permission
  - `PermissionGuard` - Inline permission check
  - `withPermission` - HOC for permission wrapping

**Permission Checking:**
```typescript
// Hook-based
const hasPerm = useHasPermission();
if (hasPerm('transactions.create')) { /* ... */ }

// Context-based
const { permissions } = useAuth();
if (permissions.includes('users.manage')) { /* ... */ }

// Component-based
<RequirePermission perm="documents.view">
  <Documents />
</RequirePermission>
```

**Super Admin:**
- Flag: `is_super_admin` on `user_profiles`
- Grants `*` wildcard permission
- Stored in localStorage for performance

---

### 6.2 Protected Routes

**Location:** `src/App.tsx`

**Route Protection:**
```typescript
<Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
  {/* All child routes require authentication */}
  <Route path="/settings/user-management" element={
    <RequirePermission perm="users.view">
      <UserManagementSystem />
    </RequirePermission>
  } />
</Route>
```

**Public Routes:**
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/auth-debug`

---

### 6.3 API Security

**Supabase RLS:**
- Policies on all tables restrict access by `user_id`, `org_id`
- Server-side validation via database functions
- JWT-based authentication

**Client-Side:**
- Token stored in Supabase client (httpOnly not exposed)
- Auto-refresh handled by Supabase SDK
- Idle logout after inactivity (`useIdleLogout`)

---

### 6.4 Data Validation

**Layers:**
1. **Client-side:** Form validation (Zod schemas, custom validators)
2. **API-level:** Supabase RLS + database constraints
3. **Database:** Foreign keys, NOT NULL, CHECK constraints

---

## 7. CACHING STRATEGIES

### 7.1 Frontend Caching

**React Query:**
- **Query caching:** Automatic with 5-minute staleTime
- **Background refetch:** Disabled (manual refetch only)
- **Cache keys:** Based on query parameters (e.g., `['transactions', filters]`)
- **Invalidation:** Manual via `queryClient.invalidateQueries()`

**LocalStorage:**
- **Zustand store:** Persisted app state (`accounting-app-store`)
- **Form preferences:** `unifiedForm:{formId}:columns`, `unifiedForm:{formId}:fieldOrder`
- **Column preferences:** `columnPreferences:{tableId}`
- **Report presets:** `reportPresets:{reportId}`
- **Super admin flag:** `is_super_admin`

**Session Storage:**
- Not currently used (could be added for temporary state)

---

### 7.2 Backend Caching

**Supabase:**
- Built-in Postgres query caching
- No explicit CDN caching (SPA deployment)

**Potential Optimizations:**
- Add database views for frequently accessed aggregates (e.g., `transactions_enriched`)
- Materialized views for reports (currently uses standard views)

---

### 7.3 Asset Caching

**Vite Build:**
- **Hashed filenames:** Automatic cache busting
- **Code splitting:** Vendor, MUI, router, query, PDF chunks
- **Static assets:** Public folder served as-is

**CDN Strategy:**
- Currently none (deployed to Vercel with default caching)
- Could add CloudFlare for aggressive edge caching

---

### 7.4 Service Workers

**Status:** Not implemented  
**Opportunity:** Add for offline support and advanced caching

---

## 8. KEY TECHNICAL PATTERNS

### 8.1 Data Flow

```
User Action → Component → Hook → Service → Supabase → Database
                ↓                    ↓
          React Query Cache   ←   Response
                ↓
          Component Re-render
```

### 8.2 Form Pattern

```
Page Component
  └─ UnifiedCRUDForm
       ├─ FormConfig (field definitions)
       ├─ EnhancedField (per field)
       ├─ SearchableSelect (lookups)
       └─ onSubmit → Service → Supabase
```

### 8.3 Report Pattern

```
Report Page
  ├─ ReportFilterBar (filters)
  ├─ ReportPreview (preview)
  ├─ ReportResults (data grid)
  └─ ExportButtons (PDF/Excel/CSV)
       └─ UniversalExportManager → pdfExport/csvExport/advancedExport
```

### 8.4 Approval Workflow

```
Transaction (draft)
  → Submit for Approval (user action)
  → approval_status = 'submitted'
  → Reviewer sees in inbox
  → Approve/Reject/Request Revision
  → approval_status updated
  → Original user notified
```

### 8.5 i18n/RTL Pattern

```
useAppStore.language → 'ar'
  ↓
document.dir = 'rtl'
  ↓
ThemeContext → createAppTheme(mode, 'ar')
  ↓
RtlCacheProvider → Emotion cache with RTL plugin
  ↓
All MUI components render RTL
```

---

## 9. CONFIGURATION & FEATURE FLAGS

**Location:** `src/config/featureFlags.ts`

**Flags:**
- `VITE_FEATURE_INVENTORY` - Enable inventory module (default: true in `.env`)
- `READ_MODE` - Read-only mode (not currently used)

**Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_FEATURE_INVENTORY` - Inventory feature flag

**Build Modes:**
- `dev` - Development server
- `build` - Production build
- `build:test` - Test environment build
- `build:analyze` - Build with bundle analyzer

---

## 10. TESTING

### 10.1 Unit Tests (Vitest)

**Location:** `src/components/__tests__/`, `src/services/__tests__/`, `src/utils/__tests__/`

**Coverage:**
- CSV parsing and reconciliation
- Opening balance validation and mapping
- Fiscal dashboard services
- Arabic language services
- Date formatting
- Cost allocation

**Command:** `npm test`

---

### 10.2 E2E Tests (Playwright)

**Location:** `tests/e2e/`

**Test:** `inventory-smoke.spec.ts`

**Command:** `npm run e2e`

---

## 11. DEPLOYMENT

**Platform:** Vercel  
**Build:** Vite → Static site  
**Config:** `vercel.json`, `vite.config.ts`  
**Preview:** `npm run preview` (port 4173)

---

## 12. NOTABLE ARCHITECTURE DECISIONS

1. **Unified Transaction Model:** Removed GL2 in favor of single `transactions` + `transaction_lines` schema
2. **MUI + Tailwind Hybrid:** MUI components with custom CSS variables for unified theming
3. **Zustand over Redux:** Lightweight global state (only for UI preferences)
4. **React Query for Server State:** Avoid prop drilling, automatic caching
5. **Supabase RLS for Security:** Database-level row-level security vs. API middleware
6. **UnifiedCRUDForm Component:** Single form component for all CRUD operations (consistency)
7. **RTL via Emotion Cache:** Full RTL support without component changes
8. **Feature Flags via Vite Env:** Easy module toggling (Inventory)
9. **Lazy Loading:** All page components lazy-loaded for bundle size
10. **Type-Safe APIs:** Full TypeScript types for Supabase tables

---

## 13. MIGRATION NOTES FOR MULTI-PAGE ARCHITECTURE

### 13.1 Recommended Approach

**Split into separate apps:**
1. **Core Accounting** (main-data, transactions, reports, fiscal)
2. **Inventory** (already feature-flagged, easy to extract)
3. **Admin** (user management, settings)
4. **Documents** (document management, templates)

### 13.2 Shared Libraries

**Extract into NPM packages:**
- `@accounting/ui-components` → `src/components/Common/`
- `@accounting/hooks` → `src/hooks/`
- `@accounting/utils` → `src/utils/`
- `@accounting/theme` → `src/styles/`, `src/theme/`
- `@accounting/services` → `src/services/` (if sharing API calls)

### 13.3 State Management

**Current:**
- Global Zustand store (`useAppStore`)

**Multi-page:**
- Keep Zustand for per-app state
- Use shared auth context across apps (via iframe or shared domain)
- Consider shared authentication service

### 13.4 Routing

**Current:**
- Single React Router instance

**Multi-page:**
- Each app has own router
- Shell app for app switching
- Deep linking via URL params

### 13.5 API

**Current:**
- Single Supabase client instance

**Multi-page:**
- Each app can have own Supabase client
- Shared auth token via `localStorage` or cookie

---

## 14. DEPENDENCIES SUMMARY

### Core
- **React:** 18.2.0 (locked via overrides)
- **TypeScript:** 5.8.3
- **Vite:** 7.1.2

### UI
- **MUI:** 5.15.15 (Material, Icons, Data Grid)
- **Emotion:** 11.11.4 (CSS-in-JS)
- **Framer Motion:** 12.23.24 (animations)
- **Lucide React:** 0.365.0 (icons)
- **Recharts:** 2.12.5 (charts)

### Data
- **Supabase:** 2.39.7
- **React Query:** 4.36.1 (Tanstack)
- **Zustand:** 4.5.2 (state)
- **React Router:** 6.22.3

### Forms
- **React Hook Form:** 7.51.3
- **Yup:** 1.4.0 (validation)
- **Zod:** 4.1.11 (validation)

### Export
- **jsPDF:** 3.0.3 (PDF)
- **jspdf-autotable:** 5.0.2 (PDF tables)
- **xlsx:** 0.18.5 (Excel)
- **html2canvas:** 1.4.1 (screenshots)

### Date/Time
- **date-fns:** 4.1.0
- **dayjs:** 1.11.10

### Utilities
- **pdfjs-dist:** 5.4.149 (PDF rendering)
- **react-window:** 1.8.9 (virtualization)
- **stylis:** 4.3.6 (CSS)
- **stylis-plugin-rtl:** 2.1.1 (RTL)

### Dev
- **ESLint:** 9.33.0
- **Vitest:** 4.0.5
- **Playwright:** 1.48.2
- **rollup-plugin-visualizer:** 5.12.0

---

## 15. NEXT STEPS FOR REFACTORING

1. **Audit Component Dependencies:** Map which components are used by which pages
2. **Extract Shared UI Library:** Create `@accounting/ui-components` package
3. **Split Services by Domain:** Separate API services into domain modules
4. **Create App Shell:** Build shell app for multi-page orchestration
5. **Migrate Inventory First:** Easiest to extract (already feature-flagged)
6. **Set Up Monorepo:** Use Turborepo or Nx for multi-app management
7. **Shared Authentication:** Implement cross-app auth strategy
8. **Migrate Routing:** Update navigation to handle cross-app links
9. **Performance Testing:** Measure bundle sizes and load times
10. **Documentation:** Update README and create migration guide

---

## APPENDIX A: COMPLETE FILE TREE

```
accounting-system/
├── .vscode/
│   └── extensions.json
├── docs/
│   └── GL2-migration-summary.json
├── mappings/
│   └── daily_journal_r6_mapping.json
├── public/
├── scripts/
│   ├── build-wizard.ts
│   └── checkLineItemsMigration.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Accounts/
│   │   │   └── AccountFormConfig.tsx
│   │   ├── Charts/
│   │   │   └── DashboardCharts.tsx
│   │   ├── Common/
│   │   │   ├── AsyncAutocomplete.tsx
│   │   │   ├── AttachmentsCell.tsx
│   │   │   ├── ColumnConfiguration.tsx
│   │   │   ├── CurrencyFormatter.tsx
│   │   │   ├── CustomizedPDFModal.tsx
│   │   │   ├── DateFormatter.tsx
│   │   │   ├── DraggableResizableDialog.tsx
│   │   │   ├── DraggableResizablePanel.tsx
│   │   │   ├── EnhancedField.tsx
│   │   │   ├── EnhancedSettingsPanel.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ExportButtons.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── FormLayoutControls.tsx
│   │   │   ├── PermissionBadge.tsx
│   │   │   ├── PresetBar.tsx
│   │   │   ├── ReportSyncStatus.tsx
│   │   │   ├── ResizableTable.tsx
│   │   │   ├── SearchableDropdown.tsx
│   │   │   ├── SearchableSelect.tsx
│   │   │   ├── UltimateButton.tsx
│   │   │   ├── UnifiedCRUDForm.tsx
│   │   │   ├── VirtualizedAutocompleteListbox.tsx
│   │   │   └── withPermission.tsx
│   │   ├── Dashboard/
│   │   │   └── EnhancedFiscalQuickLaunch.tsx
│   │   ├── DebugToggle.tsx
│   │   ├── EnhancedQuickPermissionAssignment.tsx
│   │   ├── ExpensesCategoriesTreeView.tsx
│   │   ├── Fiscal/
│   │   │   ├── BalanceReconciliationPanel.tsx
│   │   │   ├── ClosingChecklistManager.tsx
│   │   │   ├── ConstructionComplianceMonitor.tsx
│   │   │   ├── ConstructionDateRangeControls.tsx
│   │   │   ├── CostPerformanceAnalytics.tsx
│   │   │   ├── EnhancedOBImportResultsModal.tsx
│   │   │   ├── FiscalYearSelector.tsx
│   │   │   ├── ImportProgressTracker.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   ├── MaterialManagementDashboard.tsx
│   │   │   ├── OpeningBalanceImportWizard.tsx
│   │   │   ├── OpeningBalanceManualCrud.tsx
│   │   │   ├── ProjectPhaseProgressChart.tsx
│   │   │   ├── SubcontractorManagementInterface.tsx
│   │   │   └── ValidationResults.tsx
│   │   ├── Inventory/
│   │   │   ├── DocumentActionsBar.tsx
│   │   │   ├── LocationSelect.tsx
│   │   │   ├── MaterialSelect.tsx
│   │   │   ├── ProjectSelect.tsx
│   │   │   ├── QuickVoidForm.tsx
│   │   │   └── StatusChip.tsx
│   │   ├── LineItems/
│   │   │   └── LineItemsTreeView.tsx
│   │   ├── Organizations/
│   │   │   ├── OrgMembersManagement.tsx
│   │   │   ├── OrgSelector.tsx
│   │   │   ├── OrganizationManagement.tsx
│   │   │   ├── OrganizationManagementTabs.tsx
│   │   │   ├── OrganizationSettings.tsx
│   │   │   └── ProjectSelector.tsx
│   │   ├── Projects/
│   │   │   ├── ProjectAttachmentsPanel.tsx
│   │   │   └── ProjectManagement.tsx
│   │   ├── Reports/
│   │   │   ├── AccountColumns.ts
│   │   │   ├── DatasetSelector.tsx
│   │   │   ├── FieldSelector.tsx
│   │   │   ├── FilterBuilder.tsx
│   │   │   ├── GroupByBuilder.tsx
│   │   │   ├── ReportFilterBar.tsx
│   │   │   ├── ReportPreview.tsx
│   │   │   ├── ReportResults.tsx
│   │   │   ├── ReportTemplateSelector.tsx
│   │   │   └── SortBuilder.tsx
│   │   ├── Settings/
│   │   │   ├── CompanySettings.tsx
│   │   │   └── FontSettings.tsx
│   │   ├── TransactionClassification/
│   │   │   └── TransactionClassificationFormConfig.tsx
│   │   ├── TransactionLineItemSelector/
│   │   │   ├── ExampleUsage.tsx
│   │   │   ├── TransactionLineItemSelector.tsx
│   │   │   └── index.ts
│   │   ├── Transactions/
│   │   │   ├── FormLayoutSettings.tsx
│   │   │   ├── LineItemCostModal.tsx
│   │   │   ├── MultiLineEditor.tsx
│   │   │   ├── TotalsFooter.tsx
│   │   │   ├── TransactionAnalysisModal.tsx
│   │   │   ├── TransactionDetailsLayoutControls.tsx
│   │   │   ├── TransactionEntryForm.tsx
│   │   │   ├── TransactionFormConfig.tsx
│   │   │   ├── TransactionWizard.tsx
│   │   │   └── UnifiedTransactionDetailsPanel.tsx
│   │   ├── TreeView/
│   │   │   ├── ReportTreeView.tsx
│   │   │   └── TreeView.tsx
│   │   ├── WorkItems/
│   │   │   └── WorkItemsTree.tsx
│   │   ├── __tests__/
│   │   │   ├── ConstructionDashboard.test.tsx
│   │   │   ├── FiscalPeriodManager.test.tsx
│   │   │   ├── OpeningBalanceImport.test.tsx
│   │   │   ├── csv.parse.test.ts
│   │   │   ├── csv.reconciliation.test.ts
│   │   │   ├── csv.util.test.ts
│   │   │   ├── navigation.fiscal.links.test.ts
│   │   │   ├── opening-balance.mapping.guess.test.ts
│   │   │   ├── opening-balance.mapping.test.ts
│   │   │   └── opening-balance.validation.test.ts
│   │   ├── admin/
│   │   │   ├── AccessRequestManagement.tsx
│   │   │   ├── DatabaseDiagnostics.tsx
│   │   │   ├── EnhancedQuickPermissionAssignment.tsx
│   │   │   ├── InviteUserDialog.tsx
│   │   │   ├── PermissionMatrix.tsx
│   │   │   ├── QuickPermissionAssignment.tsx
│   │   │   ├── RoleFormConfig.tsx
│   │   │   ├── SecurityDiagnostics.tsx
│   │   │   ├── TestUserCreation.tsx
│   │   │   ├── UserDialog.tsx
│   │   │   ├── UserDialogEnhanced.tsx
│   │   │   ├── UserDialog_fixed.tsx
│   │   │   └── UserFormConfig.tsx
│   │   ├── auth/
│   │   │   ├── AccessRequestForm.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PermissionGuard.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ResetPassword.tsx
│   │   ├── documents/
│   │   │   ├── AttachDocumentsPanel.tsx
│   │   │   ├── CategorySelectDialog.tsx
│   │   │   ├── DocumentDetailsDrawer.tsx
│   │   │   ├── DocumentDetailsPanel.tsx
│   │   │   ├── DocumentPermissionsDialog.tsx
│   │   │   ├── DocumentPickerDialog.tsx
│   │   │   ├── FolderPermissionsDialog.tsx
│   │   │   ├── GenerateFromTemplateDialog.tsx
│   │   │   └── PdfPreview.tsx
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarPortal.tsx
│   │   │   └── TopBar.tsx
│   │   ├── line-items/
│   │   │   ├── CostAnalysisModal.tsx
│   │   │   ├── LineItemDropdown.tsx
│   │   │   ├── LineItemFormModal.tsx
│   │   │   ├── LineItemFormUnified.tsx
│   │   │   ├── LineItemsEditor.tsx
│   │   │   ├── LineItemsTreeManager.tsx
│   │   │   ├── TransactionLineItemsEditor.tsx
│   │   │   └── TransactionLineItemsSection.tsx
│   │   ├── security/
│   │   │   ├── RequirePermission.tsx
│   │   │   └── index.ts
│   │   └── ui/
│   │       └── StatCard.tsx
│   ├── config/
│   │   └── featureFlags.ts
│   ├── constants/
│   │   └── permissions.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── FontPreferencesContext.tsx
│   │   ├── RtlCacheProvider.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── UserProfileContext.tsx
│   ├── data/
│   │   ├── mock-org-permissions.ts
│   │   ├── mockData.ts
│   │   └── navigation.ts
│   ├── dev-icons.tsx
│   ├── dev-icons/
│   │   └── Google.tsx
│   ├── examples/
│   │   └── EnterpriseReportSyncExample.tsx
│   ├── hooks/
│   │   ├── documents/
│   │   │   ├── index.ts
│   │   │   └── useDocuments.ts
│   │   ├── useAccessRequestNotifications.ts
│   │   ├── useAuth.ts
│   │   ├── useCan.ts
│   │   ├── useColumnPreferences.ts
│   │   ├── useFeatureFlags.ts
│   │   ├── useHasPermission.ts
│   │   ├── useIdleLogout.ts
│   │   ├── usePermissions.ts
│   │   ├── useReportPresets.ts
│   │   ├── useSavedFilters.ts
│   │   ├── useTransactionLineItemSelector.ts
│   │   ├── useUniversalExport.ts
│   │   └── useUniversalReportSync.ts
│   ├── icons/
│   │   ├── ExpandLess.tsx
│   │   ├── Google.tsx
│   │   └── Menu.tsx
│   ├── pages/
│   │   ├── Approvals/
│   │   │   ├── DocumentApprovals.tsx
│   │   │   ├── Inbox.tsx
│   │   │   ├── TestWorkflow.tsx
│   │   │   └── Workflows.tsx
│   │   ├── AuthDebug.tsx
│   │   ├── CustomReports.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Dev/
│   │   │   ├── AccountFormDemo.tsx
│   │   │   └── UnifiedFormDemo.tsx
│   │   ├── Documents/
│   │   │   └── Documents.tsx
│   │   ├── ExportTestPage.tsx
│   │   ├── Fiscal/
│   │   │   ├── ApprovalNotificationCenter.tsx
│   │   │   ├── BalanceReconciliationDashboard.tsx
│   │   │   ├── ConstructionDashboard.tsx
│   │   │   ├── EnhancedFiscalHub.tsx
│   │   │   ├── EnhancedFiscalPeriodManager.tsx
│   │   │   ├── EnhancedFiscalYearDashboard.safe.tsx
│   │   │   ├── EnhancedFiscalYearDashboard.tsx
│   │   │   ├── EnhancedOpeningBalanceImport.tsx
│   │   │   ├── FiscalPeriodManager.tsx
│   │   │   ├── FiscalYearDashboard.tsx
│   │   │   ├── OpeningBalanceApprovalWorkflow.tsx
│   │   │   ├── OpeningBalanceAuditTrail.tsx
│   │   │   ├── OpeningBalanceImport.tsx
│   │   │   └── ValidationRuleManager.tsx
│   │   ├── Inventory/
│   │   │   ├── Adjust.tsx
│   │   │   ├── Ageing.tsx
│   │   │   ├── DocumentDetails.tsx
│   │   │   ├── InventoryDashboard.tsx
│   │   │   ├── InventorySettings.tsx
│   │   │   ├── Issue.tsx
│   │   │   ├── KPIDashboard.tsx
│   │   │   ├── Locations.tsx
│   │   │   ├── Materials.tsx
│   │   │   ├── MovementDetail.tsx
│   │   │   ├── MovementSummary.tsx
│   │   │   ├── Movements.tsx
│   │   │   ├── OnHand.tsx
│   │   │   ├── ProjectMovementSummary.tsx
│   │   │   ├── Receive.tsx
│   │   │   ├── Reconciliation.tsx
│   │   │   ├── ReconciliationSession.tsx
│   │   │   ├── Returns.tsx
│   │   │   ├── Transfer.tsx
│   │   │   ├── Valuation.tsx
│   │   │   └── ValuationByProject.tsx
│   │   ├── MainData/
│   │   │   ├── AccountsTree.tsx
│   │   │   ├── AnalysisWorkItems.tsx
│   │   │   ├── CostAnalysisItems.tsx
│   │   │   ├── CostCenters.tsx
│   │   │   ├── DocumentCategories.tsx
│   │   │   ├── ExpensesCategories.tsx
│   │   │   ├── SubTree.tsx
│   │   │   ├── TransactionClassification.tsx
│   │   │   ├── TransactionLineItems.tsx
│   │   │   └── WorkItems.tsx
│   │   ├── PerformanceDashboard.tsx
│   │   ├── Projects/
│   │   │   └── ProjectAttachments.tsx
│   │   ├── Reports/
│   │   │   ├── AccountExplorer.tsx
│   │   │   ├── AnalysisItemUsage.tsx
│   │   │   ├── BalanceSheet.tsx
│   │   │   ├── GeneralLedger.tsx
│   │   │   ├── ProfitLoss.tsx
│   │   │   ├── TransactionClassificationReports.tsx
│   │   │   ├── TrialBalanceAllLevels.tsx
│   │   │   ├── TrialBalanceOriginal.tsx
│   │   │   └── WorkItemUsage.tsx
│   │   ├── TestRTL.tsx
│   │   ├── Transactions/
│   │   │   ├── AssignCostAnalysis.tsx
│   │   │   ├── TransactionDetails.tsx
│   │   │   ├── TransactionLineItems.tsx
│   │   │   ├── TransactionLinesTable.tsx
│   │   │   ├── TransactionTest.tsx
│   │   │   ├── TransactionView.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── TransactionsEnriched.tsx
│   │   │   └── TransactionsHeaderTable.tsx
│   │   └── admin/
│   │       ├── AccountPrefixMapping.tsx
│   │       ├── ClientErrorLogs.tsx
│   │       ├── Diagnostics.tsx
│   │       ├── EditProfile.tsx
│   │       ├── EnterprisePermissionsManagement.tsx
│   │       ├── EnterpriseRoleManagement.tsx
│   │       ├── EnterpriseUserManagement.tsx
│   │       ├── ExportDatabase.tsx
│   │       ├── Profile.tsx
│   │       └── UserManagementSystem.tsx
│   ├── schemas/
│   │   └── transactionSchema.ts
│   ├── services/
│   │   ├── ApplicationPerformanceMonitor.ts
│   │   ├── ArabicLanguageService.ts
│   │   ├── ConstructionComplianceManager.ts
│   │   ├── ConstructionCostAllocation.ts
│   │   ├── ConstructionProgressIntegration.ts
│   │   ├── FiscalDashboardService.ts
│   │   ├── FiscalPeriodService.ts
│   │   ├── FiscalYearManagementService.ts
│   │   ├── FiscalYearService.ts
│   │   ├── OpeningBalanceDryRun.ts
│   │   ├── OpeningBalanceImportService.ts
│   │   ├── PeriodClosingService.ts
│   │   ├── __tests__/
│   │   │   ├── ArabicLanguageService.date-formatting.test.ts
│   │   │   ├── construction.services.test.ts
│   │   │   ├── cost-allocation.service.test.ts
│   │   │   ├── fiscal-dashboard.error.test.ts
│   │   │   ├── fiscal-dashboard.loader.test.ts
│   │   │   ├── opening-balance.dryrun.test.ts
│   │   │   └── period-closing.service.test.ts
│   │   ├── accessRequestService.ts
│   │   ├── account-balances.ts
│   │   ├── account-prefix-map.ts
│   │   ├── analysis-work-items.ts
│   │   ├── approvals.ts
│   │   ├── column-preferences.ts
│   │   ├── company-config.ts
│   │   ├── cost-analysis.ts
│   │   ├── cost-centers.ts
│   │   ├── document-categories.ts
│   │   ├── document-folders.ts
│   │   ├── documents.ts
│   │   ├── export-database.ts
│   │   ├── font-preferences.ts
│   │   ├── gl-summary.ts
│   │   ├── inventory/
│   │   │   ├── config.ts
│   │   │   ├── documents.ts
│   │   │   ├── locations.ts
│   │   │   ├── materials.ts
│   │   │   ├── reconciliation.ts
│   │   │   ├── reports.ts
│   │   │   └── uoms.ts
│   │   ├── line-items-admin.ts
│   │   ├── line-items-catalog.ts
│   │   ├── line-items-ui.ts
│   │   ├── line-items.ts
│   │   ├── lookups.ts
│   │   ├── org-memberships.ts
│   │   ├── organization.ts
│   │   ├── pdf-generator.ts
│   │   ├── projects.ts
│   │   ├── reports.ts
│   │   ├── reports/
│   │   │   ├── analysis-item-usage.ts
│   │   │   ├── analysis-work-items-filter.ts
│   │   │   ├── balance-sheet.ts
│   │   │   ├── classification-report.ts
│   │   │   ├── common.ts
│   │   │   ├── general-ledger.ts
│   │   │   ├── gl-account-summary.ts
│   │   │   ├── profit-loss.ts
│   │   │   └── work-item-usage.ts
│   │   ├── sub-tree.ts
│   │   ├── telemetry.ts
│   │   ├── templates.ts
│   │   ├── transaction-classification.ts
│   │   ├── transaction-line-items-api.ts
│   │   ├── transaction-line-items-enhanced.ts
│   │   ├── transaction-line-items.ts
│   │   ├── transaction-lines.ts
│   │   ├── transaction-validation-api.ts
│   │   ├── transaction-validation.ts
│   │   ├── transactions-enriched.ts
│   │   ├── transactions.ts
│   │   ├── user-presets.ts
│   │   ├── work-items.ts
│   │   └── zip.ts
│   ├── shims/
│   │   ├── StyledEngineProvider.tsx
│   │   ├── emotion-cache-default.ts
│   │   ├── mui-base-classname-configurator.ts
│   │   ├── mui-base-classname-configurator.tsx
│   │   ├── mui-theme-context.ts
│   │   ├── mui-use-enhanced-effect.ts
│   │   ├── mui-use-id.ts
│   │   ├── react-children-fix.ts
│   │   └── styled-engine-index.ts
│   ├── store/
│   │   └── useAppStore.ts
│   ├── styles/
│   │   └── theme.ts
│   ├── theme/
│   │   └── tokens.ts
│   ├── themes/
│   │   └── rtlTheme.ts
│   ├── types/
│   │   ├── analysis-work-items.ts
│   │   ├── common.ts
│   │   ├── cost-centers.ts
│   │   ├── database.ts
│   │   ├── emotion-cache-browser-esm.d.ts
│   │   ├── index.ts
│   │   ├── reports.ts
│   │   ├── stylis.d.ts
│   │   ├── sub-tree.ts
│   │   └── work-items.ts
│   └── utils/
│       ├── ArabicTextEngine.ts
│       ├── UniversalExportManager.ts
│       ├── __tests__/
│       │   ├── csvExport.test.ts
│       │   └── opening-balance.normalize.test.ts
│       ├── advancedExport.ts
│       ├── audit.ts
│       ├── csv.ts
│       ├── csvExport.ts
│       ├── dateHelpers.ts
│       ├── debug-rollups.ts
│       ├── debugOrganizations.ts
│       ├── financial-pdf-helper.ts
│       ├── i18n.ts
│       ├── org.ts
│       ├── pdfExport.ts
│       ├── reportPresets.ts
│       ├── reportTemplates.ts
│       ├── sampleDatasets.ts
│       ├── supabase.ts
│       ├── test-consistency.ts
│       ├── test-dashboard-consistency.ts
│       └── testSupabaseConnection.ts
├── supabase/
│   └── functions/
│       ├── admin-create-user/
│       │   └── index.ts
│       ├── documents-zip/
│       │   └── index.ts
│       └── send-invite/
│           └── index.ts
├── tests/
│   └── e2e/
│       └── inventory-smoke.spec.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── vercel.json
└── vercel-testing.json
```

---

**End of Inventory**
