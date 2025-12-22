import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import DeleteIcon from '@mui/icons-material/Delete';
import useAppStore from '../../store/useAppStore';
import { useHasPermission } from '../../hooks/useHasPermission';
import { listUserPresence, type UserPresenceRow } from '../../services/presence';
import { getOrganizations, type Organization } from '../../services/organization';
import { useScopeOptional } from '../../contexts/ScopeContext';
import { listOrgMembers } from '../../services/org-memberships';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  setTeamLeader,
  type OrgTeam,
  type OrgTeamMember,
} from '../../services/teams';

const formatDateTime = (iso: string | null, locale: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  } catch {
    return iso;
  }
};

export default function OnlineUsers() {
  const { language } = useAppStore();
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const scope = useScopeOptional();

  const canViewAll = hasPermission('presence.view.all');

  const [showOnlyOnline, setShowOnlyOnline] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createTeamName, setCreateTeamName] = useState('');
  const [createTeamNameAr, setCreateTeamNameAr] = useState('');

  const [manageMembersTeam, setManageMembersTeam] = useState<OrgTeam | null>(null);
  const [memberToAdd, setMemberToAdd] = useState<string>('');

  const orgIdForQuery = canViewAll ? selectedOrgId : (scope?.currentOrg?.id ?? null);

  const canManageTeams = hasPermission('organizations.manage_members');

  const orgsQuery = useQuery({
    queryKey: ['presence', 'orgs'],
    queryFn: async () => getOrganizations(),
    enabled: canViewAll,
    staleTime: 5 * 60 * 1000,
  });

  const presenceQuery = useQuery({
    queryKey: ['presence', 'users', orgIdForQuery, selectedTeamId, showOnlyOnline],
    queryFn: async () => listUserPresence({
      orgId: orgIdForQuery,
      teamId: selectedTeamId,
      onlineWithinSeconds: 120,
      activeWithinSeconds: 900,
    }),
    refetchInterval: 15_000,
  });

  const teamsQuery = useQuery({
    queryKey: ['presence', 'teams', orgIdForQuery],
    queryFn: async () => {
      if (!orgIdForQuery) return [];
      return listTeams(orgIdForQuery);
    },
    enabled: !!orgIdForQuery,
    staleTime: 30_000,
  });

  const orgMembersQuery = useQuery({
    queryKey: ['presence', 'org-members', orgIdForQuery],
    queryFn: async () => {
      if (!orgIdForQuery) return [];
      return listOrgMembers(orgIdForQuery);
    },
    enabled: !!orgIdForQuery && canManageTeams,
    staleTime: 60_000,
  });

  const teamMembersQuery = useQuery({
    queryKey: ['presence', 'team-members', manageMembersTeam?.id],
    queryFn: async () => {
      if (!manageMembersTeam || !orgIdForQuery) return [];
      return listTeamMembers({ orgId: orgIdForQuery, teamId: manageMembersTeam.id });
    },
    enabled: !!manageMembersTeam && !!orgIdForQuery && canManageTeams,
  });

  const userLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (orgMembersQuery.data ?? []).forEach((m) => {
      const label = language === 'ar'
        ? (m.user.full_name_ar || m.user.email)
        : m.user.email;
      map.set(m.user_id, label);
    });
    return map;
  }, [language, orgMembersQuery.data]);

  const rows: UserPresenceRow[] = useMemo(() => {
    const data = presenceQuery.data ?? [];
    return showOnlyOnline ? data.filter((r) => r.is_online) : data;
  }, [presenceQuery.data, showOnlyOnline]);

  const locale = language;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {language === 'ar' ? 'المستخدمون المتصلون الآن' : 'Online Users'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {language === 'ar'
            ? 'يعرض هذا التقرير المستخدمين المتصلين الآن والمستخدمين النشطين مؤخرًا حسب الصلاحيات.'
            : 'Shows online and recently active users based on your permissions.'}
        </Typography>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          {canViewAll ? (
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>{language === 'ar' ? 'المؤسسة' : 'Organization'}</InputLabel>
              <Select
                label={language === 'ar' ? 'المؤسسة' : 'Organization'}
                value={selectedOrgId ?? ''}
                onChange={(e) => setSelectedOrgId(e.target.value ? String(e.target.value) : null)}
              >
                <MenuItem value="">{language === 'ar' ? 'كل المؤسسات' : 'All organizations'}</MenuItem>
                {(orgsQuery.data ?? []).map((o: Organization) => (
                  <MenuItem key={o.id} value={o.id}>
                    {language === 'ar' ? (o.name_ar || o.name) : o.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <FormControl size="small" sx={{ minWidth: 240 }} disabled={!orgIdForQuery || teamsQuery.isLoading}>
            <InputLabel>{language === 'ar' ? 'الفريق' : 'Team'}</InputLabel>
            <Select
              label={language === 'ar' ? 'الفريق' : 'Team'}
              value={selectedTeamId ?? ''}
              onChange={(e) => setSelectedTeamId(e.target.value ? String(e.target.value) : null)}
            >
              <MenuItem value="">{language === 'ar' ? 'كل الفرق' : 'All teams'}</MenuItem>
              {(teamsQuery.data ?? []).map((t: OrgTeam) => (
                <MenuItem key={t.id} value={t.id}>
                  {language === 'ar' ? (t.name_ar || t.name) : t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={showOnlyOnline}
                onChange={(e) => setShowOnlyOnline(e.target.checked)}
              />
            }
            label={language === 'ar' ? 'إظهار المتصلين فقط' : 'Show online only'}
          />

          <Box sx={{ flex: 1 }} />

          {canManageTeams ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setCreateTeamOpen(true)} disabled={!orgIdForQuery}>
                {language === 'ar' ? 'إنشاء فريق' : 'Create Team'}
              </Button>
            </Stack>
          ) : null}

          {presenceQuery.isFetching ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {language === 'ar' ? 'تحديث...' : 'Refreshing...'}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      {presenceQuery.isError ? (
        <Alert severity="error">
          {language === 'ar'
            ? 'فشل تحميل بيانات الحضور.'
            : 'Failed to load presence data.'}
        </Alert>
      ) : null}

      <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{language === 'ar' ? 'الحالة' : 'Status'}</TableCell>
              <TableCell>{language === 'ar' ? 'الاسم' : 'Name'}</TableCell>
              <TableCell>{language === 'ar' ? 'البريد' : 'Email'}</TableCell>
              <TableCell>{language === 'ar' ? 'الوظيفة' : 'Job Title'}</TableCell>
              <TableCell>{language === 'ar' ? 'القسم' : 'Department'}</TableCell>
              <TableCell>{language === 'ar' ? 'آخر ظهور' : 'Last Seen'}</TableCell>
              <TableCell>{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {presenceQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    {language === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.org_id}:${r.user_id}`} hover>
                  <TableCell>
                    {r.is_online ? (
                      <Chip size="small" color="success" label={language === 'ar' ? 'متصل' : 'Online'} />
                    ) : (
                      <Chip size="small" color="default" label={language === 'ar' ? 'غير متصل' : 'Offline'} />
                    )}
                  </TableCell>
                  <TableCell>{r.full_name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.job_title ?? '-'}</TableCell>
                  <TableCell>{r.department ?? '-'}</TableCell>
                  <TableCell>{formatDateTime(r.last_seen_at, locale)}</TableCell>
                  <TableCell>{formatDateTime(r.last_active_at, locale)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Teams management */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {language === 'ar' ? 'إدارة الفرق' : 'Teams Management'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {language === 'ar'
                ? 'إنشاء فرق، إضافة أعضاء، وتحديد قائد الفريق.'
                : 'Create teams, add members, and set the team leader.'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          {canManageTeams ? (
            <Button variant="contained" onClick={() => setCreateTeamOpen(true)} disabled={!orgIdForQuery}>
              {language === 'ar' ? 'إنشاء فريق' : 'Create Team'}
            </Button>
          ) : (
            <Chip
              size="small"
              color="default"
              label={language === 'ar' ? 'عرض فقط' : 'View only'}
            />
          )}
        </Stack>

        <Box sx={{ mt: 2, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{language === 'ar' ? 'اسم الفريق' : 'Team Name'}</TableCell>
                <TableCell>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(teamsQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography variant="body2" color="text.secondary">
                      {language === 'ar' ? 'لا توجد فرق بعد' : 'No teams yet'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (teamsQuery.data ?? []).map((t: OrgTeam) => (
                  <TableRow key={t.id} hover>
                    <TableCell>{language === 'ar' ? (t.name_ar || t.name) : t.name}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => setManageMembersTeam(t)} disabled={!canManageTeams || !orgIdForQuery}>
                          {language === 'ar' ? 'الأعضاء' : 'Members'}
                        </Button>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            if (!canManageTeams) return;
                            await deleteTeam(t.id);
                            await queryClient.invalidateQueries({ queryKey: ['presence', 'teams'] });
                          }}
                          disabled={!canManageTeams}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Create team dialog */}
      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{language === 'ar' ? 'إنشاء فريق جديد' : 'Create new team'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={language === 'ar' ? 'اسم الفريق' : 'Team name'}
              value={createTeamName}
              onChange={(e) => setCreateTeamName(e.target.value)}
              fullWidth
            />
            <TextField
              label={language === 'ar' ? 'اسم الفريق (عربي)' : 'Team name (Arabic)'}
              value={createTeamNameAr}
              onChange={(e) => setCreateTeamNameAr(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeamOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button
            variant="contained"
            disabled={!canManageTeams || !orgIdForQuery || !createTeamName.trim()}
            onClick={async () => {
              if (!orgIdForQuery) return;
              await createTeam({ orgId: orgIdForQuery, name: createTeamName.trim(), nameAr: createTeamNameAr.trim() || null });
              setCreateTeamName('');
              setCreateTeamNameAr('');
              setCreateTeamOpen(false);
              await queryClient.invalidateQueries({ queryKey: ['presence', 'teams'] });
            }}
          >
            {language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage team members dialog */}
      <Dialog open={!!manageMembersTeam} onClose={() => setManageMembersTeam(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {language === 'ar' ? 'إدارة أعضاء الفريق' : 'Manage team members'}
        </DialogTitle>
        <DialogContent>
          {manageMembersTeam ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {language === 'ar' ? (manageMembersTeam.name_ar || manageMembersTeam.name) : manageMembersTeam.name}
              </Typography>

              <FormControl size="small" fullWidth disabled={!canManageTeams}>
                <InputLabel>{language === 'ar' ? 'إضافة عضو' : 'Add member'}</InputLabel>
                <Select
                  label={language === 'ar' ? 'إضافة عضو' : 'Add member'}
                  value={memberToAdd}
                  onChange={(e) => setMemberToAdd(String(e.target.value))}
                >
                  <MenuItem value="">{language === 'ar' ? 'اختر مستخدم' : 'Select user'}</MenuItem>
                  {(orgMembersQuery.data ?? []).map((m) => (
                    <MenuItem key={m.user_id} value={m.user_id}>
                      {language === 'ar'
                        ? (m.user.full_name_ar || m.user.email)
                        : `${m.user.email}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                disabled={!canManageTeams || !orgIdForQuery || !manageMembersTeam || !memberToAdd}
                onClick={async () => {
                  if (!orgIdForQuery || !manageMembersTeam || !memberToAdd) return;
                  await addTeamMember({ orgId: orgIdForQuery, teamId: manageMembersTeam.id, userId: memberToAdd });
                  setMemberToAdd('');
                  await queryClient.invalidateQueries({ queryKey: ['presence', 'team-members'] });
                  await queryClient.invalidateQueries({ queryKey: ['presence', 'users'] });
                }}
              >
                {language === 'ar' ? 'إضافة' : 'Add'}
              </Button>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{language === 'ar' ? 'المستخدم' : 'User'}</TableCell>
                    <TableCell>{language === 'ar' ? 'قائد؟' : 'Leader?'}</TableCell>
                    <TableCell>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(teamMembersQuery.data ?? []).map((tm: OrgTeamMember) => (
                    <TableRow key={tm.id} hover>
                      <TableCell>{userLabelById.get(tm.user_id) ?? tm.user_id}</TableCell>
                      <TableCell>
                        {tm.is_leader ? (
                          <Chip size="small" color="primary" label={language === 'ar' ? 'قائد' : 'Leader'} />
                        ) : (
                          <Chip size="small" color="default" label={language === 'ar' ? 'عضو' : 'Member'} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={!canManageTeams || !orgIdForQuery || !manageMembersTeam}
                            onClick={async () => {
                              if (!orgIdForQuery || !manageMembersTeam) return;
                              await setTeamLeader({ orgId: orgIdForQuery, teamId: manageMembersTeam.id, userId: tm.user_id });
                              await queryClient.invalidateQueries({ queryKey: ['presence', 'team-members'] });
                            }}
                          >
                            {language === 'ar' ? 'اجعله قائد' : 'Set leader'}
                          </Button>
                          <IconButton
                            size="small"
                            disabled={!canManageTeams || !orgIdForQuery || !manageMembersTeam}
                            onClick={async () => {
                              if (!orgIdForQuery || !manageMembersTeam) return;
                              await removeTeamMember({ orgId: orgIdForQuery, teamId: manageMembersTeam.id, userId: tm.user_id });
                              await queryClient.invalidateQueries({ queryKey: ['presence', 'team-members'] });
                              await queryClient.invalidateQueries({ queryKey: ['presence', 'users'] });
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageMembersTeam(null)}>{language === 'ar' ? 'إغلاق' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
