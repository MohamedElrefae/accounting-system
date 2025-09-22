import React from 'react'
import { Box, Container, Paper, Stack, Typography, Button, List, ListItem, ListItemText } from '@mui/material'
import { tokens } from '@/theme/tokens'

export default function OpeningBalanceApprovalWorkflowPage() {
  // Placeholder approval steps; wire to approval_requests/approval_workflows as needed
  const [steps, setSteps] = React.useState([
    { name: 'Manager Verification', status: 'pending' },
    { name: 'Owner Approval', status: 'pending' },
    { name: 'Reviewer Audit', status: 'pending' },
  ])

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Opening Balance Approval Workflow</Typography>
            <Button size="small" variant="outlined" onClick={()=>{/* TODO: refresh from Supabase */}}>Refresh</Button>
          </Stack>
          <List>
            {steps.map((s, i) => (
              <ListItem key={i} divider>
                <ListItemText primary={`${i+1}. ${s.name}`} secondary={`Status: ${s.status}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  )
}