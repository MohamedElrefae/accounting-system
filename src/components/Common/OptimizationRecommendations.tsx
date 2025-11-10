import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Collapse,
  Alert,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { bundleAnalyzer } from '../../utils/bundleAnalyzer';
import { performanceTracker } from '../../utils/performanceMetrics';

const OptimizationRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [bundleReport, setBundleReport] = useState<any>(null);

  useEffect(() => {
    const updateRecommendations = () => {
      const report = bundleAnalyzer.getBundleReport();
      const score = bundleAnalyzer.getPerformanceScore();
      const metrics = performanceTracker.getSummary();

      setBundleReport(report);
      setPerformanceScore(score);

      // Combine bundle and performance recommendations
      const allRecommendations = [
        ...report.recommendations,
        ...generatePerformanceRecommendations(metrics)
      ];

      setRecommendations(allRecommendations);
    };

    updateRecommendations();
    const interval = setInterval(updateRecommendations, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const generatePerformanceRecommendations = (metrics: any) => {
    const recs = [];

    // Check for slow page loads
    if (metrics.page_load_time?.avg > 3000) {
      recs.push({
        type: 'performance',
        priority: 'high',
        description: `Page load time is ${(metrics.page_load_time.avg / 1000).toFixed(1)}s. Optimize critical resources.`,
        estimatedSavings: 2000,
        implementation: 'Implement resource preloading and code splitting'
      });
    }

    // Check for high memory usage
    if (metrics.memory_used?.avg > 100) {
      recs.push({
        type: 'memory',
        priority: 'medium',
        description: `Memory usage is ${metrics.memory_used.avg.toFixed(0)}MB. Consider memory optimization.`,
        estimatedSavings: 50,
        implementation: 'Use React.memo, useMemo, and cleanup effects'
      });
    }

    // Check for slow component mounts
    Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
      if (key.includes('_mount') && metric.avg > 500) {
        recs.push({
          type: 'component',
          priority: 'medium',
          description: `Component ${key.replace('_mount', '')} takes ${metric.avg.toFixed(0)}ms to mount.`,
          estimatedSavings: metric.avg * 0.7,
          implementation: 'Optimize component rendering and use React.memo'
        });
      }
    });

    return recs;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ErrorIcon color="error" />;
      case 'medium': return <WarningIcon color="warning" />;
      case 'low': return <CheckCircleIcon color="success" />;
      default: return <LightbulbIcon />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'split':
      case 'lazy': return <CodeIcon />;
      case 'performance': return <SpeedIcon />;
      case 'memory': return <MemoryIcon />;
      default: return <LightbulbIcon />;
    }
  };

  if (!import.meta.env.DEV && localStorage.getItem('show-optimization-recommendations') !== 'true') {
    return null;
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <LightbulbIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Performance Optimization
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Score:
            </Typography>
            <Chip 
              label={`${performanceScore}/100`}
              color={getScoreColor(performanceScore)}
              size="small"
            />
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <LinearProgress 
          variant="determinate" 
          value={performanceScore} 
          color={getScoreColor(performanceScore)}
          sx={{ mb: 2, height: 8, borderRadius: 4 }}
        />

        {performanceScore < 70 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your app has performance issues that could impact user experience. 
            Consider implementing the recommendations below.
          </Alert>
        )}

        <Collapse in={expanded}>
          {bundleReport && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Bundle Analysis
              </Typography>
              <Box display="flex" gap={2} mb={2}>
                <Chip 
                  label={`${bundleReport.totalSize.toFixed(0)}KB total`}
                  size="small"
                  color={bundleReport.totalSize > 1000 ? 'error' : 'success'}
                />
                <Chip 
                  label={`${bundleReport.bundleCount} bundles`}
                  size="small"
                />
                <Chip 
                  label={`${bundleReport.totalLoadTime.toFixed(0)}ms load time`}
                  size="small"
                  color={bundleReport.totalLoadTime > 3000 ? 'error' : 'success'}
                />
              </Box>
            </Box>
          )}

          {recommendations.length > 0 ? (
            <List dense>
              {recommendations.slice(0, 5).map((rec, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getPriorityIcon(rec.priority)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTypeIcon(rec.type)}
                        <Typography variant="body2">
                          {rec.description}
                        </Typography>
                        <Chip 
                          label={`-${rec.estimatedSavings.toFixed(0)}${rec.type === 'memory' ? 'MB' : 'ms'}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        💡 {rec.implementation}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="success">
              🎉 Great job! Your app is well optimized. No major issues detected.
            </Alert>
          )}

          {recommendations.length > 5 && (
            <Typography variant="caption" color="text.secondary">
              ... and {recommendations.length - 5} more recommendations
            </Typography>
          )}
        </Collapse>

        <Box mt={2} display="flex" gap={1}>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => window.open('/build-analyzer', '_blank')}
          >
            View Bundle Analysis
          </Button>
          <Button 
            size="small" 
            variant="outlined"
            onClick={() => {
              const data = {
                score: performanceScore,
                recommendations,
                bundleReport,
                metrics: performanceTracker.exportMetrics()
              };
              console.log('Performance Report:', data);
              navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
            }}
          >
            Export Report
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OptimizationRecommendations;