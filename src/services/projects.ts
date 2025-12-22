import { supabase } from '../utils/supabase'
import { getCurrentUserId, type Project, type ProjectFinancialSummary, getProjectFinancialSummary as getProjectSummaryFromTransactions } from './transactions'

// Re-export Project type for external use
export type { Project } from './transactions'

export interface ProjectListFilters {
  status?: 'active' | 'inactive' | 'completed' | 'all'
  search?: string
  budgetFrom?: number
  budgetTo?: number
  dateFrom?: string
  dateTo?: string
}

export interface ProjectListOptions {
  filters?: ProjectListFilters
  page?: number
  pageSize?: number
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

// Get all projects with filtering and pagination
export async function getProjects(options?: ProjectListOptions): Promise<PagedResult<Project>> {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .order('code', { ascending: true })

  const filters = options?.filters
  if (filters) {
    // Status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim()
      query = query.or(`code.ilike.%${s}%,name.ilike.%${s}%,description.ilike.%${s}%`)
    }

    // Budget filters
    if (filters.budgetFrom != null) {
      query = query.gte('budget_amount', filters.budgetFrom)
    }
    if (filters.budgetTo != null) {
      query = query.lte('budget_amount', filters.budgetTo)
    }

    // Date filters
    if (filters.dateFrom) {
      query = query.gte('start_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('end_date', filters.dateTo)
    }
  } else {
    // Default: only show active projects if no filters specified
    query = query.eq('status', 'active')
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data as Project[]) || [], total: count ?? 0 }
}

// Get active projects for dropdown/selection
export async function getActiveProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('code', { ascending: true })

  if (error) throw error
  return (data as Project[]) || []
}

export async function getActiveProjectsByOrg(orgId: string): Promise<Project[]> {
  // Try to use the new RPC that respects project_memberships
  // Falls back to direct query if RPC doesn't exist
  try {
    const { data, error } = await supabase
      .rpc('get_user_accessible_projects', { p_org_id: orgId });
    
    if (!error && data) {
      return (data as Project[]) || [];
    }
  } catch {
    // RPC doesn't exist yet, fall back to direct query
  }
  
  // Fallback: direct query (for backward compatibility)
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .eq('org_id', orgId)
    .order('code', { ascending: true });
  if (error) throw error;
  return (data as Project[]) || [];
}

// Get user's project memberships
export async function getUserProjectMemberships(): Promise<Array<{
  project_id: string;
  project_code: string;
  project_name: string;
  org_id: string;
  org_code: string;
  org_name: string;
  role: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  is_default: boolean;
}>> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_project_memberships');
    
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

// Check if user can access a specific project
export async function canAccessProject(projectId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('can_access_project', { p_project_id: projectId });
    
    if (error) return true; // Default to true if function doesn't exist
    return data ?? true;
  } catch {
    return true; // Default to true for backward compatibility
  }
}

// Get project by ID
export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Project
}

// Get project by code
export async function getProjectByCode(code: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Project
}

