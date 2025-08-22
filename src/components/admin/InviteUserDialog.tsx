import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Stack,
  Typography,
  Alert,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  roles: any[];
  onInvitationsSent: () => void;
}

interface Invitation {
  email: string;
  role_id: string;
  send_welcome_email: boolean;
  expires_at: string;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'error';
  error_message?: string;
  invitation_token?: string;
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onClose,
  roles,
  onInvitationsSent
}) => {
  const { user: currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      email: '',
      role_id: '',
      send_welcome_email: true,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'pending'
    }
  ]);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setInvitations([{
        email: '',
        role_id: '',
        send_welcome_email: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }]);
      setBulkEmails('');
      setBulkMode(false);
      setResults([]);
      setError(null);
    }
  }, [open]);

  const addInvitation = () => {
    setInvitations([
      ...invitations,
      {
        email: '',
        role_id: '',
        send_welcome_email: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    ]);
  };

  const removeInvitation = (index: number) => {
    if (invitations.length > 1) {
      setInvitations(invitations.filter((_, i) => i !== index));
    }
  };

  const updateInvitation = (index: number, field: keyof Invitation, value: any) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value };
    setInvitations(updated);
  };

  const parseEmailList = (emailText: string): string[] => {
    return emailText
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  };

  const generateInvitationToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const sendInvitation = async (invitation: Invitation): Promise<any> => {
    try {
      const invitationToken = generateInvitationToken();
      const invitationLink = `${window.location.origin}/register?token=${invitationToken}`;

      // Store invitation in database
      const { data: invitationData, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email: invitation.email,
          role_id: parseInt(invitation.role_id),
          invited_by: currentUser?.id,
          invitation_token: invitationToken,
          expires_at: invitation.expires_at,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send email if requested
      if (invitation.send_welcome_email) {
        // In a real implementation, you would send this via your email service
        // For now, we'll just log it and mark as sent
        console.log('Invitation email would be sent to:', invitation.email);
        console.log('Invitation link:', invitationLink);
        
        // Update invitation status to sent
        await supabase
          .from('user_invitations')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', invitationData.id);
      }

      return {
        success: true,
        email: invitation.email,
        invitation_link: invitationLink,
        invitation_id: invitationData.id
      };
    } catch (error: any) {
      return {
        success: false,
        email: invitation.email,
        error: error.message
      };
    }
  };

  const handleSendInvitations = async () => {
    try {
      setSending(true);
      setError(null);
      setResults([]);

      let invitationsToSend: Invitation[] = [];

      if (bulkMode) {
        const emails = parseEmailList(bulkEmails);
        if (emails.length === 0) {
          throw new Error('لم يتم العثور على عناوين بريد إلكتروني صحيحة');
        }
        
        invitationsToSend = emails.map(email => ({
          email,
          role_id: invitations[0]?.role_id || '',
          send_welcome_email: invitations[0]?.send_welcome_email || true,
          expires_at: invitations[0]?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending' as const
        }));
      } else {
        invitationsToSend = invitations.filter(inv => inv.email.trim());
      }

      if (invitationsToSend.length === 0) {
        throw new Error('يرجى إدخال عنوان بريد إلكتروني واحد على الأقل');
      }

      // Validate all emails
      const invalidEmails = invitationsToSend.filter(inv => 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)
      );
      
      if (invalidEmails.length > 0) {
        throw new Error(`عناوين بريد إلكتروني غير صحيحة: ${invalidEmails.map(inv => inv.email).join(', ')}`);
      }

      // Send invitations
      const results = await Promise.all(
        invitationsToSend.map(invitation => sendInvitation(invitation))
      );

      setResults(results);

      // Log the invitation activity
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'user.invite',
        entity_type: 'user',
        details: {
          invited_emails: invitationsToSend.map(inv => inv.email),
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });

      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        onInvitationsSent();
        setTimeout(() => {
          onClose();
        }, 3000); // Auto-close after 3 seconds on success
      }

    } catch (error: any) {
      console.error('Error sending invitations:', error);
      setError(error.message || 'فشل إرسال الدعوات');
    } finally {
      setSending(false);
    }
  };

  const copyInvitationLink = (link: string) => {
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <PersonAddIcon color="primary" />
          <Typography variant="h6">دعوة مستخدمين جدد</Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>نتائج الدعوات:</Typography>
            <List>
              {results.map((result, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {getStatusIcon(result.success ? 'sent' : 'error')}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.email}
                    secondary={
                      result.success ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>تم إرسال الدعوة بنجاح</span>
                          {result.invitation_link && (
                            <IconButton 
                              size="small" 
                              onClick={() => copyInvitationLink(result.invitation_link)}
                              title="نسخ رابط الدعوة"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      ) : (
                        <span style={{ color: 'red' }}>خطأ: {result.error}</span>
                      )
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        <Stack spacing={3}>
          {/* Bulk mode toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                disabled={sending}
              />
            }
            label="الوضع المجمع (إدخال عدة عناوين بريد إلكتروني)"
          />

          {bulkMode ? (
            // Bulk invitation mode
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="عناوين البريد الإلكتروني"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="أدخل عناوين البريد الإلكتروني مفصولة بفاصلة أو سطر جديد&#10;مثال:&#10;user1@example.com&#10;user2@example.com, user3@example.com"
                  helperText="أدخل عناوين البريد الإلكتروني مفصولة بفاصلة أو سطر جديد"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="الدور (لجميع المدعوين)"
                  value={invitations[0]?.role_id || ''}
                  onChange={(e) => updateInvitation(0, 'role_id', e.target.value)}
                >
                  <MenuItem value="">بدون دور</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name_ar}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="تاريخ انتهاء الدعوة"
                  value={invitations[0]?.expires_at?.substring(0, 16) || ''}
                  onChange={(e) => updateInvitation(0, 'expires_at', e.target.value + ':00.000Z')}
                />
              </Grid>
            </Grid>
          ) : (
            // Individual invitation mode
            <Box>
              {invitations.map((invitation, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">دعوة #{index + 1}</Typography>
                    {invitations.length > 1 && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeInvitation(index)}
                        disabled={sending}
                      >
                        حذف
                      </Button>
                    )}
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="البريد الإلكتروني"
                        type="email"
                        value={invitation.email}
                        onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                        InputProps={{
                          startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                        required
                        disabled={sending}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        select
                        label="الدور"
                        value={invitation.role_id}
                        onChange={(e) => updateInvitation(index, 'role_id', e.target.value)}
                        disabled={sending}
                      >
                        <MenuItem value="">بدون دور</MenuItem>
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.id}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span>{role.name_ar}</span>
                              <Chip 
                                label={role.name_en} 
                                size="small" 
                                variant="outlined"
                              />
                            </Stack>
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="تاريخ انتهاء الدعوة"
                        value={invitation.expires_at.substring(0, 16)}
                        onChange={(e) => updateInvitation(index, 'expires_at', e.target.value + ':00.000Z')}
                        disabled={sending}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={invitation.send_welcome_email}
                            onChange={(e) => updateInvitation(index, 'send_welcome_email', e.target.checked)}
                            disabled={sending}
                          />
                        }
                        label="إرسال بريد ترحيب"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Button
                startIcon={<PersonAddIcon />}
                onClick={addInvitation}
                disabled={sending}
                sx={{ mb: 2 }}
              >
                إضافة دعوة أخرى
              </Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          إلغاء
        </Button>
        <Button
          onClick={handleSendInvitations}
          variant="contained"
          disabled={sending}
          startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {sending ? 'جاري الإرسال...' : 'إرسال الدعوات'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
