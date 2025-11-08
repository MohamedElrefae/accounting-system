import React from 'react';
import { Box, Skeleton } from '@mui/material';

export default function SkeletonLoader() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={40} />
      <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Skeleton variant="rectangular" width="30%" height={100} />
        <Skeleton variant="rectangular" width="30%" height={100} />
        <Skeleton variant="rectangular" width="30%" height={100} />
      </Box>
    </Box>
  );
}