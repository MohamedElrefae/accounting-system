import React, { useEffect, useMemo, useState } from 'react';
import { Box, Tabs, Tab, Card, CardContent, Typography, TextField, Button, Avatar, Stack, Alert, Divider, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';
import { audit } from '../../utils/audit';
import { useToast } from '../../contexts/ToastContext';
import { useUserProfile as useUserProfileCtx } from '../../contexts/UserProfileContext';
import { useAuditContext } from '../../hooks/useAuditContext';
import { ProfileActivity } from '../../components/ProfileActivity';

// Error interface for proper error handling
interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  security_alerts: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_alerts: boolean;
  session_timeout: number;
}

// User profile update payload
interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  full_name_ar?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  updated_at?: string;
  notification_preferences?: NotificationPrefs;
  security_settings?: SecuritySettings;
}

const defaultPrefs: NotificationPrefs = {
  email_notifications: true,
  push_notifications: true,
  security_alerts: true,
};

const defaultSecurity: SecuritySettings = {
  two_factor_enabled: false,
  login_alerts: true,
  session_timeout: 30,
};

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const userProfileCtx = useUserProfileCtx();
  const [tab, setTab] = useState<'personal' | 'security' | 'preferences' | 'activity'>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullNameAr, setFullNameAr] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [sec, setSec] = useState<SecuritySettings>(defaultSecurity);

  useAuditContext({ pageName: 'Admin/Profile', moduleName: 'Profile' });

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setFullNameAr(profile.full_name_ar || '');
      setDepartment(profile.department || '');
      setPhone(profile.phone || '');
      // Bio field may not exist until SQL migration
      setBio((profile as Record<string, unknown>).bio as string || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    const loadExtras = async () => {
      try {
        if (!user?.id) return;
        // Load JSONB preference fields if they exist
        const { data } = await supabase
          .from('user_profiles')
          .select('notification_preferences, security_settings')
          .eq('id', user.id)
          .single();
        const np = (data?.notification_preferences as NotificationPrefs) || defaultPrefs;
        const ss = (data?.security_settings as SecuritySettings) || defaultSecurity;
        setPrefs({ ...defaultPrefs, ...np });
        setSec({ ...defaultSecurity, ...ss });
      } catch (error) {
        // Silently ignore errors when loading preferences - they're optional
        console.debug('[Profile] Could not load preferences:', error);
      }
    };
    loadExtras();
  }, [user?.id]);

  const displayName = useMemo(() => {
    if (firstName) return `${firstName} ${lastName || ''}`.trim();
    if (fullNameAr) return fullNameAr;
    return user?.email?.split('@')[0] || 'User';
  }, [firstName, lastName, fullNameAr, user?.email]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setError('يجب اختيار صورة'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('الحد الأقصى للصورة 2MB'); return; }

    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`; // complies with storage policy

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      setAvatarUrl(publicUrl);
    } catch (e: unknown) {
      const error = e as AppError;
      setError(error.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const savePersonal = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const update: UserProfileUpdate = {
        first_name: firstName,
        last_name: lastName,
        full_name_ar: fullNameAr,
        department,
        phone,
        avatar_url: avatarUrl,
        bio,
        updated_at: new Date().toISOString(),
      };
      
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update(update)
        .eq('id', user.id)
        .select();
      
      if (upErr) {
        throw upErr;
      }
      
      // Refresh both contexts to ensure all components get updated data
      await refreshProfile(); // AuthContext
      await userProfileCtx.refreshProfile(); // UserProfileContext

      const prev = (profile ?? {}) as Record<string, unknown>;
      const norm = (v: unknown) => (v == null ? '' : String(v));
      const updatedFields = [
        ['first_name', firstName],
        ['last_name', lastName],
        ['full_name_ar', fullNameAr],
        ['department', department],
        ['phone', phone],
        ['avatar_url', avatarUrl ?? ''],
        ['bio', bio],
      ]
        .filter(([k, v]) => norm(prev[String(k)]) !== norm(v))
        .map(([k]) => String(k));

      await audit(supabase, 'profile.update', 'user', user.id, {
        page: 'Admin/Profile',
        table: 'user_profiles',
        operation: 'update',
        updated_fields: updatedFields,
      });
      
      setSuccess('تم حفظ البيانات الشخصية');
      showToast('تم حفظ البيانات الشخصية', { severity: 'success' });
    } catch (e: unknown) {
      const error = e as AppError;
      const msg = error.message || 'فشل حفظ البيانات';
      setError(msg);
      showToast(msg, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({
          notification_preferences: prefs,
          security_settings: sec,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (upErr) throw upErr;

      await audit(supabase, 'profile.preferences_update', 'user', user.id, {
        page: 'Admin/Profile',
        table: 'user_profiles',
        operation: 'update',
        updated_fields: ['notification_preferences', 'security_settings'],
      });
      setSuccess('تم حفظ التفضيلات الأمنية والإشعارات');
      showToast('تم حفظ التفضيلات', { severity: 'success' });
    } catch (e: unknown) {
      const error = e as AppError;
      const msg = error.message || 'فشل حفظ التفضيلات';
      setError(msg);
      showToast(msg, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailChange, setEmailChange] = useState('');

  const changePassword = async () => {
    try {
      if (!newPassword || newPassword !== confirmPassword) {
        setError('كلمات المرور غير متطابقة');
        return;
      }
      setSaving(true);
      setError(null);
      setSuccess(null);
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) throw authErr;
      setNewPassword('');
      setConfirmPassword('');

      if (user?.id) {
        await audit(supabase, 'security.password_change', 'user', user.id, {
          page: 'Admin/Profile',
          table: 'auth.users',
          operation: 'password_change',
        });
      }
      setSuccess('تم تغيير كلمة المرور');
      showToast('تم تغيير كلمة المرور', { severity: 'success' });
    } catch (e: unknown) {
      const error = e as AppError;
      const msg = error.message || 'فشل تغيير كلمة المرور';
      setError(msg);
      showToast(msg, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const changeEmail = async () => {
    try {
      if (!emailChange || emailChange === user?.email) {
        setError('يرجى إدخال بريد إلكتروني جديد');
        return;
      }
      setSaving(true);
      setError(null);
      setSuccess(null);
      const { error: authErr } = await supabase.auth.updateUser({ email: emailChange });
      if (authErr) throw authErr;

      if (user?.id) {
        await audit(supabase, 'security.email_change_request', 'user', user.id, {
          page: 'Admin/Profile',
          table: 'auth.users',
          operation: 'email_change_request',
          new_email: emailChange,
        });
      }
      setSuccess('تم إرسال رسالة تأكيد إلى البريد الإلكتروني الجديد');
      showToast('تم إرسال رسالة تأكيد إلى البريد الإلكتروني الجديد', { severity: 'success' });
    } catch (e: unknown) {
      const error = e as AppError;
      const msg = error.message || 'فشل تغيير البريد الإلكتروني';
      setError(msg);
      showToast(msg, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>الملف الشخصي</Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        {displayName} — {user?.email}
      </Typography>

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
          <Tab value="personal" label="البيانات الشخصية" />
          <Tab value="security" label="الأمان" />
          <Tab value="preferences" label="التفضيلات" />
          <Tab value="activity" label="النشاط" />
        </Tabs>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {tab === 'personal' && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
                gap: 3,
                alignItems: 'start',
              }}
            >
              <Box>
                <Stack alignItems="center" spacing={2}>
                  <Avatar src={avatarUrl || undefined} sx={{ width: 120, height: 120 }} />
                  <Button component="label" variant="outlined" disabled={uploading}>
                    {uploading ? <CircularProgress size={20} /> : 'تغيير الصورة'}
                    <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <TextField fullWidth label="الاسم الأول" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Box>
                <Box>
                  <TextField fullWidth label="اسم العائلة" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField fullWidth label="الاسم الكامل بالعربية" value={fullNameAr} onChange={(e) => setFullNameAr(e.target.value)} />
                </Box>
                <Box>
                  <TextField fullWidth label="القسم" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </Box>
                <Box>
                  <TextField fullWidth label="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <TextField fullWidth multiline minRows={3} label="نبذة" value={bio} onChange={(e) => setBio(e.target.value)} />
                </Box>
              </Box>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={savePersonal} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>تغيير كلمة المرور</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 180px' },
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              <Box>
                <TextField fullWidth label="كلمة المرور الجديدة" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Box>
              <Box>
                <TextField fullWidth label="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </Box>
              <Box sx={{ display: 'flex' }}>
                <Button variant="outlined" onClick={changePassword} sx={{ flex: 1 }} disabled={saving}>تغيير</Button>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>تغيير البريد الإلكتروني</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 180px' },
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              <Box>
                <TextField fullWidth label="البريد الإلكتروني الجديد" type="email" value={emailChange} onChange={(e) => setEmailChange(e.target.value)} />
              </Box>
              <Box sx={{ display: 'flex' }}>
                <Button variant="outlined" onClick={changeEmail} sx={{ flex: 1 }} disabled={saving}>تغيير</Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 'preferences' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>الإشعارات</Typography>
            <Stack>
              <FormControlLabel control={<Switch checked={prefs.email_notifications} onChange={(e) => setPrefs({ ...prefs, email_notifications: e.target.checked })} />} label="إشعارات البريد الإلكتروني" />
              <FormControlLabel control={<Switch checked={prefs.push_notifications} onChange={(e) => setPrefs({ ...prefs, push_notifications: e.target.checked })} />} label="إشعارات الدفع" />
              <FormControlLabel control={<Switch checked={prefs.security_alerts} onChange={(e) => setPrefs({ ...prefs, security_alerts: e.target.checked })} />} label="تنبيهات الأمان" />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>إعدادات الأمان</Typography>
            <Stack>
              <FormControlLabel control={<Switch checked={sec.two_factor_enabled} onChange={(e) => setSec({ ...sec, two_factor_enabled: e.target.checked })} />} label="تفعيل التحقق بخطوتين (اختياري)" />
              <FormControlLabel control={<Switch checked={sec.login_alerts} onChange={(e) => setSec({ ...sec, login_alerts: e.target.checked })} />} label="تنبيهات تسجيل الدخول" />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={savePreferences} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التفضيلات'}</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 'activity' && <ProfileActivity locale="ar" />}
    </Box>
  );
};

export default Profile;

