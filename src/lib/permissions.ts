/*
 * Centralized permission matrix for role-based routing and action control.
 *
 * Each role declares the routes it can access and the action-level permissions it owns.
 * Roles can inherit from other roles to enable hierarchical permission modelling.
 *
 * The exported helpers are intended for use across the app:
 * - resolveRolePermissions: get the fully expanded routes/actions for a single role
 * - flattenPermissions: merge permissions for multiple roles (e.g., current user)
 * - getRouteAccess / getActionAccess: boolean guards for routes and granular actions
 * - buildPermissionCacheSnapshot: structure that can be persisted (session/local storage)
 *
 * Route pattern matching accepts:
 * - Exact paths ("/dashboard")
 * - Dynamic segments using the ":param" convention ("/transactions/:id")
 * - Wildcards using trailing "*" ("/reports/*")
 */

export type RoleSlug =
  | 'super_admin'
  | 'admin'
  | 'hr'
  | 'team_leader'
  | 'accountant'
  | 'manager'
  | 'auditor'
  | 'viewer';

export type PermissionCode =
  // Account Management
  | 'accounts.manage'
  | 'accounts.view'
  
  // Transactions - Granular Access
  | 'transactions.create'
  | 'transactions.review'
  | 'transactions.manage'
  | 'transactions.cost_analysis'
  | 'transactions.view.own'      // NEW: View own transactions
  | 'transactions.view.all'      // NEW: View all transactions
  
  // Reports
  | 'reports.view'
  | 'reports.manage'
  
  // Documents & Templates
  | 'documents.view'
  | 'documents.manage'
  | 'templates.view'
  | 'templates.manage'
  | 'templates.generate'
  
  // Sub Tree & Analysis
  | 'sub_tree.view'
  | 'sub_tree.manage'
  | 'analysis.view'
  | 'analysis.manage'
  
  // Organizations & Projects - NEW
  | 'organizations.view'
  | 'organizations.manage'
  | 'projects.view'
  | 'projects.manage'
  
  // Cost Centers & Work Items - NEW
  | 'cost_centers.view'
  | 'cost_centers.manage'
  | 'work_items.view'
  | 'work_items.manage'
  
  // Classifications - NEW
  | 'classification.view'
  | 'classification.manage'
  
  // Inventory
  | 'inventory.view'
  | 'inventory.manage'
  | 'inventory.transfer'         // NEW
  | 'inventory.adjust'           // NEW
  
  // Transaction Line Items
  | 'transaction_line_items.read'
  
  // Users & Settings
  | 'users.view'
  | 'users.manage'
  | 'settings.manage'
  | 'settings.audit'
  | 'settings.preferences'       // NEW: All users can access preferences
  | 'data.export'
  
  // Approvals - NEW view permission
  | 'approvals.view'
  | 'approvals.manage'
  | 'approvals.review'
  
  // Fiscal - NEW view permission
  | 'fiscal.view'
  | 'fiscal.manage'
  
  // Presence
  | 'presence.view.org'
  | 'presence.view.team'
  | 'presence.view.all';

interface RoleDefinition {
  inherits?: RoleSlug[];
  routes: string[];
  actions: PermissionCode[];
}

export interface ResolvedRole {
  routes: Set<string>;
  actions: Set<PermissionCode>;
}

export interface PermissionSnapshot {
  version: string;
  roles: RoleSlug[];
  routes: string[];
  actions: PermissionCode[];
}

export const PERMISSION_SCHEMA_VERSION = '2026-01-28T00:00:00Z'; // Bumped for granular entity permissions

