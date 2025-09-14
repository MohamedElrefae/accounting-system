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

export const approveAccessRequest = async (requestId) => {
  console.log('Approving access request:', requestId);
  
  try {
    // First, get the request details
    const { data: request, error: fetchError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('Error fetching request:', fetchError);
      throw fetchError;
    }

    if (!request) {
      throw new Error('Access request not found');
    }

    console.log('Request details:', request);

    // Update the access request status
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating access request:', updateError);
      throw updateError;
    }

    // Store the approved user profile for later creation
    const { error: pendingError } = await supabase
      .from('pending_user_profiles')
      .insert([{
        email: request.email,
        full_name: request.full_name,
        organization: request.organization,
        role: request.role,
        access_request_id: requestId,
        created_at: new Date().toISOString()
      }]);

    if (pendingError) {
      console.error('Error storing pending profile:', pendingError);
      throw pendingError;
    }

    // Add email to approved_emails table for registration validation
    const { error: approvedEmailError } = await supabase
      .from('approved_emails')
      .insert([{
        email: request.email,
        approved_at: new Date().toISOString()
      }]);

    // Don't throw error if email already exists (conflict is OK)
    if (approvedEmailError && !approvedEmailError.message?.includes('duplicate key')) {
      console.error('Error adding to approved emails:', approvedEmailError);
      throw approvedEmailError;
    }

    console.log('Access request approved successfully');
    return { success: true, message: 'Access request approved successfully' };
    
  } catch (error) {
    console.error('Error in approval process:', error);
    throw error;
  }
};

export const rejectAccessRequest = async (requestId, reason) => {
  console.log('Rejecting access request:', requestId, 'Reason:', reason);
  
  const { error } = await supabase
    .from('access_requests')
    .update({ 
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting access request:', error);
    throw error;
  }

  console.log('Access request rejected successfully');
  return { success: true };
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
