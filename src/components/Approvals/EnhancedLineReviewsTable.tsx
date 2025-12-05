import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Box,
  Typography,
  Tooltip,
  CircularProgress,
  Collapse,
  Grid,
  Card,
  CardContent
} from '@mui/material'
import { Edit, Message as Comment, CheckCircle, ExpandMore, ExpandLess } from '@mui/icons-material'

interface LineReview {
  line_id: string
  line_no: number
  account_code: string
  account_name: string
  account_name_ar?: string
  org_id?: string
  project_id?: string
  line_status?: string
  description?: string
  debit_amount: number
  credit_amount: number
  review_count: number
  has_change_requests: boolean
  latest_comment: string | null
  latest_reviewer_email: string | null
  latest_review_at: string | null
  approval_history?: Array<{
    id: string
    action: string
    status: string
    user_email: string
    created_at: string
    comment: string
  }>
}

interface EnhancedLineReviewsTableProps {
  lines: LineReview[]
  loading?: boolean
  onReviewLine?: (line: LineReview) => void
  onApprove?: (lineId: string, notes?: string) => Promise<void>
  onRequestEdit?: (lineId: string, reason: string) => Promise<void>
  onFlag?: (lineId: string, reason: string) => Promise<void>
  onAddComment?: (lineId: string, comment: string) => Promise<void>
}

