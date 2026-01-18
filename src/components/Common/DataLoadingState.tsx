import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';

interface DataLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  size?: 'small' | 'medium' | 'large';
  minHeight?: string | number;
}

const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  message = 'جاري تحميل البيانات...',
  showProgress = true,
  size = 'medium',
  minHeight = 200
}) => {
  const getSizeValue = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 48;
      default: return 36;
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight={minHeight}
      p={3}
    >
      <CircularProgress size={getSizeValue()} sx={{ mb: 2 }} />
      
      <Typography variant="body2" color="text.secondary" align="center">
        {message}
      </Typography>
      
      {showProgress && (
        <Box sx={{ width: '100%', mt: 2, maxWidth: 300 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default DataLoadingState;
