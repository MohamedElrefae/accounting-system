import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Login,
  Search,
  MarkEmailRead
} from '@mui/icons-material';

const steps = [
  'تسجيل الحساب',
  'تأكيد البريد الإلكتروني',
  'تسجيل الدخول'
];

export const EmailConfirmationHelper: React.FC = () => {
  return (
    <Box sx={{ py: 4, direction: 'rtl', maxWidth: 'md', mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
          📧 خطوات تأكيد الحساب
        </Typography>

        <Stepper activeStep={1} sx={{ mb: 4 }} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label} completed={index < 1}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card sx={{ mb: 3, bgcolor: 'info.light' }}>
          <CardContent>
            <Typography variant="h6" color="info.main" gutterBottom>
              ✅ تم إنشاء حسابك بنجاح!
            </Typography>
            <Typography variant="body1">
              حسابك تم إنشاؤه في النظام، ولكن يحتاج لتأكيد البريد الإلكتروني قبل تسجيل الدخول.
            </Typography>
          </CardContent>
        </Card>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            ⚠️ هام: يجب تأكيد البريد الإلكتروني أولاً
          </Typography>
        </Alert>

        <List>
          <ListItem>
            <ListItemIcon>
              <Search color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="1. تحقق من بريدك الوارد" 
              secondary="ابحث عن رسالة من Supabase أو نظام المحاسبة" 
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <MarkEmailRead color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="2. تحقق من مجلد الرسائل غير المرغوب فيها (Spam)" 
              secondary="قد تكون الرسالة في مجلد Spam أو Junk" 
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircle color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="3. اضغط على رابط التأكيد" 
              secondary="في الرسالة اضغط على رابط التأكيد أو Confirm your email" 
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <Login color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="4. عد لتسجيل الدخول" 
              secondary="بعد التأكيد، استخدم بريدك وكلمة المرور لتسجيل الدخول" 
            />
          </ListItem>
        </List>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button 
            variant="contained" 
            startIcon={<Email />}
            href="/login"
            fullWidth
          >
            محاولة تسجيل الدخول مرة أخرى
          </Button>
          
          <Button 
            variant="outlined"
            href="https://gmail.com" 
            target="_blank"
            startIcon={<Search />}
          >
            فتح Gmail
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            💡 <strong>نصيحة:</strong> إذا لم تستلم الرسالة خلال 5 دقائق، تحقق من كتابة البريد الإلكتروني بشكل صحيح أثناء التسجيل.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};
