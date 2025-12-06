import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Stack,
  Avatar,
  Chip,
  useTheme,
  alpha
} from '@mui/material'

// Icons
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LanguageIcon from '@mui/icons-material/Language'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'

// Utils
import useAppStore from '@/store/useAppStore'

const EnhancedFiscalQuickLaunch: React.FC = () => {
  const navigate = useNavigate()
  const { language } = useAppStore()
  const theme = useTheme()
  const isRTL = language === 'ar'

  const handleLaunch = () => {
    navigate('/fiscal/dashboard')
  }

  return (
    <Card 
      elevation={0}
      sx={{
        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, rgba(255,255,255,0.95) 100%)`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
          borderColor: theme.palette.primary.main
        }
      }}
    >
      {/* Header Strip */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
      }} />
      
      <CardContent sx={{ p: 3 }}>
        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Avatar sx={{
            bgcolor: theme.palette.primary.main,
            width: 48,
            height: 48
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 24 }} />
          </Avatar>
          
          <Box sx={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {isRTL ? 'النظام المحاسبي المحسّن' : 'Enhanced Fiscal Management'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isRTL 
                ? 'أدوات إدارة مالية احترافية مع دعم كامل للغة العربية وتخطيط RTL'
                : 'Professional fiscal management tools with full Arabic language and RTL layout support'
              }
            </Typography>
            
            <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} sx={{ mb: 2 }}>
              <Chip
                icon={<LanguageIcon />}
                label={isRTL ? 'دعم العربية' : 'Arabic Support'}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<AccountBalanceIcon />}
                label={isRTL ? 'تصميم احترافي' : 'Professional Design'}
                size="small"
                color="secondary" 
                variant="outlined"
              />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
      
      <CardActions sx={{ p: 3, pt: 0 }}>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowForwardIcon />}
          onClick={handleLaunch}
          fullWidth
          sx={{ 
            borderRadius: 2, 
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {isRTL ? 'افتح النظام المحسّن' : 'Launch Enhanced System'}
        </Button>
      </CardActions>
    </Card>
  )
}

export default EnhancedFiscalQuickLaunch