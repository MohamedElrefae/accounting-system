import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Security as SecurityIcon,
  UnfoldMore as ExpandIcon,
  UnfoldLess as CompressIcon,
} from '../icons/SimpleIcons';
import { useQueryClient } from '@tanstack/react-query';
import * as svc from '../../services/documents';
import { useToast } from '../../contexts/ToastContext';
import { useDocumentVersions } from '../../hooks/documents/useDocuments';
import DocumentPermissionsDialog from './DocumentPermissionsDialog';
import { useHasPermission } from '../../hooks/useHasPermission';
import { supabase } from '../../utils/supabase';

interface DocumentDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  document: svc.Document | null;
}

export default function DocumentDetailsDrawer({ open, onClose, document }: DocumentDetailsDrawerProps) {
  const hasPerm = useHasPermission();
  const { data: versions = [] } = useDocumentVersions(document?.id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permOpen, setPermOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [compact, setCompact] = useState(false);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  // Version preview selection
  const [selectedVersion, setSelectedVersion] = useState<svc.DocumentVersion | null>(null);

  // Compare state
  const [compareA, setCompareA] = useState<svc.DocumentVersion | null>(null);
  const [compareB, setCompareB] = useState<svc.DocumentVersion | null>(null);
  const [compareAUrl, setCompareAUrl] = useState<string | null>(null);
  const [compareBUrl, setCompareBUrl] = useState<string | null>(null);
  const [compareAText, setCompareAText] = useState<string | null>(null);
  const [compareBText, setCompareBText] = useState<string | null>(null);

  // Editing state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');

  // Linking state
  const [linkType, setLinkType] = useState<'transactions' | 'projects'>('transactions');
  const [linkId, setLinkId] = useState('');

  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvalActions, setApprovalActions] = useState<any[]>([]);
  const [statusAudits, setStatusAudits] = useState<any[]>([]);

  const latest = useMemo(() => versions?.[0], [versions]);
  const qc = useQueryClient();
  const { showToast } = useToast();

  // Reset edit inputs when document changes
  useEffect(() => {
    if (document) {
      setTitleInput(document.title || '');
      setDescInput((document as any).description || '');
      setEditMode(false);
    }
  }, [document?.id]);

  // Load category and project labels
  useEffect(() => {
    (async () => {
      try {
        setCategoryName(null);
        setProjectName(null);
        if (document?.category_id) {
          const { data } = await supabase.from('document_categories').select('name').eq('id', document.category_id).single();
          setCategoryName((data as any)?.name || null);
        }
        if (document?.project_id) {
          const { data } = await supabase.from('projects').select('name, name_ar').eq('id', document.project_id).single();
          setProjectName(((data as any)?.name_ar) || (data as any)?.name || null);
        }
      } catch {}
    })();
  }, [document?.category_id, document?.project_id]);

  // Update compare defaults when versions list changes
  useEffect(() => {
    if (versions && versions.length >= 2) {
      setCompareA(versions[0]);
      setCompareB(versions[1]);
    } else if (versions && versions.length === 1) {
      setCompareA(versions[0]);
      setCompareB(null);
    } else {
      setCompareA(null);
      setCompareB(null);
    }
  }, [document?.id, versions?.length]);

  // Load compare URLs/text where possible
  useEffect(() => {
    (async () => {
      try {
        const load = async (v: svc.DocumentVersion | null) => {
          if (!v?.storage_path) return { url: null as string | null, text: null as string | null };
          const url = await svc.getSignedUrl(v.storage_path);
          // Decide if we should attempt text fetch
          const mt = (v.mime_type || '').toLowerCase();
          const isText = mt.startsWith('text/') || mt.includes('json') || mt.includes('csv');
          let text: string | null = null;
          if (isText) {
            try {
              const res = await fetch(url);
              text = await res.text();
            } catch {}
          }
          return { url, text };
        };
        const a = await load(compareA);
        const b = await load(compareB);
        setCompareAUrl(a.url);
        setCompareBUrl(b.url);
        setCompareAText(a.text);
        setCompareBText(b.text);
      } catch {
        setCompareAUrl(null);
        setCompareBUrl(null);
        setCompareAText(null);
        setCompareBText(null);
      }
    })();
  }, [compareA?.id, compareA?.storage_path, compareA?.mime_type, compareB?.id, compareB?.storage_path, compareB?.mime_type]);

  // Preview selected version (falls back to latest)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const path = selectedVersion?.storage_path ?? latest?.storage_path;
        if (path) {
          const url = await svc.getSignedUrl(path);
          if (active) setPreviewUrl(url);
        } else setPreviewUrl(null);
      } catch { setPreviewUrl(null); }
    })();
    return () => { active = false; };
  }, [latest?.storage_path, selectedVersion?.storage_path]);

  // Fetch approvals history
  useEffect(() => {
    if (!document?.id) return;
    (async () => {
      try {
        setHistoryLoading(true);
        const { data: reqs } = await supabase
          .from('approval_requests')
          .select('id')
          .eq('target_table', 'documents')
          .eq('target_id', document.id);
        const reqIds = new Set((reqs || []).map((r: any) => r.id));

        const { data: approvals } = await supabase
          .from('approval_actions')
          .select('id, action, reason, created_at, request_id, actor_user_id')
          .order('created_at', { ascending: false });
        const filteredApprovals = (approvals || []).filter((a: any) => reqIds.has(a.request_id));
        setApprovalActions(filteredApprovals);

        const { data: audits } = await supabase
          .from('document_audit_log')
          .select('id, event_type, actor_id, details, created_at')
          .eq('document_id', document.id)
          .eq('event_type', 'approval_decision')
          .order('created_at', { ascending: false });
        setStatusAudits(audits || []);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [document?.id]);

  const downloadLatest = async () => {
    if (!latest?.storage_path) return;
    const url = await svc.getSignedUrl(latest.storage_path, 300);
    window.open(url, '_blank');
  };

  const copyLatestLink = async () => {
    if (!latest?.storage_path) return;
    const url = await svc.getSignedUrl(latest.storage_path, 300);
    await (navigator as any)?.clipboard?.writeText?.(url);
    showToast('Share link copied', { severity: 'success' });
  };

  const copyVersionLink = async (storagePath: string) => {
    const url = await svc.getSignedUrl(storagePath, 300);
    await (navigator as any)?.clipboard?.writeText?.(url);
    showToast('Version link copied', { severity: 'success' });
  };

  const downloadVersion = async (storagePath: string) => {
    const url = await svc.getSignedUrl(storagePath, 300);
    window.open(url, '_blank');
  };

  const saveEdits = async () => {
    if (!document) return;
    try {
      setSaving(true);
      const updated = await svc.updateDocument(document.id, { title: titleInput, description: descInput } as any);
      showToast('Document updated', { severity: 'success' });
      setEditMode(false);
      await qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
    } catch (e: any) {
      showToast(e?.message || 'Update failed', { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async () => {
    if (!document) return;
    const confirmDel = window.confirm('Delete this document and all versions? This cannot be undone.');
    if (!confirmDel) return;
    try {
      await svc.deleteDocument(document.id);
      showToast('Document deleted', { severity: 'success' });
      await qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
      onClose();
    } catch (e: any) {
      showToast(e?.message || 'Delete failed', { severity: 'error' });
    }
  };

  const linkEntity = async () => {
    if (!document || !linkId) return;
    try {
      await svc.linkDocument(document.id, linkType, linkId);
      showToast('Linked successfully', { severity: 'success' });
      setLinkId('');
    } catch (e: any) {
      showToast(e?.message || 'Link failed', { severity: 'error' });
    }
  };

  const unlinkEntity = async () => {
    if (!document || !linkId) return;
    try {
      await svc.unlinkDocument(document.id, linkType, linkId);
      showToast('Unlinked successfully', { severity: 'success' });
      setLinkId('');
    } catch (e: any) {
      showToast(e?.message || 'Unlink failed', { severity: 'error' });
    }
  };

  const renderPreview = () => {
    if (!latest || !previewUrl) return (
      <Typography variant="body2" color="text.secondary">No preview available.</Typography>
    );
    const mime = latest.mime_type || '';
    if (mime.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'background.default', p: 1 }}>
          <img src={previewUrl} alt={latest.file_name} style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8 }} />
        </Box>
      );
    }
    if (mime === 'application/pdf') {
      return (
        <Box sx={{ height: 420, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <iframe title="pdf" src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
        </Box>
      );
    }
    return (
      <Typography variant="body2" color="text.secondary">Unsupported format: {mime}. Use Download to view.</Typography>
    );
  };

  // Helpers for compare rendering
  const renderComparePane = (v: svc.DocumentVersion | null, url: string | null, text: string | null) => {
    if (!v) return <Typography variant="body2" color="text.secondary">Select a version</Typography>;
    const mime = (v.mime_type || '').toLowerCase();
    if (text != null) {
      return renderHighlightedText(text, mime);
    }
    if (mime.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'background.default', p: 1 }}>
          {url ? <img src={url} alt={v.file_name} style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8 }} /> : <Typography variant="body2" color="text.secondary">No preview.</Typography>}
        </Box>
      );
    }
    if (mime === 'application/pdf') {
      return (
        <Box sx={{ height: 420, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {url ? <iframe title={`pdf-${v.id}`} src={url} style={{ width: '100%', height: '100%', border: 'none' }} /> : <Typography variant="body2" color="text.secondary">No preview.</Typography>}
        </Box>
      );
    }
    return <Typography variant="body2" color="text.secondary">Preview not available. Try Download.</Typography>;
  };

  // Syntax highlighting for simple types (JSON, CSV, plain)
  function renderHighlightedText(text: string, mime?: string | null) {
    const isJSON = (mime || '').includes('json');
    const isCSV = (mime || '').includes('csv');

    const color = {
      key: '#c792ea',
      string: '#91b859',
      number: '#f78c6c',
      boolean: '#ff5370',
      nullish: '#ff5370',
      comma: '#89ddff',
      colon: '#89ddff',
      default: 'inherit',
    } as const;

    const highlightJSONLine = (line: string, idx: number) => {
      const parts: React.ReactNode[] = [];
      let i = 0;
      const push = (text: string, style?: React.CSSProperties) => parts.push(<span key={`${idx}-${parts.length}`} style={style}>{text}</span>);
      while (i < line.length) {
        const rest = line.slice(i);
        // String
        const mStr = rest.match(/^"(?:[^"\\]|\\.)*"/);
        if (mStr) {
          const val = mStr[0];
          // Key if followed by colon in remaining
          const isKey = line.slice(i + val.length).trimStart().startsWith(':');
          push(val, { color: isKey ? color.key : color.string });
          i += val.length;
          continue;
        }
        // Number
        const mNum = rest.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (mNum) { push(mNum[0], { color: color.number }); i += mNum[0].length; continue; }
        // Boolean/null
        const mBool = rest.match(/^(true|false|null)/);
        if (mBool) { push(mBool[0], { color: color.boolean }); i += mBool[0].length; continue; }
        // Punctuation
        const ch = rest[0];
        if (ch === ':' || ch === ',') { push(ch, { color: color.colon }); i++; continue; }
        // Default
        push(ch, { color: color.default }); i++;
      }
      return <div key={idx}>{parts}</div>;
    };

    const renderLine = (line: string, idx: number) => {
      if (isJSON) return highlightJSONLine(line, idx);
      // For CSV we can lightly color commas
      if (isCSV) {
        const segs = line.split(',');
        return (
          <div key={idx}>
            {segs.map((s, i2) => (
              <React.Fragment key={`${idx}-${i2}`}>
                <span>{s}</span>
                {i2 < segs.length - 1 && <span style={{ color: color.comma }}>,</span>}
              </React.Fragment>
            ))}
          </div>
        );
      }
      return <div key={idx}>{line}</div>;
    };

    return (
      <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre', wordBreak: 'normal', maxHeight: 420, overflow: 'auto', p: 1 }}>
        {text.split(/\r?\n/).map((ln, i) => renderLine(ln, i))}
      </Box>
    );
  }

  // Minimal unified diff renderer (line-based LCS)
  function renderUnifiedDiff(aText: string, bText: string, mimeHint?: string | null) {
    const a = aText.split(/\r?\n/);
    const b = bText.split(/\r?\n/);

    // LCS table
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    // Reconstruct
    const out: { type: 'same' | 'del' | 'add'; text: string }[] = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (a[i] === b[j]) { out.push({ type: 'same', text: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
      else { out.push({ type: 'add', text: b[j] }); j++; }
    }
    while (i < m) { out.push({ type: 'del', text: a[i++] }); }
    while (j < n) { out.push({ type: 'add', text: b[j++] }); }

    return (
      <Box sx={{ fontFamily: 'monospace', fontSize: 12, maxHeight: 300, overflow: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
        {out.map((row, idx) => (
          <Box key={idx} sx={{
            px: 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: row.type === 'add' ? 'rgba(76, 175, 80, 0.15)' : row.type === 'del' ? 'rgba(244, 67, 54, 0.12)' : 'transparent',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography component="span" sx={{ color: row.type === 'add' ? 'success.main' : row.type === 'del' ? 'error.main' : 'text.secondary', mr: 1 }}>
              {row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '}
            </Typography>
            <span>{renderHighlightedText(row.text, mimeHint)}</span>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: compact ? 380 : 520 } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Document Details</Typography>
          <Stack direction="row" spacing={1}>
            {hasPerm('documents.update') && (
              <Button size="small" onClick={() => setEditMode(v => !v)} variant={editMode ? 'contained' : 'outlined'}>
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            )}
            {hasPerm('documents.manage') && (
              <Button size="small" color="error" onClick={deleteDoc} variant="outlined">Delete</Button>
            )}
            <IconButton onClick={() => setCompact(v => !v)} title={compact ? 'Expand' : 'Compact'}>
              {compact ? <ExpandIcon /> : <CompressIcon />}
            </IconButton>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Stack>
        </Stack>

        {document && (
          <>
            {!editMode ? (
              <>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>{document.title}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip label={document.status} size="small" />
                  {document.category_id && <Chip label={`Category: ${categoryName || '...'}`} size="small" variant="outlined" />}
                  {document.project_id && <Chip label={`Project: ${projectName || '...'}`} size="small" variant="outlined" />}
                </Stack>
              </>
            ) : (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField label="Title" size="small" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} />
                <TextField label="Description" size="small" value={descInput} onChange={(e) => setDescInput(e.target.value)} multiline minRows={2} />
                <Stack direction="row" spacing={1}>
                  <Button onClick={saveEdits} disabled={saving} variant="contained">{saving ? 'Saving...' : 'Save'}</Button>
                  <Button onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
                </Stack>
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
              <Tab label="Overview" />
              <Tab label="History" />
              <Tab label="Compare" />
              <Tab label="Permissions" />
            </Tabs>

            {tab === 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>{selectedVersion ? `Previewing v${selectedVersion.version_number}` : 'Latest Version'}</Typography>
                {!compact && renderPreview()}

                {selectedVersion && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="text" onClick={() => setSelectedVersion(null)}>View Latest</Button>
                  </Stack>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={downloadLatest} disabled={!latest?.storage_path}>
                    Download
                  </Button>
                  <Button size="small" variant="outlined" onClick={copyLatestLink} disabled={!latest?.storage_path}>
                    Copy Share Link
                  </Button>
                  {hasPerm('documents.update') && (
                    <Button size="small" variant="outlined" component="label" disabled={uploadBusy}>
                      {uploadBusy ? 'Uploading...' : 'New Version'}
                      <input hidden type="file" onChange={async (e) => {
                        try {
                          const file = e.target.files?.[0];
                          if (!file || !document) return;
                          setUploadBusy(true);
                          await svc.createDocumentVersion(document.id, (document as any).org_id, file);
                          await qc.refetchQueries({ queryKey: ['document-versions', document.id], type: 'active' });
                          await qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
                        } finally {
                          setUploadBusy(false);
                        }
                      }} />
                    </Button>
                  )}
                  {hasPerm('documents.manage') && (
                    <Button size="small" variant="text" startIcon={<SecurityIcon />} onClick={() => setPermOpen(true)}>Permissions</Button>
                  )}
                </Stack>

                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Link to other sections</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel id="link-type-label">Entity</InputLabel>
                      <Select labelId="link-type-label" label="Entity" value={linkType} onChange={(e) => setLinkType(e.target.value as any)}>
                        <MenuItem value="transactions">Transaction</MenuItem>
                        <MenuItem value="projects">Project</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField size="small" label="ID" value={linkId} onChange={(e) => setLinkId(e.target.value)} sx={{ minWidth: 160 }} />
                    <Button size="small" variant="outlined" onClick={linkEntity} disabled={!linkId}>Link</Button>
                    <Button size="small" variant="text" onClick={unlinkEntity} disabled={!linkId}>Unlink</Button>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Version History</Typography>
                <Box sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {(versions ?? []).map(v => (
                    <Stack key={v.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1 }}>
                      <Typography variant="body2">v{v.version_number} • {v.file_name}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => { setSelectedVersion(v); setTab(0); }} disabled={!v.storage_path}>View</Button>
                        <Button size="small" onClick={() => downloadVersion(v.storage_path)} disabled={!v.storage_path}>Download</Button>
                        <Button size="small" onClick={() => copyVersionLink(v.storage_path)} disabled={!v.storage_path}>Copy Link</Button>
                        {hasPerm('documents.update') && (
                          <Button size="small" color="secondary" onClick={async () => {
                            try {
                              const ok = window.confirm(`Set v${v.version_number} as current version?`);
                              if (!ok) return;
                              await svc.promoteDocumentVersion(v.id);
                              showToast(`Promoted v${v.version_number} to current`, { severity: 'success' });
                              await qc.refetchQueries({ queryKey: ['documents'], type: 'active' });
                              await qc.refetchQueries({ queryKey: ['document-versions', document?.id], type: 'active' });
                              setSelectedVersion(v);
                              setTab(0);
                            } catch (e: any) {
                              showToast(e?.message || 'Failed to set current version', { severity: 'error' });
                            }
                          }}>Set as current</Button>
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{new Date(v.uploaded_at).toLocaleString()}</Typography>
                    </Stack>
                  ))}
                  {(!versions || versions.length === 0) && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No versions.</Typography>
                  )}
                </Box>
              </>
            )}

            {tab === 1 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Version History</Typography>
                <Box sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {(versions ?? []).map(v => (
                    <Stack key={v.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1 }}>
                      <Typography variant="body2">v{v.version_number} • {v.file_name}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => { setSelectedVersion(v); setTab(0); }} disabled={!v.storage_path}>View</Button>
                        <Button size="small" onClick={() => downloadVersion(v.storage_path)} disabled={!v.storage_path}>Download</Button>
                        <Button size="small" onClick={() => copyVersionLink(v.storage_path)} disabled={!v.storage_path}>Copy Link</Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{new Date(v.uploaded_at).toLocaleString()}</Typography>
                    </Stack>
                  ))}
                  {(!versions || versions.length === 0) && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No versions.</Typography>
                  )}
                </Box>
              </>
            )}

            {tab === 2 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Compare Versions</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Left</Typography>
                    <Select size="small" value={compareA?.id || ''} onChange={(e) => setCompareA((versions || []).find(v => v.id === e.target.value) || null)} displayEmpty>
                      {(versions || []).map(v => (
                        <MenuItem key={v.id} value={v.id}>v{v.version_number} • {v.file_name}</MenuItem>
                      ))}
                    </Select>
                  </Stack>
                  <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">Right</Typography>
                    <Select size="small" value={compareB?.id || ''} onChange={(e) => setCompareB((versions || []).find(v => v.id === e.target.value) || null)} displayEmpty>
                      {(versions || []).map(v => (
                        <MenuItem key={v.id} value={v.id}>v{v.version_number} • {v.file_name}</MenuItem>
                      ))}
                    </Select>
                  </Stack>
                  <Stack justifyContent="flex-end">
                    <Button size="small" variant="outlined" onClick={() => { const A = compareA; setCompareA(compareB); setCompareB(A); }}>Swap</Button>
                  </Stack>
                </Stack>

                {/* Side-by-side preview/diff */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {/* Left */}
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 200 }}>
                    {renderComparePane(compareA, compareAUrl, compareAText)}
                  </Box>
                  {/* Right */}
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 200 }}>
                    {renderComparePane(compareB, compareBUrl, compareBText)}
                  </Box>
                </Box>

                {/* Unified text diff if both are text */}
                {compareAText != null && compareBText != null && (
                  <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>Highlighted differences</Typography>
                    {renderUnifiedDiff(compareAText, compareBText, (compareA?.mime_type || compareB?.mime_type || '').toLowerCase())}
                  </Box>
                )}
              </>
            )}

            {tab === 1 && (
              <Box sx={{ mt: 2 }}>
                {historyLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading history...</Typography>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Approval Actions</Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                      {(approvalActions || []).map(a => (
                        <Stack key={a.id} direction="row" justifyContent="space-between" sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2">{a.action}{a.reason ? ` • ${a.reason}` : ''}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(a.created_at).toLocaleString()}</Typography>
                        </Stack>
                      ))}
                      {approvalActions.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No approval actions.</Typography>}
                    </Box>

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Status Changes</Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      {(statusAudits || []).map(h => (
                        <Stack key={h.id} direction="row" justifyContent="space-between" sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2">
                            {(() => {
                              try {
                                const d = h.details || {};
                                const oldS = d.old_status || d.oldStatus || d.old;
                                const newS = d.new_status || d.newStatus || d.new;
                                return `${oldS || '—'} → ${newS || '—'}`;
                              } catch { return '—'; }
                            })()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(h.created_at).toLocaleString()}</Typography>
                        </Stack>
                      ))}
                      {statusAudits.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No status changes.</Typography>}
                    </Box>
                  </>
                )}
              </Box>
            )}

            {tab === 2 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Use the Permissions button in Overview to manage ACLs.</Typography>
              </Box>
            )}

            {document && (
              <DocumentPermissionsDialog open={permOpen} onClose={() => setPermOpen(false)} documentId={document.id} />
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
