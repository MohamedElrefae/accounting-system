import React from 'react';
import { Box } from '@mui/material';
import { DatabaseDiagnostics } from '../../components/admin/DatabaseDiagnostics';

export default function Diagnostics() {
  return (
    <Box>
      <DatabaseDiagnostics />
    </Box>
  );
}
