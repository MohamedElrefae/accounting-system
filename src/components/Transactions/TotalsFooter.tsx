import React from 'react';
import { Box, Button, Typography, Paper, Stack, Chip, CircularProgress } from '@mui/material';
import { Save, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

interface TotalsFooterProps {
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  linesCount: number;
  onSave: () => void;
  onSaveAsDraft?: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isSaveDisabled: boolean;
}

const TotalsFooter: React.FC<TotalsFooterProps> = ({
  totalDebits,
  totalCredits,
  difference,
  isBalanced,
  linesCount,
  onSave,
  onSaveAsDraft,
  onCancel,
  isSubmitting,
  isSaveDisabled,
}) => {
  const theme = useTheme();

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2000, // Above modal overlay
        borderTop: 3,
        borderColor: isBalanced ? 'success.main' : 'error.main',
        bgcolor: 'background.paper',
        backdropFilter: 'blur(10px)',
      }}
      dir="rtl"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          gap: 3,
        }}
      >
        {/* Left Section: Totals */}
        <Stack direction="row" spacing={3} sx={{ flex: 1 }}>
          {/* Total Debits */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              إجمالي المدين
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              {formatCurrency(totalDebits)} ر.س
            </Typography>
          </Box>

          {/* Total Credits */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              إجمالي الدائن
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="error.main">
              {formatCurrency(totalCredits)} ر.س
            </Typography>
          </Box>

          {/* Difference */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              الفرق
            </Typography>
            <Typography 
              variant="h6" 
              fontWeight="bold"
              color={isBalanced ? 'success.main' : 'error.main'}
            >
              {formatCurrency(Math.abs(difference))} ر.س
            </Typography>
          </Box>

          {/* Lines Count */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              عدد الأسطر
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {linesCount}
            </Typography>
          </Box>
        </Stack>

        {/* Center Section: Balance Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isBalanced ? (
            <>
              <CheckCircle size={24} color={theme.palette.success.main} />
              <Chip 
                label="متوازن ✅" 
                color="success" 
                variant="filled"
                sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              />
            </>
          ) : (
            <>
              <XCircle size={24} color={theme.palette.error.main} />
              <Chip 
                label="غير متوازن ❌" 
                color="error" 
                variant="filled"
                sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              />
            </>
          )}
        </Box>

        {/* Right Section: Action Buttons (Right to Left: Save, Draft, Cancel) */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Save size={18} />
              )
            }
            onClick={onSave}
            disabled={isSaveDisabled || isSubmitting}
            sx={{
              minWidth: 140,
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ المعاملة'}
          </Button>

          {onSaveAsDraft && (
            <Button
              variant="outlined"
              startIcon={<FileText size={18} />}
              onClick={onSaveAsDraft}
              disabled={isSubmitting}
              sx={{
                minWidth: 140,
                py: 1.5,
              }}
            >
              حفظ كمسودة
            </Button>
          )}

          <Button
            variant="text"
            color="error"
            onClick={onCancel}
            disabled={isSubmitting}
            sx={{
              minWidth: 100,
              py: 1.5,
            }}
          >
            إلغاء
          </Button>
        </Stack>
      </Box>

      {/* Validation Message */}
      {!isBalanced && (
        <Box
          sx={{
            px: 3,
            py: 1,
            bgcolor: 'error.lighter',
            borderTop: 1,
            borderColor: 'error.light',
          }}
        >
          <Typography variant="body2" color="error.dark" fontWeight="medium">
            ⚠️ لا يمكن حفظ المعاملة حتى يكون إجمالي المدين مساوياً لإجمالي الدائن
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TotalsFooter;
