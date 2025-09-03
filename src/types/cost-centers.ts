// Cost Centers Types
export type {
  CostCenter,
  CostCenterTreeNode,
  CostCenterRow,
  CostCenterCreate,
  CostCenterUpdate
} from '../services/cost-centers'

export type CostCenterSelectorOption = {
  id: string
  code: string
  name: string
  name_ar?: string | null
  project_id?: string | null
  level: number
  label: string // Computed: "code - name"
  disabled?: boolean
}
