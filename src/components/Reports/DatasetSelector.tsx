import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Skeleton,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import DatasetIcon from '@mui/icons-material/Dataset';
import InfoIcon from '@mui/icons-material/Info';
import type { DatasetSelectorProps } from '../../types/reports';

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets,
  selectedDataset,
  onDatasetSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          اختر مصدر البيانات
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((index) => (
            <Grid xs={12} md={6} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} />
                  <Box display="flex" gap={1} mt={2}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (datasets.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          اختر مصدر البيانات
        </Typography>
        <Alert severity="info">
          لا توجد مصادر بيانات متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        اختر مصدر البيانات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        اختر مصدر البيانات الذي تريد إنشاء التقرير منه
      </Typography>

      <Grid container spacing={2}>
        {datasets.map((dataset) => (
          <Grid xs={12} md={6} key={dataset.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedDataset?.id === dataset.id ? 2 : 1,
                borderColor: selectedDataset?.id === dataset.id ? 'primary.main' : 'grey.300',
                '&:hover': {
                  borderColor: 'primary.main',
                  elevation: 4,
                },
                transition: 'all 0.2s',
              }}
              onClick={() => onDatasetSelect(dataset)}
              elevation={selectedDataset?.id === dataset.id ? 3 : 1}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DatasetIcon color="primary" />
                    <Typography variant="h6" component="h3">
                      {dataset.name}
                    </Typography>
                  </Box>
                  {dataset.description && (
                    <IconButton size="small" title={dataset.description}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {dataset.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    {dataset.description}
                  </Typography>
                )}

                <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                  <Chip
                    size="small"
                    label={`${dataset.allowed_fields.length} حقل`}
                    variant="outlined"
                    color="primary"
                  />
                  <Chip
                    size="small"
                    label={dataset.table_name}
                    variant="outlined"
                  />
                  {dataset.required_permissions && dataset.required_permissions.length > 0 && (
                    <Chip
                      size="small"
                      label="يتطلب صلاحيات"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                </Box>

                {selectedDataset?.id === dataset.id && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedDataset && (
        <Alert severity="success" sx={{ mt: 3 }}>
          تم اختيار مصدر البيانات: <strong>{selectedDataset.name}</strong>
          <br />
          يمكنك الآن الانتقال لاختيار الحقول
        </Alert>
      )}
    </Box>
  );
};

export default DatasetSelector;
