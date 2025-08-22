import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Stack,
  Typography,
  Alert,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch,
  Avatar,
  IconButton,
  Box,
  LinearProgress,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  PhotoCamera as PhotoCameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import { audit } from '../../utils/audit';
import { useAuth } from '../../contexts/AuthContext';

// Predefined departments
const DEPARTMENTS = [
  { value: 'accounting', label: 'المحاسبة', label_en: 'Accounting' },
  { value: 'sales', label: 'المبيعات', label_en: 'Sales' },
  { value: 'hr', label: 'الموارد البشرية', label_en: 'Human Resources' },
  { value: 'it', label: 'تقنية المعلومات', label_en: 'Information Technology' },
  { value: 'operations', label: 'العمليات', label_en: 'Operations' },
  { value: 'marketing', label: 'التسويق', label_en: 'Marketing' },
  { value: 'finance', label: 'المالية', label_en: 'Finance' },
  { value: 'customer_service', label: 'خدمة العملاء', label_en: 'Customer Service' },
  { value: 'warehouse', label: 'المستودع', label_en: 'Warehouse' },
  { value: 'management', label: 'الإدارة', label_en: 'Management' }
];

// Job titles
const JOB_TITLES = [
  { value: 'manager', label: 'مدير', label_en: 'Manager' },
  { value: 'assistant_manager', label: 'مساعد مدير', label_en: 'Assistant Manager' },
  { value: 'supervisor', label: 'مشرف', label_en: 'Supervisor' },
  { value: 'accountant', label: 'محاسب', label_en: 'Accountant' },
  { value: 'senior_accountant', label: 'محاسب أول', label_en: 'Senior Accountant' },
  { value: 'sales_rep', label: 'مندوب مبيعات', label_en: 'Sales Representative' },
  { value: 'hr_specialist', label: 'أخصائي موارد بشرية', label_en: 'HR Specialist' },
  { value: 'it_specialist', label: 'أخصائي تقنية', label_en: 'IT Specialist' },
  { value: 'developer', label: 'مطور', label_en: 'Developer' },
  { value: 'analyst', label: 'محلل', label_en: 'Analyst' },
  { value: 'coordinator', label: 'منسق', label_en: 'Coordinator' },
  { value: 'admin', label: 'إداري', label_en: 'Administrator' },
  { value: 'clerk', label: 'موظف', label_en: 'Clerk' },
  { value: 'other', label: 'أخرى', label_en: 'Other' }
];

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  user: any | null;
  roles: any[];
  onUserSaved: () => void;
}

// Password strength calculator
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return Math.min(100, (strength / 6) * 100);
};

// Email validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return !phone || phoneRegex.test(phone);
};

