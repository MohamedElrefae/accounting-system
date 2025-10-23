import React, { useEffect, useState } from 'react'
import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'

interface KPI {
  label: string
  value: string | number
}

export default function InventoryKPIDashboardPage() {
  const orgId = getActiveOrgId?.() || null
  const [loading, setLoading] = useState(false)
  const [kpis, setKpis] = useState<KPI[]>([
    { label: 'Total Valuation', value: '-' },
    { label: 'Total On-Hand Qty', value: '-' },
    { label: 'Ageing > 90 Days (Qty)', value: '-' },
    { label: 'Last Month Movements (In/Out)', value: '-' }
  ])

  const loadKpis = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      // 1) Total Valuation and Total On-Hand from valuation by project (sums)
      const { data: valProj, error: valErr } = await supabase
        .from('v_inv_valuation_by_project')
        .select('total_quantity,total_value')
        .eq('org_id', orgId)
      if (valErr) throw valErr
      const totalQty = (valProj || []).reduce((a: number, r: any) => a + Number(r.total_quantity || 0), 0)
      const totalVal = (valProj || []).reduce((a: number, r: any) => a + Number(r.total_value || 0), 0)

      // 2) Ageing > 90 days (sum qty where days_since_inbound > 90)
      const { data: ageing, error: ageErr } = await supabase
        .from('v_inv_stock_ageing')
        .select('on_hand_qty, days_since_inbound')
        .eq('org_id', orgId)
        .gt('days_since_inbound', 90)
      if (ageErr) throw ageErr
      const ageingQty = (ageing || []).reduce((a: number, r: any) => a + Number(r.on_hand_qty || 0), 0)

      // 3) Last month movements (In/Out) from project-month summary
      // Compute YYYY-MM for last calendar month
      const now = new Date()
      const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const yyyy = lastMonthDate.getUTCFullYear()
      const mm = String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0')
      const lastMonthKey = `${yyyy}-${mm}-01` // period_month compares lexically as date-like

      const { data: mv, error: mvErr } = await supabase
        .from('v_inv_movement_summary_project_month')
        .select('period_month, qty_in, qty_out')
        .eq('org_id', orgId)
        .gte('period_month', `${yyyy}-${mm}`)
        .lte('period_month', `${yyyy}-${mm}`)
      if (mvErr) throw mvErr
      const inSum = (mv || []).reduce((a: number, r: any) => a + Number(r.qty_in || 0), 0)
      const outSum = (mv || []).reduce((a: number, r: any) => a + Number(r.qty_out || 0), 0)

      setKpis([
        { label: 'Total Valuation', value: Intl.NumberFormat().format(Math.round(totalVal)) },
        { label: 'Total On-Hand Qty', value: Intl.NumberFormat().format(Math.round(totalQty)) },
        { label: 'Ageing > 90 Days (Qty)', value: Intl.NumberFormat().format(Math.round(ageingQty)) },
        { label: 'Last Month Movements (In/Out)', value: `${inSum} / ${outSum}` }
      ])
    } catch (e) {
      // fallback values remain '-'
      console.error('Error loading KPIs', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadKpis() }, [orgId])

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>Inventory Dashboard (KPIs)</Typography>
          <Grid container spacing={2}>
            {kpis.map((kpi, idx) => (
              <Grid key={idx} item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{loading ? 'Loading…' : kpi.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}