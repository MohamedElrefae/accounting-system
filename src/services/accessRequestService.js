import { supabase } from '../utils/supabase';

export const submitAccessRequest = async (requestData) => {
  console.log('Submitting access request:', requestData);
  
  const { data, error } = await supabase
    .from('access_requests')
    .insert([{
      email: requestData.email,
      full_name: requestData.fullName,
      organization: requestData.organization,
      role: requestData.role,
      reason: requestData.reason,
      status: 'pending',
      requested_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error submitting access request:', error);
    throw error;
  }

  console.log('Access request submitted successfully:', data);
  return data;
};

export const getAccessRequests = async () => {
  console.log('Fetching access requests...');
  
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('Error fetching access requests:', error);
    throw error;
  }

  console.log('Access requests fetched:', data);
  return data;
};

export const approveAccessRequest = async (requestId, assignedRole = 'user') => {
  console.log('Approving access request:', requestId, 'with role:', assignedRole);
  
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
        full_name_ar: request.full_name_ar || request.full_name,
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

export const rejectAccessRequest = async (requestId, reason) => {
  console.log('Rejecting access request:', requestId, 'Reason:', reason);
  
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

  console.log('Access request rejected successfully');
};

// New function to check if email is approved for registration
export const isEmailApproved = async (email) => {
  console.log('Checking if email is approved:', email);
  
  const { data, error } = await supabase
    .from('approved_emails')
    .select('email')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error checking approved email:', error);
    throw error;
  }

  const isApproved = !!data;
  console.log('Email approval status:', { email, isApproved });
  return isApproved;
};

// Get all access requests (admin only)
export const getAllAccessRequests = async () => {
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch access requests: ${error.message}`);
  }

  return data || [];
};

// Get pending access requests count (for notifications)
export const getPendingAccessRequestsCount = async () => {
  const { count, error } = await supabase
    .from('access_requests')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  if (error) {
    throw new Error(`Failed to count pending requests: ${error.message}`);
  }

  return count || 0;
};

// Check if user has permission to manage access requests
export const canManageAccessRequests = async () => {
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
