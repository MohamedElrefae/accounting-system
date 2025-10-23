// Generated from database schema - DO NOT EDIT MANUALLY
// Run SQL schema query to regenerate these types

export type DatabaseId = string; // uuid type
export type Timestamp = string; // timestamp with time zone

// Base type for all database entities
export interface BaseEntity {
  id: DatabaseId;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

// Enums from USER-DEFINED types
export type AccountCategory = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
export type AccountStatus = 'active' | 'inactive';
export type NormalBalance = 'debit' | 'credit';

// Access Requests
export interface AccessRequest extends BaseEntity {
  email: string;
  full_name_ar?: string | null;
  phone?: string | null;
  department?: string | null;
  job_title?: string | null;
  message?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at?: Timestamp;
  reviewed_at?: Timestamp | null;
  reviewed_by?: DatabaseId | null;
  assigned_role?: string | null;
}

// Account Balance Snapshots
export interface AccountBalanceSnapshot extends BaseEntity {
  org_id: DatabaseId;
  account_id: DatabaseId;
  as_of: Timestamp;
  debits_minor: number; // bigint
  credits_minor: number; // bigint
  balance_signed_minor: number; // bigint
  balance_natural_minor: number; // bigint;
}

// Account Prefix Map
export interface AccountPrefixMap extends BaseEntity {
  prefix: string;
  account_group: string;
  description?: string | null;
  is_active: boolean;
}

// Accounts
export interface Account extends BaseEntity {
  org_id: DatabaseId;
  code: string;
  name: string;
  category: AccountCategory;
  normal_balance?: NormalBalance | null;
  parent_id?: DatabaseId | null;
  level: number;
  path: DatabaseId[]; // array type
  status: AccountStatus;
  description?: string | null;
  name_ar?: string | null;
  description_ar?: string | null;
  is_standard: boolean;
  allow_transactions: boolean;
  is_postable?: boolean | null;
}

// Analysis Work Items
export interface AnalysisWorkItem extends BaseEntity {
  org_id: DatabaseId;
  project_id?: DatabaseId | null;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  is_active: boolean;
}

// Budget Entries
export interface BudgetEntry extends BaseEntity {
  org_id: DatabaseId;
  budget_period_id?: DatabaseId | null;
  account_id: DatabaseId;
  period_start: Timestamp;
  period_end: Timestamp;
  budgeted_amount_minor: number; // bigint
  actual_amount_minor: number; // bigint
  variance_amount_minor: number; // bigint
  notes?: string | null;
}

// Budget Periods
export interface BudgetPeriod extends BaseEntity {
  org_id: DatabaseId;
  name: string;
  fiscal_year: number;
  start_date: string; // date
  end_date: string; // date
  status: 'draft' | 'active' | 'closed';
  description?: string | null;
}

// Company Configs
export interface CompanyConfig extends BaseEntity {
  company_name: string;
  fiscal_year_start_month: number;
  currency_code: string;
  currency_symbol?: string | null;
  date_format?: string | null;
  number_format?: string | null;
  transaction_number_prefix: string;
  transaction_number_use_year_month: boolean;
  transaction_number_length: number;
  transaction_number_separator: string;
  default_org_id?: DatabaseId | null;
  default_project_id?: DatabaseId | null;
  enable_multi_currency: boolean;
  enable_cost_centers: boolean;
  enable_projects: boolean;
}

// Cost Analysis Settings
export interface CostAnalysisSetting extends BaseEntity {
  org_id: DatabaseId;
  name: string;
  description?: string | null;
  analysis_type: 'project' | 'department' | 'custom';
  allocation_method: 'direct' | 'percentage' | 'driver';
  is_active: boolean;
  config_json?: unknown; // json type
}

// Cost Centers
export interface CostCenter extends BaseEntity {
  org_id: DatabaseId;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  parent_id?: DatabaseId | null;
  level: number;
  is_active: boolean;
  manager_id?: DatabaseId | null;
  budget_amount_minor?: number | null; // bigint
}

// Currencies
export interface Currency extends BaseEntity {
  code: string;
  name: string;
  symbol?: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  is_active: boolean;
}

// Expenses Categories
export interface ExpensesCategory extends BaseEntity {
  org_id: DatabaseId;
  code: string;
  description: string;
  parent_id?: DatabaseId | null;
  level: number;
  add_to_cost: boolean;
  is_active: boolean;
  linked_account_id?: DatabaseId | null;
}

// Font Preferences
export interface FontPreference extends BaseEntity {
  user_id?: DatabaseId | null;
  is_global: boolean;
  font_family: string;
  font_size: number;
  line_height: number;
  is_active: boolean;
}

// Journals
export interface Journal extends BaseEntity {
  org_id: DatabaseId;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  auto_number: boolean;
  number_prefix?: string | null;
  next_number: number;
}

// Org Memberships
export interface OrgMembership {
  org_id: DatabaseId;
  user_id: DatabaseId;
  created_at?: Timestamp;
}

// Organizations
export interface Organization extends BaseEntity {
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tax_number?: string | null;
  registration_number?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  parent_org_id?: DatabaseId | null;
  settings?: unknown; // json
}

// Pending User Profiles
export interface PendingUserProfile extends BaseEntity {
  email: string;
  full_name_ar?: string | null;
  phone?: string | null;
  department?: string | null;
  job_title?: string | null;
  assigned_role?: string | null;
  invited_by?: DatabaseId | null;
  used: boolean;
}

// Permissions
export interface Permission extends BaseEntity {
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  is_system: boolean;
}

// Projects
export interface Project extends BaseEntity {
  org_id: DatabaseId;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  start_date?: string | null; // date
  end_date?: string | null; // date
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  manager_id?: DatabaseId | null;
  budget_amount_minor?: number | null; // bigint
  actual_amount_minor?: number | null; // bigint
  is_active: boolean;
}

// Roles
export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
  is_system: boolean;
}

