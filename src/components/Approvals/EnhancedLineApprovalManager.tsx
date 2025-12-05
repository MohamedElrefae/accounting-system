import React, { useState, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material'
import { CheckCircle, Send, Close } from '@mui/icons-material'
import LineReviewStatus from './LineReviewStatus'
import EnhancedLineReviewsTable from './EnhancedLineReviewsTable'
import EnhancedLineReviewModalV2 from './EnhancedLineReviewModalV2'
import { useLineReviews, useLineReviewStatus } from '../../hooks/useLineReviews'
import { approveLineReview } from '../../services/lineReviewService'

interface ApprovalWorkflowManagerProps {
  transactionId: string
  approvalRequestId?: string
  onApprovalComplete?: () => void
  onApprovalFailed?: (error: string) => void
  onClose?: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const EnhancedLineApprovalManager: React.FC<ApprovalWorkflowManagerProps> = ({
  transactionId,
  approvalRequestId,
  onApprovalComplete,
  onApprovalFailed
}) => {
  const [tabValue, setTabValue] = useState(0)
  const [selectedLine, setSelectedLine] = useState<any>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [finalApprovalDialogOpen, setFinalApprovalDialogOpen] = useState(false)
  const [finalNotes, setFinalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Draggable/Resizable state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('lineApprovalModal:position')
      return saved ? JSON.parse(saved) : { x: 100, y: 100 }
    } catch {
      return { x: 100, y: 100 }
    }
  })
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('lineApprovalModal:size')
      return saved ? JSON.parse(saved) : { width: 1200, height: 800 }
    } catch {
      return { width: 1200, height: 800 }
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const { lineReviews, loading: reviewsLoading, refresh: refreshReviews, addComment } = useLineReviews(
    approvalRequestId,
    transactionId
  )
  const { status, loading: statusLoading, refresh: refreshStatus } = useLineReviewStatus(
    transactionId
  )

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    try {
      localStorage.setItem('lineApprovalModal:position', JSON.stringify(position))
    } catch {}
  }

  // Resize handler
  const handleResize = (newWidth: number, newHeight: number) => {
    setSize({ width: newWidth, height: newHeight })
    try {
      localStorage.setItem('lineApprovalModal:size', JSON.stringify({ width: newWidth, height: newHeight }))
    } catch {}
  }

  const handleReviewLine = useCallback((line: any) => {
    setSelectedLine(line)
    setReviewModalOpen(true)
  }, [])

  const handleAddComment = useCallback(
    async (comment: string, reviewType: string) => {
      if (!selectedLine) return
      try {
        await addComment(selectedLine.line_id, comment, reviewType as any)
        await refreshReviews()
      } catch (error) {
        console.error('Failed to add comment:', error)
        throw error
      }
    },
    [selectedLine, refreshReviews, addComment]
  )

  const handleRequestEdit = useCallback(
    async (reason: string) => {
      if (!selectedLine) return
      try {
        await addComment(selectedLine.line_id, reason, 'request_change')
        await refreshReviews()
        await refreshStatus()
      } catch (error) {
        console.error('Failed to request edit:', error)
        throw error
      }
    },
    [selectedLine, refreshReviews, refreshStatus, addComment]
  )

  const handleFlag = useCallback(
    async (reason: string) => {
      if (!selectedLine) return
      try {
        await addComment(selectedLine.line_id, reason, 'flag')
        await refreshReviews()
      } catch (error) {
        console.error('Failed to flag line:', error)
        throw error
      }
    },
    [selectedLine, refreshReviews, addComment]
  )

  const handleApprove = useCallback(
    async (notes?: string) => {
      if (!selectedLine || !approvalRequestId) return
      try {
        await approveLineReview(approvalRequestId, selectedLine.line_id, notes)
        await refreshReviews()
        await refreshStatus()
      } catch (error) {
        console.error('Failed to approve line:', error)
        throw error
      }
    },
    [selectedLine, approvalRequestId, refreshReviews, refreshStatus]
  )

  const handleFinalApproval = useCallback(async () => {
    try {
      setSubmitting(true)
      onApprovalComplete?.()
      setFinalApprovalDialogOpen(false)
    } catch (error: any) {
      onApprovalFailed?.(error.message)
    } finally {
      setSubmitting(false)
    }
  }, [onApprovalComplete, onApprovalFailed])

  const canFinalApprove = status && status.all_lines_reviewed && status.lines_with_change_requests === 0

  return (
    <Dialog
      open={true}
      onClose={onApprovalComplete}
      maxWidth={false}
      fullWidth={false}
      PaperProps={{
        sx: {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          background: 'var(--modal_bg)',
          color: 'var(--text)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          cursor: isDragging ? 'grabbing' : 'default'
        },
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseUp
      }}
    >
      {/* Header - Draggable */}
      <DialogTitle
        onMouseDown={handleMouseDown}
        sx={{
          background: 'var(--surface)',
          borderBottom: '2px solid var(--border)',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: 'grab',
          userSelect: 'none',
          '&:active': {
            cursor: 'grabbing'
          }
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: 'var(--heading)',
              fontSize: '1.5rem',
              mb: 0.5,
              letterSpacing: '-0.02em'
            }}
          >
            مراجعة واعتماد الأسطر
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'var(--muted_text)',
              fontSize: '0.95rem'
            }}
          >
            قم بمراجعة كل سطر واتخاذ الإجراء المناسب
          </Typography>
        </Box>
        <IconButton
          onClick={onApprovalComplete}
          sx={{
            color: 'var(--muted_text)',
            '&:hover': {
              background: 'var(--hover-bg)',
              color: 'var(--text)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          padding: '32px',
          background: 'var(--background)',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0
        }}
      >
        {/* Status Alert */}
        {status && status.lines_with_change_requests > 0 && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              background: 'rgba(255, 192, 72, 0.12)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text)',
              '& .MuiAlert-icon': {
                color: 'var(--warning)',
                fontSize: '1.5rem'
              },
              '& .MuiAlert-message': {
                fontSize: '0.95rem'
              }
            }}
          >
            <strong style={{ fontWeight: 600 }}>{status.lines_with_change_requests} أسطر</strong> تحتاج إلى تعديلات قبل الاعتماد
          </Alert>
        )}

        {/* Review Status Card */}
        {status && (
          <Box sx={{ mb: 3 }}>
            <LineReviewStatus
              allLinesReviewed={status.all_lines_reviewed}
              totalLines={status.total_lines}
              linesNeedingReview={status.lines_needing_review}
              linesWithComments={status.lines_with_comments}
              linesWithChangeRequests={status.lines_with_change_requests}
              loading={statusLoading}
            />
          </Box>
        )}

        {/* Main Content Card */}
        <Card
          sx={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'none',
            overflow: 'hidden'
          }}
        >
          <CardHeader
            title={
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: 'var(--heading)',
                  fontSize: '1.125rem'
                }}
              >
                تفاصيل المراجعة
              </Typography>
            }
            sx={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              padding: '20px 24px'
            }}
            action={
              canFinalApprove && (
                <Button
                  variant="contained"
                  sx={{
                    background: 'var(--success)',
                    color: 'var(--on-success)',
                    fontWeight: 600,
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 8px rgba(33, 193, 151, 0.3)',
                    '&:hover': {
                      background: 'var(--success-strong)',
                      boxShadow: '0 4px 12px rgba(33, 193, 151, 0.4)'
                    }
                  }}
                  startIcon={<CheckCircle />}
                  onClick={() => setFinalApprovalDialogOpen(true)}
                >
                  اعتماد نهائي
                </Button>
              )
            }
          />
          <CardContent sx={{ padding: 0, background: 'var(--surface)' }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              aria-label="approval tabs"
              sx={{
                borderBottom: '1px solid var(--border)',
                px: 3,
                '& .MuiTab-root': {
                  color: 'var(--muted_text)',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  minHeight: '56px',
                  '&.Mui-selected': {
                    color: 'var(--accent)',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  background: 'var(--accent)',
                  height: '3px',
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab label="الأسطر" />
              <Tab label="الملخص" />
            </Tabs>

            {/* Lines Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3, pb: 3 }}>
                <EnhancedLineReviewsTable
                  lines={lineReviews}
                  loading={reviewsLoading}
                  onReviewLine={handleReviewLine}
                  onApprove={handleApprove}
                  onRequestEdit={handleRequestEdit}
                  onFlag={handleFlag}
                  onAddComment={handleAddComment}
                />
              </Box>
            </TabPanel>

            {/* Summary Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3, pb: 3 }}>
                {status && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2.5 }}>
                    <Card
                      sx={{
                        background: 'var(--field_bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'none'
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography
                          sx={{
                            color: 'var(--muted_text)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            mb: 1.5
                          }}
                        >
                          إجمالي الأسطر
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            color: 'var(--text)',
                            fontWeight: 700,
                            fontSize: '2.5rem'
                          }}
                        >
                          {status.total_lines}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        background: 'var(--field_bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'none'
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography
                          sx={{
                            color: 'var(--muted_text)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            mb: 1.5
                          }}
                        >
                          تمت مراجعتها
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            color: 'var(--success)',
                            fontWeight: 700,
                            fontSize: '2.5rem'
                          }}
                        >
                          {status.total_lines - status.lines_needing_review}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        background: 'var(--field_bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'none'
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography
                          sx={{
                            color: 'var(--muted_text)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            mb: 1.5
                          }}
                        >
                          بانتظار المراجعة
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            color: 'var(--warning)',
                            fontWeight: 700,
                            fontSize: '2.5rem'
                          }}
                        >
                          {status.lines_needing_review}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        background: 'var(--field_bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'none'
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography
                          sx={{
                            color: 'var(--muted_text)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            mb: 1.5
                          }}
                        >
                          طلبات تعديل
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            color: 'var(--error)',
                            fontWeight: 700,
                            fontSize: '2.5rem'
                          }}
                        >
                          {status.lines_with_change_requests}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      </DialogContent>

      {/* Line Review Modal */}
      {selectedLine && (
        <EnhancedLineReviewModalV2
          open={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false)
            setSelectedLine(null)
          }}
          lineData={selectedLine}
          onAddComment={handleAddComment}
          onRequestEdit={handleRequestEdit}
          onApprove={handleApprove}
          onFlag={handleFlag}
        />
      )}

      {/* Final Approval Dialog */}
      <Dialog
        open={finalApprovalDialogOpen}
        onClose={() => setFinalApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'var(--modal_bg)',
            color: 'var(--text)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }
        }}
      >
        <DialogTitle sx={{
          fontWeight: 600,
          color: 'var(--heading)',
          borderBottom: '1px solid var(--border)'
        }}>
          اعتماد نهائي
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mb: 3, color: 'var(--text)' }}>
            هل أنت متأكد من اعتماد جميع الأسطر؟ سيتم إرسال الطلب للمرحلة التالية.
          </Typography>
          <TextField
            label="ملاحظات نهائية (اختياري)"
            multiline
            rows={3}
            fullWidth
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            placeholder="أضف أي ملاحظات نهائية..."
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'var(--field_bg)',
                color: 'var(--text)',
                '& fieldset': {
                  borderColor: 'var(--border)'
                },
                '&:hover fieldset': {
                  borderColor: 'var(--accent)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent)'
                }
              },
              '& .MuiInputLabel-root': {
                color: 'var(--muted_text)'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <Button
            onClick={() => setFinalApprovalDialogOpen(false)}
            disabled={submitting}
            sx={{
              color: 'var(--muted_text)',
              '&:hover': {
                background: 'var(--hover-bg)'
              }
            }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleFinalApproval}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
            sx={{
              background: 'var(--success)',
              color: 'var(--on-success)',
              fontWeight: 600,
              '&:hover': {
                background: 'var(--success-strong)'
              }
            }}
          >
            اعتماد نهائي
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resize Handle */}
      <Box
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startY = e.clientY
          const startWidth = size.width
          const startHeight = size.height

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(600, startWidth + (moveEvent.clientX - startX))
            const newHeight = Math.max(400, startHeight + (moveEvent.clientY - startY))
            handleResize(newWidth, newHeight)
          }

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          background: 'linear-gradient(135deg, transparent 50%, var(--accent) 50%)',
          cursor: 'nwse-resize',
          borderRadius: '0 0 var(--radius-lg) 0'
        }}
      />
    </Dialog>
  )
}

export default EnhancedLineApprovalManager
