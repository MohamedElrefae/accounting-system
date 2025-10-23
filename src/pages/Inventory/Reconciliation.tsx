import React, { useEffect, useState, useMemo } from 'react'
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ReconciliationService, type ReconSession } from '@/services/inventory/reconciliation'
import { useNavigate } from 'react-router-dom'

export default function ReconciliationPage() {
  const [rows, setRows] = useState<ReconSession[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await ReconciliationService.listSessions()
        if (mounted) setRows(data)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'session_name', headerName: 'Session', flex: 1, minWidth: 220 },
    { field: 'status', headerName: 'Status', width: 140 },
    { field: 'created_at', headerName: 'Created', width: 200 },
    { field: 'updated_at', headerName: 'Updated', width: 200 },
    {
      field: 'actions', headerName: 'Actions', width: 160, sortable: false, renderCell: (params) => (
        <Button size="small" variant="outlined" onClick={() => navigate(`/inventory/reconciliation/${params.row.id}`)}>Open</Button>
      )
    }
  ], [navigate])

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>Inventory Reconciliation</Typography>
          <Paper variant="outlined" sx={{ height: 520 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              disableRowSelectionOnClick
              sx={{ border: 0 }}
            />
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}