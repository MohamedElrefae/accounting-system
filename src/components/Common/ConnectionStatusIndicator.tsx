import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { 
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Refresh as RefreshIcon,
  SignalCellularConnectedNoInternet4Bar as NoInternetIcon
} from '@mui/icons-material';
import { useConnectionHealth } from '../../utils/connectionMonitor';
import { useScope } from '../../contexts/ScopeContext';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  showDetails = false, 
  compact = false 
}) => {
  const connectionHealth = useConnectionHealth();
  const { error: scopeError, isLoadingOrgs } = useScope();
  
  const getStatusColor = () => {
    if (!connectionHealth.isOnline) return 'error';
    if (connectionHealth.latency && connectionHealth.latency > 2000) return 'warning';
    if (scopeError) return 'warning';
    return 'success';
  };
  
  const getStatusText = () => {
    if (!connectionHealth.isOnline) return 'غير متصل';
    if (scopeError && scopeError.includes('Connection')) return 'مشاكل في الاتصال';
    if (isLoadingOrgs) return 'جاري التحميل...';
    return 'متصل';
  };
  
  const getStatusIcon = () => {
    if (!connectionHealth.isOnline) return <WifiOffIcon />;
    if (connectionHealth.latency && connectionHealth.latency > 2000) return <NoInternetIcon />;
    return <WifiIcon />;
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  if (compact) {
    return (
      <Tooltip title={`الحالة: ${getStatusText()}`}>
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant="outlined"
        />
      </Tooltip>
    );
  }
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider'
      }}
    >
      <Chip
        icon={getStatusIcon()}
        label={getStatusText()}
        color={getStatusColor()}
        size="small"
      />
      
      {showDetails && (
        <>
          {connectionHealth.latency && (
            <Typography variant="caption" color="text.secondary">
              {connectionHealth.latency}ms
            </Typography>
          )}
          
          {scopeError && (
            <Typography variant="caption" color="error" sx={{ maxWidth: 200 }}>
              {scopeError}
            </Typography>
          )}
        </>
      )}
      
      {!connectionHealth.isOnline && (
        <Tooltip title="إعادة تحميل الصفحة">
          <IconButton size="small" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ConnectionStatusIndicator;
