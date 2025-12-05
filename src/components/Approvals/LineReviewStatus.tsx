import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Alert
} from '@mui/material'
import { CheckCircle, Schedule as ClockIcon } from '@mui/icons-material'

interface LineReviewStatusProps {
  allLinesReviewed: boolean
  totalLines: number
  linesNeedingReview: number
  linesWithComments: number
  linesWithChangeRequests: number
  loading?: boolean
}

const LineReviewStatus: React.FC<LineReviewStatusProps> = ({
  allLinesReviewed,
  totalLines,
  linesNeedingReview,
  linesWithComments,
  linesWithChangeRequests,
  loading = false
}) => {
  const reviewedLines = totalLines - linesNeedingReview
  const reviewProgress = totalLines > 0 ? (reviewedLines / totalLines) * 100 : 0

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            حالة مراجعة الأسطر
          </Typography>
          {allLinesReviewed ? (
            <Chip
              icon={<CheckCircle />}
              label="جميع الأسطر تمت مراجعتها"
              color="success"
              variant="outlined"
            />
          ) : (
            <Chip
              icon={<ClockIcon />}
              label={`${linesNeedingReview} أسطر بانتظار المراجعة`}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              تقدم المراجعة
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {Math.round(reviewProgress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={reviewProgress}
            sx={{
              height: 8,
              borderRadius: '4px',
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: allLinesReviewed ? '#10b981' : '#f59e0b'
              }
            }}
          />
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, background: '#f0f9ff', borderRadius: '8px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#0284c7' }}>
                {totalLines}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                إجمالي الأسطر
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, background: '#f0fdf4', borderRadius: '8px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
                {reviewedLines}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                تمت مراجعتها
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, background: '#fef3c7', borderRadius: '8px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                {linesNeedingReview}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                بانتظار المراجعة
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 1, background: '#fef2f2', borderRadius: '8px' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                {linesWithChangeRequests}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                طلبات تعديل
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Comments Info */}
        {linesWithComments > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {linesWithComments} أسطر لها تعليقات من المراجعين
            </Typography>
          </Alert>
        )}

        {/* Change Requests Alert */}
        {linesWithChangeRequests > 0 && (
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>{linesWithChangeRequests} أسطر</strong> تحتاج إلى تعديلات قبل الاعتماد النهائي
            </Typography>
          </Alert>
        )}

        {/* All Reviewed Alert */}
        {allLinesReviewed && (
          <Alert severity="success">
            <Typography variant="body2">
              ✓ تمت مراجعة جميع الأسطر بنجاح. جاهز للاعتماد النهائي.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default LineReviewStatus
