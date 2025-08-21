import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import useAppStore from '../store/useAppStore';

const TestRTL: React.FC = () => {
  const { language, toggleLanguage } = useAppStore();
  const isRtl = language === 'ar';

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          RTL/LTR Test Page
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Current Settings:
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography>Language: <strong>{language}</strong></Typography>
          <Typography>Direction: <strong>{isRtl ? 'RTL' : 'LTR'}</strong></Typography>
          <Typography>Document Dir: <strong>{document.documentElement.dir}</strong></Typography>
        </Box>

        <Button 
          variant="contained" 
          onClick={toggleLanguage}
          sx={{ mb: 2 }}
        >
          Toggle Language (Current: {language.toUpperCase()})
        </Button>

        <Box sx={{ 
          p: 2, 
          border: '2px solid',
          borderColor: isRtl ? 'error.main' : 'success.main',
          borderRadius: 1,
          bgcolor: isRtl ? 'error.light' : 'success.light',
        }}>
          <Typography variant="h6">
            Expected Behavior:
          </Typography>
          {isRtl ? (
            <Box>
              <Typography>✅ Language: Arabic (AR)</Typography>
              <Typography>✅ Sidebar should be on the RIGHT</Typography>
              <Typography>✅ Menu button should be on the RIGHT</Typography>
              <Typography>✅ Action icons should be on the LEFT</Typography>
              <Typography>✅ Text should flow RIGHT to LEFT</Typography>
            </Box>
          ) : (
            <Box>
              <Typography>✅ Language: English (EN)</Typography>
              <Typography>✅ Sidebar should be on the LEFT</Typography>
              <Typography>✅ Menu button should be on the LEFT</Typography>
              <Typography>✅ Action icons should be on the RIGHT</Typography>
              <Typography>✅ Text should flow LEFT to RIGHT</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Debug Info:
          </Typography>
          <Typography variant="caption" component="pre">
            {JSON.stringify({
              language,
              isRtl,
              documentDir: document.documentElement.dir,
              documentLang: document.documentElement.lang,
              timestamp: new Date().toISOString()
            }, null, 2)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default TestRTL;