const EnhancedLineReviewsTable: React.FC<EnhancedLineReviewsTableProps> = ({
  lines,
  loading = false,
  onReviewLine,
  onApprove,
  onRequestEdit,
  onFlag,
  onAddComment
}) => {
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)

  const toggleExpand = (lineId: string) => {
    setExpandedLineId(expandedLineId === lineId ? null : lineId)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (lines.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <Typography variant="body2" sx={{ color: 'var(--muted_text)' }}>
          لا توجد أسطر للمراجعة
        </Typography>
      </Paper>
    )
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'none'
      }}
    >
      <Table size="small" dir="rtl">
        <TableHead sx={{ background: 'var(--table_header_bg)' }}>
          <TableRow>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'var(--heading)', width: '40px' }}>
              التفاصيل
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              رقم السطر
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              الحساب
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              مدين
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              دائن
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              المراجعات
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              الحالة
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              الإجراءات
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <React.Fragment key={line.line_id}>
              {/* Main Row */}
              <TableRow
                sx={{
                  background: line.has_change_requests ? 'rgba(255, 192, 72, 0.08)' : 'var(--table_row_bg)',
                  '&:hover': { background: 'var(--hover-bg)' },
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <TableCell align="center" sx={{ color: 'var(--text)' }}>
                  <IconButton
                    size="small"
                    onClick={() => toggleExpand(line.line_id)}
                    sx={{
                      color: 'var(--accent)',
                      '&:hover': { background: 'rgba(32, 118, 255, 0.1)' }
                    }}
                  >
                    {expandedLineId === line.line_id ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </TableCell>
                <TableCell align="right" sx={{ color: 'var(--text)', fontWeight: 600 }}>
                  #{line.line_no}
                </TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)' }}>
                      {line.account_code}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--muted_text)' }}>
                      {line.account_name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ color: 'var(--text)' }}>
                  {line.debit_amount > 0 ? line.debit_amount.toLocaleString('ar-SA') : '-'}
                </TableCell>
                <TableCell align="right" sx={{ color: 'var(--text)' }}>
                  {line.credit_amount > 0 ? line.credit_amount.toLocaleString('ar-SA') : '-'}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {line.review_count > 0 && (
                      <Tooltip title={`${line.review_count} تعليق`}>
                        <Chip
                          icon={<Comment />}
                          label={line.review_count}
                          size="small"
                          sx={{
                            background: 'var(--chip-bg)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {/* Explicit Status Badge */}
                    {line.line_status && line.line_status !== 'draft' && (
                      <Chip
                        icon={
                          line.line_status === 'approved' ? <CheckCircle /> :
                            line.line_status === 'rejected' ? <Close /> :
                              line.line_status === 'request_change' ? <Edit /> :
                                undefined
                        }
                        label={
                          line.line_status === 'approved' ? 'معتمد' :
                            line.line_status === 'rejected' ? 'مرفوض' :
                              line.line_status === 'request_change' ? 'طلب تعديل' :
                                line.line_status === 'pending' ? 'قيد المراجعة' :
                                  line.line_status
                        }
                        size="small"
                        sx={{
                          background:
                            line.line_status === 'approved' ? 'rgba(33, 193, 151, 0.12)' :
                              line.line_status === 'rejected' ? 'rgba(239, 68, 68, 0.12)' :
                                line.line_status === 'request_change' ? 'rgba(255, 192, 72, 0.12)' :
                                  'var(--chip-bg)',
                          color:
                            line.line_status === 'approved' ? 'var(--success)' :
                              line.line_status === 'rejected' ? 'var(--error)' :
                                line.line_status === 'request_change' ? 'var(--warning)' :
                                  'var(--text)',
                          border: '1px solid',
                          borderColor:
                            line.line_status === 'approved' ? 'var(--success)' :
                              line.line_status === 'rejected' ? 'var(--error)' :
                                line.line_status === 'request_change' ? 'var(--warning)' :
                                  'var(--border)'
                        }}
                      />
                    )}

                    {/* Fallback for legacy data or draft with comments */}
                    {(!line.line_status || line.line_status === 'draft') && line.has_change_requests && (
                      <Tooltip title="طلبات تعديل">
                        <Chip
                          icon={<Edit />}
                          label="تعديل"
                          size="small"
                          sx={{
                            background: 'rgba(255, 192, 72, 0.12)',
                            color: 'var(--warning)',
                            border: '1px solid var(--warning)'
                          }}
                        />
                      </Tooltip>
                    )}
                    {(!line.line_status || line.line_status === 'draft') && line.review_count > 0 && !line.has_change_requests && (
                      <Tooltip title="تمت المراجعة">
                        <Chip
                          icon={<CheckCircle />}
                          label="مراجع"
                          size="small"
                          sx={{
                            background: 'rgba(33, 193, 151, 0.12)',
                            color: 'var(--success)',
                            border: '1px solid var(--success)'
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="مراجعة السطر">
                    <IconButton
                      size="small"
                      onClick={() => onReviewLine?.(line)}
                      sx={{
                        color: 'var(--accent)',
                        background: 'rgba(32, 118, 255, 0.1)',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        '&:hover': {
                          background: 'rgba(32, 118, 255, 0.2)',
                          color: 'var(--accent-primary-hover)'
                        }
                      }}
                    >
                      <Edit fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        مراجعة
                      </Typography>
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>

              {/* Expanded Details Row */}
              <TableRow sx={{ background: 'var(--field_bg)' }}>
                <TableCell colSpan={8} sx={{ p: 0, borderBottom: '1px solid var(--border)' }}>
                  <Collapse in={expandedLineId === line.line_id} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 3 }}>
                      {/* Location 1: Line Details */}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mb: 2,
                            fontWeight: 700,
                            color: 'var(--heading)',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box
                            sx={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            1
                          </Box>
                          تفاصيل السطر
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Card
                              sx={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'none'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--muted_text)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5
                                  }}
                                >
                                  رقم الحساب
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'var(--text)',
                                    fontSize: '1rem'
                                  }}
                                >
                                  {line.account_code}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              sx={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'none'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--muted_text)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5
                                  }}
                                >
                                  اسم الحساب (عربي)
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                    fontSize: '0.95rem'
                                  }}
                                >
                                  {line.account_name_ar || line.account_name}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              sx={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'none'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--muted_text)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5
                                  }}
                                >
                                  معرف المنظمة
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {line.org_id || '-'}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Card
                              sx={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'none'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'var(--muted_text)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5
                                  }}
                                >
                                  معرف المشروع
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {line.project_id || '-'}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          {line.description && (
                            <Grid item xs={12}>
                              <Card
                                sx={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: 'none'
                                }}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'var(--muted_text)',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      display: 'block',
                                      mb: 0.5
                                    }}
                                  >
                                    الوصف
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: 'var(--text)',
                                      fontSize: '0.9rem',
                                      lineHeight: 1.6
                                    }}
                                  >
                                    {line.description}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      {/* Location 2: Approval Audit */}
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            mb: 2,
                            fontWeight: 700,
                            color: 'var(--heading)',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Box
                            sx={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            2
                          </Box>
                          سجل الاعتماد والمراجعة
                        </Typography>

                        {line.approval_history && line.approval_history.length > 0 ? (
                          <Box sx={{ display: 'grid', gap: 1.5 }}>
                            {line.approval_history.map((audit, idx) => (
                              <Card
                                key={audit.id}
                                sx={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: 'none',
                                  borderLeft: `4px solid ${audit.action === 'approve' ? 'var(--success)' :
                                    audit.action === 'request_change' ? 'var(--warning)' :
                                      audit.action === 'flag' ? 'var(--error)' :
                                        'var(--accent)'
                                    }`
                                }}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      <Chip
                                        label={
                                          audit.action === 'approve' ? 'اعتماد' :
                                            audit.action === 'request_change' ? 'طلب تعديل' :
                                              audit.action === 'flag' ? 'تنبيه' :
                                                'تعليق'
                                        }
                                        size="small"
                                        sx={{
                                          background:
                                            audit.action === 'approve' ? 'rgba(33, 193, 151, 0.12)' :
                                              audit.action === 'request_change' ? 'rgba(255, 192, 72, 0.12)' :
                                                audit.action === 'flag' ? 'rgba(222, 63, 63, 0.12)' :
                                                  'var(--chip-bg)',
                                          color:
                                            audit.action === 'approve' ? 'var(--success)' :
                                              audit.action === 'request_change' ? 'var(--warning)' :
                                                audit.action === 'flag' ? 'var(--error)' :
                                                  'var(--text)',
                                          border: '1px solid',
                                          borderColor:
                                            audit.action === 'approve' ? 'var(--success)' :
                                              audit.action === 'request_change' ? 'var(--warning)' :
                                                audit.action === 'flag' ? 'var(--error)' :
                                                  'var(--border)'
                                        }}
                                      />
                                      <Chip
                                        label={
                                          audit.status === 'completed' ? 'مكتمل' :
                                            audit.status === 'pending' ? 'قيد الانتظار' :
                                              'معلق'
                                        }
                                        size="small"
                                        sx={{
                                          background: 'var(--chip-bg)',
                                          color: 'var(--text)',
                                          border: '1px solid var(--border)'
                                        }}
                                      />
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'var(--muted_text)',
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      {new Date(audit.created_at).toLocaleString('ar-SA')}
                                    </Typography>
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'var(--muted_text)',
                                      fontSize: '0.8rem',
                                      display: 'block',
                                      mb: 1
                                    }}
                                  >
                                    بواسطة: {audit.user_email}
                                  </Typography>
                                  {audit.comment && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: 'var(--text)',
                                        fontSize: '0.9rem',
                                        p: 1.5,
                                        background: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: 'var(--radius-sm)',
                                        lineHeight: 1.6
                                      }}
                                    >
                                      {audit.comment}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        ) : (
                          <Card
                            sx={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: 'none'
                            }}
                          >
                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'var(--muted_text)',
                                  fontSize: '0.9rem'
                                }}
                              >
                                لا توجد إجراءات اعتماد حتى الآن
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Box>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>

              {/* Latest Comment Display */}
              {line.latest_comment && !expandedLineId && (
                <TableRow sx={{ background: 'var(--field_bg)' }}>
                  <TableCell colSpan={8} sx={{ p: 2, borderBottom: '1px solid var(--border)' }}>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="caption" sx={{ color: 'var(--muted_text)', fontWeight: 600 }}>
                        آخر تعليق من {line.latest_reviewer_email}:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          p: 1.5,
                          background: 'rgba(255, 243, 205, 0.1)',
                          border: '1px solid rgba(255, 192, 72, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text)'
                        }}
                      >
                        {line.latest_comment}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default EnhancedLineReviewsTable
