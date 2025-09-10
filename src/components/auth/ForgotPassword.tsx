import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, Paper, Alert } from '@mui/material';
import { supabase } from '../../utils/supabase';

const schema = yup.object({
  email: yup.string().email('البريد الإلكتروني غير صحيح').required('البريد الإلكتروني مطلوب')
});

type FormValues = { email: string };

export const ForgotPassword: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ 
    resolver: yupResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      alert(e?.message || 'فشل إرسال رابط استعادة كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">استعادة كلمة المرور</Typography>
        
        {sent ? (
          <Alert severity="success">
            تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من البريد الوارد.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
              أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور
            </Typography>
            
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              placeholder="name@example.com"
              margin="normal"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </Button>
            
            <Button href="/login" fullWidth variant="text" sx={{ mt: 2 }}>العودة لتسجيل الدخول</Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
