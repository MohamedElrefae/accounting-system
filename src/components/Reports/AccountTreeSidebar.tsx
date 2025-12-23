import React, { useState, useEffect, useMemo } from 'react'
import type { AccountTreeNode } from '../../services/reports/hierarchical-balance'
import { ChevronRight, ChevronDown, Search, Folder, FolderOpen, FileText } from 'lucide-react'

interface AccountTreeSidebarProps {
    data: AccountTreeNode[]
    selectedId: string | null
    onSelect: (node: AccountTreeNode) => void
    loading?: boolean
}

interface TreeNodeProps {
    node: AccountTreeNode
    level: number
    selectedId: string | null
    onSelect: (node: AccountTreeNode) => void
    expandedIds: Set<string>
    toggleExpand: (id: string) => void
    searchTerm: string
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

const TreeNode: React.FC<TreeNodeProps> = ({
    node, level, selectedId, onSelect, expandedIds, toggleExpand, searchTerm
}) => {
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedId === node.id
    const hasChildren = node.children && node.children.length > 0

    const nameDisplay = useMemo(() => {
        const text = node.name_ar || node.name
        if (!searchTerm) return text
        return text
    }, [node, searchTerm])

    return (
        <div className="select-none">
            <div
                className={`
          flex items-center py-1 px-2 cursor-pointer text-sm border-r-2 transition-colors
          ${isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-transparent hover:bg-gray-50 text-gray-700'}
        `}
                style={{ paddingRight: `${level * 12 + 8}px` }}
                onClick={() => onSelect(node)}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(node.id)
                    }}
                    className={`p-1 mr-1 rounded-sm hover:bg-gray-200 text-gray-500 ${!hasChildren ? 'invisible' : ''}`}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
                </button>

                <span className="ml-2 text-gray-400">
                    {hasChildren ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileText size={14} />}
                </span>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                        <span className="truncate font-medium" title={node.code + ' - ' + (node.name_ar || node.name)}>
                            <span className="text-gray-500 text-xs ml-1">{node.code}</span>
                            {nameDisplay}
                        </span>
                        <span className={`text-xs font-mono ml-2 ${node.current_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(node.current_balance)}
                        </span>
                    </div>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                            searchTerm={searchTerm}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export const AccountTreeSidebar: React.FC<AccountTreeSidebarProps> = ({
    data, selectedId, onSelect, loading
}) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (data.length > 0 && expandedIds.size === 0) {
            const allIds = new Set<string>()
            data.forEach(n => {
                allIds.add(n.id)
                n.children.forEach(c => allIds.add(c.id))
            })
            setExpandedIds(allIds)
        }
    }, [data])

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedIds(next)
    }

    const filteredData = useMemo(() => {
        if (!searchTerm) return data

        const lowerTerm = searchTerm.toLowerCase()

        const filterNode = (nodes: AccountTreeNode[]): AccountTreeNode[] => {
            return nodes.reduce<AccountTreeNode[]>((acc, node) => {
                const matchesSelf =
                    node.code.toLowerCase().includes(lowerTerm) ||
                    (node.name_ar && node.name_ar.toLowerCase().includes(lowerTerm)) ||
                    node.name.toLowerCase().includes(lowerTerm)

                const filteredChildren = filterNode(node.children)

                if (matchesSelf || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren
                    })
                }
                return acc
            }, [])
        }

        return filterNode(data)
    }, [data, searchTerm])

    useEffect(() => {
        if (searchTerm) {
            const allIds = new Set<string>()
            const collect = (nodes: AccountTreeNode[]) => {
                nodes.forEach(n => {
                    allIds.add(n.id)
                    collect(n.children)
                })
            }
            collect(filteredData)
            setExpandedIds(allIds)
        }
    }, [searchTerm, filteredData])

    if (loading && data.length === 0) {
        return (
            <div className="w-80 h-full bg-white border-l p-4 flex items-center justify-center text-gray-400">
                جاري تحميل الشجرة...
            </div>
        )
    }

    return (
        <div className="w-80 h-full bg-white border-l flex flex-col">
            <div className="p-3 border-b">
                <h3 className="font-semibold text-gray-800 mb-2">شجرة الحسابات</h3>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="بحث بالكود أو الاسم..."
                        className="w-full pl-3 pr-9 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search size={16} className="absolute right-3 top-2 text-gray-400" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {filteredData.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        لا توجد حسابات
                    </div>
                ) : (
                    filteredData.map(node => (
                        <TreeNode
                            key={node.id}
                            node={node}
                            level={0}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                            searchTerm={searchTerm}
                        />
                    ))
                )}
            </div>

            <div className="p-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
                {data.reduce((acc, n) => acc + 1 + countChildren(n), 0)} حساب إجمالي
            </div>
        </div>
    )
}

function countChildren(node: AccountTreeNode): number {
    return node.children.length + node.children.reduce((acc, c) => acc + countChildren(c), 0)
}
