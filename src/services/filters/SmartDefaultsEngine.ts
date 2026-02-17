import { FilterState } from '../../hooks/useFilterState'
import { startOfMonth, endOfMonth, startOfYear, format } from 'date-fns'

export interface PageContext {
  pageScope: string
  userId?: string
  orgId?: string
  projectId?: string
  userRole?: string
  previousFilters?: FilterState
}

export interface SmartDefaultRule {
  condition: (context: PageContext) => boolean
  defaults: Partial<FilterState> | ((context: PageContext) => Partial<FilterState>)
  priority: number
}

export interface UserPreference {
  userId: string
  pageScope: string
  preferredFilters: Partial<FilterState>
  frequency: number
  lastUsed: Date
}

export class SmartDefaultsEngine {
  private rules: SmartDefaultRule[] = []
  private userPreferences: Map<string, UserPreference[]> = new Map()

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    // Date-based defaults for transaction reports
    this.addRule({
      condition: (ctx) => ctx.pageScope.includes('transaction') || ctx.pageScope.includes('report'),
      defaults: () => ({
        dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      }),
      priority: 1
    })

    // Running balance defaults to year-to-date
    this.addRule({
      condition: (ctx) => ctx.pageScope === 'runningBalance',
      defaults: () => ({
        dateFrom: format(startOfYear(new Date()), 'yyyy-MM-dd'),
        dateTo: format(new Date(), 'yyyy-MM-dd')
      }),
      priority: 2
    })

    // Clear search on page entry
    this.addRule({
      condition: () => true,
      defaults: { search: '' },
      priority: 0
    })

    // Role-based defaults
    this.addRule({
      condition: (ctx) => ctx.userRole === 'accountant',
      defaults: { approvalStatus: 'approved' },
      priority: 3
    })

    this.addRule({
      condition: (ctx) => ctx.userRole === 'manager',
      defaults: { approvalStatus: '' }, // Show all statuses
      priority: 3
    })
  }

  addRule(rule: SmartDefaultRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  getPageDefaults(context: PageContext): FilterState {
    const defaults: FilterState = {}

    // Apply rules in priority order
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        const ruleDefaults = typeof rule.defaults === 'function' 
          ? rule.defaults(context) 
          : rule.defaults

        Object.assign(defaults, ruleDefaults)
      }
    }

    // Apply user preferences if available
    const userPrefs = this.getUserPreferences(context.userId || '', context.pageScope)
    if (userPrefs) {
      Object.assign(defaults, userPrefs.preferredFilters)
    }

    // Apply organizational defaults
    const orgDefaults = this.getOrganizationalDefaults(context.orgId || '')
    Object.assign(defaults, orgDefaults)

    return defaults
  }

  getUserPreferences(userId: string, pageScope: string): UserPreference | null {
    const userPrefs = this.userPreferences.get(userId) || []
    return userPrefs.find(pref => pref.pageScope === pageScope) || null
  }

  setUserPreferences(userId: string, pageScope: string, filters: Partial<FilterState>): void {
    const userPrefs = this.userPreferences.get(userId) || []
    const existingIndex = userPrefs.findIndex(pref => pref.pageScope === pageScope)

    const preference: UserPreference = {
      userId,
      pageScope,
      preferredFilters: filters,
      frequency: existingIndex >= 0 ? userPrefs[existingIndex].frequency + 1 : 1,
      lastUsed: new Date()
    }

    if (existingIndex >= 0) {
      userPrefs[existingIndex] = preference
    } else {
      userPrefs.push(preference)
    }

    this.userPreferences.set(userId, userPrefs)
    this.persistUserPreferences(userId)
  }

  getOrganizationalDefaults(orgId: string): Partial<FilterState> {
    // This would typically come from a database or API
    // For now, return empty defaults
    return {}
  }

  getTemporalDefaults(pageType: string): Partial<FilterState> {
    const now = new Date()
    const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd')
    const endCurrentMonth = format(endOfMonth(now), 'yyyy-MM-dd')

    switch (pageType) {
      case 'monthly_report':
        return {
          dateFrom: currentMonth,
          dateTo: endCurrentMonth
        }
      
      case 'yearly_report':
        return {
          dateFrom: format(startOfYear(now), 'yyyy-MM-dd'),
          dateTo: format(now, 'yyyy-MM-dd')
        }
      
      default:
        return {}
    }
  }

  private persistUserPreferences(userId: string): void {
    try {
      const prefs = this.userPreferences.get(userId) || []
      localStorage.setItem(`user_filter_preferences_${userId}`, JSON.stringify(prefs))
    } catch (error) {
      console.warn('Failed to persist user preferences:', error)
    }
  }

  private loadUserPreferences(userId: string): void {
    try {
      const stored = localStorage.getItem(`user_filter_preferences_${userId}`)
      if (stored) {
        const prefs = JSON.parse(stored) as UserPreference[]
        this.userPreferences.set(userId, prefs)
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error)
    }
  }

  // Initialize user preferences on first use
  initializeUser(userId: string): void {
    if (!this.userPreferences.has(userId)) {
      this.loadUserPreferences(userId)
    }
  }

  // Get smart suggestions based on context
  getSuggestions(context: PageContext): Array<{
    type: 'temporal' | 'role' | 'usage' | 'performance'
    title: string
    description: string
    filters: Partial<FilterState>
    confidence: number
  }> {
    const suggestions = []

    // Temporal suggestions
    if (!context.previousFilters?.dateFrom) {
      suggestions.push({
        type: 'temporal' as const,
        title: 'Set date range to current month',
        description: 'Most users filter by current month for better performance',
        filters: {
          dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd')
        },
        confidence: 0.8
      })
    }

    // Role-based suggestions
    if (context.userRole === 'accountant' && !context.previousFilters?.approvalStatus) {
      suggestions.push({
        type: 'role' as const,
        title: 'Filter by approved transactions',
        description: 'Accountants typically work with approved transactions',
        filters: { approvalStatus: 'approved' },
        confidence: 0.7
      })
    }

    return suggestions
  }
}

// Singleton instance
export const smartDefaultsEngine = new SmartDefaultsEngine()
export default smartDefaultsEngine