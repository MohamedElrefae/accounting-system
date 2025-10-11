import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Chip,
  Avatar,
  useTheme,
  alpha,
  IconButton,
  Tooltip
} from '@mui/material'

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard'
import UploadIcon from '@mui/icons-material/Upload'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LanguageIcon from '@mui/icons-material/Language'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

// Services and Utils
import { useArabicLanguage, ArabicLanguageService } from '@/services/ArabicLanguageService'
import useAppStore from '@/store/useAppStore'
import { tokens } from '@/theme/tokens'

const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon, 
  color = 'primary',
  route,
  features
}: {
  title: string
  description: string
  icon: React.ElementType
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  route: string
  features: string[]
}) => {
  const navigate = useNavigate()
  const { isRTL, getDirectionalStyle } = useArabicLanguage()
  const theme = useTheme()

  return (
    <Card 
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${tokens.palette.divider}`,
        borderRadius: 0,
        background: tokens.palette.background.paper,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)'
        }
      }}
    >
      {/* Accent Strip */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: tokens.palette.primary.main
      }} />
      
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Avatar sx={{
            bgcolor: tokens.palette.primary.main,
            width: 56,
            height: 56
          }}>
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
          
          <Box sx={{ flex: 1, ...getDirectionalStyle() }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
        
        {/* Features List */}
        <Box sx={{ flex: 1, mb: 2 }}>
          <Stack spacing={1}>
            {features.map((feature, index) => (
              <Stack key={index} direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center">
                <AutoAwesomeIcon sx={{ fontSize: 16, color: tokens.palette.primary.main }} />
                <Typography variant="caption" color="text.secondary">
                  {feature}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </CardContent>
      
      <CardActions sx={{ p: 3, pt: 0, gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color={color}
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate(route)}
          sx={{ borderRadius: 0, textTransform: 'none', flex: 1 }}
        >
          {isRTL ? 'فتح' : 'Open'}
        </Button>
        {route === '/fiscal/enhanced/dashboard' && (
          <Button
            variant="outlined"
            color={color}
            onClick={() => navigate(`${route}?openCreate=1`)}
            sx={{ borderRadius: 0, textTransform: 'none' }}
          >
            {isRTL ? 'إنشاء سنة' : 'Create Year'}
          </Button>
        )}
      </CardActions>
    </Card>
  )
}

export default function EnhancedFiscalHub() {
  const { t, isRTL, texts, getDirectionalStyle } = useArabicLanguage()
  const { language, setLanguage } = useAppStore()
  const navigate = useNavigate()
  const theme = useTheme()

  // Language Toggle
  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en'
    setLanguage(newLang)
    ArabicLanguageService.setLanguage(newLang)
  }

  const features = [
    {
      title: isRTL ? 'لوحة تحكم السنوات المالية' : 'Fiscal Year Dashboard',
      description: isRTL 
        ? 'لوحة تحكم شاملة للسنوات المالية مع دعم كامل للعربية والتخطيط من اليمين لليسار'
        : 'Comprehensive fiscal year management dashboard with full Arabic RTL support',
      icon: DashboardIcon,
      color: 'primary' as const,
      route: '/fiscal/enhanced/dashboard',
      features: [
        isRTL ? 'دعم اللغة العربية الكامل' : 'Full Arabic language support',
        isRTL ? 'تخطيط من اليمين لليسار' : 'Right-to-left layout',
        isRTL ? 'لوحة تحكم تفاعلية' : 'Interactive dashboard',
        isRTL ? 'إشعارات فورية' : 'Real-time notifications'
      ]
    },
    {
      title: isRTL ? 'استيراد الأرصدة الافتتاحية' : 'Opening Balance Import',
      description: isRTL
        ? 'أداة متقدمة لاستيراد الأرصدة الافتتاحية مع واجهة احترافية وتتبع مباشر للعملية'
        : 'Advanced opening balance import tool with professional UI and real-time progress tracking',
      icon: UploadIcon,
      color: 'success' as const,
      route: '/fiscal/enhanced/opening-balance-import',
      features: [
        isRTL ? 'سحب وإفلات الملفات' : 'Drag & drop file upload',
        isRTL ? 'عملية تحقق متعددة المراحل' : 'Multi-step validation process',
        isRTL ? 'تتبع التقدم المباشر' : 'Real-time progress tracking',
        isRTL ? 'معالجة شاملة للأخطاء' : 'Comprehensive error handling'
      ]
    },
    {
      title: isRTL ? 'إدارة الفترات المالية' : 'Fiscal Period Manager',
      description: isRTL
        ? 'إدارة شاملة للفترات المالية مع أدوات متقدمة للبحث والفلترة وإدارة دورة الحياة'
        : 'Comprehensive fiscal period management with advanced search, filtering, and lifecycle management',
      icon: CalendarTodayIcon,
      color: 'info' as const,
      route: '/fiscal/enhanced/periods',
      features: [
        isRTL ? 'إدارة دورة حياة الفترات' : 'Period lifecycle management',
        isRTL ? 'بحث وفلترة متقدمة' : 'Advanced search & filtering',
        isRTL ? 'إحصائيات تفصيلية' : 'Detailed statistics',
        isRTL ? 'إجراءات جماعية' : 'Batch operations'
      ]
    }
  ]

  return (
    <Box sx={{
      minHeight: '100vh',
      background: tokens.palette.background.default,
      py: 3
    }}>
      <Container maxWidth="xl">
        <Paper 
          elevation={0}
          sx={{ 
            minHeight: 'calc(100vh - 48px)',
            borderRadius: 0,
            overflow: 'hidden',
            background: tokens.palette.background.paper,
            border: `1px solid ${tokens.palette.divider}`
          }}
        >
          {/* Header */}
          <Box sx={{
            background: tokens.palette.primary.main,
            color: 'white',
            p: 3,
            position: 'relative',
            overflow: 'hidden',
            ...getDirectionalStyle()
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Ccircle cx="7" cy="7" r="7"/%3E%3Ccircle cx="53" cy="7" r="7"/%3E%3Ccircle cx="30" cy="30" r="7"/%3E%3Ccircle cx="7" cy="53" r="7"/%3E%3Ccircle cx="53" cy="53" r="7"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }} />
            
            <Stack 
              direction={isRTL ? 'row-reverse' : 'row'} 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Box>
                <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                  {isRTL ? 'النظام المحاسبي المحسّن' : 'Enhanced Fiscal Management'}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                  {isRTL 
                    ? 'أدوات إدارة مالية احترافية مع دعم كامل للغة العربية'
                    : 'Professional fiscal management tools with full Arabic language support'
                  }
                </Typography>
                <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
                  <Chip
                    label={isRTL ? 'دعم العربية' : 'Arabic Support'}
                    variant="outlined"
                    sx={{ borderColor: 'white', color: 'white', borderRadius: 0 }}
                  />
                  <Chip
                    label={isRTL ? 'تخطيط RTL' : 'RTL Layout'}
                    variant="outlined"
                    sx={{ borderColor: 'white', color: 'white', borderRadius: 0 }}
                  />
                  <Chip
                    label={isRTL ? 'تصميم احترافي' : 'Professional Design'}
                    variant="outlined"
                    sx={{ borderColor: 'white', color: 'white', borderRadius: 0 }}
                  />
                </Stack>
              </Box>
              
              <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1}>
                <Tooltip title={isRTL ? 'تبديل اللغة' : 'Switch Language'}>
                  <IconButton onClick={toggleLanguage} sx={{ color: 'white' }}>
                    <LanguageIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate('/fiscal')}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  {isRTL ? 'النسخة العادية' : 'Standard Version'}
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ p: 4, ...getDirectionalStyle() }}>
            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <FeatureCard {...feature} />
                </Grid>
              ))}
            </Grid>
            
            {/* Additional Info */}
            <Box sx={{ mt: 6, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={getDirectionalStyle()}>
                {isRTL ? 'المميزات الرئيسية' : 'Key Features'}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {[
                  isRTL ? 'دعم كامل للغة العربية مع خطوط احترافية' : 'Full Arabic language support with professional fonts',
                  isRTL ? 'تخطيط من اليمين لليسار (RTL) في جميع المكونات' : 'Right-to-left (RTL) layout in all components',
                  isRTL ? 'تصميم حديث مع تأثيرات انتقالية سلسة' : 'Modern design with smooth transition effects',
                  isRTL ? 'واجهات مستخدم متجاوبة لجميع أحجام الشاشات' : 'Responsive user interfaces for all screen sizes',
                  isRTL ? 'إدارة متقدمة للأخطاء والتحقق من صحة البيانات' : 'Advanced error handling and data validation',
                  isRTL ? 'تحديثات فورية ومؤشرات تقدم مباشرة' : 'Real-time updates and live progress indicators'
                ].map((feature, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} alignItems="center">
                      <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}