import React from 'react'
import { Box, Typography, Alert } from '@mui/material'
import './Approvals.css'

/**
 * Workflows Page - Deprecated
 * 
 * This page was using the deleted approvals.ts service.
 * General approval workflows are not part of the enhanced line approval system.
 * 
 * For line-specific approvals, use the EnhancedLineApprovalManager component.
 */
const WorkflowsPage: React.FC = () => {
  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">إدارة مسارات الموافقات</h1>
      </div>

      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ⚠️ هذه الصفحة قيد التطوير
          </Typography>
          <Typography variant="caption">
            تم حذف خدمة الموافقات العامة (approvals.ts) لتركيز النظام على موافقات الأسطر المحسّنة.
            للموافقة على أسطر المعاملات، استخدم مدير الموافقات المحسّن.
          </Typography>
        </Alert>

        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom>
            🔄 قيد التطوير
          </Typography>
          <Typography color="text.secondary">
            سيتم تحديث هذه الصفحة قريباً
          </Typography>
        </Box>
      </Box>
    </div>
  )
}

export default WorkflowsPage
