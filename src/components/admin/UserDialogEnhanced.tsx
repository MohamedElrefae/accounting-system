import React, { useState, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { audit } from '../../utils/audit';
import { useAuth } from '../../contexts/AuthContext';
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../Common/UnifiedCRUDForm';
import DraggableResizablePanel from '../Common/DraggableResizablePanel';
import { createUserFormConfig, type UserRecord, type Role } from './UserFormConfig';

interface PanelState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
  isDocked: boolean;
  dockPosition?: 'left' | 'right' | 'top' | 'bottom';
}

type ExistingUserFromDb = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  is_active?: boolean;
  avatar_url?: string;
  user_roles?: { roles?: { id?: number } }[];
};

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  user: ExistingUserFromDb | null;
  roles: Role[];
  onUserSaved: () => void;
}

export const UserDialogEnhanced: React.FC<UserDialogProps> = ({
  open,
  onClose,
  user,
  roles,
  onUserSaved
}) => {
  const { user: currentUser } = useAuth();
  const formRef = useRef<UnifiedCRUDFormHandle>(null);
  
  // Panel state for DraggableResizablePanel
  const [panelState, setPanelState] = useState<PanelState>({
    position: { x: window.innerWidth * 0.1, y: window.innerHeight * 0.1 },
    size: { width: Math.min(900, window.innerWidth * 0.8), height: Math.min(700, window.innerHeight * 0.8) },
    isMaximized: false,
    isDocked: false
  });

  // Convert user data to UserRecord format
  const existingUserRecord: UserRecord | null = user ? {
    id: user.id,
    email: user.email || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    full_name_ar: user.full_name_ar || '',
    department: user.department || '',
    job_title: user.job_title || '',
    phone: user.phone || '',
    role_id: user.user_roles?.[0]?.roles?.id?.toString() || '',
    is_active: user.is_active !== false,
    avatar_url: user.avatar_url || ''
  } : null;

  // Convert roles to Role format
  const roleRecords: Role[] = roles.map(role => ({
    id: role.id,
    name: (role as any).name ?? (role as any).name_en ?? '',
    name_ar: (role as any).name_ar ?? (role as any).name ?? '',
    description: (role as any).description,
    description_ar: (role as any).description_ar
  }));

  // Create form configuration
  const formConfig = createUserFormConfig(
    !!user, // isEditing
    roleRecords,
    existingUserRecord
  );

  // Handle form submission
  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    try {
      const finalJobTitle = (formData as any).job_title === 'other'
        ? String((formData as any).custom_job_title || '')
        : String((formData as any).job_title || '');

      const fd = formData as unknown as UserRecord;
      if (user) {
        // Update existing user
        const updateData: Partial<UserRecord> & { updated_at: string } = {
          first_name: fd.first_name,
          last_name: fd.last_name,
          full_name_ar: fd.full_name_ar,
          department: fd.department,
          job_title: finalJobTitle,
          phone: fd.phone,
          is_active: fd.is_active,
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Update role if changed
        if (fd.role_id) {
          await supabase.from('user_roles').delete().eq('user_id', user.id);
          
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: user.id,
            role_id: parseInt(fd.role_id),
            assigned_by: currentUser?.id,
            is_active: true
          });

          if (roleError) throw roleError;
        }

        // Log via secure RPC only if authenticated
        if (currentUser?.id) {
          await audit(supabase, 'user.update', 'user', user.id, {
            updated_fields: Object.keys(formData).filter(k =>
              !['password', 'confirm_password', 'send_invite'].includes(k)
            )
          });
        }

      } else {
        // Create new user using signUp (client-safe)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: fd.email,
          password: fd.password as string,
          options: {
            data: {
              first_name: fd.first_name,
              last_name: fd.last_name,
              require_password_change: fd.require_password_change
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          // Create user profile
          const profileData: Partial<UserRecord> & { id: string; email: string; created_at: string } = {
            id: signUpData.user.id,
            email: fd.email,
            first_name: fd.first_name,
            last_name: fd.last_name,
            full_name_ar: fd.full_name_ar,
            department: fd.department,
            job_title: finalJobTitle,
            phone: fd.phone,
            is_active: fd.is_active,
            created_at: new Date().toISOString()
          };

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert(profileData);

          if (profileError) throw profileError;

          // Assign role
          if (fd.role_id) {
            await supabase.from('user_roles').insert({
              user_id: signUpData.user.id,
              role_id: parseInt(fd.role_id),
              assigned_by: currentUser?.id,
              is_active: true
            });
          }

          // Log via secure RPC only if authenticated
          if (currentUser?.id) {
            await audit(supabase, 'user.create', 'user', signUpData.user.id, {
              email: fd.email,
              role_id: fd.role_id,
              department: fd.department
            });
          }
        }
      }

      // Success - reload and close
      onUserSaved();
      onClose();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      throw error; // Let the form handle the error display
    }
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <DraggableResizablePanel
      isOpen={open}
      onClose={onClose}
      title={formConfig.title}
      position={panelState.position}
      size={panelState.size}
      isMaximized={panelState.isMaximized}
      isDocked={panelState.isDocked}
      dockPosition={panelState.dockPosition || 'right'}
      onMove={(position) => setPanelState(prev => ({ ...prev, position }))}
      onResize={(size) => setPanelState(prev => ({ ...prev, size }))}
      onMaximize={() => setPanelState(prev => ({ ...prev, isMaximized: !prev.isMaximized }))}
      onDock={(dockPosition) => setPanelState(prev => ({ ...prev, isDocked: true, dockPosition }))}
      onResetPosition={() => setPanelState(prev => ({ ...prev, position: { x: 100, y: 100 }, isMaximized: false, isDocked: false }))}
    >
      <UnifiedCRUDForm
        ref={formRef}
        config={formConfig}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    </DraggableResizablePanel>
  );
};

