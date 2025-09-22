import React from 'react'
import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import { tokens } from '@/theme/tokens'
import { BalanceReconciliationPanel } from '@/components/Fiscal/BalanceReconciliationPanel'

export default function BalanceReconciliationDashboardPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>Balance Reconciliation</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Select a period in Period Manager to see details. This page can aggregate multiple periods in the future.</Typography>
                <BalanceReconciliationPanel glTotal={0} openingTotal={0} difference={0} />
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}