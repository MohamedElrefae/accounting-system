import React from 'react'
import { Card, CardContent, Grid, Typography } from '@mui/material'
import QuickVoidForm from '@/components/Inventory/QuickVoidForm'
import DocumentActionsBar from '@/components/Inventory/DocumentActionsBar'
import { RequirePermission } from '@/components/security/RequirePermission'

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <Card>
    <CardContent>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="h5">{value}</Typography>
    </CardContent>
  </Card>
)

const InventoryDashboardPage: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Inventory Dashboard / لوحة المخزون</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}><StatCard title="Materials" value="—" /></Grid>
        <Grid item xs={12} md={3}><StatCard title="Locations" value="—" /></Grid>
        <Grid item xs={12} md={3}><StatCard title="On Hand Value" value="—" /></Grid>
        <Grid item xs={12} md={3}><StatCard title="Pending Approvals" value="—" /></Grid>
        <Grid item xs={12} md={6}>
          <RequirePermission allOf={['inventory.post']}>
            <QuickVoidForm />
          </RequirePermission>
        </Grid>
        <Grid item xs={12} md={6}>
          <DocumentActionsBar />
        </Grid>
      </Grid>

    </div>
  )
}

export default InventoryDashboardPage