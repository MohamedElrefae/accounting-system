import React from 'react'
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid
} from '@mui/material'

export interface RunningBalanceFilterState {
  debitAccountId: string
  search: string
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
  projectId: string
  classificationId: string
  costCenterId: string
  workItemId: string
}

interface RunningBalanceFiltersProps {
  title?: string
  totalRecords?: number
  filteredRecords?: number
  filters: RunningBalanceFilterState
  onFilterChange: (key: keyof RunningBalanceFilterState, value: string) => void
  onResetFilters: () => void
  onApplyFilters: () => void
  loading?: boolean
  disabled?: boolean
  preferencesKey?: string
}

// Mock data for dropdowns - in real implementation these would come from API
const mockAccounts = [
  { id: '1', code: '1001', name: 'Cash Account', name_ar: 'حساب الصندوق' },
  { id: '2', code: '1002', name: 'Bank Account', name_ar: 'حساب البنك' },
  { id: '3', code: '1003', name: 'Accounts Receivable', name_ar: 'ذمم مدينة' },
  { id: '4', code: '1004', name: 'Inventory', name_ar: 'المخزون' },
  { id: '5', code: '2001', name: 'Accounts Payable', name_ar: 'ذمم دائنة' }
]

const mockProjects = [
  { id: '1', code: 'PRJ001', name: 'Project A', name_ar: 'مشروع أ' },
  { id: '2', code: 'PRJ002', name: 'Project B', name_ar: 'مشروع ب' },
  { id: '3', code: 'PRJ003', name: 'Project C', name_ar: 'مشروع ج' }
]

const mockClassifications = [
  { id: '1', code: 'ASSETS', name: 'Assets', name_ar: 'الأصول' },
  { id: '2', code: 'LIABILITIES', name: 'Liabilities', name_ar: 'الخصوم' },
  { id: '3', code: 'EQUITY', name: 'Equity', name_ar: 'حقوق الملكية' },
  { id: '4', code: 'REVENUE', name: 'Revenue', name_ar: 'الإيرادات' },
  { id: '5', code: 'EXPENSES', name: 'Expenses', name_ar: 'المصروفات' }
]

const mockCostCenters = [
  { id: '1', code: 'CC001', name: 'Cost Center A', name_ar: 'مركز التكلفة أ' },
  { id: '2', code: 'CC002', name: 'Cost Center B', name_ar: 'مركز التكلفة ب' }
]

const mockWorkItems = [
  { id: '1', code: 'WI001', name: 'Work Item A', name_ar: 'بند العمل أ' },
  { id: '2', code: 'WI002', name: 'Work Item B', name_ar: 'بند العمل ب' }
]

const RunningBalanceFilters: React.FC<RunningBalanceFiltersProps> = ({
  title = 'Running Balance Filters',
  totalRecords = 0,
  filteredRecords = 0,
  filters,
  onFilterChange,
  onResetFilters,
  onApplyFilters,
  loading = false,
  disabled = false,
  preferencesKey = 'running_balance_filters'
}) => {
  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => value !== '').length
  const hasActiveFilters = activeFilterCount > 0

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">
          {title}
        </Typography>
        {hasActiveFilters && (
          <Typography variant="body2" color="primary">
            ({activeFilterCount} active)
          </Typography>
        )}
        {totalRecords > 0 && (
          <Typography variant="body2" color="textSecondary">
            ({filteredRecords} / {totalRecords} records)
          </Typography>
        )}
      </Box>
      
      <Grid container spacing={2} alignItems="center">
        {/* Account Filter (Required) */}
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Account *"
            value={filters.debitAccountId}
            onChange={(e) => onFilterChange('debitAccountId', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          >
            <MenuItem value="">Select Account</MenuItem>
            {mockAccounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.code} - {account.name_ar || account.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Search Filter */}
        <Grid item xs={12} md={2}>
          <TextField
            label="Search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
            placeholder="Description..."
          />
        </Grid>

        {/* Date Range Filters */}
        <Grid item xs={12} md={2}>
          <TextField
            label="From Date"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            label="To Date"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Amount Range Filters */}
        <Grid item xs={12} md={2}>
          <TextField
            label="Amount From"
            type="number"
            value={filters.amountFrom}
            onChange={(e) => onFilterChange('amountFrom', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            label="Amount To"
            type="number"
            value={filters.amountTo}
            onChange={(e) => onFilterChange('amountTo', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          />
        </Grid>

        {/* Project Filter */}
        <Grid item xs={12} md={2}>
          <TextField
            select
            label="Project"
            value={filters.projectId}
            onChange={(e) => onFilterChange('projectId', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          >
            <MenuItem value="">All Projects</MenuItem>
            {mockProjects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.code} - {project.name_ar || project.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Classification Filter */}
        <Grid item xs={12} md={2}>
          <TextField
            select
            label="Classification"
            value={filters.classificationId}
            onChange={(e) => onFilterChange('classificationId', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          >
            <MenuItem value="">All Classifications</MenuItem>
            {mockClassifications.map((classification) => (
              <MenuItem key={classification.id} value={classification.id}>
                {classification.code} - {classification.name_ar || classification.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Cost Center Filter */}
        <Grid item xs={12} md={2}>
          <TextField
            select
            label="Cost Center"
            value={filters.costCenterId}
            onChange={(e) => onFilterChange('costCenterId', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          >
            <MenuItem value="">All Cost Centers</MenuItem>
            {mockCostCenters.map((costCenter) => (
              <MenuItem key={costCenter.id} value={costCenter.id}>
                {costCenter.code} - {costCenter.name_ar || costCenter.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Work Item Filter */}
        <Grid item xs={12} md={2}>
          <TextField
            select
            label="Work Item"
            value={filters.workItemId}
            onChange={(e) => onFilterChange('workItemId', e.target.value)}
            fullWidth
            size="small"
            disabled={disabled}
          >
            <MenuItem value="">All Work Items</MenuItem>
            {mockWorkItems.map((workItem) => (
              <MenuItem key={workItem.id} value={workItem.id}>
                {workItem.code} - {workItem.name_ar || workItem.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={onApplyFilters}
          disabled={!filters.debitAccountId || loading || disabled}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Loading...' : 'Apply Filters'}
        </Button>
        <Button
          variant="outlined"
          onClick={onResetFilters}
          disabled={loading || disabled}
        >
          Reset
        </Button>
      </Box>
    </Box>
  )
}

export default RunningBalanceFilters
