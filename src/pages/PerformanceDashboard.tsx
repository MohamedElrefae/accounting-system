import React from 'react'
import { Box, Container, Paper, Typography, List, ListItem, ListItemText } from '@mui/material'
import { ApplicationPerformanceMonitor } from '@/services/ApplicationPerformanceMonitor'

export default function PerformanceDashboardPage() {
  const [events, setEvents] = React.useState(ApplicationPerformanceMonitor.list())
  React.useEffect(()=>{
    const id = setInterval(()=> setEvents([...ApplicationPerformanceMonitor.list()]), 10000) // Reduced from 2s to 10s
    return ()=> clearInterval(id)
  }, [])
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={700} mb={2}>Performance Dashboard</Typography>
          <List>
            {events.map((e,i)=> (
              <ListItem key={i} divider>
                <ListItemText primary={`${e.name}: ${e.value}`} secondary={new Date(e.at).toISOString()} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  )
}