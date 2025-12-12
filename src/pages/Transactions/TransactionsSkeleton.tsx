import React from 'react'
import { Box, Stack, Skeleton, Paper } from '@mui/material'

const rows = Array.from({ length: 6 })

const TransactionsSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Skeleton variant="text" width={220} height={42} />
          <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 48 }} />
          <Skeleton variant="rounded" width={140} height={48} />
        </Stack>

        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>
            <Skeleton variant="text" width={180} height={32} />
            <Skeleton variant="rounded" height={64} />
            {rows.map((_, idx) => (
              <Skeleton
                key={`header-row-${idx}`}
                variant="rounded"
                height={56}
                sx={{ opacity: 1 - idx * 0.08 }}
              />
            ))}
          </Stack>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2}>
            <Skeleton variant="text" width={200} height={32} />
            <Skeleton variant="rounded" height={56} />
            {rows.map((_, idx) => (
              <Skeleton
                key={`line-row-${idx}`}
                variant="rounded"
                height={48}
                sx={{ opacity: 1 - idx * 0.08 }}
              />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}

export default TransactionsSkeleton
