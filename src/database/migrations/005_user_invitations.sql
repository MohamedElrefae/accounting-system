-- User Invitations System
-- This migration creates the user_invitations table and related functionality

-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role_id BIGINT REFERENCES roles(id) ON DELETE SET NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_invitations
CREATE POLICY "Super admins can manage all invitations" ON user_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_super_admin = true
        )
    );

CREATE POLICY "Users can view their own invitations" ON user_invitations
    FOR SELECT USING (invited_by = auth.uid());

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS VOID AS $$
BEGIN
    UPDATE user_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() 
      AND status IN ('pending', 'sent');
END;
$$ LANGUAGE plpgsql;

-- Function to get invitation by token
CREATE OR REPLACE FUNCTION get_invitation_by_token(token_param TEXT)
RETURNS TABLE (
    id BIGINT,
    email VARCHAR(255),
    role_id BIGINT,
    role_name_ar TEXT,
    role_name_en TEXT,
    status VARCHAR(20),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- First expire old invitations
    PERFORM expire_old_invitations();
    
    -- Return invitation details with role info
    RETURN QUERY
    SELECT 
        ui.id,
        ui.email,
        ui.role_id,
        r.name_ar,
        r.name AS name_en,
        ui.status,
        ui.expires_at,
        ui.created_at
    FROM user_invitations ui
    LEFT JOIN roles r ON ui.role_id = r.id
    WHERE ui.invitation_token = token_param
      AND ui.status IN ('pending', 'sent')
      AND ui.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
    token_param TEXT,
    user_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT id, email, role_id, status, expires_at 
    INTO invitation_record
    FROM user_invitations
    WHERE invitation_token = token_param
      AND status IN ('pending', 'sent')
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark invitation as accepted
    UPDATE user_invitations
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Assign role to user if specified
    IF invitation_record.role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, is_active, created_at)
        VALUES (user_id_param, invitation_record.role_id, true, NOW())
        ON CONFLICT (user_id, role_id) DO UPDATE SET
            is_active = true,
            updated_at = NOW();
    END IF;
    
    -- Log the acceptance
    INSERT INTO audit_logs (
        user_id, 
        action, 
        entity_type, 
        entity_id,
        details
    ) VALUES (
        user_id_param,
        'user.invitation_accepted',
        'user_invitation',
        invitation_record.id::text,
        jsonb_build_object(
            'email', invitation_record.email,
            'role_id', invitation_record.role_id
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resend invitation (updates sent_at and extends expiry)
CREATE OR REPLACE FUNCTION resend_invitation(invitation_id_param BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_invitations
    SET 
        status = 'sent',
        sent_at = NOW(),
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = invitation_id_param
      AND status IN ('pending', 'sent');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for invitation management
CREATE OR REPLACE VIEW invitation_management_view AS
SELECT 
    ui.id,
    ui.email,
    ui.status,
    ui.expires_at,
    ui.sent_at,
    ui.accepted_at,
    ui.created_at,
    r.name_ar as role_name_ar,
    r.name as role_name_en,
    up.first_name || ' ' || up.last_name as invited_by_name,
    CASE 
        WHEN ui.expires_at < NOW() THEN 'expired'
        ELSE ui.status
    END as effective_status
FROM user_invitations ui
LEFT JOIN roles r ON ui.role_id = r.id
LEFT JOIN user_profiles up ON ui.invited_by = up.id
ORDER BY ui.created_at DESC;

-- Grant permissions
GRANT SELECT ON invitation_management_view TO authenticated;

-- Comments
COMMENT ON TABLE user_invitations IS 'Stores user invitation data for the invite system';
COMMENT ON FUNCTION expire_old_invitations() IS 'Automatically expires invitations past their expiry date';
COMMENT ON FUNCTION get_invitation_by_token(TEXT) IS 'Retrieves invitation details by token for registration page';
COMMENT ON FUNCTION accept_invitation(TEXT, UUID) IS 'Accepts an invitation and assigns role to user';
COMMENT ON FUNCTION resend_invitation(BIGINT) IS 'Resends an invitation by updating timestamps';
COMMENT ON VIEW invitation_management_view IS 'Management view for user invitations with role and user details';
