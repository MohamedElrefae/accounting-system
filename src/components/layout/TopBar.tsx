import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { alpha, styled } from '@mui/material/styles';
import {
  MenuIcon,
  NotificationsIcon,
  AccountCircleIcon,
  SettingsIcon,
  HomeIcon,
  LogoutIcon,
  VisibilityIcon,
  VisibilityOffIcon,
  LightbulbIcon,
  Refresh,
} from '../icons/SimpleIcons';
import useAppStore from '../../store/useAppStore';
import { useCustomTheme } from '../../contexts/ThemeContext';

import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useAppSync } from '../../hooks/useAppSync';
// import { ThemeSettings } from "./ThemeSettings"; // Temporarily disabled
import { mergedTranslations as translations } from '../../data/mockData';
import { ScopedOrgSelector, ScopedProjectSelector } from '../Scope';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';


// Enterprise-grade styled button
const StyledTopBarButton = styled(Button, { shouldForwardProp: (prop) => prop !== 'active' })<{ active?: boolean }>(({ theme, active }) => ({
  borderRadius: '8px',
  textTransform: 'none',
  fontSize: '0.85rem',
  fontWeight: 600,
  padding: '6px 12px',
  minWidth: 'auto',
  color: theme.palette.text.primary,
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.text.primary, 0.05),
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
    borderColor: theme.palette.text.secondary,
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.direction === 'rtl' ? '-4px' : '8px',
    marginLeft: theme.direction === 'rtl' ? '8px' : '-4px',
  }
}));

