import { supabase } from '../utils/supabase';

export interface AccessRequest {
  id: string;
  email: string;
  full_name_ar?: string;
  phone?: string;
  department?: string;
  job_title?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  assigned_role?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessRequestWithReviewer extends AccessRequest {
  reviewer?: {
    full_name_ar?: string;
    email: string;
  };
}

// Get all access requests (admin only)
export const getAllAccessRequests = async (): Promise<AccessRequestWithReviewer[]> => {
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch access requests: ${error.message}`);
  }

  // For now, return without reviewer info since the relationship isn't set up
  // We can add reviewer details later when the FK relationship is properly configured
  return (data as AccessRequest[]).map(request => ({
    ...request,
    reviewer: undefined // We'll populate this manually if needed
  })) as AccessRequestWithReviewer[];
};

// Get pending access requests count (for notifications)
export const getPendingAccessRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('access_requests')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to count pending requests: ${error.message}`);
  }

  return count || 0;
};

// Get pending access requests
export const getPendingAccessRequests = async (): Promise<AccessRequest[]> => {
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending requests: ${error.message}`);
  }

  return data as AccessRequest[];
};

// Approve access request - simplified approach
export const approveAccessRequest = async (
  requestId: string, 
  assignedRole: string = 'user'
): Promise<{ message: string; email: string; requestData: any }> => {
  try {
    // First, get the access request
    const { data: request, error: requestError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Access request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Access request has already been processed');
    }

    // Store the request data in a temporary table for profile creation later
    const { error: tempError } = await supabase
      .from('pending_user_profiles')
      .upsert({
        email: request.email,
        full_name_ar: request.full_name_ar,
        phone: request.phone,
        department: request.department,
        job_title: request.job_title,
        assigned_role: assignedRole,
        approved_at: new Date().toISOString(),
        approved_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    // Continue even if this fails - it's just for convenience
    if (tempError) {
      console.warn('Failed to store pending profile:', tempError);
    }

    // Update the access request status
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        assigned_role: assignedRole
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update access request: ${updateError.message}`);
    }

    return {
      message: 'Access request approved successfully',
      email: request.email,
      requestData: request
    };
  } catch (error) {
    console.error('Error approving access request:', error);
    throw error;
  }
};
// Reject access request
export const rejectAccessRequest = async (
  requestId: string,
  reason?: string
): Promise<void> => {
  const { error } = await supabase
    .from('access_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      message: reason ? `${reason}` : undefined
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to reject access request: ${error.message}`);
  }
};

// Get approved user email for notification (to inform admin who to contact)
export const getApprovedUserEmail = async (requestId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('access_requests')
    .select('email')
    .eq('id', requestId)
    .eq('status', 'approved')
    .single();
  if (error || !data) return null;
  return data.email as string | null;
};

// Check if user has permission to manage access requests
export const canManageAccessRequests = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin, department')
    .eq('id', user.id)
    .single();
    
  if (!profile) return false;
  
  // Super admin can always manage requests, or Admin department users
  return profile.is_super_admin === true || profile.department === 'Admin';
};
