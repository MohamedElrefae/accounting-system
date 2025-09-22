import React from 'react'
import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { tokens } from '@/theme/tokens'

export default function ValidationRuleManagerPage() {
  const [ruleCode, setRuleCode] = React.useState('')
  const [nameEn, setNameEn] = React.useState('')
  const [severity, setSeverity] = React.useState<'info'|'warning'|'error'>('error')
  const [expression, setExpression] = React.useState('')

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={700} mb={2}>Validation Rule Manager</Typography>
          <Stack spacing={2}>
            <TextField size="small" label="Rule Code" value={ruleCode} onChange={(e)=> setRuleCode(e.target.value)} />
            <TextField size="small" label="Name (EN)" value={nameEn} onChange={(e)=> setNameEn(e.target.value)} />
            <TextField size="small" label="Severity (info|warning|error)" value={severity} onChange={(e)=> setSeverity(e.target.value as any)} />
            <TextField size="small" label="Validation Expression" value={expression} onChange={(e)=> setExpression(e.target.value)} multiline rows={3} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained">Save</Button>
              <Button variant="outlined">Test</Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}