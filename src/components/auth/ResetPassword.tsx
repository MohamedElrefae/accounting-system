import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, Paper, Alert } from '@mui/material';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';

const schema = yup.object({
  password: yup
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .required('كلمة المرور مطلوبة'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'كلمتا المرور غير متطابقتين')
    .required('تأكيد كلمة المرور مطلوب')
});

type FormValues = { password: string; confirmPassword: string };

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ 
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    // Ensure session is established when arriving from email link
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        // New GoTrue behavior sends a `code` query param that must be exchanged for a session
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          console.log('[ResetPassword] Exchanged code for session');
        }
      } catch (e) {
        console.warn('[ResetPassword] exchangeCodeForSession skipped:', e);
      }
    })();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) throw error;

      // Clear the require_password_change flag after successful update
      await supabase.auth.updateUser({
        data: { require_password_change: false }
      });
      
      setSuccess(true);
      
      // Check if we're already logged in after password update
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[ResetPassword] Session after update:', !!session);
      
      if (session) {
        // Already logged in, go to dashboard (SPA navigation)
        setTimeout(() => {
          try { navigate('/'); } catch { window.location.href = '/'; }
        }, 1500);
      } else {
        // Not logged in, go to login page (SPA navigation)
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (e: any) {
      console.error('[ResetPassword] Error:', e);
      setError(e?.message || 'فشل في تحديث كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">إعادة تعيين كلمة المرور</Typography>
        
        {success ? (
          <Alert severity="success">
            تم تحديث كلمة المرور بنجاح! سيتم توجيهك إلى صفحة تسجيل الدخول...
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
              أدخل كلمة المرور الجديدة
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="كلمة المرور الجديدة"
              type="password"
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            
            <TextField
              fullWidth
              label="تأكيد كلمة المرور"
              type="password"
              margin="normal"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={submitting}>
              {submitting ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </Button>
            
            <Button onClick={() => navigate('/login')} fullWidth variant="text" sx={{ mt: 2 }}>العودة لتسجيل الدخول</Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