// Role Permissions
export interface RolePermission {
  role_id: DatabaseId;
  permission_id: DatabaseId;
  granted_at?: Timestamp;
}

// System Logs
export interface SystemLog extends BaseEntity {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: unknown; // json
  user_id?: DatabaseId | null;
  org_id?: DatabaseId | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: Timestamp;
}

// Transaction Entries
export interface TransactionEntry {
  id: DatabaseId;
  transaction_id: DatabaseId;
  account_id: DatabaseId;
  analysis_work_item_id?: DatabaseId | null;
  cost_center_id?: DatabaseId | null;
  description?: string | null;
  debit_amount_minor?: number | null; // bigint
  credit_amount_minor?: number | null; // bigint
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

// Transactions
export interface Transaction extends BaseEntity {
  org_id: DatabaseId;
  journal_id?: DatabaseId | null;
  project_id?: DatabaseId | null;
  transaction_number: string;
  transaction_date: string; // date
  description: string;
  reference_number?: string | null;
  total_amount_minor: number; // bigint
  status: 'draft' | 'posted' | 'reversed';
  posted_by?: DatabaseId | null;
  posted_at?: Timestamp | null;
  reversed_by?: DatabaseId | null;
  reversed_at?: Timestamp | null;
  reversal_reason?: string | null;
  attachments?: string[] | null; // array
}

// User Profiles
export interface UserProfile extends BaseEntity {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name_ar?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  department?: string | null;
  job_title?: string | null;
  is_active: boolean;
  last_login?: Timestamp | null;
  preferences?: unknown; // json
}

// User Roles
export interface UserRole {
  user_id: DatabaseId;
  role_name: string;
  assigned_at?: Timestamp;
  assigned_by?: DatabaseId | null;
}

// Work Items
export interface WorkItem extends BaseEntity {
  org_id: DatabaseId;
  project_id?: DatabaseId | null;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  parent_id?: DatabaseId | null;
  level: number;
  is_active: boolean;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  hourly_rate_minor?: number | null; // bigint
}

// Union types for common patterns
export type EntityWithOrg = Account | Transaction | TransactionEntry | Project | Organization | WorkItem | AnalysisWorkItem | CostCenter | ExpensesCategory;
export type EntityWithUser = UserProfile | UserRole | OrgMembership;
export type EntityWithStatus = Account | Organization | Project | Transaction | BudgetPeriod;