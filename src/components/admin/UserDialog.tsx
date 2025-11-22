import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import { supabase } from '../../utils/supabase';
import { audit } from '../../utils/audit';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from './UserFormConfig';

type ExistingUserProfileDb = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  is_active?: boolean;
  user_roles?: { roles?: { id?: number } }[];
};

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  user: ExistingUserProfileDb | null; // null for new user
  roles: Role[];
  onUserSaved: () => void;
}

export const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onClose,
  user,
  roles,
  onUserSaved
}) => {
  const { user: currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    full_name_ar: '',
    department: '',
    job_title: '',
    phone: '',
    role_id: '',
    is_active: true,
    send_invite: true
  });

  useEffect(() => {
    if (user) {
      // Edit mode - populate with existing user data
      setFormData({
        email: user.email || '',
        password: '', // Don't populate password for security
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        full_name_ar: user.full_name_ar || '',
        department: user.department || '',
        job_title: user.job_title || '',
        phone: user.phone || '',
        role_id: String(user.user_roles?.[0]?.roles?.id ?? ''),
        is_active: user.is_active !== false,
        send_invite: false
      });
    } else {
      // Create mode - reset form
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        full_name_ar: '',
        department: '',
        job_title: '',
        phone: '',
        role_id: '',
        is_active: true,
        send_invite: true
      });
    }
    setError(null);
  }, [user, open]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (user) {
        // Update existing user profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name_ar: formData.full_name_ar,
            department: formData.department,
            job_title: formData.job_title,
            phone: formData.phone,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Update role if changed
        if (formData.role_id) {
          // Remove existing roles
          await supabase.from('user_roles').delete().eq('user_id', user.id);
          
          // Add new role
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
            updated_fields: Object.keys(formData).filter(k => k !== 'password' && k !== 'send_invite')
          });
        }
      } else {
        // Create new user
        if (!formData.email || !formData.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: !formData.send_invite,
          user_metadata: {
            first_name: formData.first_name,
            last_name: formData.last_name
          }
        });

        if (authError) {
          // Fallback to regular signup if admin API not available
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                first_name: formData.first_name,
                last_name: formData.last_name
              },
              emailRedirectTo: `${window.location.origin}/login`
            }
          });

          if (signUpError) throw signUpError;
          
          if (signUpData.user) {
            // Create user profile
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                id: signUpData.user.id,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                full_name_ar: formData.full_name_ar,
                department: formData.department,
                job_title: formData.job_title,
                phone: formData.phone,
                is_active: formData.is_active,
                created_at: new Date().toISOString()
              });

            if (profileError) throw profileError;

            // Assign role
            if (formData.role_id) {
              const { error: roleError } = await supabase.from('user_roles').insert({
                user_id: signUpData.user.id,
                role_id: parseInt(formData.role_id),
                assigned_by: currentUser?.id,
                is_active: true
              });

              if (roleError) console.error('Error assigning role:', roleError);
            }

            // Log via secure RPC only if authenticated
            if (currentUser?.id) {
              await audit(supabase, 'user.create', 'user', signUpData.user.id, {
                email: formData.email,
                role_id: formData.role_id
              });
            }
          }
        } else if (authData?.user) {
          // Admin API worked - create profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              first_name: formData.first_name,
              last_name: formData.last_name,
              full_name_ar: formData.full_name_ar,
              department: formData.department,
              job_title: formData.job_title,
              phone: formData.phone,
              is_active: formData.is_active,
              created_at: new Date().toISOString()
            });

          if (profileError) throw profileError;

          // Assign role
          if (formData.role_id) {
            await supabase.from('user_roles').insert({
              user_id: authData.user.id,
              role_id: parseInt(formData.role_id),
              assigned_by: currentUser?.id,
              is_active: true
            });
          }
        }
      }

      onUserSaved();
      onClose();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setError(msg || 'فشل حفظ المستخدم');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
<Grid xs={12}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!user} // Can't change email for existing users
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              required
            />
</Grid>

          {!user && (
            <Grid xs={12}>
              <TextField
                fullWidth
                label="كلمة المرور"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="يجب أن تكون 6 أحرف على الأقل"
                required
              />
</Grid>
          )}

<Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم الأول"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
</Grid>

<Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="اسم العائلة"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
</Grid>

<Grid xs={12}>
            <TextField
              fullWidth
              label="الاسم الكامل بالعربية"
              value={formData.full_name_ar}
              onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
            />
          </Grid>

<Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="القسم"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              InputProps={{
                startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="الوظيفة"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              InputProps={{
                startAdornment: <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>

          <Grid xs={12} md={6}>
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Grid>

          <Grid xs={12} md={6}>
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
                  {role.name_ar}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

<Grid xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="حساب نشط"
            />
          </Grid>

          {!user && (
<Grid xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.send_invite}
                    onChange={(e) => setFormData({ ...formData, send_invite: e.target.checked })}
                  />
                }
                label="إرسال دعوة بالبريد الإلكتروني"
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || (!user && (!formData.email || !formData.password))}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