export const UserDialogEnhanced: React.FC<UserDialogProps> = ({
  open,
  onClose,
  user,
  roles,
  onUserSaved
}) => {
  const { user: currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    full_name_ar: '',
    department: '',
    job_title: '',
    custom_job_title: '',
    phone: '',
    role_id: '',
    is_active: true,
    send_invite: true,
    require_password_change: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '',
        confirm_password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        full_name_ar: user.full_name_ar || '',
        department: user.department || '',
        job_title: user.job_title || '',
        custom_job_title: '',
        phone: user.phone || '',
        role_id: user.user_roles?.[0]?.roles?.id || '',
        is_active: user.is_active !== false,
        send_invite: false,
        require_password_change: false
      });
      setAvatarUrl(user.avatar_url || null);
    } else {
      setFormData({
        email: '',
        password: '',
        confirm_password: '',
        first_name: '',
        last_name: '',
        full_name_ar: '',
        department: '',
        job_title: '',
        custom_job_title: '',
        phone: '',
        role_id: '',
        is_active: true,
        send_invite: true,
        require_password_change: true
      });
      setAvatarUrl(null);
    }
    setError(null);
    setValidationErrors({});
    setPasswordStrength(0);
  }, [user, open]);

  // Update password strength when password changes
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(0);
    }
  }, [formData.password]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('يجب أن يكون الملف صورة');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'temp'}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError('فشل رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    // Password validation (only for new users)
    if (!user) {
      if (!formData.password) {
        errors.password = 'كلمة المرور مطلوبة';
      } else if (formData.password.length < 6) {
        errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      }

      if (formData.password && formData.password !== formData.confirm_password) {
        errors.confirm_password = 'كلمات المرور غير متطابقة';
      }
    }

    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'رقم الهاتف غير صحيح';
    }

    // Name validation
    if (!formData.first_name) {
      errors.first_name = 'الاسم الأول مطلوب';
    }

    if (!formData.last_name) {
      errors.last_name = 'اسم العائلة مطلوب';
    }

    // Custom job title validation
    if (formData.job_title === 'other' && !formData.custom_job_title) {
      errors.custom_job_title = 'يرجى تحديد المسمى الوظيفي';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const finalJobTitle = formData.job_title === 'other' 
        ? formData.custom_job_title 
        : formData.job_title;

      if (user) {
        // Update existing user
        const updateData: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name_ar: formData.full_name_ar,
          department: formData.department,
          job_title: finalJobTitle,
          phone: formData.phone,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        };

        if (avatarUrl) {
          updateData.avatar_url = avatarUrl;
        }

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Update role if changed
        if (formData.role_id) {
          await supabase.from('user_roles').delete().eq('user_id', user.id);
          
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: user.id,
            role_id: parseInt(formData.role_id),
            assigned_by: currentUser?.id,
            is_active: true
          });

          if (roleError) throw roleError;
        }

        // Log via secure RPC only if authenticated
        if (currentUser?.id) {
          await audit(supabase, 'user.update', 'user', user.id, {
            updated_fields: Object.keys(formData).filter(k =>
              !['password', 'confirm_password', 'send_invite'].includes(k)
            )
          });
        }

      } else {
        // Create new user using signUp (client-safe)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              require_password_change: formData.require_password_change
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          // Create user profile
          const profileData: any = {
            id: signUpData.user.id,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name_ar: formData.full_name_ar,
            department: formData.department,
            job_title: finalJobTitle,
            phone: formData.phone,
            is_active: formData.is_active,
            created_at: new Date().toISOString()
          };

          if (avatarUrl) {
            profileData.avatar_url = avatarUrl;
          }

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert(profileData);

          if (profileError) throw profileError;

          // Assign role
          if (formData.role_id) {
            await supabase.from('user_roles').insert({
              user_id: signUpData.user.id,
              role_id: parseInt(formData.role_id),
              assigned_by: currentUser?.id,
              is_active: true
            });
          }

          // Log via secure RPC only if authenticated
          if (currentUser?.id) {
            await audit(supabase, 'user.create', 'user', signUpData.user.id, {
              email: formData.email,
              role_id: formData.role_id,
              department: formData.department
            });
          }
        }
      }

      onUserSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      setError(error.message || 'فشل حفظ المستخدم');
    } finally {
      setSaving(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 33) return 'error';
    if (passwordStrength < 66) return 'warning';
    return 'success';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 33) return 'ضعيفة';
    if (passwordStrength < 66) return 'متوسطة';
    return 'قوية';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {user ? 'تعديل بيانات المستخدم' : 'مستخدم جديد'}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Avatar Upload */}
          <Grid item xs={12} sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={avatarUrl || undefined}
                sx={{ width: 100, height: 100, mb: 2 }}
              >
                {!avatarUrl && <PersonIcon sx={{ fontSize: 50 }} />}
              </Avatar>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="avatar-upload"
                type="file"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <label htmlFor="avatar-upload">
                <IconButton
                  color="primary"
                  component="span"
                  disabled={uploadingAvatar}
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: -10,
                    backgroundColor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PhotoCameraIcon />
                  )}
                </IconButton>
              </label>
            </Box>
          </Grid>

          {/* Email */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!user}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
                endAdornment: formData.email && validateEmail(formData.email) && (
                  <InputAdornment position="end">
                    <CheckIcon color="success" />
                  </InputAdornment>
                )
              }}
              required
            />
          </Grid>

          {/* Password fields for new users */}
          {!user && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={!!validationErrors.password}
                  helperText={validationErrors.password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  required
                />
                {formData.password && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength}
                      color={getPasswordStrengthColor() as any}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      قوة كلمة المرور: {getPasswordStrengthLabel()}
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="تأكيد كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  error={!!validationErrors.confirm_password}
                  helperText={validationErrors.confirm_password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: formData.confirm_password && (
                      <InputAdornment position="end">
                        {formData.password === formData.confirm_password ? (
                          <CheckIcon color="success" />
                        ) : (
                          <CloseIcon color="error" />
                        )}
                      </InputAdornment>
                    )
                  }}
                  required
                />
              </Grid>
            </>
          )}

          {/* Names */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="الاسم الأول"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={!!validationErrors.first_name}
              helperText={validationErrors.first_name}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="اسم العائلة"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              error={!!validationErrors.last_name}
              helperText={validationErrors.last_name}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="الاسم الكامل بالعربية"
              value={formData.full_name_ar}
              onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
            />
          </Grid>

          {/* Department and Job Title */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="القسم"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon />
                  </InputAdornment>
                )
              }}
            >
              <MenuItem value="">-- اختر القسم --</MenuItem>
              {DEPARTMENTS.map((dept) => (
                <MenuItem key={dept.value} value={dept.value}>
                  {dept.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="المسمى الوظيفي"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WorkIcon />
                  </InputAdornment>
                )
              }}
            >
              <MenuItem value="">-- اختر المسمى الوظيفي --</MenuItem>
              {JOB_TITLES.map((title) => (
                <MenuItem key={title.value} value={title.value}>
                  {title.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Custom job title field */}
          {formData.job_title === 'other' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المسمى الوظيفي المخصص"
                value={formData.custom_job_title}
                onChange={(e) => setFormData({ ...formData, custom_job_title: e.target.value })}
                error={!!validationErrors.custom_job_title}
                helperText={validationErrors.custom_job_title}
                placeholder="أدخل المسمى الوظيفي"
              />
            </Grid>
          )}

          {/* Phone and Role */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={!!validationErrors.phone}
              helperText={validationErrors.phone}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="الدور"
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
            >
              <MenuItem value="">بدون دور</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{role.name_ar}</span>
                    <Chip 
                      label={role.name_en} 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Switches */}
          <Grid item xs={12}>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="حساب نشط"
              />

              {!user && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.send_invite}
                        onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })}
                      />
                    }
                    label="إرسال دعوة بالبريد الإلكتروني"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.require_password_change}
                        onChange={(e) => setFormData({ ...formData, require_password_change: e.target.checked })}
                      />
                    }
                    label="مطالبة المستخدم بتغيير كلمة المرور عند أول تسجيل دخول"
                  />
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
