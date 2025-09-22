import React from 'react'
import { Box, Container, Paper, Stack, Typography, List, ListItem, ListItemText } from '@mui/material'
import { tokens } from '@/theme/tokens'

export default function OpeningBalanceAuditTrailPage() {
  // Placeholder audit entries
  const [entries] = React.useState([
    { action: 'opening_balances_imported', when: '2025-09-22 12:00', by: 'user@example.com' },
    { action: 'fiscal_year_created', when: '2025-09-21 08:11', by: 'owner@example.com' },
  ])

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={700} mb={2}>Opening Balance Audit Trail</Typography>
          <List>
            {entries.map((e, i) => (
              <ListItem key={i} divider>
                <ListItemText primary={e.action} secondary={`${e.when} • ${e.by}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  )
}