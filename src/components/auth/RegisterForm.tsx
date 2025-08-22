import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, Paper, Stack, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const schema = yup.object({
  email: yup.string().email('البريد الإلكتروني غير صحيح').required('البريد الإلكتروني مطلوب'),
  password: yup
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .required('كلمة المرور مطلوبة'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'كلمتا المرور غير متطابقتين')
    .required('تأكيد كلمة المرور مطلوب')
});

type FormValues = { email: string; password: string; confirmPassword: string };

export const RegisterForm: React.FC = () => {
  const { signUp } = useAuth();
  const allowedEmail = import.meta.env.VITE_ALLOWED_SIGNUP_EMAIL?.trim();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const registrationOpen = useMemo(() => Boolean(allowedEmail), [allowedEmail]);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!registrationOpen) return;
    if (allowedEmail && values.email.toLowerCase() !== allowedEmail.toLowerCase()) {
      setError('email', { message: 'التسجيل متاح لعنوان بريد محدد فقط' });
      return;
    }
    try {
      setSubmitting(true);
      await signUp(values.email, values.password);
      setSent(true);
    } catch (e: any) {
      alert(e?.message || 'فشل إنشاء الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">إنشاء حساب</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>سيتم إرسال رابط تأكيد إلى بريدك الإلكتروني</Typography>

        {!registrationOpen && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            التسجيل مغلق. الرجاء الاتصال بالمسؤول لفتح التسجيل الأولي عبر تعيين VITE_ALLOWED_SIGNUP_EMAIL.
          </Alert>
        )}

        {sent ? (
          <Alert severity="success">
            تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب قبل تسجيل الدخول.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              placeholder="name@example.com"
              margin="normal"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={!registrationOpen}
            />

            <TextField
              fullWidth
              label="كلمة المرور"
              type="password"
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={!registrationOpen}
            />

            <TextField
              fullWidth
              label="تأكيد كلمة المرور"
              type="password"
              margin="normal"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              disabled={!registrationOpen}
            />

            <Stack direction="row" spacing={2} mt={2}>
              <Button type="submit" variant="contained" disabled={!registrationOpen || submitting}>
                {submitting ? 'جاري الإرسال...' : 'إنشاء حساب'}
              </Button>
              <Button href="/login" variant="text">العودة لتسجيل الدخول</Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