// Create a new project
export async function createProject(input: Omit<Project, 'id' | 'created_at' | 'updated_at'> & Record<string, any>): Promise<Project> {
  const uid = await getCurrentUserId()
  
  // Validate required fields
  if (!input.code || !input.name) {
    throw new Error('كود المشروع واسم المشروع مطلوبان')
  }

  // Check if project code already exists
  const existingProject = await getProjectByCode(input.code)
  if (existingProject) {
    throw new Error(`كود المشروع "${input.code}" موجود مسبقاً`)
  }

  // Build sanitized payload (avoid sending generated or aliased columns)
  const normalizeDate = (v: any) => (v && String(v).trim() !== '' ? v : null)
  const normalize = (v: any) => (v === '' ? null : v)
  const payload: Record<string, any> = {
    code: input.code,
    name: input.name,
    description: normalize(input.description ?? null),
    status: input.status ?? 'active',
    start_date: normalizeDate((input as any).start_date),
    end_date: normalizeDate((input as any).end_date),
    org_id: normalize((input as any).org_id ?? null),
    budget_amount: normalize((input as any).budget_amount ?? (input as any).budget ?? null),
    created_by: uid ?? null,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as Project
}

// Update a project
export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>> & Record<string, any>): Promise<Project> {
  // If updating code, check for duplicates
  if (updates.code) {
    const existingProject = await getProjectByCode(updates.code)
    if (existingProject && existingProject.id !== id) {
      throw new Error(`كود المشروع "${updates.code}" موجود مسبقاً`)
    }
  }

  // Sanitize updates and map aliases
  const normalizeDate = (v: any) => (v && String(v).trim() !== '' ? v : null)
  const normalize = (v: any) => (v === '' ? null : v)
  const payload: Record<string, any> = {}
  if (updates.code !== undefined) payload.code = updates.code
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = normalize(updates.description)
  if (updates.status !== undefined) payload.status = updates.status
  if ((updates as any).start_date !== undefined) payload.start_date = normalizeDate((updates as any).start_date)
  if ((updates as any).end_date !== undefined) payload.end_date = normalizeDate((updates as any).end_date)
  if ((updates as any).org_id !== undefined) {
    payload.org_id = normalize((updates as any).org_id)
  }
  if ((updates as any).budget_amount !== undefined || (updates as any).budget !== undefined) {
    payload.budget_amount = normalize((updates as any).budget_amount ?? (updates as any).budget)
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data as Project
}

// Delete a project
export async function deleteProject(id: string): Promise<void> {
  // First check if project has any transactions
  // Check references in transaction_lines (project moved to lines)
  const { data: lines, error: tlError } = await supabase
    .from('transaction_lines')
    .select('id')
    .eq('project_id', id)
    .limit(1)

  if (tlError) throw tlError
  
  if (lines && lines.length > 0) {
    throw new Error('لا يمكن حذف المشروع لأنه مرتبط بحركات في قيود اليومية')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Change project status
export async function changeProjectStatus(id: string, status: 'active' | 'inactive' | 'completed'): Promise<Project> {
  return await updateProject(id, { status })
}

// Get project financial summary
export async function getProjectFinancialSummary(
  projectId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ProjectFinancialSummary[]> {
  return await getProjectSummaryFromTransactions(projectId, dateFrom, dateTo)
}

// Get project dashboard data (combines project info with financial summary)
export interface ProjectDashboard {
  project: Project
  financialSummary: ProjectFinancialSummary
  recentTransactionsCount: number
  pendingTransactionsCount: number
  budgetStatus: {
    spent: number
    remaining: number
    percentage: number
    status: 'under_budget' | 'near_budget' | 'over_budget'
  }
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard | null> {
  // Get project details
  const project = await getProject(projectId)
  if (!project) return null

  // Get financial summary
  const summaries = await getProjectFinancialSummary(projectId)
  const financialSummary = summaries.find(s => s.project_id === projectId)
  
  if (!financialSummary) {
    // If no transactions yet, create empty summary
    const emptySummary: ProjectFinancialSummary = {
      project_id: projectId,
      project_code: project.code,
      project_name: project.name,
      project_budget: project.budget_amount ?? null,
      total_transactions_count: 0,
      total_debits: 0,
      total_credits: 0,
      net_amount: 0,
      budget_utilization_percent: 0
    }
    
    const dashboard: ProjectDashboard = {
      project,
      financialSummary: emptySummary,
      recentTransactionsCount: 0,
      pendingTransactionsCount: 0,
      budgetStatus: {
        spent: 0,
        remaining: project.budget_amount || 0,
        percentage: 0,
        status: 'under_budget'
      }
    }
    
    return dashboard
  }

  // Get recent and pending transactions counts (exclude wizard drafts)
  const [recentResult, pendingResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
      .eq('project_id', projectId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1),
    supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
      .eq('project_id', projectId)
      .eq('is_posted', false)
      .limit(1)
  ])

  const recentTransactionsCount = recentResult.count ?? 0
  const pendingTransactionsCount = pendingResult.count ?? 0

  // Calculate budget status
  const spent = Math.abs(financialSummary.net_amount)
  const budget = project.budget_amount || 0
  const remaining = Math.max(0, budget - spent)
  const percentage = budget > 0 ? (spent / budget) * 100 : 0
  
  let status: 'under_budget' | 'near_budget' | 'over_budget' = 'under_budget'
  if (percentage >= 100) {
    status = 'over_budget'
  } else if (percentage >= 80) {
    status = 'near_budget'
  }

  const dashboard: ProjectDashboard = {
    project,
    financialSummary,
    recentTransactionsCount,
    pendingTransactionsCount,
    budgetStatus: {
      spent,
      remaining,
      percentage,
      status
    }
  }

  return dashboard
}

// Bulk update projects status
export async function bulkUpdateProjectStatus(
  projectIds: string[], 
  status: 'active' | 'inactive' | 'completed'
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status })
    .in('id', projectIds)

  if (error) throw error
}

// Get project statistics
export interface ProjectStatistics {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalBudget: number
  totalSpent: number
  averageBudgetUtilization: number
  projectsOverBudget: number
}

export async function getProjectStatistics(): Promise<ProjectStatistics> {
  // Get project counts and budgets
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('status, budget_amount')

  if (projectsError) throw projectsError

  const totalProjects = projects?.length || 0
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget_amount || 0), 0) || 0

  // Get financial summaries for all projects
  const summaries = await getProjectFinancialSummary()
  const totalSpent = summaries.reduce((sum, s) => sum + Math.abs(s.net_amount), 0)
  const projectsWithBudget = summaries.filter(s => s.project_budget && s.project_budget > 0)
  const averageBudgetUtilization = projectsWithBudget.length > 0
    ? projectsWithBudget.reduce((sum, s) => sum + (s.budget_utilization_percent || 0), 0) / projectsWithBudget.length
    : 0
  const projectsOverBudget = summaries.filter(s => 
    s.project_budget && s.project_budget > 0 && Math.abs(s.net_amount) > s.project_budget
  ).length

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    totalBudget,
    totalSpent,
    averageBudgetUtilization,
    projectsOverBudget
  }
}
