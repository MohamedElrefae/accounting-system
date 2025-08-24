import React from 'react';
import { Box } from '@mui/material';
import { DatabaseDiagnostics } from '../../components/admin/DatabaseDiagnostics';
import { SecurityDiagnostics } from '../../components/admin/SecurityDiagnostics';

export default function Diagnostics() {
  return (
    <Box>
      <SecurityDiagnostics />
      <DatabaseDiagnostics />
    </Box>
  );
}
