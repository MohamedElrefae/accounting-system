import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Stack,
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
import KeyIcon from '@mui/icons-material/Key';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
// Import enterprise components
import EnterpriseUserManagement from './EnterpriseUserManagement';
import EnterpriseRoleManagement from './EnterpriseRoleManagement';
import EnterprisePermissionsManagement from './EnterprisePermissionsManagement';
import { AccessRequestManagement } from '../../components/admin/AccessRequestManagement';
import { useAuth } from '../../hooks/useAuth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-management-tabpanel-${index}`}
      aria-labelledby={`user-management-tab-${index}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      {...other}
    >
      {value === index && (
        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          overflow: 'hidden'
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `user-management-tab-${index}`,
    'aria-controls': `user-management-tabpanel-${index}`,
  };
}

export default function UserManagementSystem() {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const { user } = useAuth();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tabsData = [
    {
      label: 'المستخدمين',
      labelEn: 'Users',
      icon: <PeopleIcon />,
      color: theme.palette.primary.main,
      description: 'إدارة حسابات المستخدمين وصلاحياتهم'
    },
    {
      label: 'الأدوار',
      labelEn: 'Roles',
      icon: <AdminIcon />,
      color: theme.palette.secondary.main,
      description: 'إدارة الأدوار وتعيين الصلاحيات'
    },
    {
      label: 'الصلاحيات',
      labelEn: 'Permissions',
      icon: <KeyIcon />,
      color: theme.palette.warning.main,
      description: 'إدارة صلاحيات النظام'
    },
    {
      label: 'طلبات الوصول',
      labelEn: 'Access Requests',
      icon: <PersonAddIcon />,
      color: theme.palette.info.main,
      description: 'مراجعة واعتماد طلبات الوصول الجديدة'
    }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          borderRadius: '0 0 16px 16px'
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            <SecurityIcon sx={{ fontSize: 40, color: 'primary.contrastText' }} />
          </Box>

          <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, flexGrow: 1 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              إدارة المستخدمين والصلاحيات
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 400 }}
            >
              User Management & Security System
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              نظام شامل لإدارة المستخدمين، الأدوار، والصلاحيات مع واجهة موحدة ومتطورة
            </Typography>
          </Stack>

          {/* Quick Stats */}
          <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
            {tabsData.map((tab, index) => (
              <Chip
                key={index}
                icon={tab.icon}
                label={tab.label}
                variant={value === index ? 'filled' : 'outlined'}
                sx={{
                  py: 2,
                  px: 1,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: value === index ? alpha(tab.color, 0.1) : 'transparent',
                  borderColor: tab.color,
                  color: tab.color,
                  '&:hover': {
                    backgroundColor: alpha(tab.color, 0.08),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${alpha(tab.color, 0.2)}`
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
                onClick={() => setValue(index)}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content */}
      <Paper
        elevation={1}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'hidden',
          boxShadow: 'none',
          border: 'none'
        }}
      >
        {/* Enhanced Tabs */}
        <Box sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)'
        }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="user management tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 80,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                flexDirection: 'column',
                gap: 1,
                py: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  transform: 'translateY(-2px)'
                },
                '&.Mui-selected': {
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  '& .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                    filter: `drop-shadow(0 2px 4px ${alpha(theme.palette.primary.main, 0.3)})`
                  }
                }
              },
              '& .MuiTabs-indicator': {
                height: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                borderRadius: '4px 4px 0 0'
              }
            }}
          >
            {tabsData.map((tab, index) => (
              <Tab
                key={index}
                icon={
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '12px',
                      backgroundColor: value === index
                        ? alpha(tab.color, 0.12)
                        : alpha(theme.palette.action.hover, 0.04),
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {React.cloneElement(tab.icon, {
                      sx: {
                        fontSize: 24,
                        color: value === index ? tab.color : 'text.secondary'
                      }
                    })}
                  </Box>
                }
                label={
                  <Stack spacing={0.5} alignItems="center">
                    <Typography variant="body1" sx={{ fontWeight: 'inherit' }}>
                      {tab.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        opacity: value === index ? 1 : 0.7,
                        fontSize: '0.75rem'
                      }}
                    >
                      {tab.labelEn}
                    </Typography>
                  </Stack>
                }
                {...a11yProps(index)}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <CustomTabPanel value={value} index={0}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <EnterpriseUserManagement />
            </Box>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <EnterpriseRoleManagement />
            </Box>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <EnterprisePermissionsManagement />
            </Box>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={3}>
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              <AccessRequestManagement />
            </Box>
          </CustomTabPanel>
        </Box>
      </Paper>

    </Box>
  );
}
