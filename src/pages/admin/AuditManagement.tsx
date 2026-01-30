import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Stack,
  Container,
  Alert,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme
} from '@mui/material';
import AuditIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import { useScope } from '../../contexts/ScopeContext';
import { usePermissionAuditLogs } from '../../hooks/usePermissionAuditLogs';
import { permissionAuditService } from '../../services/permissionAuditService';

export default function AuditManagement() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const scope = useScope();
  const { getOrgId, isLoadingOrgs } = scope || {};
  const orgId = getOrgId?.() || '';

  const {
    logs,
    loading,
    error
  } = usePermissionAuditLogs(
    orgId,
    {
      action: filterAction || undefined,
      resourceType: filterResourceType || undefined,
      limit: 50
    }
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Load stats when switching to Permission Audit tab
    if (newValue === 2 && !stats && orgId) {
      loadStats();
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const auditStats = await permissionAuditService.getAuditStats(orgId);
      setStats(auditStats);
    } catch (err) {
      console.error('Error loading audit stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const csv = await permissionAuditService.exportAuditLogs(orgId, {
        action: filterAction || undefined,
        resourceType: filterResourceType || undefined
      });

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `permission-audit-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert('فشل تصدير السجلات');
    }
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (action) {
      case 'ASSIGN':
        return 'success';
      case 'REVOKE':
        return 'error';
      case 'MODIFY':
        return 'warning';
      case 'CREATE':
        return 'info';
      case 'DELETE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: { [key: string]: string } = {
      'ASSIGN': 'تعيين',
      'REVOKE': 'إلغاء',
      'MODIFY': 'تعديل',
      'CREATE': 'إنشاء',
      'DELETE': 'حذف'
    };
    return labels[action] || action;
  };

  if (isLoadingOrgs) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography color="text.secondary">جاري تحميل البيانات...</Typography>
      </Container>
    );
  }

  if (!orgId) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography color="text.secondary">يرجى اختيار منظمة أولاً</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            نظام التدقيق والمراقبة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراقبة الأنشطة والعمليات في النظام
          </Typography>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="audit tabs">
          <Tab icon={<AuditIcon sx={{ mr: 1 }} />} iconPosition="start" label="نظرة عامة" />
          <Tab icon={<InfoIcon sx={{ mr: 1 }} />} iconPosition="start" label="المعلومات" />
          <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} iconPosition="start" label="سجل الصلاحيات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ width: '100%' }}>
        {activeTab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                نظام التدقيق قيد التطوير. سيتم إضافة المزيد من الميزات قريباً.
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      المنظمة الحالية
                    </Typography>
                    <Typography variant="h6">{orgId}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      حالة النظام
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      نشط
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      الإصدار
                    </Typography>
                    <Typography variant="h6">1.0.0</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                معلومات النظام
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    الميزات المتاحة:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • مراقبة الأنشطة الأساسية
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • تتبع التغييرات
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • تقارير الأداء
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    الميزات القادمة:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • سجلات التدقيق المفصلة
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • تحليلات متقدمة
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    • تنبيهات فورية
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            {/* Statistics Cards */}
            {statsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : stats ? (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        إجمالي التغييرات
                      </Typography>
                      <Typography variant="h5">{stats.totalChanges}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        هذا الأسبوع
                      </Typography>
                      <Typography variant="h5">{stats.changesThisWeek}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        هذا الشهر
                      </Typography>
                      <Typography variant="h5">{stats.changesThisMonth}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        أنواع العمليات
                      </Typography>
                      <Typography variant="h5">{Object.keys(stats.actionBreakdown).length}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : null}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>نوع العملية</InputLabel>
                  <Select
                    value={filterAction}
                    label="نوع العملية"
                    onChange={(e) => setFilterAction(e.target.value)}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="ASSIGN">تعيين</MenuItem>
                    <MenuItem value="REVOKE">إلغاء</MenuItem>
                    <MenuItem value="MODIFY">تعديل</MenuItem>
                    <MenuItem value="CREATE">إنشاء</MenuItem>
                    <MenuItem value="DELETE">حذف</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>نوع المورد</InputLabel>
                  <Select
                    value={filterResourceType}
                    label="نوع المورد"
                    onChange={(e) => setFilterResourceType(e.target.value)}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="role_permissions">صلاحيات الدور</MenuItem>
                    <MenuItem value="role">الدور</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportLogs}
                  disabled={loading || logs.length === 0}
                >
                  تصدير
                </Button>
              </Stack>
            </Paper>

            {/* Logs Table */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : logs.length === 0 ? (
              <Alert severity="info">
                لا توجد سجلات صلاحيات متاحة
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                      <TableCell>التاريخ والوقت</TableCell>
                      <TableCell>نوع العملية</TableCell>
                      <TableCell>نوع المورد</TableCell>
                      <TableCell>معرف المورد</TableCell>
                      <TableCell>السبب</TableCell>
                      <TableCell>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getActionLabel(log.action)}
                            color={getActionColor(log.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.resource_type}</TableCell>
                        <TableCell>{log.resource_id || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.reason || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailsOpen(true);
                            }}
                          >
                            التفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>تفاصيل السجل</DialogTitle>
              <DialogContent>
                {selectedLog && (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        معرف السجل:
                      </Typography>
                      <Typography variant="body2">{selectedLog.id}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        نوع العملية:
                      </Typography>
                      <Chip
                        label={getActionLabel(selectedLog.action)}
                        color={getActionColor(selectedLog.action)}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        نوع المورد:
                      </Typography>
                      <Typography variant="body2">{selectedLog.resource_type}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        معرف المورد:
                      </Typography>
                      <Typography variant="body2">{selectedLog.resource_id || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        السبب:
                      </Typography>
                      <Typography variant="body2">{selectedLog.reason || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        القيمة السابقة:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ overflow: 'auto', maxHeight: 150, backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {JSON.stringify(selectedLog.old_value, null, 2) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        القيمة الجديدة:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ overflow: 'auto', maxHeight: 150, backgroundColor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                        {JSON.stringify(selectedLog.new_value, null, 2) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        التاريخ والوقت:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedLog.created_at).toLocaleString('ar-SA')}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Box>
    </Box>
  );
}
