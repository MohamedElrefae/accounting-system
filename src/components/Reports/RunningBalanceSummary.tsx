import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid
} from '@mui/material'

export interface RunningBalanceSummary {
  openingBalance: number
  totalDebits: number
  totalCredits: number
  netChange: number
  closingBalance: number
  transactionCount: number
  periodDays?: number
  averageDailyTransaction?: number
}

interface RunningBalanceSummaryProps {
  summary: RunningBalanceSummary
  loading?: boolean
  currency?: string
}

const RunningBalanceSummary: React.FC<RunningBalanceSummaryProps> = ({
  summary,
  loading = false,
  currency = 'USD'
}) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const summaryItems = [
    {
      title: 'Opening Balance',
      value: formatCurrency(summary.openingBalance),
      color: summary.openingBalance >= 0 ? 'text.primary' : 'error.main'
    },
    {
      title: 'Total Debits',
      value: formatCurrency(summary.totalDebits),
      color: 'text.primary'
    },
    {
      title: 'Total Credits',
      value: formatCurrency(summary.totalCredits),
      color: 'text.primary'
    },
    {
      title: 'Net Change',
      value: formatCurrency(summary.netChange),
      color: summary.netChange >= 0 ? 'success.main' : 'error.main'
    },
    {
      title: 'Closing Balance',
      value: formatCurrency(summary.closingBalance),
      color: summary.closingBalance >= 0 ? 'success.main' : 'error.main'
    },
    {
      title: 'Transactions',
      value: summary.transactionCount.toString(),
      color: 'text.primary'
    }
  ]

  if (summary.periodDays) {
    summaryItems.push({
      title: 'Period Days',
      value: summary.periodDays.toString(),
      color: 'text.primary'
    })
  }

  if (summary.averageDailyTransaction) {
    summaryItems.push({
      title: 'Avg Daily Transaction',
      value: formatCurrency(summary.averageDailyTransaction),
      color: 'text.primary'
    })
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Summary
        </Typography>
        <Grid container spacing={2}>
          {summaryItems.map((item, index) => (
            <Grid item xs={6} md={2} key={index}>
              <Typography variant="body2" color="textSecondary">
                {item.title}
              </Typography>
              <Typography 
                variant="h6" 
                color={item.color}
                sx={{ fontWeight: 'bold' }}
              >
                {loading ? (
                  <Box sx={{ width: 60, height: 24, bgcolor: 'grey.200', borderRadius: 1 }} />
                ) : (
                  item.value
                )}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default RunningBalanceSummary
