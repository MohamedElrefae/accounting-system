import React from 'react'
import { Box, Chip, List, ListItem, ListItemText, Paper, Stack, Typography, Button, ToggleButtonGroup, ToggleButton, Accordion, AccordionSummary, AccordionDetails, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { issuesToCsv } from '@/utils/csv'
import { validationReportToCsv, downloadCsv, toCsv } from '@/utils/csvExport'
import type { ValidationReport } from '@/services/OpeningBalanceImportService'

const ValidationResultsBase: React.FC<{ report?: ValidationReport | null }> = ({ report }) => {
  const [view, setView] = React.useState<'all' | 'errors' | 'warnings'>('all')
  if (!report) return null
  const fmt = React.useMemo(() => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [])

  // Persisted accordion state
  const [accOpen, setAccOpen] = React.useState<{ byAcc: boolean; byProj: boolean; byCC: boolean; rules: boolean }>(() => {
    try {
      return {
        byAcc: localStorage.getItem('obi_val_acc_byAcc') !== '0',
        byProj: localStorage.getItem('obi_val_acc_byProj') !== '0',
        byCC: localStorage.getItem('obi_val_acc_byCC') !== '0',
        rules: localStorage.getItem('obi_val_acc_rules') !== '0',
      }
    } catch { return { byAcc: true, byProj: true, byCC: true, rules: true } }
  })
  const persist = (key: keyof typeof accOpen, val: boolean) => {
    setAccOpen(s => ({ ...s, [key]: val }))
    try { localStorage.setItem(`obi_val_acc_${key}`, val ? '1' : '0') } catch {}
  }

  const exportJson = (which: 'errors'|'warnings') => {
    const data = which === 'errors' ? report.errors : report.warnings
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_${which}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const exportCsv = (which: 'errors'|'warnings') => {
    const data = which === 'errors' ? report.errors : report.warnings
    const csv = issuesToCsv(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_${which}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Helpers: generic exporters for arrays
  const exportArrayJson = (arr: unknown[], filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }
  const exportArrayCsv = (arr: unknown[], filename: string) => {
    try {
      const csv = toCsv(arr as any)
      downloadCsv(csv, filename)
    } catch {}
  }

  const copyId = async (id: unknown) => {
    try { await navigator.clipboard.writeText(String(id ?? '')); (window as any)?.toast?.success?.('Copied ID') } catch {}
  }
  const openAccountExplorer = (params: Record<string,string>) => {
    try {
      const usp = new URLSearchParams(params)
      const url = `/reports/account-explorer?${usp.toString()}`
      window.open(url, '_blank', 'noopener')
    } catch {}
  }

  const errorsList = (
    <List dense>
      {report.errors?.length ? report.errors.map((e, i) => (
        <ListItem key={i} disableGutters>
          <ListItemText primary={`${e.code}: ${e.message}`} secondary={e.row ? JSON.stringify(e.row) : undefined} />
        </ListItem>
      )) : <Typography variant="caption" color="text.secondary">No errors</Typography>}
    </List>
  )

  const warningsList = (
    <List dense>
      {report.warnings?.length ? report.warnings.map((w, i) => (
        <ListItem key={i} disableGutters>
          <ListItemText primary={`${w.code}: ${w.message}`} secondary={w.row ? JSON.stringify(w.row) : undefined} />
        </ListItem>
      )) : <Typography variant="caption" color="text.secondary">No warnings</Typography>}
    </List>
  )

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle1">Validation</Typography>
        {report.ok ? (
          <Chip size="small" color="success" label="OK" />
        ) : (
          <Chip size="small" color="error" label="Issues" />
        )}
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v)=> v && setView(v)} sx={{ ml: 'auto' }}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="errors">Errors</ToggleButton>
          <ToggleButton value="warnings">Warnings</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" onClick={()=>exportJson('errors')}>Errors JSON</Button>
        <Button size="small" onClick={()=>exportCsv('errors')}>Errors CSV</Button>
        <Button size="small" onClick={()=>exportJson('warnings')}>Warnings JSON</Button>
        <Button size="small" onClick={()=>exportCsv('warnings')}>Warnings CSV</Button>
        <Button size="small" variant="outlined" onClick={()=>{
          try {
            const csv = validationReportToCsv(report)
            downloadCsv(csv, 'validation_summary.csv')
          } catch {}
        }}>Summary CSV</Button>
      </Stack>
      {report.totals && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Rows: {report.totals.count} • Sum: {fmt.format(Number(report.totals.sum||0))}
        </Typography>
      )}

      {/* Breakdown sections if available */}
      {(report.by_account?.length || report.by_project?.length || report.by_cost_center?.length || report.active_rules?.length) ? (
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Server-side breakdowns</Typography>
          <Stack spacing={1}>
            {report.by_account?.length ? (
<Accordion disableGutters expanded={accOpen.byAcc} onChange={(_,v)=>persist('byAcc', !!v)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">By Account</Typography>
                    <Chip size="small" label={report.by_account.length} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button size="small" onClick={()=>exportArrayCsv(report.by_account!, 'validation_by_account.csv')}>CSV</Button>
                    <Button size="small" onClick={()=>exportArrayJson(report.by_account!, 'validation_by_account.json')}>JSON</Button>
                  </Stack>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{textAlign:'left'}}>account_id</th><th style={{textAlign:'right'}}>total</th></tr></thead>
                    <tbody>
                      {report.by_account.slice(0,50).map((r, i)=> (
                        <tr key={i}>
                          <td>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span style={{ color:'#1976d2', cursor:'pointer', textDecoration:'underline' }} title="Copy ID" onClick={()=>copyId(r.account_id)}>{String(r.account_id)}</span>
                              <IconButton size="small" title="Open in Account Explorer" onClick={()=>openAccountExplorer({ account_id: String(r.account_id) })}><OpenInNewIcon fontSize="inherit" /></IconButton>
                            </Stack>
                          </td>
                          <td style={{textAlign:'right'}}>{fmt.format(Number(r.total||0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Total ({report.by_account.length})</td>
                        <td style={{ textAlign:'right', fontWeight: 600 }}>
                          {fmt.format(report.by_account.reduce((s:any, x:any)=> s + Number(x.total||0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ) : null}
            {report.by_project?.length ? (
<Accordion disableGutters expanded={accOpen.byProj} onChange={(_,v)=>persist('byProj', !!v)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">By Project</Typography>
                    <Chip size="small" label={report.by_project.length} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button size="small" onClick={()=>exportArrayCsv(report.by_project!, 'validation_by_project.csv')}>CSV</Button>
                    <Button size="small" onClick={()=>exportArrayJson(report.by_project!, 'validation_by_project.json')}>JSON</Button>
                  </Stack>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{textAlign:'left'}}>project_id</th><th style={{textAlign:'right'}}>total</th></tr></thead>
                    <tbody>
                      {report.by_project.slice(0,50).map((r, i)=> (
                        <tr key={i}>
                          <td>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span style={{ color:'#1976d2', cursor:'pointer', textDecoration:'underline' }} title="Copy ID" onClick={()=>copyId(r.project_id)}>{String(r.project_id)}</span>
                              <IconButton size="small" title="Open in Account Explorer" onClick={()=>openAccountExplorer({ project_id: String(r.project_id) })}><OpenInNewIcon fontSize="inherit" /></IconButton>
                            </Stack>
                          </td>
                          <td style={{textAlign:'right'}}>{fmt.format(Number(r.total||0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Total ({report.by_project.length})</td>
                        <td style={{ textAlign:'right', fontWeight: 600 }}>
                          {fmt.format(report.by_project.reduce((s:any, x:any)=> s + Number(x.total||0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ) : null}
            {report.by_cost_center?.length ? (
<Accordion disableGutters expanded={accOpen.byCC} onChange={(_,v)=>persist('byCC', !!v)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">By Cost Center</Typography>
                    <Chip size="small" label={report.by_cost_center.length} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button size="small" onClick={()=>exportArrayCsv(report.by_cost_center!, 'validation_by_cost_center.csv')}>CSV</Button>
                    <Button size="small" onClick={()=>exportArrayJson(report.by_cost_center!, 'validation_by_cost_center.json')}>JSON</Button>
                  </Stack>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{textAlign:'left'}}>cost_center_id</th><th style={{textAlign:'right'}}>total</th></tr></thead>
                    <tbody>
                      {report.by_cost_center.slice(0,50).map((r, i)=> (
                        <tr key={i}>
                          <td>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span style={{ color:'#1976d2', cursor:'pointer', textDecoration:'underline' }} title="Copy ID" onClick={()=>copyId(r.cost_center_id)}>{String(r.cost_center_id)}</span>
                              <IconButton size="small" title="Open in Account Explorer" onClick={()=>openAccountExplorer({ cost_center_id: String(r.cost_center_id) })}><OpenInNewIcon fontSize="inherit" /></IconButton>
                            </Stack>
                          </td>
                          <td style={{textAlign:'right'}}>{fmt.format(Number(r.total||0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Total ({report.by_cost_center.length})</td>
                        <td style={{ textAlign:'right', fontWeight: 600 }}>
                          {fmt.format(report.by_cost_center.reduce((s:any, x:any)=> s + Number(x.total||0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ) : null}
{report.active_rules?.length ? (
              <Accordion disableGutters expanded={accOpen.rules} onChange={(_,v)=>persist('rules', !!v)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">Active Rules</Typography>
                    <Chip size="small" label={report.active_rules.length} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                    <Button size="small" onClick={()=>exportArrayCsv(report.active_rules!, 'validation_active_rules.csv')}>CSV</Button>
                    <Button size="small" onClick={()=>exportArrayJson(report.active_rules!, 'validation_active_rules.json')}>JSON</Button>
                  </Stack>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {report.active_rules.slice(0,100).map((r)=> (
                      <Chip key={r.id} size="small" label={`${r.rule_code} (${r.severity})`} color={r.severity==='error'?'error':r.severity==='warning'?'warning':'default'} />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {view === 'all' ? (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
          <Box>
            <Typography variant="subtitle2" color="error.main">Errors</Typography>
            {errorsList}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="warning.main">Warnings</Typography>
            {warningsList}
          </Box>
        </Box>
      ) : view === 'errors' ? (
        <Box>
          <Typography variant="subtitle2" color="error.main">Errors</Typography>
          {errorsList}
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle2" color="warning.main">Warnings</Typography>
          {warningsList}
        </Box>
      )}
    </Paper>
  )
}

export const ValidationResults = React.memo(ValidationResultsBase)