const ActionIconButton = styled(IconButton)(({ theme }) => ({
  borderRadius: '8px',
  padding: '8px',
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    transform: 'translateY(-1px)',
  }
}));

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { language, toggleLanguage, demoMode, setDemoMode } = useAppStore();
  const { user, signOut } = useAuth();
  const { profile, hasRole, isSuperAdmin } = useUserProfile();
  const navigate = useNavigate();
  const { refreshAll, isRefreshing } = useAppSync();

  const {
    themeMode,
    toggleTheme,
  } = useCustomTheme();

  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  // const [themeSettingsOpen, setThemeSettingsOpen] = useState(false); // Temporarily disabled
  const isRtl = language === 'ar';

  const t = translations[language];



  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };

  // Helper function to get proper display name
  const getDisplayName = () => {
    if (profile?.first_name) {
      return `${profile.first_name} ${profile.last_name || ''}`.trim();
    }
    if (profile?.full_name_ar) {
      return profile.full_name_ar;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Helper function to get proper avatar initials
  const getAvatarInitials = () => {
    if (profile?.first_name) {
      return (profile.first_name.charAt(0) + (profile.last_name?.charAt(0) || '')).toUpperCase();
    }
    if (profile?.full_name_ar) {
      const names = profile.full_name_ar.split(' ');
      return names.length > 1
        ? (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
        : profile.full_name_ar.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  // Helper function to get user role
  const getUserRole = () => {
    console.log('[TopBar] Profile:', profile);
    console.log('[TopBar] Roles:', profile?.roles);
    console.log('[TopBar] isSuperAdmin:', isSuperAdmin());
    console.log('[TopBar] hasRole(admin):', hasRole('admin'));
    console.log('[TopBar] hasRole(manager):', hasRole('manager'));

    // Check for admin/manager roles first
    if (isSuperAdmin()) {
      return language === 'ar' ? 'مدير النظام الرئيسي' : 'Super Admin';
    }
    if (hasRole('admin')) {
      return language === 'ar' ? 'مدير' : 'Admin';
    }
    if (hasRole('manager')) {
      return language === 'ar' ? 'مدير' : 'Manager';
    }

    // Show the first role if available
    if (profile?.roles && profile.roles.length > 0) {
      const role = profile.roles[0];
      // Map common roles
      const roleMap: Record<string, { en: string; ar: string }> = {
        accountant: { en: 'Accountant', ar: 'محاسب' },
        user: { en: 'User', ar: 'مستخدم' },
        auditor: { en: 'Auditor', ar: 'مدقق' },
        viewer: { en: 'Viewer', ar: 'عارض' },
      };

      if (roleMap[role]) {
        return language === 'ar' ? roleMap[role].ar : roleMap[role].en;
      }
      // Return the role name as-is if not in map
      return role;
    }

    return null;
  };



  return (
    <>
      <AppBar
        key={`topbar-${language}`} // Force remount when language changes
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(12px)',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(18, 18, 18, 0.8)'
              : 'rgba(255, 255, 255, 0.8)',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        <Toolbar sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, md: 3 },
          minHeight: '64px !important',
          gap: 2,
        }}>
          {/* LEFT SECTION (Start) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ActionIconButton onClick={onMenuClick} aria-label="menu">
              <MenuIcon fontSize="small" />
            </ActionIconButton>

            {/* User Name and Role */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {getDisplayName()}
                {getUserRole() && (
                  <Typography component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {' '}({getUserRole()})
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>

          {/* CENTER SECTION - Global Search */}
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 2 }}>
            <GlobalSearch />
          </Box>

          {/* RIGHT SECTION (End) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

            {/* Demo Mode Chip */}
            {demoMode && (
              <Chip
                size="small"
                color="warning"
                variant="filled"
                label={language === 'ar' ? 'وضع تجريبي' : 'Demo Mode'}
                onDelete={() => setDemoMode(false)}
                sx={{ borderRadius: '6px', fontWeight: 600 }}
              />
            )}



            {/* Scope / Context Selector - Enterprise Scoped Dropdowns */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <ScopedOrgSelector
                size="small"
                sx={{ 
                  minWidth: 200,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.85rem',
                  }
                }}
              />
              <ScopedProjectSelector
                size="small"
                allowAll
                sx={{ 
                  minWidth: 200,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.85rem',
                  }
                }}
              />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} />

            {/* Sync Button */}
            <Tooltip title={language === 'ar' ? 'مزامنة البيانات' : 'Sync Data'}>
              <StyledTopBarButton
                onClick={() => refreshAll()}
                disabled={isRefreshing}
                startIcon={
                  <Refresh
                    fontSize="small"
                    sx={{
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                }
              >
                {language === 'ar' ? 'مزامنة' : 'Sync'}
              </StyledTopBarButton>
            </Tooltip>

            {/* Help Button */}
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <StyledTopBarButton
                onClick={() => navigate('/getting-started')}
                startIcon={<LightbulbIcon fontSize="small" />}
              >
                {language === 'ar' ? 'مساعدة' : 'Help'}
              </StyledTopBarButton>
            </Box>

            {/* Utility Icons Group */}
            <Box sx={{ display: 'flex', gap: 1, backgroundColor: (theme) => alpha(theme.palette.divider, 0.05), p: 0.5, borderRadius: '10px' }}>
              <Tooltip title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                <ActionIconButton
                  size="small"
                  onClick={toggleTheme}
                  sx={{ border: 'none', width: 32, height: 32, padding: 0 }}
                >
                  {themeMode === 'light' ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </ActionIconButton>
              </Tooltip>

              <Tooltip title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
                <ActionIconButton
                  size="small"
                  onClick={() => toggleLanguage?.()}
                  sx={{ border: 'none', width: 32, height: 32, padding: 0 }}
                >
                  <HomeIcon fontSize="small" />
                </ActionIconButton>
              </Tooltip>

              <Tooltip title={t.notifications}>
                <ActionIconButton
                  size="small"
                  onClick={handleNotificationMenuOpen}
                  sx={{ border: 'none', width: 32, height: 32, padding: 0 }}
                >
                  <Badge variant="dot" color="error">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </ActionIconButton>
              </Tooltip>
            </Box>

            {/* Profile */}
            <Tooltip title={t.profile}>
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  p: 0,
                  ml: 1,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
              >
                {(profile?.avatar_url) ? (
                  <Avatar src={profile.avatar_url} sx={{ width: 36, height: 36 }} />
                ) : (
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 700 }}>
                    {getAvatarInitials()}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>

          </Box>
        </Toolbar>
      </AppBar>



      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileMenuClose}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
            {profile?.avatar_url ? (
              <Avatar src={profile.avatar_url} sx={{ width: 40, height: 40 }} />
            ) : (
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                {getAvatarInitials()}
              </Avatar>
            )}
            <Box>
              <Typography variant="subtitle2">
                {getDisplayName()}
                {/* Role Badge */}
                {(isSuperAdmin() || hasRole('admin') || hasRole('manager')) && (
                  <Chip
                    label={language === 'ar' ? 'مدير' : 'Manager'}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email || profile?.email || 'user@example.com'}
              </Typography>
            </Box>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          handleProfileMenuClose();
          navigate('/settings/profile');
        }}>
          <AccountCircleIcon sx={{ mr: 2 }} />
          {t.profile}
        </MenuItem>
        <MenuItem onClick={handleProfileMenuClose}>
          <SettingsIcon sx={{ mr: 2 }} />
          {t.settings}
        </MenuItem>
        <Divider />
        <MenuItem onClick={async () => {
          try {
            handleProfileMenuClose();
            await signOut();
          } catch (error) {
            console.error('Logout failed:', error);
            alert('فشل تسجيل الخروج');
          }
        }}>
          <LogoutIcon sx={{ mr: 2 }} />
          {t.logout}
        </MenuItem>
      </Menu>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={handleNotificationMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 300, maxHeight: 400 }
        }}
      >
        <MenuItem onClick={handleNotificationMenuClose}>
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle2">New invoice received</Typography>
            <Typography variant="body2" color="text.secondary">
              Invoice #1025 from ABC Company
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleNotificationMenuClose}>
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle2">Payment reminder</Typography>
            <Typography variant="body2" color="text.secondary">
              Invoice #1023 is due tomorrow
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleNotificationMenuClose}>
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle2">Monthly report ready</Typography>
            <Typography variant="body2" color="text.secondary">
              Your January financial report is ready
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      {/* Theme Settings Dialog - Temporarily disabled */}
      {/* <ThemeSettings 
      open={themeSettingsOpen} 
      onClose={() => setThemeSettingsOpen(false)} 
    /> */}
    </>
  );
};

export default TopBar;
