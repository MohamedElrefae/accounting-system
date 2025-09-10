import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, IconButton, InputAdornment, Paper, Stack } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import { AccessRequestForm } from './AccessRequestForm';

const schema = yup.object({
  email: yup.string().email('البريد الإلكتروني غير صحيح').required('البريد الإلكتروني مطلوب'),
  password: yup.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').required('كلمة المرور مطلوبة')
});

type FormValues = { email: string; password: string };

export const LoginForm: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { setLanguage } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      await signIn(values.email, values.password);
      // Set Arabic as default language after successful login and then navigate
      setLanguage('ar');
      navigate('/');
    } catch (e: any) {
      console.error('[Login] signIn error:', e);
      alert(e?.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  // Show access request form if requested
  if (showAccessRequest) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AccessRequestForm onBack={() => setShowAccessRequest(false)} />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">نظام المحاسبة</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>نظام محاسبة متقدم للشركات</Typography>

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

          <Stack direction="row" justifyContent="center" spacing={2} mt={2}>
            <Button 
              variant="outlined"
              onClick={() => setShowAccessRequest(true)}
              startIcon={<PersonAdd />}
              sx={{ flex: 1 }}
            >
              طلب حساب جديد
            </Button>
            <Button href="/forgot-password" sx={{ flex: 1 }}>
              نسيت كلمة المرور؟
            </Button>
          </Stack>
          
          <Stack direction="row" justifyContent="center" mt={2}>
            <Button 
              href="/register"
              variant="contained"
              color="success"
              sx={{ minWidth: 200 }}
            >
              لديك موافقة؟ سجل الآن
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};
