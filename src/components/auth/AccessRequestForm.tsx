import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  Alert,
  MenuItem,
  CircularProgress,
  Stack
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import useAppStore from '../../store/useAppStore';

const accessRequestSchema = yup.object({
  email: yup
    .string()
    .email('البريد الإلكتروني غير صحيح')
    .required('البريد الإلكتروني مطلوب'),
  full_name_ar: yup
    .string()
    .required('الاسم الكامل مطلوب')
    .min(2, 'يجب أن يكون الاسم أكثر من حرفين'),
  phone: yup
    .string()
    .matches(/^[\+]?[0-9\s\-\(\)]{10,}$/, 'رقم الهاتف غير صحيح')
    .required('رقم الهاتف مطلوب'),
  department: yup.string().required('القسم مطلوب'),
  job_title: yup.string().required('المسمى الوظيفي مطلوب'),
  message: yup
    .string()
    .max(500, 'الرسالة يجب أن تكون أقل من 500 حرف')
    .optional()
});

type AccessRequestFormValues = {
  email: string;
  full_name_ar: string;
  phone: string;
  department: string;
  job_title: string;
  message?: string;
};

interface AccessRequestFormProps {
  onBack: () => void;
}

const departments = [
  'المحاسبة',
  'الإدارة المالية',
  'الموارد البشرية',
  'المشتريات',
  'المبيعات',
  'التسويق',
  'تقنية المعلومات',
  'العمليات',
  'إدارة المشاريع',
  'أخرى'
];

export const AccessRequestForm: React.FC<AccessRequestFormProps> = ({ onBack }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { theme } = useAppStore();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AccessRequestFormValues>({
    resolver: yupResolver(accessRequestSchema)
  });

  const onSubmit = async (values: AccessRequestFormValues) => {
    try {
      setSubmitting(true);
      setError(null);

      // Check if email already has a request
      const { data: existingRequest } = await supabase
        .from('access_requests')
        .select('id, status')
        .eq('email', values.email)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          setError('يوجد طلب معلق بالفعل لهذا البريد الإلكتروني');
        } else if (existingRequest.status === 'approved') {
          setError('تم الموافقة على طلبك بالفعل، يرجى التحقق من بريدك الإلكتروني');
        } else {
          setError('يوجد طلب سابق لهذا البريد الإلكتروني');
        }
        return;
      }

      // Submit access request
      const { error: insertError } = await supabase
        .from('access_requests')
        .insert([values]);

      if (insertError) {
        throw insertError;
      }

      setSubmittedEmail(values.email);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Access request submission error:', err);
      setError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl', textAlign: 'center' }}>
        <Typography variant="h5" color="success.main" gutterBottom>
          ✅ تم إرسال طلبك بنجاح
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={2}>
          سيتم مراجعة طلبك من قبل الإدارة.
        </Typography>
        
        <Typography variant="h6" mb={2} sx={{ color: 'primary.main' }}>
          عند الموافقة على طلبك:
        </Typography>
        
        <Stack spacing={1} mb={3} sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight="bold" color="success.main">
            ✅ اضغط على "لديك موافقة؟ سجل الآن" في صفحة تسجيل الدخول
          </Typography>
          <Typography variant="body2">1. أنشئ حساب جديد ببريدك: {submittedEmail}</Typography>
          <Typography variant="body2">2. اختر كلمة مرور قوية</Typography>
          <Typography variant="body2">3. أكد حسابك عبر البريد الإلكتروني</Typography>
          <Typography variant="body2">4. سجل دخولك واستمتع بالنظام!</Typography>
        </Stack>
        
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            color="success"
            href="/register"
          >
            اذهب للتسجيل الآن
          </Button>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBack />}
          >
            عودة
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={6} sx={{ p: 4, width: '100%', direction: 'rtl' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
        طلب الوصول للنظام
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
        املأ البيانات التالية لطلب الوصول لنظام المحاسبة
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label="البريد الإلكتروني *"
          placeholder="name@company.com"
          margin="normal"
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          disabled={submitting}
        />

        <TextField
          fullWidth
          label="الاسم الكامل *"
          margin="normal"
          {...register('full_name_ar')}
          error={!!errors.full_name_ar}
          helperText={errors.full_name_ar?.message}
          disabled={submitting}
        />

        <TextField
          fullWidth
          label="رقم الهاتف *"
          placeholder="+966xxxxxxxxx"
          margin="normal"
          {...register('phone')}
          error={!!errors.phone}
          helperText={errors.phone?.message}
          disabled={submitting}
        />

        <TextField
          fullWidth
          select
          label="القسم *"
          margin="normal"
          {...register('department')}
          error={!!errors.department}
          helperText={errors.department?.message}
          disabled={submitting}
          defaultValue=""
        >
          {departments.map((dept) => (
            <MenuItem key={dept} value={dept}>
              {dept}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="المسمى الوظيفي *"
          margin="normal"
          {...register('job_title')}
          error={!!errors.job_title}
          helperText={errors.job_title?.message}
          disabled={submitting}
        />

        <TextField
          fullWidth
          label="رسالة إضافية (اختيارية)"
          multiline
          rows={3}
          margin="normal"
          placeholder="اذكر أي معلومات إضافية قد تساعد في مراجعة طلبك..."
          {...register('message')}
          error={!!errors.message}
          helperText={errors.message?.message || 'حد أقصى 500 حرف'}
          disabled={submitting}
        />

        <Stack direction="row" spacing={2} mt={3}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={onBack}
            disabled={submitting}
            startIcon={<ArrowBack />}
          >
            إلغاء
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};
