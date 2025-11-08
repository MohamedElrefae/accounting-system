import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'error';
  threshold: number;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      setIsVisible(true);
      
      const updateMetrics = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const newMetrics: PerformanceMetric[] = [
          {
            name: 'DOM Content Loaded',
            value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            unit: 'ms',
            threshold: 1500,
            status: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart < 1500 ? 'good' : 'warning'
          },
          {
            name: 'Page Load Time',
            value: navigation.loadEventEnd - navigation.loadEventStart,
            unit: 'ms',
            threshold: 3000,
            status: navigation.loadEventEnd - navigation.loadEventStart < 3000 ? 'good' : 'warning'
          }
        ];

        // Add paint metrics if available
        paint.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            newMetrics.push({
              name: 'First Contentful Paint',
              value: entry.startTime,
              unit: 'ms',
              threshold: 1500,
              status: entry.startTime < 1500 ? 'good' : entry.startTime < 2500 ? 'warning' : 'error'
            });
          }
        });

        // Memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          newMetrics.push({
            name: 'Memory Usage',
            value: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            unit: 'MB',
            threshold: 100,
            status: memory.usedJSHeapSize / 1024 / 1024 < 100 ? 'good' : 'warning'
          });
        }

        setMetrics(newMetrics);
      };

      // Update metrics after page load
      setTimeout(updateMetrics, 1000);
      
      // Update periodically
      const interval = setInterval(updateMetrics, 5000);
      
      return () => clearInterval(interval);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  if (!isVisible || metrics.length === 0) return null;

  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        bottom: 16, 
        right: 16, 
        zIndex: 9999,
        maxWidth: 300,
        opacity: 0.9
      }}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Monitor
          </Typography>
          <Grid container spacing={1}>
            {metrics.map((metric, index) => (
              <Grid item xs={12} key={index}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    {metric.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {metric.value.toFixed(0)}{metric.unit}
                    </Typography>
                    <Chip 
                      size="small" 
                      color={getStatusColor(metric.status) as any}
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceDashboard;