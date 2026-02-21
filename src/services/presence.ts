import { supabase } from '../utils/supabase';
import { getConnectionMonitor } from '../utils/connectionMonitor';

export interface UserPresenceRow {
  org_id: string;
  user_id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  last_seen_at: string | null;
  last_active_at: string | null;
  is_online: boolean;
}

export async function presenceHeartbeat(params?: {
  orgId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { orgId = null, metadata = {} } = params ?? {};
  const monitor = getConnectionMonitor();
  if (!monitor.getHealth().isOnline) return;

  const { error } = await supabase.rpc('rpc_presence_heartbeat', {
    p_org_id: orgId,
    p_metadata: metadata,
  });

  if (error) throw error;
}

export async function listUserPresence(params?: {
  orgId?: string | null;
  teamId?: string | null;
  onlineWithinSeconds?: number;
  activeWithinSeconds?: number;
}): Promise<UserPresenceRow[]> {
  const {
    orgId = null,
    teamId = null,
    onlineWithinSeconds = 120,
    activeWithinSeconds = 900,
  } = params ?? {};
  
  const monitor = getConnectionMonitor();
  if (!monitor.getHealth().isOnline) return [];

  const { data, error } = await supabase.rpc('rpc_list_user_presence', {
    p_org_id: orgId,
    p_team_id: teamId,
    p_online_within_seconds: onlineWithinSeconds,
    p_active_within_seconds: activeWithinSeconds,
  });

  if (error) throw error;
  return (data ?? []) as UserPresenceRow[];
}