const MATRIX: Record<RoleSlug, RoleDefinition> = {
  super_admin: {
    inherits: ['admin'],
    routes: ['*'],
    actions: [
      'accounts.manage',
      'accounts.view',
      'transactions.create',
      'transactions.review',
      'transactions.manage',
      'transactions.cost_analysis',
      'transactions.view.own',
      'transactions.view.all',
      'reports.view',
      'reports.manage',
      'documents.view',
      'documents.manage',
      'sub_tree.view',
      'sub_tree.manage',
      'templates.view',
      'templates.manage',
      'templates.generate',
      'transaction_line_items.read',
      'organizations.view',
      'organizations.manage',
      'projects.view',
      'projects.manage',
      'cost_centers.view',
      'cost_centers.manage',
      'work_items.view',
      'work_items.manage',
      'classification.view',
      'classification.manage',
      'inventory.view',
      'inventory.manage',
      'inventory.transfer',
      'inventory.adjust',
      'users.view',
      'users.manage',
      'data.export',
      'settings.manage',
      'settings.audit',
      'settings.preferences',
      'approvals.view',
      'approvals.manage',
      'approvals.review',
      'fiscal.view',
      'fiscal.manage',
      'analysis.manage',
      'analysis.view',
      'presence.view.all',
      'presence.view.org',
      'presence.view.team',
    ],
  },
  admin: {
    inherits: ['manager'],
    routes: [
      '/',
      '/dashboard',
      '/settings/*',
      '/approvals/*',
      '/documents/*',
      '/transactions/*',
      '/reports/*',
      '/main-data/*',
      '/inventory/*',
      '/fiscal/*',
      '/projects/*',
      '/documents',
      '/performance',
      '/export-test',
    ],
    actions: [
      'accounts.manage',
      'accounts.view',
      'transactions.create',
      'transactions.review',
      'transactions.manage',
      'transactions.cost_analysis',
      'reports.view',
      'reports.manage',
      'documents.view',
      'documents.manage',
      'inventory.view',
      'inventory.manage',
      'users.view',
      'users.manage',
      'data.export',
      'settings.manage',
      'settings.audit',
      'fiscal.manage',
      'approvals.manage',
      'approvals.review',
      'approvals.view',
      'analysis.manage',
      'analysis.view',
      'sub_tree.view',
      'sub_tree.manage',
      'transactions.view.own',
      'transactions.view.all',
      'organizations.view',
      'organizations.manage',
      'projects.view',
      'projects.manage',
      'cost_centers.view',
      'cost_centers.manage',
      'work_items.view',
      'work_items.manage',
      'classification.view',
      'classification.manage',
      'inventory.transfer',
      'inventory.adjust',
      'fiscal.view',
      'settings.preferences',
      'presence.view.org',
      'presence.view.team',
    ],
  },
  hr: {
    inherits: ['viewer'],
    routes: [
      '/',
      '/dashboard',
      '/settings/*',
    ],
    actions: [
      'presence.view.org',
      'presence.view.team',
    ],
  },
  team_leader: {
    inherits: ['viewer'],
    routes: [
      '/',
      '/dashboard',
      '/settings/*',
    ],
    actions: [
      'presence.view.team',
    ],
  },
  manager: {
    inherits: ['accountant', 'auditor'],
    routes: [
      '/',
      '/dashboard',
      '/transactions/*',
      '/approvals/*',
      '/documents/*',
      '/documents',
      '/projects/*',
      '/reports/*',
      '/main-data/*',
      '/inventory/*',
      '/fiscal/*',
    ],
    actions: [
      'accounts.view',
      'transactions.create',
      'transactions.review',
      'transactions.manage',
      'transactions.cost_analysis',
      'transactions.view.own',
      'transactions.view.all',
      'reports.view',
      'documents.view',
      'documents.manage',
      'sub_tree.view',
      'sub_tree.manage',
      'templates.view',
      'templates.manage',
      'templates.generate',
      'transaction_line_items.read',
      'organizations.view',
      'projects.view',
      'cost_centers.view',
      'work_items.view',
      'classification.view',
      'inventory.view',
      'analysis.view',
      'analysis.manage',
      'approvals.view',
      'approvals.review',
      'fiscal.view',
      'settings.preferences',
    ],
  },
  accountant: {
    inherits: [],
    routes: [
      '/',
      '/dashboard',
      '/transactions/*',
      '/main-data/accounts-tree',
      '/settings/font-preferences',
    ],
    actions: [
      'accounts.view',
      'transactions.create',
      'transactions.cost_analysis',
      'transactions.view.own',
      'transactions.view.all', // Allow viewing all transactions read-only
      'transaction_line_items.read',
      'transactions.review',
      'sub_tree.view', // Needed for Sub Tree
      'settings.preferences',
    ],
  },
  auditor: {
    inherits: ['viewer'],
    routes: [
      '/',
      '/dashboard',
      '/transactions/all',
      '/transactions/all-enriched',
      '/reports/*',
      '/documents/*',
      '/documents',
      '/projects/*',
      '/main-data/*',
      '/settings/audit',
    ],
    actions: [
      'accounts.view',
      'reports.view',
      'documents.view',
      'transactions.review',
      'sub_tree.view',
      'templates.view',
      'transaction_line_items.read',
      'analysis.view',
      'settings.audit',
    ],
  },
  viewer: {
    routes: [
      '/',
      '/dashboard',
      '/transactions/my',
      '/transactions/my-enriched',
      '/transactions/my-lines',
      '/reports/trial-balance',
      '/reports/general-ledger',
      '/documents',
      '/main-data/accounts-tree',
      '/settings/font-preferences',
    ],
    actions: [
      'accounts.view',
      'reports.view',
      'documents.view',
      'sub_tree.view',
      'templates.view',
      'analysis.view',
      'sub_tree.view',
      'sub_tree.manage',
      'transactions.view.own',
      'settings.preferences',
    ],
  },
};

const dynamicSegmentRegex = /:[^/]+/g;

function toRouteRegex(pattern: string): RegExp {
  if (pattern === '*') return /^.*$/;
  const normalized = pattern
    .replace(/\*/g, '.*')
    .replace(dynamicSegmentRegex, '[^/]+');
  return new RegExp(`^${normalized}$`);
}

