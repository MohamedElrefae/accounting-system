import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import { useToast } from '../../contexts/ToastContext';
import * as svc from '../../services/document-categories';
import { useScopeOptional } from '../../contexts/ScopeContext';

interface Node extends svc.DocumentCategory { children?: Node[] }

function buildTree(rows: svc.DocumentCategory[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach(r => map.set(r.id, { ...r, children: [] }));
  const roots: Node[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id)!.children!.push(node);
    else roots.push(node);
  });
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a,b)=> (a.position||0)-(b.position||0));
    nodes.forEach(n => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export default function DocumentCategoriesPage() {
  const { showToast } = useToast();
  const scope = useScopeOptional();
  const orgId = scope?.currentOrg?.id || '';

  const [rows, setRows] = useState<svc.DocumentCategory[]>([]);
  const [filter, setFilter] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Node[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const tree = useMemo(()=> buildTree(rows), [rows]);

  // Build a map for breadcrumbs and quick path lookup
  const nodeMap = useMemo(()=>{
    const m = new Map<string, Node>();
    rows.forEach(r => m.set(r.id, { ...r } as Node));
    return m;
  }, [rows]);

  const getPath = (id: string): Node[] => {
    const path: Node[] = [];
    let cur = nodeMap.get(id) || null;
    while (cur) {
      path.unshift(cur);
      cur = cur.parent_id ? (nodeMap.get(cur.parent_id) || null) : null;
    }
    return path;
  };

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await svc.listCategories(orgId);
      setRows(data);
    } finally { setLoading(false); }
  }, [orgId]);

  useEffect(()=>{ refresh(); }, [refresh]);

  const addCategory = async (parentId: string | null) => {
    if (!orgId || !newName.trim()) return;
    try {
      const position = (rows.filter(r => r.parent_id === parentId).length) + 1;
      await svc.createCategory({ org_id: orgId, name: newName.trim(), parent_id: parentId, position });
      setNewName('');
      setCreatingFor(null);
      await refresh();
      showToast('تم إنشاء التصنيف', { severity: 'success' });
    } catch (e:any) { showToast(e?.message || 'فشل إنشاء التصنيف', { severity: 'error' }); }
  };

  const removeCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await svc.deleteCategory(id); await refresh(); showToast('تم حذف التصنيف', { severity: 'info' }); }
    catch(e:any){ showToast(e?.message || 'فشل حذف التصنيف', { severity: 'error' }); }
  };

  const move = async (node: svc.DocumentCategory, dir: -1|1) => {
    const siblings = rows.filter(r => r.parent_id === node.parent_id).sort((a,b)=>a.position-b.position);
    const idx = siblings.findIndex(s => s.id === node.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const a = siblings[idx];
    const b = siblings[swapIdx];
    try {
      await svc.reorderCategory(a.id, a.parent_id || null, b.position);
      await svc.reorderCategory(b.id, b.parent_id || null, a.position);
      await refresh();
    } catch(e:any){ showToast(e?.message || 'فشل إعادة الترتيب', { severity: 'error' }); }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropOnNode = async (targetId: string) => {
    try {
      if (!draggingId || draggingId === targetId) return;
      // Move dragged node under target node as last child
      const lastPos = rows.filter(r => r.parent_id === targetId).length + 1;
      await svc.reorderCategory(draggingId, targetId, lastPos);
      setDraggingId(null);
      await refresh();
    } catch (e:any) {
      showToast(e?.message || 'فشل نقل التصنيف', { severity: 'error' });
    }
  };

  const renderNode = (n: Node, level=0) => (
    <Box key={n.id}
      sx={{ pl: level*2, py: 0.5, borderLeft: level? '1px solid var(--mui-palette-divider)': 'none', borderRadius: 1, backgroundColor: draggingId === n.id ? 'action.selected' : 'transparent' }}
      draggable
      onDragStart={(e)=>onDragStart(e, n.id)}
      onDragOver={onDragOver}
      onDrop={()=>onDropOnNode(n.id)}
      onClick={()=> setBreadcrumb(getPath(n.id))}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {selectMode && (
          <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={(e)=>{
            setSelectedIds(prev => e.target.checked ? [...prev, n.id] : prev.filter(x => x !== n.id));
          }} />
        )}
        <Typography variant="body2">{n.name}</Typography>
        <IconButton size="small" onClick={()=>move(n,-1)}><ArrowUpward fontSize="inherit"/></IconButton>
        <IconButton size="small" onClick={()=>move(n,1)}><ArrowDownward fontSize="inherit"/></IconButton>
        <Button size="small" variant="text" onClick={()=>setCreatingFor(n.id)}>Add Child</Button>
        <IconButton size="small" onClick={()=>removeCategory(n.id)}><DeleteIcon fontSize="inherit"/></IconButton>
      </Stack>
      {creatingFor === n.id && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Name" value={newName} onChange={(e)=>setNewName(e.target.value)} />
          <Button size="small" variant="contained" onClick={()=>addCategory(n.id)}>Create</Button>
          <Button size="small" onClick={()=>{setCreatingFor(null); setNewName('');}}>Cancel</Button>
        </Stack>
      )}
      {n.children?.map(c => renderNode(c, level+1))}
    </Box>
  );

  // Apply filter to nodes (simple contains)
  const filterTree = (nodes: Node[]): Node[] => {
    if (!filter.trim()) return nodes;
    const match = (name: string) => name.toLowerCase().includes(filter.toLowerCase());
    const dfs = (ns: Node[]): Node[] => ns.map(n => ({...n, children: n.children ? dfs(n.children) : []}))
      .filter(n => match(n.name) || (n.children && n.children.length>0));
    return dfs(nodes);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Document Categories</Typography>
      <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems={{ xs:'stretch', sm:'center' }} sx={{ mb: 2 }}>
        <Button variant="outlined" onClick={refresh} disabled={loading}>Refresh</Button>
        <Button variant="contained" onClick={()=>setCreatingFor('root')}>Add Root</Button>
        <Button variant={selectMode ? 'contained' : 'outlined'} onClick={()=>{ setSelectMode(!selectMode); setSelectedIds([]); }}>{selectMode ? 'Cancel Select' : 'Select'}</Button>
        {selectMode && (
          <>
            <Button color="error" variant="outlined" disabled={selectedIds.length===0} onClick={async()=>{
              if (!confirm('Delete selected categories?')) return;
              for (const id of selectedIds) { try { await svc.deleteCategory(id); } catch {} }
              setSelectedIds([]);
              await refresh();
              showToast('تم حذف التصنيفات المحددة', { severity: 'info' });
            }}>Delete Selected</Button>
          </>
        )}
        <TextField size="small" label="Search" value={filter} onChange={(e)=>setFilter(e.target.value)} sx={{ minWidth: 200 }} />
      </Stack>

      {breadcrumb.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap:'wrap' }}>
          <Typography variant="caption">Path:</Typography>
          {breadcrumb.map((b, idx)=> (
            <Typography key={b.id} variant="caption">{b.name}{idx<breadcrumb.length-1 ? ' / ' : ''}</Typography>
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />
      {filterTree(tree).map(n => renderNode(n))}
      {tree.length === 0 && (<Typography variant="body2" color="text.secondary">No categories yet.</Typography>)}
    </Box>
  );
}