import { useMemo } from 'react'

interface TransactionLine {
  id: string
  transaction_id: string
  line_no: number
  account_id: string
  debit_amount: number
  credit_amount: number
  description: string
  project_id?: string | null
  cost_center_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  classification_id?: string | null
  sub_tree_id?: string | null
  created_at: string
  org_id?: string | null
  entry_number?: string | null
  entry_date?: string | null
  approval_status?: string | null
  is_posted?: boolean | null
}

interface GroupTotal {
  debit: number
  credit: number
  balance: number
  count: number
}

export interface GroupedData {
  groupKey: string
  groupName: string
  lines: TransactionLine[]
  subtotal: GroupTotal
}

interface UseReportGroupingProps {
  lines: TransactionLine[]
  groupingField: string
  contextData: {
    organizations: any[]
    projects: any[]
    accounts: any[]
    costCenters: any[]
    workItems: any[]
    categories: any[]
    classifications: any[]
    analysisItemsMap: Record<string, any>
  }
}

export function useReportGrouping({
  lines,
  groupingField,
  contextData,
}: UseReportGroupingProps) {
  return useMemo(() => {
    const isGrouped = groupingField !== 'none'
    const grandTotal: GroupTotal = { debit: 0, credit: 0, balance: 0, count: lines.length }

    lines.forEach(line => {
      grandTotal.debit += (line.debit_amount || 0)
      grandTotal.credit += (line.credit_amount || 0)
    })
    grandTotal.balance = grandTotal.debit - grandTotal.credit

    if (!isGrouped) {
      return { groupedData: null, grandTotal, isGrouped: false }
    }

    const groupsMap = new Map<string, GroupedData>()

    lines.forEach(line => {
      let groupKey = 'none'
      let groupName = 'غير محدد'

      switch (groupingField) {
        case 'org_id':
          groupKey = line.org_id || 'unassigned'
          groupName = contextData.organizations.find(o => o.id === groupKey)?.name || 'مؤسسة غير محددة'
          break
        case 'project_id':
          groupKey = line.project_id || 'unassigned'
          groupName = contextData.projects.find(p => p.id === groupKey)?.name || 'مشروع غير محدد'
          break
        case 'account_id':
          groupKey = line.account_id || 'unassigned'
          const account = contextData.accounts.find(a => a.id === groupKey)
          groupName = account ? `${account.code} - ${account.name_ar || account.name}` : 'حساب غير محدد'
          break
        case 'cost_center_id':
          groupKey = line.cost_center_id || 'unassigned'
          groupName = contextData.costCenters.find(cc => cc.id === groupKey)?.name || 'مركز تكلفة غير محدد'
          break
        case 'work_item_id':
          groupKey = line.work_item_id || 'unassigned'
          groupName = contextData.workItems.find(wi => wi.id === groupKey)?.name || 'عنصر عمل غير محدد'
          break
        case 'analysis_work_item_id':
          groupKey = line.analysis_work_item_id || 'unassigned'
          groupName = contextData.analysisItemsMap[groupKey]?.name || 'بند تحليل غير محدد'
          break
        case 'classification_id':
          groupKey = line.classification_id || 'unassigned'
          groupName = contextData.classifications.find(c => c.id === groupKey)?.name || 'تصنيف غير محدد'
          break
        case 'sub_tree_id':
          groupKey = line.sub_tree_id || 'unassigned'
          groupName = contextData.categories.find(c => c.id === groupKey)?.description || 'شجرة فرعية غير محددة'
          break
        case 'approval_status':
          groupKey = line.approval_status || 'draft'
          const statusMap: Record<string, string> = {
            draft: 'مسودة',
            submitted: 'مُرسلة',
            pending: 'قيد المراجعة',
            revision_requested: 'طلب تعديل',
            requires_revision: 'يحتاج تعديل',
            approved: 'معتمدة',
            rejected: 'مرفوضة',
            cancelled: 'ملغاة',
          }
          groupName = statusMap[groupKey] || groupKey
          break
        case 'is_posted':
          groupKey = line.is_posted ? 'posted' : 'not_posted'
          groupName = line.is_posted ? 'مُرحل' : 'غير مُرحل'
          break
        case 'date_monthly':
          if (line.entry_date) {
            const date = new Date(line.entry_date)
            groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            groupName = date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
          } else {
            groupKey = 'unassigned'
            groupName = 'تاريخ غير محدد'
          }
          break
        case 'date_weekly':
          if (line.entry_date) {
            const date = new Date(line.entry_date)
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
            const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
            groupKey = `${date.getFullYear()}-W${weekNumber}`
            groupName = `أسبوع ${weekNumber} - ${date.getFullYear()}`
          } else {
            groupKey = 'unassigned'
            groupName = 'تاريخ غير محدد'
          }
          break
        case 'date_daily':
          groupKey = line.entry_date || 'unassigned'
          groupName = line.entry_date ? new Date(line.entry_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'تاريخ غير محدد'
          break
        default:
          groupKey = 'unassigned'
          groupName = 'غير محدد'
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          groupName,
          lines: [],
          subtotal: { debit: 0, credit: 0, balance: 0, count: 0 },
        })
      }

      const group = groupsMap.get(groupKey)!
      group.lines.push(line)
      group.subtotal.debit += (line.debit_amount || 0)
      group.subtotal.credit += (line.credit_amount || 0)
      group.subtotal.count += 1
      group.subtotal.balance = group.subtotal.debit - group.subtotal.credit
    })

    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
      if (groupingField.startsWith('date_')) {
        return a.groupKey.localeCompare(b.groupKey)
      }
      return a.groupName.localeCompare(b.groupName)
    })

    return { groupedData: sortedGroups, grandTotal, isGrouped: true }
  }, [lines, groupingField, contextData])
}
