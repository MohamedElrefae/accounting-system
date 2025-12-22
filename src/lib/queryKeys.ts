export const queryKeys = {
  // Scope keys for org/project context
  scope: {
    all: () => ['scope'] as const,
    organizations: () => ['scope', 'organizations'] as const,
    projects: (orgId: string) => ['scope', 'projects', { orgId }] as const,
    current: () => ['scope', 'current'] as const,
  },

  transactions: {
    all: () => ['transactions'] as const,
    by: (filters: {
      scope?: 'my' | 'all';
      orgId?: string;
      projectId?: string;
      dateFrom?: string;
      dateTo?: string;
      approvalStatus?: string;
      [key: string]: any;
    }) => {
      // Filter out raw undefined/null values for cleaner keys
      const cleaned = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v != null && v !== '')
      );
      return ['transactions', cleaned] as const;
    },
    detail: (id: string) => ['transactions', id] as const,
  },

  accounts: {
    all: () => ['accounts'] as const,
    byOrg: (orgId: string) => ['accounts', { orgId }] as const,
    detail: (id: string) => ['accounts', id] as const,
  },

  costCenters: {
    all: () => ['cost_centers'] as const,
    byOrg: (orgId: string, projectId?: string | null) => 
      ['cost_centers', { orgId, projectId: projectId || null }] as const,
    detail: (id: string) => ['cost_centers', id] as const,
  },

  projects: {
    all: () => ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  
  organizations: {
    all: () => ['organizations'] as const,
    detail: (id: string) => ['organizations', id] as const,
  },

  classifications: {
      all: () => ['classifications'] as const,
  },
  categories: {
      byOrg: (orgId: string) => ['categories', { orgId }] as const,
  },
  workItems: {
      byOrg: (orgId: string) => ['work_items', { orgId }] as const,
  },
  analysisItems: {
      byOrg: (orgId: string) => ['analysis_work_items', { orgId }] as const,
  },

  reports: {
    all: () => ['reports'] as const,
    trialBalance: (filters?: Record<string, any>) =>
      ['reports', 'trial-balance', filters ?? {}] as const,
    incomeStatement: (filters?: Record<string, any>) =>
      ['reports', 'income-statement', filters ?? {}] as const,
    balanceSheet: (filters?: Record<string, any>) =>
      ['reports', 'balance-sheet', filters ?? {}] as const,
    generalLedger: (filters?: Record<string, any>) =>
      ['reports', 'general-ledger', filters ?? {}] as const,
    cashFlow: (filters?: Record<string, any>) =>
      ['reports', 'cash-flow', filters ?? {}] as const,
  },
};

export type QueryKeyFactory = typeof queryKeys;
