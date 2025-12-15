import React from 'react'
import { Typography, Box } from '@mui/material'

const DocumentsView: React.FC = () => {
  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6" gutterBottom>
        Inventory Documents / مستندات المخزون
      </Typography>
      <Typography variant="body1">
        Documents view content will be implemented here.
      </Typography>
    </Box>
  )
}

export default DocumentsView