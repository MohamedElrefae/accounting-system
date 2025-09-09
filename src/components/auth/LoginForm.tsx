import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, IconButton, InputAdornment, Paper, Stack } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GitHub from '@mui/icons-material/GitHub';
import Google from '@mui/icons-material/Google';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const schema = yup.object({
  email: yup.string().email('البريد الإلكتروني غير صحيح').required('البريد الإلكتروني مطلوب'),
  password: yup.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').required('كلمة المرور مطلوبة')
});

type FormValues = { email: string; password: string };

export const LoginForm: React.FC = () => {
  const { signIn, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      await signIn(values.email, values.password);
      // Navigate to dashboard after successful sign-in
      navigate('/');
    } catch (e: any) {
      console.error('[Login] signIn error:', e);
      alert(e?.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">نظام المحاسبة</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>نظام محاسبة متقدم للشركات</Typography>

        <Stack direction="row" spacing={2} mb={3}>
          <Button fullWidth variant="outlined" startIcon={<GitHub />} onClick={() => signInWithProvider('github')}>GitHub</Button>
          <Button fullWidth variant="outlined" startIcon={<Google />} onClick={() => signInWithProvider('google')}>جوجل</Button>
        </Stack>

        <Typography variant="h6" textAlign="center" mb={2}>تسجيل الدخول</Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            margin="normal"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <TextField
            fullWidth
            label="كلمة المرور"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(p => !p)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={submitting}>
            {submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>

          <Stack direction="row" justifyContent="center" spacing={3} mt={2}>
            {import.meta.env.VITE_ALLOWED_SIGNUP_EMAIL ? (
              <Button href="/register">إنشاء حساب جديد</Button>
            ) : null}
            <Button href="/forgot-password">نسيت كلمة المرور؟</Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
