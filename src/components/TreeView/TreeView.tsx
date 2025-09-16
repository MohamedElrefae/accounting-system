import React, { useState, useCallback } from 'react';
import { ChevronRight, Edit2, Plus, Trash2, Play, Pause, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import './TreeView.css';
import ui from '../Common/CommonUI.module.css';

interface TreeNode {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  level: number;
  parent_id?: string | null;
  is_active: boolean;
  account_type?: string;
  children?: TreeNode[];
}

interface ButtonState {
  loading: boolean;
  success: boolean;
  error: boolean;
}

interface ExtraColumn {
  key: string;
  header: string;
  render: (node: any) => React.ReactNode;
}

interface TreeViewProps {
  data: TreeNode[];
  onEdit?: (node: TreeNode) => void;
  onAdd?: (parentNode: TreeNode) => void;
  onToggleStatus?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  onSelect?: (node: TreeNode) => void;
  onToggleExpand?: (node: TreeNode) => void | Promise<void>;
  canHaveChildren?: (node: TreeNode) => boolean;
  getChildrenCount?: (node: TreeNode) => number | null | undefined;
  // New: allow parent to control deletion disabled state and tooltip reason
  isDeleteDisabled?: (node: TreeNode) => boolean;
  getDeleteDisabledReason?: (node: TreeNode) => string | undefined;
  maxLevel?: number;
  // New: extra columns to display between level and actions
  extraColumns?: ExtraColumn[];
}

const TreeView: React.FC<TreeViewProps> = ({ 
  data, 
  onEdit, 
  onAdd, 
  onToggleStatus, 
  onDelete,
  onSelect,
  onToggleExpand,
  canHaveChildren,
  getChildrenCount,
  isDeleteDisabled,
  getDeleteDisabledReason,
  maxLevel = 4,
  extraColumns = []
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [buttonStates, setButtonStates] = useState<{[key: string]: ButtonState}>({});

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const getButtonState = (buttonId: string): ButtonState => {
    return buttonStates[buttonId] || { loading: false, success: false, error: false };
  };

  const handleButtonWithStates = async (
    buttonId: string,
    action: () => Promise<void> | void
  ) => {
    try {
      // Set loading state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: true, success: false, error: false }
      }));

      await action();

      // Set success state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: false, success: true, error: false }
      }));

      // Reset after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newStates = { ...prev };
          delete newStates[buttonId];
          return newStates;
        });
      }, 2000);
    } catch {
      // Set error state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: false, success: false, error: true }
      }));

      // Reset after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newStates = { ...prev };
          delete newStates[buttonId];
          return newStates;
        });
      }, 2000);
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasLoadedChildren = node.children && node.children.length > 0;
    const mayHaveChildren = hasLoadedChildren || (canHaveChildren ? !!canHaveChildren(node) : false);
    const canAddSubAccount = node.level < maxLevel;

    return (
      <div key={node.id} className="tree-node-wrapper">
        <div 
          className={`tree-node ${!node.is_active ? 'inactive' : ''}`}
        >
          <div 
            className={`tree-node-expander ${isExpanded ? 'expanded' : ''} ${!mayHaveChildren ? 'no-children' : ''}`}
            onClick={async () => {
              if (!mayHaveChildren) return;
              if (onToggleExpand) {
                await onToggleExpand(node);
              }
              toggleNode(node.id);
            }}
            style={{ marginLeft: `${depth * 20}px` }}
          >
            {mayHaveChildren && <ChevronRight className="expander-icon" size={16} />}
          </div>
          
          <div className={`tree-node-status ${node.is_active ? 'active' : 'inactive'}`} />
          
          <div className="tree-node-spacer"></div>
          
          <div className={`tree-node-code contrast-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>
            {node.code}
          </div>
          
          <div className="tree-node-name" onClick={() => onSelect && onSelect(node)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            {node.name_ar}
            {!node.is_active && <span className={`status-inactive-text ${ui.inactiveText}`}>(معطل)</span>}
            {mayHaveChildren && (
              <span className={ui.textSecondarySmall} style={{ marginRight: 8 }}>
                {hasLoadedChildren ? (getChildrenCount ? getChildrenCount(node) ?? '' : '') : '…'}
              </span>
            )}
          </div>
          
          <div className="tree-node-type">
            {node.account_type || '—'}
          </div>
          
          <div className="tree-node-level">
            <span className={`level-badge ${ui.badgeLevel}`}>{node.level}</span>
          </div>

          {/* Extra dynamic columns */}
          {extraColumns.length > 0 && extraColumns.map(col => (
            <div key={`${col.key}-${node.id}`} className="tree-node-extra">
              {col.render(node)}
            </div>
          ))}
          
          <div className="tree-node-actions">
            {/* Edit Button */}
            <button
              onClick={() => handleButtonWithStates(
                `edit-${node.id}`,
                async () => onEdit && onEdit(node)
              )}
              className={`ultimate-btn ultimate-btn-edit ${
                getButtonState(`edit-${node.id}`).loading ? 'loading' : ''
              } ${
                getButtonState(`edit-${node.id}`).success ? 'success' : ''
              } ${
                getButtonState(`edit-${node.id}`).error ? 'error' : ''
              }`}
              disabled={getButtonState(`edit-${node.id}`).loading}
              title="تعديل"
            >
              <div className="btn-content">
                <div className={`btn-icon ${
                  getButtonState(`edit-${node.id}`).loading ? 'spinning' : ''
                }`}>
                  {getButtonState(`edit-${node.id}`).loading ? (
                    <Loader2 size={14} />
                  ) : getButtonState(`edit-${node.id}`).success ? (
                    <CheckCircle size={14} />
                  ) : getButtonState(`edit-${node.id}`).error ? (
                    <AlertCircle size={14} />
                  ) : (
                    <Edit2 size={14} />
                  )}
                </div>
                <span className="btn-text">تعديل</span>
              </div>
            </button>

            {/* Add Sub-Account Button */}
            {canAddSubAccount && (
              <button
                onClick={() => handleButtonWithStates(
                  `add-${node.id}`,
                  async () => onAdd && onAdd(node)
                )}
                className={`ultimate-btn ultimate-btn-add ${
                  getButtonState(`add-${node.id}`).loading ? 'loading' : ''
                } ${
                  getButtonState(`add-${node.id}`).success ? 'success' : ''
                } ${
                  getButtonState(`add-${node.id}`).error ? 'error' : ''
                }`}
                disabled={getButtonState(`add-${node.id}`).loading}
                title="إضافة فرعي"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${
                    getButtonState(`add-${node.id}`).loading ? 'spinning' : ''
                  }`}>
                    {getButtonState(`add-${node.id}`).loading ? (
                      <Loader2 size={14} />
                    ) : getButtonState(`add-${node.id}`).success ? (
                      <CheckCircle size={14} />
                    ) : getButtonState(`add-${node.id}`).error ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                  </div>
                  <span className="btn-text">إضافة فرعي</span>
                </div>
              </button>
            )}

            {/* Toggle Status Button */}
            <button
              onClick={() => handleButtonWithStates(
                `toggle-${node.id}`,
                async () => onToggleStatus && onToggleStatus(node)
              )}
              className={`ultimate-btn ${node.is_active ? 'ultimate-btn-disable' : 'ultimate-btn-enable'} ${
                getButtonState(`toggle-${node.id}`).loading ? 'loading' : ''
              } ${
                getButtonState(`toggle-${node.id}`).success ? 'success' : ''
              } ${
                getButtonState(`toggle-${node.id}`).error ? 'error' : ''
              }`}
              disabled={getButtonState(`toggle-${node.id}`).loading}
              title={node.is_active ? 'تعطيل' : 'تفعيل'}
            >
              <div className="btn-content">
                <div className={`btn-icon ${
                  getButtonState(`toggle-${node.id}`).loading ? 'spinning' : ''
                }`}>
                  {getButtonState(`toggle-${node.id}`).loading ? (
                    <Loader2 size={14} />
                  ) : getButtonState(`toggle-${node.id}`).success ? (
                    <CheckCircle size={14} />
                  ) : getButtonState(`toggle-${node.id}`).error ? (
                    <AlertCircle size={14} />
                  ) : node.is_active ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} />
                  )}
                </div>
                <span className="btn-text">{node.is_active ? 'تعطيل' : 'تفعيل'}</span>
              </div>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => handleButtonWithStates(
                `delete-${node.id}`,
                async () => {
                  if (window.confirm(`هل أنت متأكد من حذف "${node.name_ar}"؟`)) {
                    onDelete?.(node);
                  }
                }
              )}
              className={`ultimate-btn ultimate-btn-delete ${
                getButtonState(`delete-${node.id}`).loading ? 'loading' : ''
              } ${
                getButtonState(`delete-${node.id}`).success ? 'success' : ''
              } ${
                getButtonState(`delete-${node.id}`).error ? 'error' : ''
              }`}
              disabled={
                getButtonState(`delete-${node.id}`).loading ||
                (typeof isDeleteDisabled === 'function' ? isDeleteDisabled(node) : hasLoadedChildren)
              }
              title={
                typeof getDeleteDisabledReason === 'function'
                  ? getDeleteDisabledReason(node) || 'حذف'
                  : (hasLoadedChildren ? 'لا يمكن حذف حساب له فروع' : 'حذف')
              }
            >
              <div className="btn-content">
                <div className={`btn-icon ${
                  getButtonState(`delete-${node.id}`).loading ? 'spinning' : ''
                }`}>
                  {getButtonState(`delete-${node.id}`).loading ? (
                    <Loader2 size={14} />
                  ) : getButtonState(`delete-${node.id}`).success ? (
                    <CheckCircle size={14} />
                  ) : getButtonState(`delete-${node.id}`).error ? (
                    <AlertCircle size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </div>
                <span className="btn-text">حذف</span>
              </div>
            </button>
          </div>
        </div>
        
        {isExpanded && hasLoadedChildren && (
          <div className="tree-node-children">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Build tree structure from flat data
  const buildTree = (items: TreeNode[]): TreeNode[] => {
    const itemMap = new Map<string, TreeNode>();
    const rootItems: TreeNode[] = [];

    // First pass: create a map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: build the tree structure
    items.forEach(item => {
      const node = itemMap.get(item.id)!;
      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        rootItems.push(node);
      }
    });

    return rootItems;
  };

  const treeData = buildTree(data);

  const containerClass = `tree-view-container ${extraColumns.length > 0 ? `tree-has-extras-${extraColumns.length}` : ''}`;

  return (
    <div className={containerClass}>
      {/* Header Row */}
      <div className="tree-node tree-header">
        <div className="tree-node-expander"></div>
        <div className="tree-node-status"></div>
        <div className="tree-node-spacer"></div>
        <div className="tree-node-code">
          <span className="header-text">الكود</span>
        </div>
        <div className="tree-node-name">
          <span className="header-text">اسم الحساب</span>
        </div>
        <div className="tree-node-type">
          <span className="header-text">نوع الحساب</span>
        </div>
        <div className="tree-node-level">
          <span className="header-text">المستوى</span>
        </div>
        {/* Extra column headers */}
        {extraColumns.length > 0 && extraColumns.map(col => (
          <div key={`header-${col.key}`} className="tree-node-extra">
            <span className="header-text">{col.header}</span>
          </div>
        ))}
        <div className="tree-node-actions">
          <span className="header-text">الإجراءات</span>
        </div>
      </div>
      {/* Tree Nodes */}
      {treeData.map(node => renderTreeNode(node))}
    </div>
  );
};

export default TreeView;
