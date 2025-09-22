import React from 'react'
import { Box, Container, Paper, Stack, Typography, List, ListItem, ListItemText, Button } from '@mui/material'
import { tokens } from '@/theme/tokens'

export default function ApprovalNotificationCenterPage() {
  const [items, setItems] = React.useState([
    { title: 'Approve Opening Balance Import #123', createdAt: '2025-09-22', status: 'pending' },
  ])

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Typography variant="h5" fontWeight={700}>Approval Notification Center</Typography>
            <Button size="small" onClick={()=>{/* TODO load from approval_requests */}}>Refresh</Button>
          </Stack>
          <List>
            {items.map((it, i) => (
              <ListItem key={i} divider>
                <ListItemText primary={it.title} secondary={`${it.createdAt} • ${it.status}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  )
}