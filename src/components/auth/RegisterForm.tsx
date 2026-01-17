import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Container, TextField, Typography, Box, Paper, Stack, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';

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
  const [approvedEmails, setApprovedEmails] = useState<string[]>([]);
  const [checkingApproval, setCheckingApproval] = useState(true);

  // Check for approved emails from the access_requests table
  useEffect(() => {
    const loadApprovedEmails = async () => {
      try {
        console.log('Loading approved emails from access_requests table...');
        const { data, error } = await supabase
          .from('access_requests')
          .select('email')
          .eq('status', 'approved');
        
        console.log('Approved emails query result:', { data, error });
        
        if (!error && data) {
          const emails = data.map(item => item.email.toLowerCase());
          console.log('Setting approved emails:', emails);
          setApprovedEmails(emails);
        } else {
          console.error('Error in approved emails query:', error);
        }
      } catch (error) {
        console.error('Error loading approved emails:', error);
      } finally {
        setCheckingApproval(false);
      }
    };
    
    loadApprovedEmails();
  }, []);

  const registrationOpen = useMemo(() => {
    // Temporary bypass for testing - remove this in production
    if (import.meta.env.DEV) {
      console.log('🔓 Development mode: Allowing registration for testing');
      return true;
    }
    return Boolean(allowedEmail) || approvedEmails.length > 0;
  }, [allowedEmail, approvedEmails]);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!registrationOpen) return;
    
    const emailLower = values.email.toLowerCase();
    const isAllowedEmail = allowedEmail && emailLower === allowedEmail.toLowerCase();
    const isApprovedEmail = approvedEmails.includes(emailLower);
    
    console.log('Email validation:', { 
      email: emailLower, 
      isAllowedEmail, 
      isApprovedEmail, 
      approvedEmails,
      registrationOpen
    });
    
    // In development mode, allow any email (backend will validate)
    // In production, require frontend check OR rely on backend validation
    if (!import.meta.env.DEV && !registrationOpen && !isAllowedEmail && !isApprovedEmail) {
      setError('email', { 
        message: 'هذا البريد غير مسموح له بالتسجيل. يرجى طلب الوصول أولاً.'
      });
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('🚀 Calling signUp function for:', emailLower);
      await signUp(values.email, values.password);
      setSent(true);
    } catch (e: any) {
      console.error('❌ Registration error:', e);
      // Show the actual error from backend validation
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

        {checkingApproval && (
          <Alert severity="info" sx={{ mb: 2 }}>
            جاري التحقق من طلبات الوصول المعتمدة...
          </Alert>
        )}
        
        {!checkingApproval && !registrationOpen && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            التسجيل مغلق. يرجى طلب الوصول عبر صفحة تسجيل الدخول أولاً.
          </Alert>
        )}
        
        {!checkingApproval && approvedEmails.length > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            هناك {approvedEmails.length} بريد معتمد يمكنه التسجيل. استخدم بريدك المعتمد.
          </Alert>
        )}

        {sent ? (
          <Alert severity="success">
            ✅ تم إنشاء الحساب بنجاح!
            <br /><br />
            يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب، ثم يمكنك تسجيل الدخول.
            <br /><br />
            📧 <strong>ملاحظة هامة:</strong> ابحث عن رسالة التأكيد في البريد الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).
            <br /><br />
            📝 ملاحظة: سيتم تحميل بياناتك الشخصية تلقائياً بعد أول تسجيل دخول.
            <br /><br />
            <Button 
              variant="contained" 
              href="/login"
              sx={{ mt: 2 }}
            >
              الذهاب لتسجيل الدخول
            </Button>
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
              disabled={!registrationOpen || checkingApproval}
            />

            <TextField
              fullWidth
              label="كلمة المرور"
              type="password"
              margin="normal"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={!registrationOpen || checkingApproval}
            />

            <TextField
              fullWidth
              label="تأكيد كلمة المرور"
              type="password"
              margin="normal"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              disabled={!registrationOpen || checkingApproval}
            />

            <Stack direction="row" spacing={2} mt={2}>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={!registrationOpen || submitting || checkingApproval}
              >
                {checkingApproval 
                  ? 'جاري التحقق...' 
                  : submitting 
                    ? 'جاري الإرسال...' 
                    : 'إنشاء حساب'
                }
              </Button>
              <Button href="/login" variant="text">العودة لتسجيل الدخول</Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};
