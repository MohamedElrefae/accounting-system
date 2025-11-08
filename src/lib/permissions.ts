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
  | 'accountant'
  | 'manager'
  | 'auditor'
  | 'viewer';

export type PermissionCode =
  | 'accounts.manage'
  | 'accounts.view'
  | 'transactions.create'
  | 'transactions.review'
  | 'transactions.manage'
  | 'transactions.cost_analysis'
  | 'reports.view'
  | 'reports.manage'
  | 'sub_tree.view'
  | 'templates.view'
  | 'templates.manage'
  | 'templates.generate'
  | 'documents.view'
  | 'documents.manage'
  | 'inventory.view'
  | 'inventory.manage'
  | 'transaction_line_items.read'
  | 'users.view'
  | 'users.manage'
  | 'data.export'
  | 'settings.manage'
  | 'fiscal.manage'
  | 'approvals.manage'
  | 'approvals.review'
  | 'analysis.manage'
  | 'analysis.view';

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

export const PERMISSION_SCHEMA_VERSION = '2025-11-07T00:00:00Z';

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
      'reports.view',
      'reports.manage',
      'documents.view',
      'documents.manage',
      'sub_tree.view',
      'templates.view',
      'templates.manage',
      'templates.generate',
      'transaction_line_items.read',
      'inventory.view',
      'inventory.manage',
      'users.view',
      'users.manage',
      'data.export',
      'settings.manage',
      'fiscal.manage',
      'approvals.manage',
      'approvals.review',
      'analysis.manage',
      'analysis.view',
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
      'fiscal.manage',
      'approvals.manage',
      'approvals.review',
      'analysis.manage',
      'analysis.view',
    ],
  },
  manager: {
    inherits: ['accountant'],
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
      'reports.view',
      'documents.view',
      'documents.manage',
      'sub_tree.view',
      'templates.view',
      'templates.manage',
      'templates.generate',
      'transaction_line_items.read',
      'inventory.view',
      'analysis.view',
      'analysis.manage',
      'approvals.review',
    ],
  },
  accountant: {
    inherits: ['auditor'],
    routes: [
      '/',
      '/dashboard',
      '/transactions/*',
      '/documents/*',
      '/documents',
      '/projects/*',
      '/fiscal/*',
      '/main-data/accounts-tree',
      '/main-data/sub-tree',
      '/main-data/work-items',
      '/main-data/transaction-line-items',
      '/reports/trial-balance',
      '/reports/general-ledger',
      '/reports/profit-loss',
      '/reports/balance-sheet',
    ],
    actions: [
      'accounts.view',
      'transactions.create',
      'transactions.cost_analysis',
      'reports.view',
      'documents.view',
      'sub_tree.view',
      'templates.view',
      'transaction_line_items.read',
      'analysis.view',
      'fiscal.manage',
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
    ],
  },
  viewer: {
    routes: [
      '/',
      '/dashboard',
      '/transactions/my',
      '/transactions/my-enriched',
      '/reports/trial-balance',
      '/reports/general-ledger',
      '/documents',
      '/main-data/accounts-tree',
    ],
    actions: [
      'accounts.view',
      'reports.view',
      'documents.view',
      'sub_tree.view',
      'templates.view',
      'analysis.view',
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
