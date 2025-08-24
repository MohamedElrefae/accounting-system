import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';

export default function AuthDebug() {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const { data, error } = await supabase.auth.getSession();
    if (error) setError(error.message);
    setSession(data?.session ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, direction: 'rtl' }}>
        <Typography variant="h5" gutterBottom>تشخيص نظام الدخول</Typography>
        <Stack direction="row" spacing={2} mb={2}>
          <Button variant="contained" onClick={load}>تحديث الحالة</Button>
          <Button variant="outlined" onClick={async () => { await supabase.auth.signOut(); await load(); }}>تسجيل الخروج</Button>
        </Stack>
        {error && (
          <Box sx={{ color: 'error.main', mb: 2 }}>خطأ: {error}</Box>
        )}
        <pre style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  session,
}, null, 2)}
        </pre>
      </Paper>
    </Container>
  );
}
