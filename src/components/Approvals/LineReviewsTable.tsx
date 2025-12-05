import React from 'react'
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
  CircularProgress
} from '@mui/material'
import { Edit, Message as Comment, CheckCircle } from '../icons/SimpleIcons'

interface LineReview {
  line_id: string
  line_no: number
  account_code: string
  account_name: string
  debit_amount: number
  credit_amount: number
  review_count: number
  has_change_requests: boolean
  latest_comment: string | null
  latest_reviewer_email: string | null
  latest_review_at: string | null
}

interface LineReviewsTableProps {
  lines: LineReview[]
  loading?: boolean
  onReviewLine?: (line: LineReview) => void
}

const LineReviewsTable: React.FC<LineReviewsTableProps> = ({
  lines,
  loading = false,
  onReviewLine
}) => {

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
            <TableCell align="right" sx={{ fontWeight: 600, color: 'var(--heading)' }}>
              #
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
              <TableRow
                sx={{
                  background: line.has_change_requests ? 'rgba(255, 192, 72, 0.08)' : 'var(--table_row_bg)',
                  '&:hover': { background: 'var(--hover-bg)' },
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <TableCell align="right" sx={{ color: 'var(--text)' }}>
                  {line.line_no}
                </TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--text)' }}>
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
                    {line.has_change_requests && (
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
                    {line.review_count > 0 && !line.has_change_requests && (
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

              {/* Latest Comment Display */}
              {line.latest_comment && (
                <TableRow sx={{ background: 'var(--field_bg)' }}>
                  <TableCell colSpan={7} sx={{ p: 2, borderBottom: '1px solid var(--border)' }}>
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

export default LineReviewsTable
