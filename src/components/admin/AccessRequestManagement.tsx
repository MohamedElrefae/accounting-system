import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Email,
  Phone,
  Business,
  Person,
  Schedule,
  Refresh
} from '@mui/icons-material';
import {
  getAllAccessRequests,
  getPendingAccessRequestsCount,
  approveAccessRequest,
  rejectAccessRequest,
  canManageAccessRequests,
  type AccessRequestWithReviewer
} from '../../services/accessRequestService';

const roles = [
  { value: 'user', label: 'مستخدم عادي' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'manager', label: 'مدير' },
  { value: 'admin', label: 'مدير النظام' }
];

export const AccessRequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequestWithReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Dialog states
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: AccessRequestWithReviewer | null;
    selectedRole: string;
    processing: boolean;
  }>({
    open: false,
    request: null,
    selectedRole: 'user',
    processing: false
  });

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: AccessRequestWithReviewer | null;
    reason: string;
    processing: boolean;
  }>({
    open: false,
    request: null,
    reason: '',
    processing: false
  });

  const loadRequests = useCallback(async () => {
    try {
      const [requestsData, pendingCountData] = await Promise.all([
        getAllAccessRequests(),
        getPendingAccessRequestsCount()
      ]);
      setRequests(requestsData);
      setPendingCount(pendingCountData);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الطلبات');
    }
  }, []);

  const checkPermissionsAndLoadData = useCallback(async () => {
    try {
      const hasPermission = await canManageAccessRequests();
      setCanManage(hasPermission);
      if (hasPermission) {
        await loadRequests();
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في التحقق من الصلاحيات');
    } finally {
      setLoading(false);
    }
  }, [loadRequests]);

  useEffect(() => {
    checkPermissionsAndLoadData();
  }, [checkPermissionsAndLoadData]);

  const handleApprove = async () => {
    if (!approveDialog.request) return;

    setApproveDialog(prev => ({ ...prev, processing: true }));

    try {
      const result = await approveAccessRequest(approveDialog.request.id, approveDialog.selectedRole);
      
      const signupUrl = `${window.location.origin}/register`;
      
      // Show success message with contact instructions
      alert(`✅ تم الموافقة على الطلب بنجاح!

يرجى التواصل مع المستخدم عبر:
📧 البريد: ${approveDialog.request.email}
📱 الهاتف: ${approveDialog.request.phone || 'غير محدد'}

وإبلاغه بأنه يمكنه الآن إنشاء حسابه:

✅ خطوات إنشاء الحساب:
1. اذهب لرابط: ${signupUrl}
2. أنشئ حساب جديد ببريدك: ${result.email}
3. اختر كلمة مرور قوية
4. سيتم تحميل بياناتك الشخصية تلقائياً!

ℹ️ ملاحظة: يجب إنشاء حساب جديد أولاً، ثم يمكن استخدام "نسيت كلمة المرور" لاحقاً.`);
      
      setApproveDialog({
        open: false,
        request: null,
        selectedRole: 'user',
        processing: false
      });
      
      // Reload requests
      await loadRequests();
      
    } catch (err: any) {
      setError(err.message || 'فشل في الموافقة على الطلب');
      setApproveDialog(prev => ({ ...prev, processing: false }));
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.request) return;

    setRejectDialog(prev => ({ ...prev, processing: true }));

    try {
      await rejectAccessRequest(rejectDialog.request.id, rejectDialog.reason);
      
      setRejectDialog({
        open: false,
        request: null,
        reason: '',
        processing: false
      });
      
      // Reload requests
      await loadRequests();
      
    } catch (err: any) {
      setError(err.message || 'فشل في رفض الطلب');
      setRejectDialog(prev => ({ ...prev, processing: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'approved':
        return 'موافق عليه';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!canManage) {
    return (
      <Alert severity="error">
        ليس لديك صلاحية لإدارة طلبات الوصول
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          إدارة طلبات الوصول
          {pendingCount > 0 && (
            <Badge badgeContent={pendingCount} color="warning" sx={{ ml: 2 }}>
              <Schedule />
            </Badge>
          )}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadRequests}
        >
          تحديث
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              طلبات معلقة
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {requests.filter(r => r.status === 'pending').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="success.main">
              طلبات موافق عليها
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {requests.filter(r => r.status === 'approved').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="error.main">
              طلبات مرفوضة
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {requests.filter(r => r.status === 'rejected').length}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Requests Table */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>المعلومات الشخصية</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>معلومات العمل</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الطلب</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Person fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>
                        {request.full_name_ar}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Email fontSize="small" />
                      <Typography variant="body2">
                        {request.email}
                      </Typography>
                    </Stack>
                    {request.phone && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Phone fontSize="small" />
                        <Typography variant="body2">
                          {request.phone}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </TableCell>
                
                <TableCell>
                  <Stack spacing={1}>
                    {request.department && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Business fontSize="small" />
                        <Typography variant="body2">
                          {request.department}
                        </Typography>
                      </Stack>
                    )}
                    {request.job_title && (
                      <Typography variant="body2" color="text.secondary">
                        {request.job_title}
                      </Typography>
                    )}
                    {request.message && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{request.message}"
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={getStatusLabel(request.status)}
                    color={getStatusColor(request.status) as any}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(request.requested_at)}
                  </Typography>
                  {request.reviewed_at && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      تم المراجعة: {formatDate(request.reviewed_at)}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  {request.status === 'pending' && (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="موافقة">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => setApproveDialog({
                            open: true,
                            request,
                            selectedRole: 'user',
                            processing: false
                          })}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="رفض">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setRejectDialog({
                            open: true,
                            request,
                            reason: '',
                            processing: false
                          })}
                        >
                          <Cancel />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                  {request.status === 'approved' && request.assigned_role && (
                    <Typography variant="caption" color="success.main">
                      دور: {roles.find(r => r.value === request.assigned_role)?.label}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {requests.length === 0 && (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              لا توجد طلبات وصول حالياً
            </Typography>
          </Box>
        )}
      </TableContainer>

      {/* Approve Dialog */}
      <Dialog
        open={approveDialog.open}
        onClose={() => !approveDialog.processing && setApproveDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>الموافقة على طلب الوصول</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            هل أنت متأكد من الموافقة على طلب الوصول لـ {approveDialog.request?.full_name_ar}؟
          </DialogContentText>
          
          <TextField
            select
            fullWidth
            label="اختر الدور"
            value={approveDialog.selectedRole}
            onChange={(e) => setApproveDialog(prev => ({ ...prev, selectedRole: e.target.value }))}
            disabled={approveDialog.processing}
            margin="normal"
          >
            {roles.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApproveDialog(prev => ({ ...prev, open: false }))}
            disabled={approveDialog.processing}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={approveDialog.processing}
            startIcon={approveDialog.processing ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            موافقة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !rejectDialog.processing && setRejectDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>رفض طلب الوصول</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            هل أنت متأكد من رفض طلب الوصول لـ {rejectDialog.request?.full_name_ar}؟
          </DialogContentText>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض (اختياري)"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
            disabled={rejectDialog.processing}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectDialog(prev => ({ ...prev, open: false }))}
            disabled={rejectDialog.processing}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={rejectDialog.processing}
            startIcon={rejectDialog.processing ? <CircularProgress size={20} /> : <Cancel />}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
