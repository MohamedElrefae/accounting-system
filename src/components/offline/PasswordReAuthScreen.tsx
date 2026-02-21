import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    IconButton,
    InputAdornment
} from '@mui/material';
import {
    LockOutlined as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    VpnKey as KeyIcon
} from '@mui/icons-material';
import { securityManager } from '../../services/offline/security/SecurityManager';

interface PasswordReAuthScreenProps {
    onSuccess: () => void;
}

/**
 * PasswordReAuthScreen
 * Implements Req 5.2 (Secure Offline Access) using existing user passwords.
 */
export const PasswordReAuthScreen: React.FC<PasswordReAuthScreenProps> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        setError(null);

        try {
            // For offline work, we check if the password matches the hash stored during the last successful online login
            // or we try a Supabase re-auth if online.
            const success = await securityManager.unlockWithPassword(password);

            if (success) {
                onSuccess();
            } else {
                setError('Incorrect password. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to unlock. Please ensure you are using your enterprise password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                bgcolor: 'background.default',
                p: 3
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: 4,
                    maxWidth: 400,
                    width: '100%',
                    textAlign: 'center',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                <Box sx={{ mb: 3 }}>
                    <KeyIcon color="primary" sx={{ fontSize: 48, filter: 'drop-shadow(0 0 10px rgba(25, 118, 210, 0.5))' }} />
                </Box>

                <Typography variant="h5" gutterBottom fontWeight="bold">
                    Session Locked
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Please enter your regular login password to resume your offline session and access encrypted data.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleUnlock}>
                    <TextField
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="Security Password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{ mb: 3 }}
                    />

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || !password}
                        sx={{
                            py: 1.5,
                            fontWeight: 'bold',
                            borderRadius: 2,
                            textTransform: 'none',
                            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
                            '&:hover': {
                                boxShadow: '0 6px 20px rgba(0,118,255,0.23)',
                            }
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Unlock Session'}
                    </Button>
                </form>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
                    This security check ensures only you can access the financial records stored on this device.
                </Typography>
            </Paper>
        </Box>
    );
};
