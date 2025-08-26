import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Brightness4 from '@mui/icons-material/Brightness4';
import Brightness7 from '@mui/icons-material/Brightness7';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PaletteIcon from '@mui/icons-material/Palette';
import useAppStore from '../../store/useAppStore';
import { useCustomTheme } from '../../contexts/ThemeContext';

import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
// import { ThemeSettings } from "./ThemeSettings"; // Temporarily disabled
import { mergedTranslations as translations } from '../../data/mockData';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { language, toggleLanguage } = useAppStore();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const {
    themeMode,
    toggleTheme,
  } = useCustomTheme();

  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  // const [themeSettingsOpen, setThemeSettingsOpen] = useState(false); // Temporarily disabled
  const isRtl = language === 'ar';

  const t = translations[language];

  // Force component update when language changes
  React.useEffect(() => {
    // Language changed silently
  }, [language, isRtl]);

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

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning;
    if (hour < 18) return t.goodAfternoon;
    return t.goodEvening;
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

  return (
    <>
    <AppBar
      position="fixed" 
      elevation={0}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        background: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: isRtl ? 'row-reverse' : 'row',
      }}>
        {/* Menu button - always on the sidebar side (left in LTR, right in RTL) */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
        }}>
          <IconButton
            edge="start"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderRadius: '12px',
              '&:hover': {
                bgcolor: 'action.selected',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Center title */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            textAlign: 'center',
            fontWeight: 500,
            letterSpacing: '-0.5px',
          }}
        >
          {getCurrentGreeting()}, {getDisplayName()}!
        </Typography>

        {/* Actions cluster - always opposite to menu (right in LTR, left in RTL) */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
        }}>
          {/* Theme Settings - Modern Glass Effect */}
          <Tooltip title="Theme Settings" placement="bottom">
            <IconButton 
              onClick={() => {/* Theme settings coming soon! */}}
              sx={{
                color: 'text.primary',
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <PaletteIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Theme Mode Toggle - Modern Switch Style */}
          <Tooltip title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} placement="bottom">
            <IconButton 
              onClick={toggleTheme}
              sx={{
                color: themeMode === 'light' ? 'warning.main' : 'primary.light',
                bgcolor: themeMode === 'light' ? 'warning.light' : 'primary.dark',
                borderRadius: '12px',
                '&:hover': {
                  bgcolor: themeMode === 'light' ? 'warning.main' : 'primary.main',
                  color: 'white',
                  transform: 'rotate(180deg) scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {themeMode === 'light' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Language Toggle - Modern Globe Style */}
          <Tooltip title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'} placement="bottom">
            <IconButton 
              onClick={() => {
                toggleLanguage?.();
              }}
              sx={{
                color: 'text.primary',
                background: (theme) => 
                  `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'scale(1.1)',
                  '&::before': {
                    transform: 'translate(-50%, -50%) scale(1)',
                  },
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  transform: 'translate(-50%, -50%) scale(0)',
                  transition: 'transform 0.5s ease',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <LanguageIcon fontSize="small" sx={{ zIndex: 1 }} />
            </IconButton>
          </Tooltip>

          {/* Notifications - Modern Badge Style */}
          <Tooltip title={t.notifications} placement="bottom">
            <IconButton
              onClick={handleNotificationMenuOpen}
              sx={{
                color: 'text.primary',
                bgcolor: 'transparent',
                position: 'relative',
                '&:hover': {
                  bgcolor: 'action.hover',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Badge 
                badgeContent={4} 
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: 'error.main',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    minWidth: '18px',
                    height: '18px',
                    animation: 'pulse 2s infinite',
                  },
                  '@keyframes pulse': {
                    '0%': {
                      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)',
                    },
                    '70%': {
                      boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)',
                    },
                    '100%': {
                      boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)',
                    },
                  },
                }}
              >
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile Avatar - Modern Ring Style */}
          <Tooltip title={t.profile} placement="bottom">
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                p: 0.5,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: -2,
                  borderRadius: '50%',
                  padding: '2px',
                  background: (theme) => 
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'exclude',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                },
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {(profile?.avatar_url) ? (
                <Avatar 
                  src={profile.avatar_url} 
                  sx={{ 
                    width: 36, 
                    height: 36,
                    border: '2px solid',
                    borderColor: 'background.paper',
                  }} 
                />
              ) : (
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36,
                    bgcolor: 'primary.main',
                    fontWeight: 600,
                    fontSize: '1rem',
                    border: '2px solid',
                    borderColor: 'background.paper',
                  }}
                >
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
      onClick={handleProfileMenuClose}
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
            <Typography variant="subtitle2">{getDisplayName()}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || profile?.email || 'user@example.com'}
            </Typography>
          </Box>
        </Box>
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => {
        handleProfileMenuClose();
        window.location.href = '/settings/profile';
      }}>
        <AccountCircle sx={{ mr: 2 }} />
        {t.profile}
      </MenuItem>
      <MenuItem onClick={handleProfileMenuClose}>
        <SettingsIcon sx={{ mr: 2 }} />
        {t.settings}
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleProfileMenuClose}>
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
