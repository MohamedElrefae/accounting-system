import { supabase } from '../utils/supabase'

export interface ReportPreset {
  id: string
  report_key: string
  name: string
  filters: any
  columns: string[]
  created_at: string
  updated_at: string
}

export async function listReportPresets(reportKey: string): Promise<ReportPreset[]> {
  const { data, error } = await supabase.rpc('get_report_presets', { p_report_key: reportKey })
  if (error) throw error
  return (data as ReportPreset[]) ?? []
}

export async function saveReportPreset(params: {
  id?: string | null
  reportKey: string
  name: string
  filters: any
  columns: string[]
}): Promise<ReportPreset> {
  const { data, error } = await supabase.rpc('upsert_report_preset', {
    p_id: params.id ?? null,
    p_report_key: params.reportKey,
    p_name: params.name,
    p_filters: params.filters,
    p_columns: params.columns,
  })
  if (error) throw error
  return data as ReportPreset
}

export async function deleteReportPreset(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_report_preset', { p_id: id })
  if (error) throw error
}
