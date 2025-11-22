import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Avatar, Stack, Alert, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { supabase } from '../../utils/supabase';

const EditProfile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const userProfileCtx = useUserProfile();
  const [form, setForm] = useState({ first_name: '', last_name: '', full_name_ar: '', phone: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name_ar: profile.full_name_ar || '',
        phone: profile.phone || ''
      });
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

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
      const filePath = `${user.id}/${fileName}`; // complies with policy: first folder is auth.uid()

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('user-avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      setAvatarUrl(publicUrl);
    } catch (e: any) {
      setError(e.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const update: any = {
        first_name: form.first_name,
        last_name: form.last_name,
        full_name_ar: form.full_name_ar,
        phone: form.phone,
        updated_at: new Date().toISOString()
      };
      if (avatarUrl) update.avatar_url = avatarUrl;

      const { error: upErr } = await supabase
        .from('user_profiles')
        .update(update)
        .eq('id', user.id);
      if (upErr) throw upErr;

      // Refresh both contexts to ensure all components get updated data
      await refreshProfile(); // AuthContext
      await userProfileCtx.refreshProfile(); // UserProfileContext
      
      setSuccess('تم حفظ التغييرات بنجاح');
    } catch (e: any) {
      setError(e.message || 'فشل حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>تعديل الملف الشخصي</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
<Grid xs={12} md={3}>
              <Stack alignItems="center" spacing={2}>
                <Avatar src={avatarUrl || undefined} sx={{ width: 120, height: 120 }} />
                <Button component="label" variant="outlined" disabled={uploading}>
                  {uploading ? <CircularProgress size={20} /> : 'تغيير الصورة'}
                  <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </Button>
              </Stack>
            </Grid>
<Grid xs={12} md={9}>
              <Grid container spacing={2}>
<Grid xs={12} md={6}>
                  <TextField fullWidth label="الاسم الأول" value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </Grid>
<Grid xs={12} md={6}>
                  <TextField fullWidth label="اسم العائلة" value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </Grid>
<Grid xs={12}>
                  <TextField fullWidth label="الاسم الكامل بالعربية" value={form.full_name_ar}
                    onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })} />
                </Grid>
<Grid xs={12} md={6}>
                  <TextField fullWidth label="الهاتف" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        </CardContent>
      </Card>
    </Box>
  );
};

export default EditProfile;

