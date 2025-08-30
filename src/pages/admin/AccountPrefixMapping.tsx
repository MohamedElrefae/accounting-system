import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'

interface Rule {
  id?: string
  prefix: string
  account_group: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
  description?: string | null
  is_active?: boolean
}

const groups: Rule['account_group'][] = ['assets','liabilities','equity','revenue','expenses']

const AccountPrefixMapping: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const [prefix, setPrefix] = useState('')
  const [group, setGroup] = useState<Rule['account_group']>('assets')
  const [desc, setDesc] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    // Longer prefixes first, then lexicographic
    return [...rules].sort((a,b) => (b.prefix.length - a.prefix.length) || a.prefix.localeCompare(b.prefix))
  }, [rules])

  useEffect(() => { refresh().catch(()=>{}) }, [])

  async function refresh() {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('account_prefix_map')
      .select('*')
      .order('prefix')
    if (error) setError(error.message)
    setRules(data || [])
    setLoading(false)
  }

  async function save() {
    if (!prefix.trim()) { setError('Prefix is required'); return }
    setLoading(true); setError('')
    const payload: any = { prefix: prefix.trim(), account_group: group, description: desc || null, is_active: true }
    let res
    if (editingId) {
      res = await supabase.from('account_prefix_map').update(payload).eq('id', editingId).select('*').single()
    } else {
      res = await supabase.from('account_prefix_map').insert(payload).select('*').single()
    }
    if ((res as any).error) setError((res as any).error.message)
    setPrefix(''); setDesc(''); setGroup('assets'); setEditingId(null)
    await refresh()
  }

  async function edit(rule: Rule) {
    setPrefix(rule.prefix)
    setGroup(rule.account_group)
    setDesc(rule.description || '')
    setEditingId(rule.id || null)
  }

  async function remove(id?: string) {
    if (!id) return
    if (!confirm('Delete this rule?')) return
    setLoading(true)
    const { error } = await supabase.from('account_prefix_map').delete().eq('id', id)
    if (error) setError(error.message)
    await refresh()
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2>Account Prefix Mapping</h2>
      <p>Configure how account codes are classified into Assets, Liabilities, Equity, Revenues, and Expenses. Longer prefixes have higher priority.</p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
        <label>Prefix:
          <input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="e.g. 11 or 230" style={{ marginInlineStart: 6 }} />
        </label>
        <label>Group:
          <select value={group} onChange={e => setGroup(e.target.value as any)} style={{ marginInlineStart: 6 }}>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label>Description:
          <input value={desc} onChange={e => setDesc(e.target.value)} style={{ marginInlineStart: 6, minWidth: 240 }} />
        </label>
        <button onClick={save} disabled={loading}>{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button onClick={() => { setEditingId(null); setPrefix(''); setDesc(''); setGroup('assets') }}>Cancel</button>}
        <button onClick={refresh} disabled={loading}>Reload</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f2f6ff' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Prefix</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Group</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Description</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Active</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 6, borderTop: '1px solid #eee' }}>{r.prefix}</td>
                <td style={{ padding: 6, borderTop: '1px solid #eee' }}>{r.account_group}</td>
                <td style={{ padding: 6, borderTop: '1px solid #eee' }}>{r.description || ''}</td>
                <td style={{ padding: 6, borderTop: '1px solid #eee' }}>{r.is_active ? 'Yes' : 'No'}</td>
                <td style={{ padding: 6, borderTop: '1px solid #eee' }}>
                  <button onClick={() => edit(r)} style={{ marginInlineEnd: 6 }}>Edit</button>
                  <button onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#888' }}>No rules yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AccountPrefixMapping
