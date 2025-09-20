// This component has been removed as part of the migration from line_items to transaction_line_items
// This component is now part of the enhanced TransactionLineItemsSection

import React from 'react'

// DEPRECATED: This component has been integrated into TransactionLineItemsSection
// The enhanced transaction line items service provides all tree management functionality

const LineItemsTreeManager: React.FC = () => {
  return (
    <div className="deprecated-notice">
      <p>This component has been deprecated.</p>
      <p>Tree management functionality is now integrated into TransactionLineItemsSection.</p>
    </div>
  )
}

export default LineItemsTreeManager;

  // Render children recursively
  const renderChildren = (parentId: string) => {
    const children = treeItems.filter(item => {
      const parentNode = treeItems.find(n => n.id === parentId);
      if (!parentNode?.item_code) return false;
      
      return item.item_code && item.item_code !== parentNode.item_code && (
        item.item_code.startsWith(parentNode.item_code + '-') ||
        (item.item_code.startsWith(parentNode.item_code) && 
         !item.item_code.includes('-') && 
         item.item_code.length > parentNode.item_code.length)
      );
    });

    return children.map(child => (
      <div key={child.id} className={`child-nodes ${expandedNodes.has(parentId) ? 'expanded' : 'collapsed'}`}>
        {renderTreeNode(child)}
        {child.has_children && renderChildren(child.id)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="line-items-tree-loading">
        <div className="loading-spinner"></div>
        <span>جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className={`line-items-tree-manager ${className}`}>
      <div className="tree-header">
        <div className="header-title">
          <TreePine className="tree-icon" />
          <h3>هيكل بنود التكلفة</h3>
        </div>
        {!readOnly && (
          <Button onClick={handleAddRoot} className="add-root-btn">
            <Plus size={16} />
            إضافة بند رئيسي
          </Button>
        )}
      </div>

      <div className="tree-container">
        {treeItems.filter(item => item.depth === 0).map(rootNode => (
          <div key={rootNode.id}>
            {renderTreeNode(rootNode)}
            {rootNode.has_children && renderChildren(rootNode.id)}
          </div>
        ))}
      </div>

      {showAddForm && (
        <div className="add-form-overlay">
          <div className="add-form-modal">
            <div className="form-header">
              <h4>
                {parentCode ? `إضافة بند فرعي لـ ${parentCode}` : 'إضافة بند رئيسي جديد'}
              </h4>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <div className="form-body">
              {codeSuggestion && (
                <div className="code-suggestion">
                  <div className="suggestion-header">
                    <Sparkles className="sparkle-icon" />
                    <span>اقتراح الكود</span>
                    {loadingSuggestion && <div className="mini-spinner" />}
                  </div>
                  <div className="suggested-code">
                    <code>{codeSuggestion.suggested_code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(codeSuggestion.suggested_code)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                  <div className="pattern-info">
                    نمط: {codeSuggestion.pattern_used === 'dash' ? 'شرطة' : 'رقمي'}
                  </div>
                </div>
              )}

              <div className="form-grid">
                <div className="form-field">
                  <label>كود البند</label>
                  <Input
                    value={formData.item_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, item_code: e.target.value }))}
                    placeholder="أدخل كود البند"
                  />
                </div>

                <div className="form-field">
                  <label>اسم البند</label>
                  <Input
                    value={formData.item_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="أدخل اسم البند"
                  />
                </div>

                <div className="form-field">
                  <label>الكمية</label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="form-field">
                  <label>النسبة %</label>
                  <Input
                    type="number"
                    value={formData.percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 100 }))}
                  />
                </div>

                <div className="form-field">
                  <label>سعر الوحدة</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="form-field calculated-total">
                  <label>
                    <Calculator size={14} />
                    الإجمالي المحسوب
                  </label>
                  <div className="total-value">
                    {calculateTotal(
                      formData.quantity,
                      formData.percentage,
                      formData.unit_price,
                      formData.discount_amount,
                      formData.tax_amount
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-footer">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                إلغاء
              </Button>
              <Button onClick={saveChildItem}>
                حفظ البند
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineItemsTreeManager;