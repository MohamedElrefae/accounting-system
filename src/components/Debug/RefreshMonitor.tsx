import React, { useEffect, useState } from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';

interface RefreshEvent {
  timestamp: number;
  reason: string;
  details?: any;
}

/**
 * Debug component to monitor and log page refresh events
 */
const RefreshMonitor: React.FC = () => {
  const [refreshEvents, setRefreshEvents] = useState<RefreshEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show monitor in development mode or when debug flag is set
    const shouldShow = import.meta.env.DEV || localStorage.getItem('debug_refresh_monitor') === 'true';
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    const handlePreventedRefresh = (event: CustomEvent) => {
      const newEvent: RefreshEvent = {
        timestamp: Date.now(),
        reason: event.detail?.reason || 'unknown',
        details: event.detail
      };
      
      setRefreshEvents(prev => [...prev.slice(-9), newEvent]); // Keep last 10 events
      console.log('[RefreshMonitor] Prevented refresh:', newEvent);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const newEvent: RefreshEvent = {
        timestamp: Date.now(),
        reason: 'beforeunload',
        details: { returnValue: event.returnValue }
      };
      
      setRefreshEvents(prev => [...prev.slice(-9), newEvent]);
      console.log('[RefreshMonitor] Page unload detected:', newEvent);
    };

    const handleError = (event: ErrorEvent) => {
      const newEvent: RefreshEvent = {
        timestamp: Date.now(),
        reason: 'error',
        details: { 
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      };
      
      setRefreshEvents(prev => [...prev.slice(-9), newEvent]);
      console.log('[RefreshMonitor] Error detected:', newEvent);
    };

    window.addEventListener('preventedRefresh', handlePreventedRefresh as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('preventedRefresh', handlePreventedRefresh as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (!isVisible || refreshEvents.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        maxWidth: 300,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        boxShadow: 2
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
        Refresh Monitor ({refreshEvents.length})
      </Typography>
      
      {refreshEvents.slice(-3).map((event, index) => (
        <Alert 
          key={`${event.timestamp}-${index}`}
          severity={event.reason === 'error' ? 'error' : 'info'}
          sx={{ mb: 0.5, py: 0 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={event.reason} 
              size="small" 
              color={event.reason === 'error' ? 'error' : 'default'}
            />
            <Typography variant="caption">
              {new Date(event.timestamp).toLocaleTimeString()}
            </Typography>
          </Box>
          {event.details && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
              {JSON.stringify(event.details, null, 2).slice(0, 100)}...
            </Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
};

export default RefreshMonitor;