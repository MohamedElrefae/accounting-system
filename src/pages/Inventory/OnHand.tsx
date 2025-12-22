import React, { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Grid, TextField, Box, MenuItem } from '@mui/material'
import { listInventoryOnHandFiltered } from '@/services/inventory/documents'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'
import { getDisplayName } from '@/utils/inventoryDisplay'
import { useScopeOptional } from '@/contexts/ScopeContext'

const OnHandPage: React.FC = () => {
  const { t, isRTL } = useArabicLanguage()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const [rows, setRows] = useState<any[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [materialId, setMaterialId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [qText, setQText] = useState<string>('')

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    Promise.all([
      listInventoryOnHandFiltered({ orgId, materialId: materialId || undefined, locationId: locationId || undefined }),
      listMaterials(orgId),
      listInventoryLocations(orgId)
    ]).then(([rowsRes, mats, locs]) => { setRows(rowsRes); setMaterials(mats); setLocations(locs) }).finally(() => setLoading(false))
  }, [orgId, materialId, locationId])

  return (
    <Box sx={{ padding: 2, direction: isRTL ? 'rtl' : 'ltr' }}>
      <Typography variant="h4" gutterBottom>
        {t(INVENTORY_TEXTS.onHand)}
      </Typography>
      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField 
                fullWidth 
                label={t({ en: 'Search (material/location)', ar: 'بحث (مادة/موقع)' })} 
                value={qText} 
                onChange={e=>setQText(e.target.value)} 
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                select 
                fullWidth 
                label={t(INVENTORY_TEXTS.material)} 
                value={materialId} 
                onChange={e=>setMaterialId(e.target.value)}
              >
                <MenuItem value="">{t(INVENTORY_TEXTS.all)}</MenuItem>
                {materials.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.material_code} - {getDisplayName(m)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField 
                select 
                fullWidth 
                label={t(INVENTORY_TEXTS.location)} 
                value={locationId} 
                onChange={e=>setLocationId(e.target.value)}
              >
                <MenuItem value="">{t(INVENTORY_TEXTS.all)}</MenuItem>
                {locations.map(l => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.location_code} - {getDisplayName({ location_name: l.location_name, location_name_ar: (l as any).location_name_ar })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {loading ? (
            <Typography>{t({ en: 'Loading...', ar: 'جاري التحميل...' })}</Typography>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', padding: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {t({ en: 'No inventory data found', ar: 'لا توجد بيانات مخزون' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t({ en: 'Receive materials to see inventory balances', ar: 'استلم مواد لرؤية أرصدة المخزون' })}
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t(INVENTORY_TEXTS.material)}</TableCell>
                  <TableCell>{t(INVENTORY_TEXTS.location)}</TableCell>
                  <TableCell align="right">{t(INVENTORY_TEXTS.onHand)}</TableCell>
                  <TableCell align="right">{t({ en: 'Available', ar: 'المتاح' })}</TableCell>
                  <TableCell align="right">{t({ en: 'Avg Cost', ar: 'متوسط التكلفة' })}</TableCell>
                  <TableCell align="right">{t(INVENTORY_TEXTS.totalValue)}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.filter(r =>
                  !qText || `${r.material_code} ${r.material_name} ${r.location_code} ${r.location_name}`.toLowerCase().includes(qText.toLowerCase())
                ).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.material_code} - {getDisplayName({ material_name: r.material_name, material_name_ar: r.material_name_ar })}</TableCell>
                    <TableCell>{r.location_code} - {getDisplayName({ location_name: r.location_name, location_name_ar: r.location_name_ar })}</TableCell>
                    <TableCell align="right">{Number(r.quantity_on_hand || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.quantity_available || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.average_cost || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.total_value || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default OnHandPage