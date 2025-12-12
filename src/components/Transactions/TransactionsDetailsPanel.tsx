import React, { useMemo } from 'react'
import UnifiedTransactionDetailsPanel from './UnifiedTransactionDetailsPanel'
import type {
  TransactionRecord,
  TransactionAudit,
  Account,
  Project,
} from '../../services/transactions'
import type { Organization } from '../../types'
import type { TransactionClassification } from '../../services/transaction-classification'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import type { WorkItemRow } from '../../types/work-items'

interface TransactionsDetailsPanelProps {
  open: boolean
  transaction: TransactionRecord | null
  audit: TransactionAudit[]
  approvalHistory: any[]
  userNames: Record<string, string>
  accounts: Account[]
  projects: Project[]
  organizations: Organization[]
  classifications: TransactionClassification[]
  categories: ExpensesCategoryRow[]
  workItems: WorkItemRow[]
  costCenters: Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }>
  analysisItemsMap: Record<string, { code: string; name: string }>
  currentUserId?: string | null
  mode?: 'my' | 'pending' | 'all'
  canEdit: boolean
  canDelete: boolean
  canReview: boolean
  canPost: boolean
  canManage: boolean
  onClose: () => void
  onUpdate: (updatedTransaction: TransactionRecord) => Promise<void>
  onDelete: (transactionId: string) => Promise<void>
  onSubmitForReview: (transactionId: string, note: string) => Promise<void>
  onApprove: (transactionId: string, reason?: string) => Promise<void>
  onReject: (transactionId: string, reason: string) => Promise<void>
  onRequestRevision: (transactionId: string, reason: string) => Promise<void>
  onPost: (transactionId: string) => Promise<void>
  onEditWithWizard?: (transaction: TransactionRecord) => Promise<void>
}

const TransactionsDetailsPanel: React.FC<TransactionsDetailsPanelProps> = ({
  open,
  transaction,
  audit,
  approvalHistory,
  userNames,
  accounts,
  projects,
  organizations,
  classifications,
  categories,
  workItems,
  costCenters,
  analysisItemsMap,
  currentUserId,
  mode = 'all',
  canEdit,
  canDelete,
  canReview,
  canPost,
  canManage,
  onClose,
  onUpdate,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestRevision,
  onPost,
  onEditWithWizard,
}) => {
  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, category) => {
      acc[category.id] = `${category.code} - ${category.description}`
      return acc
    }, {})
  }, [categories])

  const categoryLabel = useMemo(() => {
    if (!transaction) return '—'
    const subTreeId = (transaction as any).sub_tree_id
    if (!subTreeId) return '—'
    return categoriesMap[subTreeId] || '—'
  }, [transaction, categoriesMap])

  if (!open || !transaction) {
    return null
  }

  return (
    <UnifiedTransactionDetailsPanel
      transaction={transaction}
      audit={audit}
      approvalHistory={approvalHistory}
      userNames={userNames}
      accounts={accounts}
      projects={projects}
      organizations={organizations}
      classifications={classifications}
      categories={categories}
      workItems={workItems}
      costCenters={costCenters}
      analysisItemsMap={analysisItemsMap}
      categoryLabel={categoryLabel}
      currentUserId={currentUserId}
      mode={mode}
      onClose={onClose}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onSubmitForReview={onSubmitForReview}
      onApprove={onApprove}
      onReject={onReject}
      onRequestRevision={onRequestRevision}
      onPost={onPost}
      onEditWithWizard={onEditWithWizard}
      canEdit={canEdit}
      canDelete={canDelete}
      canReview={canReview}
      canPost={canPost}
      canManage={canManage}
    />
  )
}

export default TransactionsDetailsPanel
