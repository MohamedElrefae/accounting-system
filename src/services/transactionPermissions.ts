/**
 * Transaction Permission Service
 * Handles all permission checks for transaction operations
 * Supports: edit, request_edit, resubmit, approve, reject, post
 */

import type { TransactionRecord } from './transactions'

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  action?: string
}

/**
 * Check if user can edit transaction directly (draft only)
 */
export const canEditTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): PermissionCheckResult => {
  // Rule 1: Posted transactions are immutable
  if (transaction.is_posted) {
    return {
      allowed: false,
      reason: 'المعاملات المرسلة لا يمكن تعديلها',
      action: 'edit'
    }
  }

  // Rule 2: Only draft can be edited directly
  if (transaction.approval_status !== 'draft') {
    return {
      allowed: false,
      reason: 'يمكن تعديل المعاملات في حالة المسودة فقط',
      action: 'edit'
    }
  }

  // Rule 3: Must be owner or have manage permission
  const isOwner = transaction.created_by === currentUserId
  const canManage = permissions.includes('transactions.manage')

  if (!isOwner && !canManage) {
    return {
      allowed: false,
      reason: 'ليس لديك صلاحية لتعديل هذه المعاملة',
      action: 'edit'
    }
  }

  return { allowed: true, action: 'edit' }
}

/**
 * Check if user can request edit for submitted/approved transactions
 */
export const canRequestEdit = (
  transaction: TransactionRecord,
  currentUserId: string
): PermissionCheckResult => {
  // Can request edit if:
  // - Not posted
  // - Not in draft
  // - Is owner
  if (transaction.is_posted) {
    return {
      allowed: false,
      reason: 'لا يمكن طلب تعديل المعاملات المرسلة',
      action: 'request_edit'
    }
  }

  if (transaction.approval_status === 'draft') {
    return {
      allowed: false,
      reason: 'يمكنك تعديل المسودات مباشرة بدلاً من طلب تعديل',
      action: 'request_edit'
    }
  }

  if (transaction.created_by !== currentUserId) {
    return {
      allowed: false,
      reason: 'يمكن فقط لمنشئ المعاملة طلب تعديلها',
      action: 'request_edit'
    }
  }

  return { allowed: true, action: 'request_edit' }
}

/**
 * Check if user can resubmit transaction after revision
 */
export const canResubmit = (
  transaction: TransactionRecord,
  currentUserId: string
): PermissionCheckResult => {
  // Can resubmit if:
  // - Not posted
  // - In revision_requested or rejected state
  // - Is owner
  if (transaction.is_posted) {
    return {
      allowed: false,
      reason: 'لا يمكن إعادة إرسال المعاملات المرسلة',
      action: 'resubmit'
    }
  }

  const validStatuses = ['revision_requested', 'rejected']
  if (!validStatuses.includes(transaction.approval_status)) {
    return {
      allowed: false,
      reason: 'يمكن إعادة الإرسال فقط للمعاملات المرفوضة أو التي تحتاج تعديل',
      action: 'resubmit'
    }
  }

  if (transaction.created_by !== currentUserId) {
    return {
      allowed: false,
      reason: 'يمكن فقط لمنشئ المعاملة إعادة إرسالها',
      action: 'resubmit'
    }
  }

  return { allowed: true, action: 'resubmit' }
}

/**
 * Check if user can approve transaction
 */
export const canApproveTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): PermissionCheckResult => {
  // Must have approve permission
  if (!permissions.includes('transactions.approve')) {
    return {
      allowed: false,
      reason: 'ليس لديك صلاحية الموافقة على المعاملات',
      action: 'approve'
    }
  }

  // Cannot approve own transactions
  if (transaction.created_by === currentUserId) {
    return {
      allowed: false,
      reason: 'لا يمكنك الموافقة على معاملاتك الخاصة',
      action: 'approve'
    }
  }

  // Can only approve submitted or revision_requested
  const validStatuses = ['submitted', 'revision_requested']
  if (!validStatuses.includes(transaction.approval_status)) {
    return {
      allowed: false,
      reason: 'يمكن الموافقة فقط على المعاملات المرسلة أو التي تحتاج تعديل',
      action: 'approve'
    }
  }

  return { allowed: true, action: 'approve' }
}

/**
 * Check if user can reject transaction
 */
