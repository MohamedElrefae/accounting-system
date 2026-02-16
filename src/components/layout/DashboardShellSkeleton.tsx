import { Box, Skeleton, AppBar, Toolbar, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { DRAWER_WIDTH } from './Sidebar';

export const DashboardShellSkeleton: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            {/* TopBar Skeleton */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    backgroundColor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 3, minHeight: 64 }}>
                    {/* Left: Branding & User Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton variant="text" width={120} height={24} />
                    </Box>

                    {/* Center: Search Bar */}
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 4 }}>
                        <Box sx={{ width: '100%', maxWidth: 400 }}>
                            <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 2 }} />
                        </Box>
                    </Box>

                    {/* Right: Selectors & Profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rectangular" width={180} height={36} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="circular" width={36} height={36} />
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Layout Shell */}
            <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', mt: '64px' }}>
                {/* Sidebar Skeleton */}
                <Box
                    sx={{
                        width: DRAWER_WIDTH,
                        borderRight: 1,
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        p: 2,
                    }}
                >
                    <Box sx={{ mb: 4, px: 1 }}>
                        <Skeleton variant="rectangular" width="80%" height={40} sx={{ borderRadius: 1 }} />
                    </Box>
                    <List>
                        {Array.from(new Array(8)).map((_, i) => (
                            <ListItem key={i} sx={{ px: 1, py: 1.5 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Skeleton variant="circular" width={24} height={24} />
                                </ListItemIcon>
                                <ListItemText primary={<Skeleton variant="text" width="70%" />} />
                            </ListItem>
                        ))}
                    </List>
                </Box>

                {/* Content Area Skeleton */}
                <Box component="main" sx={{ flex: 1, p: 3, backgroundColor: 'background.default', overflow: 'hidden' }}>
                    <Box sx={{ mb: 4 }}>
                        <Skeleton variant="text" width="30%" height={40} />
                        <Skeleton variant="text" width="20%" height={24} />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 2 }} />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default DashboardShellSkeleton;
