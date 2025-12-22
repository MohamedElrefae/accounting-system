import { supabase } from '../utils/supabase';

export interface OrgTeam {
  id: string;
  org_id: string;
  name: string;
  name_ar: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface OrgTeamMember {
  id: string;
  org_id: string;
  team_id: string;
  user_id: string;
  is_leader: boolean;
  created_at: string;
  created_by: string | null;
}

export async function listTeams(orgId: string): Promise<OrgTeam[]> {
  const { data, error } = await supabase
    .from('org_teams')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrgTeam[];
}

export async function createTeam(params: {
  orgId: string;
  name: string;
  nameAr?: string | null;
}): Promise<OrgTeam> {
  const { orgId, name, nameAr = null } = params;

  const { data, error } = await supabase
    .from('org_teams')
    .insert({
      org_id: orgId,
      name,
      name_ar: nameAr,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as OrgTeam;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('org_teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;
}

export async function listTeamMembers(params: {
  orgId: string;
  teamId: string;
}): Promise<OrgTeamMember[]> {
  const { orgId, teamId } = params;

  const { data, error } = await supabase
    .from('org_team_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('team_id', teamId)
    .order('is_leader', { ascending: false });

  if (error) throw error;
  return (data ?? []) as OrgTeamMember[];
}

export async function addTeamMember(params: {
  orgId: string;
  teamId: string;
  userId: string;
}): Promise<void> {
  const { orgId, teamId, userId } = params;

  const { error } = await supabase
    .from('org_team_members')
    .insert({
      org_id: orgId,
      team_id: teamId,
      user_id: userId,
      is_leader: false,
    });

  if (error) throw error;
}

export async function removeTeamMember(params: {
  orgId: string;
  teamId: string;
  userId: string;
}): Promise<void> {
  const { orgId, teamId, userId } = params;

  const { error } = await supabase
    .from('org_team_members')
    .delete()
    .eq('org_id', orgId)
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function setTeamLeader(params: {
  orgId: string;
  teamId: string;
  userId: string;
}): Promise<void> {
  const { orgId, teamId, userId } = params;

  const { error } = await supabase.rpc('rpc_set_team_leader', {
    p_org_id: orgId,
    p_team_id: teamId,
    p_user_id: userId,
  });

  if (error) throw error;
}
