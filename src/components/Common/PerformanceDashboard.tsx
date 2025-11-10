import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { performanceTracker } from '../../utils/performanceMetrics';

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const showDashboard = import.meta.env.DEV || 
                         localStorage.getItem('show-performance-dashboard') === 'true';
    setIsVisible(showDashboard);

    if (!showDashboard) return;

    const updateMetrics = () => {
      const data = performanceTracker.exportMetrics();
      setMetrics(data);
    };

    // Update metrics every 5 seconds
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !metrics) {
    return null;
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  };

  const formatValue = (value: number, unit: string = 'ms') => {
    if (unit === 'ms') {
      return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(1)}s`;
    }
    return `${value.toFixed(1)}${unit}`;
  };

  const criticalMetrics = [
    { key: 'page_load_time', label: 'Page Load', thresholds: { good: 2000, warning: 5000 }, icon: <SpeedIcon /> },
    { key: 'largest_contentful_paint', label: 'LCP', thresholds: { good: 2500, warning: 4000 }, icon: <TimerIcon /> },
    { key: 'first_input_delay', label: 'FID', thresholds: { good: 100, warning: 300 }, icon: <NetworkIcon /> },
    { key: 'memory_used', label: 'Memory', thresholds: { good: 50, warning: 100 }, icon: <MemoryIcon />, unit: 'MB' }
  ];

  return (
    <Box sx={{ position: 'fixed', top: 10, right: 10, zIndex: 9999, maxWidth: 400 }}>
      <Card sx={{ mb: 1, backgroundColor: 'rgba(0,0,0,0.9)', color: 'white' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" mb={1}>
            <SpeedIcon sx={{ mr: 1, fontSize: 16 }} />
            <Typography variant="subtitle2">Performance Monitor</Typography>
            <Chip 
              label="LIVE" 
              color="success" 
              size="small" 
              sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
            />
          </Box>

          <Grid container spacing={1}>
            {criticalMetrics.map(({ key, label, thresholds, icon, unit = 'ms' }) => {
              const metric = metrics.summary[key];
              if (!metric) return null;

              const color = getPerformanceColor(metric.avg, thresholds);
              const value = formatValue(metric.avg, unit);

              return (
                <Grid item xs={6} key={key}>
                  <Box display="flex" alignItems="center" mb={0.5}>
                    {React.cloneElement(icon, { sx: { fontSize: 14, mr: 0.5 } })}
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      {label}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    color={color === 'success' ? 'success.main' : color === 'warning' ? 'warning.main' : 'error.main'}
                    sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}
                  >
                    {value}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((metric.avg / thresholds.warning) * 100, 100)}
                    color={color}
                    sx={{ height: 3, borderRadius: 1 }}
                  />
                </Grid>
              );
            })}
          </Grid>

          {/* Performance Alerts */}
          {Object.entries(metrics.summary).some(([key, metric]: [string, any]) => {
            const threshold = criticalMetrics.find(m => m.key === key)?.thresholds.warning || 1000;
            return metric.avg > threshold;
          }) && (
            <Alert 
              severity="warning" 
              sx={{ mt: 1, py: 0, fontSize: '0.7rem' }}
              icon={<WarningIcon sx={{ fontSize: 14 }} />}
            >
              Performance issues detected
            </Alert>
          )}

          {/* Quick Stats */}
          <Box mt={1} pt={1} borderTop="1px solid rgba(255,255,255,0.1)">
            <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
              Metrics: {Object.keys(metrics.summary).length} | 
              Recent: {metrics.recent.length} | 
              Memory: {((performance as any).memory?.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Toggle button */}
      <Box textAlign="right">
        <Chip
          label="Hide"
          size="small"
          onClick={() => {
            localStorage.setItem('show-performance-dashboard', 'false');
            setIsVisible(false);
          }}
          sx={{ fontSize: '0.7rem', height: 20, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
        />
      </Box>
    </Box>
  );
};

export default PerformanceDashboard;