export const canRejectTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): PermissionCheckResult => {
  // Must have approve permission
  if (!permissions.includes('transactions.approve')) {
    return {
      allowed: false,
      reason: 'ليس لديك صلاحية رفض المعاملات',
      action: 'reject'
    }
  }

  // Cannot reject own transactions
  if (transaction.created_by === currentUserId) {
    return {
      allowed: false,
      reason: 'لا يمكنك رفض معاملاتك الخاصة',
      action: 'reject'
    }
  }

  // Can only reject submitted or revision_requested
  const validStatuses = ['submitted', 'revision_requested']
  if (!validStatuses.includes(transaction.approval_status)) {
    return {
      allowed: false,
      reason: 'يمكن رفض فقط المعاملات المرسلة أو التي تحتاج تعديل',
      action: 'reject'
    }
  }

  return { allowed: true, action: 'reject' }
}

/**
 * Check if user can post transaction
 */
export const canPostTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): PermissionCheckResult => {
  // Must have post permission
  if (!permissions.includes('transactions.post')) {
    return {
      allowed: false,
      reason: 'ليس لديك صلاحية ترسيل المعاملات',
      action: 'post'
    }
  }

  // Can only post approved transactions
  if (transaction.approval_status !== 'approved') {
    return {
      allowed: false,
      reason: 'يمكن ترسيل المعاملات المعتمدة فقط',
      action: 'post'
    }
  }

  // Cannot post already posted
  if (transaction.is_posted) {
    return {
      allowed: false,
      reason: 'هذه المعاملة مرسلة بالفعل',
      action: 'post'
    }
  }

  return { allowed: true, action: 'post' }
}

/**
 * Check if user can delete transaction
 */
export const canDeleteTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): PermissionCheckResult => {
  // Cannot delete posted transactions
  if (transaction.is_posted) {
    return {
      allowed: false,
      reason: 'لا يمكن حذف المعاملات المرسلة',
      action: 'delete'
    }
  }

  // Can delete if owner or have manage permission
  const isOwner = transaction.created_by === currentUserId
  const canManage = permissions.includes('transactions.manage')

  if (!isOwner && !canManage) {
    return {
      allowed: false,
      reason: 'ليس لديك صلاحية حذف هذه المعاملة',
      action: 'delete'
    }
  }

  return { allowed: true, action: 'delete' }
}

/**
 * Get all available actions for a transaction
 */
export const getAvailableActions = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): string[] => {
  const actions: string[] = []

  if (canEditTransaction(transaction, currentUserId, permissions).allowed) {
    actions.push('edit')
  }

  if (canRequestEdit(transaction, currentUserId).allowed) {
    actions.push('request_edit')
  }

  if (canResubmit(transaction, currentUserId).allowed) {
    actions.push('resubmit')
  }

  if (canApproveTransaction(transaction, currentUserId, permissions).allowed) {
    actions.push('approve')
  }

  if (canRejectTransaction(transaction, currentUserId, permissions).allowed) {
    actions.push('reject')
  }

  if (canPostTransaction(transaction, currentUserId, permissions).allowed) {
    actions.push('post')
  }

  if (canDeleteTransaction(transaction, currentUserId, permissions).allowed) {
    actions.push('delete')
  }

  return actions
}

/**
 * Check if transaction is locked for editing
 */
export const isTransactionLocked = (transaction: TransactionRecord): boolean => {
  return transaction.is_posted || transaction.approval_status !== 'draft'
}

/**
 * Get lock reason for transaction
 */
export const getLockReason = (transaction: TransactionRecord): string => {
  if (transaction.is_posted) {
    return 'المعاملة مرسلة ولا يمكن تعديلها'
  }

  if (transaction.approval_status === 'approved') {
    return 'المعاملة معتمدة ولا يمكن تعديلها مباشرة'
  }

  if (transaction.approval_status === 'submitted') {
    return 'المعاملة مرسلة للموافقة ولا يمكن تعديلها مباشرة'
  }

  if (transaction.approval_status === 'rejected') {
    return 'المعاملة مرفوضة. يرجى إعادة الإرسال بعد التعديل'
  }

  if (transaction.approval_status === 'revision_requested') {
    return 'تم طلب تعديل المعاملة. يرجى إعادة الإرسال بعد التعديل'
  }

  return 'المعاملة مقفلة'
}
