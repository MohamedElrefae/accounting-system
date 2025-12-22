import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'
import AttachDocumentsPanel from '../documents/AttachDocumentsPanel'
import './TransactionLineCard.css'

export interface TransactionLineCardProps {
    line: any
    lineIndex: number
    accounts: Array<{ id: string; code: string; name: string; name_ar?: string }>
    projects: Array<{ id: string; code: string; name: string }>
    costCenters: Array<{ id: string; code: string; name: string }>
    workItems: Array<{ id: string; code: string; name: string }>
    classifications: Array<{ id: string; code: string | number; name: string }>
    categories: Array<{ id: string; code: string; description: string }>
    analysisItemsMap: Record<string, { code: string; name: string }>
    orgId: string
    projectId?: string
    canReview?: boolean
    onReview?: () => void
}

export const TransactionLineCard: React.FC<TransactionLineCardProps> = ({
    line,
    lineIndex,
    accounts,
    projects,
    costCenters,
    workItems,
    classifications,
    categories,
    analysisItemsMap,
    orgId,
    projectId,
    canReview = false,
    onReview
}) => {
    const [isDimensionsExpanded, setIsDimensionsExpanded] = useState(false)
    const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false)

    // Helper functions
    const getAccountLabel = (accountId?: string | null) => {
        if (!accountId) return '—'
        // Try enriched data first
        if (line.account_code && (line.account_name_ar || line.account_name)) {
            return `${line.account_code} - ${line.account_name_ar || line.account_name}`
        }

        // Fallback to lookup
        const account = accounts.find(a => a.id === accountId)
        return account ? `${account.code} - ${account.name_ar || account.name}` : accountId
    }

    const getProjectLabel = (projectId?: string | null) => {
        if (!projectId) return '—'
        const project = projects.find(p => p.id === projectId)
        return project ? `${project.code} - ${project.name}` : projectId
    }

    const getCostCenterLabel = (costCenterId?: string | null) => {
        if (!costCenterId) return '—'
        const costCenter = costCenters.find(cc => cc.id === costCenterId)
        return costCenter ? `${costCenter.code} - ${costCenter.name}` : costCenterId
    }

    const getWorkItemLabel = (workItemId?: string | null) => {
        if (!workItemId) return '—'
        const workItem = workItems.find(w => w.id === workItemId)
        return workItem ? `${workItem.code} - ${workItem.name}` : workItemId
    }

    const getClassificationLabel = (classificationId?: string | null) => {
        if (!classificationId) return '—'
        const classification = classifications.find(c => c.id === classificationId)
        return classification ? `${classification.code} - ${classification.name}` : classificationId
    }

    const getCategoryLabel = (categoryId?: string | null) => {
        if (!categoryId) return '—'
        const category = categories.find(c => c.id === categoryId)
        return category ? `${category.code} - ${category.description}` : categoryId
    }

    const getAnalysisWorkItemLabel = (analysisWorkItemId?: string | null) => {
        if (!analysisWorkItemId) return '—'
        const item = analysisItemsMap[analysisWorkItemId]
        return item ? `${item.code} - ${item.name}` : analysisWorkItemId
    }

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        return new Intl.NumberFormat('ar-EG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num || 0)
    }

    // Status badge
    const getStatusBadge = () => {
        const status = line.line_status || 'draft'
        const statusMap: Record<string, { label: string; cls: string }> = {
            draft: { label: 'مسودة', cls: 'status-draft' },
            pending: { label: 'قيد المراجعة', cls: 'status-pending' },
            approved: { label: 'معتمد', cls: 'status-approved' },
            rejected: { label: 'مرفوض', cls: 'status-rejected' },
            active: { label: 'نشط', cls: 'status-active' }
        }
        const conf = statusMap[status] || statusMap['draft']
        return <span className={`line-status-badge ${conf.cls}`}>{conf.label}</span>
    }

    const debitAmount = parseFloat(line.debit_amount || line.debit || 0)
    const creditAmount = parseFloat(line.credit_amount || line.credit || 0)

    return (
        <div className="transaction-line-card">
            {/* Header Row */}
            <div className="line-card-header">
                <div className="line-card-header-main">
                    <div className="line-number">#{lineIndex + 1}</div>
                    <div className="line-account">{getAccountLabel(line.account_id)}</div>
                    <div className="line-amounts">
                        {debitAmount > 0 && (
                            <span className="amount-debit" dir="ltr">
                                {formatCurrency(debitAmount)} مدين
                            </span>
                        )}
                        {creditAmount > 0 && (
                            <span className="amount-credit" dir="ltr">
                                {formatCurrency(creditAmount)} دائن
                            </span>
                        )}
                    </div>
                    <div className="line-description">{line.description || '—'}</div>
                    <div className="line-status">{getStatusBadge()}</div>
                </div>
            </div>

            {/* Footer Actions Row */}
            <div className="line-card-footer">
                {/* Dimensions Toggle */}
                <button
                    className="action-toggle"
                    onClick={() => setIsDimensionsExpanded(!isDimensionsExpanded)}
                    title={isDimensionsExpanded ? 'إخفاء الأبعاد' : 'عرض الأبعاد'}
                >
                    {isDimensionsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>الأبعاد والتفاصيل</span>
                </button>

                {/* Attachments Toggle */}
                <button
                    className="action-toggle"
                    onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                    title={isAttachmentsExpanded ? 'إخفاء المستندات' : 'عرض المستندات'}
                >
                    {isAttachmentsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>المستندات المرفقة</span>
                    {line.documents_count > 0 && (
                        <span className="attachments-count">{line.documents_count}</span>
                    )}
                </button>

                {/* Review Action */}
                {canReview && onReview && (
                    <button
                        className="action-toggle review-action"
                        onClick={onReview}
                        title="مراجعة هذا السطر"
                    >
                        <Star size={16} />
                        <span>مراجعة</span>
                    </button>
                )}
            </div>

            {/* Expanded Panels */}
            {isDimensionsExpanded && (
                <div className="line-card-panel">
                    <div className="dimensions-grid">
                        {line.project_id && (
                            <div className="dimension-item">
                                <label>المشروع</label>
                                <div className="dimension-value">{getProjectLabel(line.project_id)}</div>
                            </div>
                        )}
                        {line.cost_center_id && (
                            <div className="dimension-item">
                                <label>مركز التكلفة</label>
                                <div className="dimension-value">{getCostCenterLabel(line.cost_center_id)}</div>
                            </div>
                        )}
                        {line.work_item_id && (
                            <div className="dimension-item">
                                <label>عنصر العمل</label>
                                <div className="dimension-value">{getWorkItemLabel(line.work_item_id)}</div>
                            </div>
                        )}
                        {line.classification_id && (
                            <div className="dimension-item">
                                <label>التصنيف</label>
                                <div className="dimension-value">{getClassificationLabel(line.classification_id)}</div>
                            </div>
                        )}
                        {line.sub_tree_id && (
                            <div className="dimension-item">
                                <label>الفئة</label>
                                <div className="dimension-value">{getCategoryLabel(line.sub_tree_id)}</div>
                            </div>
                        )}
                        {line.analysis_work_item_id && (
                            <div className="dimension-item">
                                <label>عنصر التحليل</label>
                                <div className="dimension-value">{getAnalysisWorkItemLabel(line.analysis_work_item_id)}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isAttachmentsExpanded && (
                <div className="line-card-panel">
                    <AttachDocumentsPanel
                        orgId={orgId}
                        transactionLineId={line.id}
                        projectId={projectId}
                    />
                </div>
            )}
        </div>
    )
}