function resolveRole(role: RoleSlug, visited: Set<RoleSlug> = new Set()): ResolvedRole {
  if (visited.has(role)) {
    return { routes: new Set(), actions: new Set() };
  }
  visited.add(role);

  const definition = MATRIX[role];
  if (!definition) {
    return { routes: new Set(), actions: new Set() };
  }

  const routes = new Set<string>(definition.routes);
  const actions = new Set<PermissionCode>(definition.actions);

  const parents = definition.inherits ?? [];
  parents.forEach((parent) => {
    const resolvedParent = resolveRole(parent, visited);
    resolvedParent.routes.forEach((route) => routes.add(route));
    resolvedParent.actions.forEach((action) => actions.add(action));
  });

  return { routes, actions };
}

export function resolveRolePermissions(role: RoleSlug): ResolvedRole {
  return resolveRole(role);
}

export function flattenPermissions(roles: RoleSlug[]): ResolvedRole {
  const aggregate: ResolvedRole = {
    routes: new Set(),
    actions: new Set(),
  };

  roles.forEach((role) => {
    const resolved = resolveRole(role);
    resolved.routes.forEach((route) => aggregate.routes.add(route));
    resolved.actions.forEach((action) => aggregate.actions.add(action));
  });

  return aggregate;
}

export function getRouteAccess(roles: RoleSlug[], pathname: string): boolean {
  if (!roles.length) return false;
  const { routes } = flattenPermissions(roles);
  for (const pattern of routes) {
    const regex = toRouteRegex(pattern);
    if (regex.test(pathname)) {
      return true;
    }
  }
  return false;
}

export function getActionAccess(roles: RoleSlug[], action: PermissionCode): boolean {
  if (!roles.length) return false;
  const { actions } = flattenPermissions(roles);
  return actions.has(action);
}

export function buildPermissionCacheSnapshot(roles: RoleSlug[]): PermissionSnapshot {
  const resolved = flattenPermissions(roles);
  return {
    version: PERMISSION_SCHEMA_VERSION,
    roles,
    routes: Array.from(resolved.routes),
    actions: Array.from(resolved.actions),
  };
}

export function hydrateSnapshot(snapshot: PermissionSnapshot | null | undefined): ResolvedRole | null {
  if (!snapshot) return null;
  if (snapshot.version !== PERMISSION_SCHEMA_VERSION) return null;
  return {
    routes: new Set(snapshot.routes),
    actions: new Set(snapshot.actions),
  };
}

export function hasRouteInSnapshot(snapshot: ResolvedRole, pathname: string): boolean {
  for (const pattern of snapshot.routes) {
    if (toRouteRegex(pattern).test(pathname)) {
      return true;
    }
  }
  return false;
}

export function hasActionInSnapshot(snapshot: ResolvedRole, action: PermissionCode): boolean {
  return snapshot.actions.has(action);
}

/**
 * Convention-based permission derivation.
 * Converts navigation item ID to permission code.
 * 
 * @param itemId - The navigation item ID (e.g., "organizations", "sub-tree")
 * @param action - The action (default: "view")
 * @returns Derived permission code (e.g., "organizations.view")
 */
export function derivePermissionFromId(
  itemId: string, 
  action: 'view' | 'manage' | 'create' = 'view'
): string {
  // Normalize: kebab-case → snake_case
  const normalized = itemId
    .replace(/-/g, '_')           // sub-tree → sub_tree
    .replace(/\s+/g, '_')        // spaces → underscores
    .toLowerCase();
  
  // Apply aliases for backward compatibility with existing permission codes
  const ALIASES: Record<string, string> = {
    'accounts_tree': 'accounts',
    'transaction_classification': 'classification',
    'document_templates': 'templates',
    'analysis_work_items': 'analysis',
    'fiscal_dashboard': 'fiscal',
    'fiscal_periods': 'fiscal',
    'opening_balance_import': 'fiscal',
    'user_management': 'users',
    'online_users': 'presence.view.team',  // Special: Returns full permission
    'org_management': 'settings',
    'account_prefix_mapping': 'settings',
    'font_preferences': 'settings.preferences', // Special: Returns full permission
    'export_database': 'data.export', // Special: Returns full permission
    'enterprise_audit': 'settings.audit', // Special: Returns full permission
    'audit_management': 'settings.audit', // Special: Returns full permission

    // Reports aliases
    'trial_balance': 'reports.view',
    'trial_balance_all_levels': 'reports.view',
    'general_ledger': 'reports.view',
    'running_balance': 'reports.view',
    'account_explorer': 'reports.view',
    'profit_loss': 'reports.view',
    'balance_sheet': 'reports.view',
    'transaction_lines_report': 'reports.view',
    'custom_reports': 'reports.view',
    'main_data_reports': 'reports.view',
    'transaction_classification_reports': 'reports.view',
  };
  
  // Check if alias returns a full permission (contains a dot)
  const aliasValue = ALIASES[normalized];
  if (aliasValue && aliasValue.includes('.') && aliasValue.split('.').length >= 2) {
    return aliasValue; // Return as-is, it's already a complete permission code
  }
  
  const entity = aliasValue || normalized;
  return `${entity}.${action}`;
}
