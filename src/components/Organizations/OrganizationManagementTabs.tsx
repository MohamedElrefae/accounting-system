import React, { useEffect, useState } from 'react';
import styles from './OrganizationManagementTabs.module.css';
import { Settings as SettingsIcon, Users as UsersIcon, Building2 as OrgsIcon } from 'lucide-react';
import OrganizationSettings from './OrganizationSettings';
import OrgMembersManagement from './OrgMembersManagement';
import OrganizationManagement from './OrganizationManagement';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';

const OrganizationManagementTabs: React.FC = () => {
  const { hasActionAccess, loading } = useOptimizedAuth();
  
  // Check if user can manage organizations (create/update/delete)
  // All users can VIEW organizations, but only admins can manage them
  const canManageOrgs = hasActionAccess('settings.manage') || hasActionAccess('users.manage');
  
  const [tab, setTab] = useState<'orgs' | 'settings' | 'members'>('settings');

  useEffect(() => {
    // No need to redirect - all users can access all tabs
    // Organizations tab shows read-only view for non-admins
  }, [loading]);

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>إدارة المؤسسة</h1>
          <div className={styles.tabs}>
            {/* Show Organizations tab to all users - they'll see read-only view if not admin */}
            <button
              className={`${styles.tab} ${tab === 'orgs' ? styles.active : ''}`}
              onClick={() => setTab('orgs')}
              aria-selected={tab === 'orgs'}
            >
              <OrgsIcon size={16} />
              قائمة المؤسسات
            </button>
            <button
              className={`${styles.tab} ${tab === 'settings' ? styles.active : ''}`}
              onClick={() => setTab('settings')}
              aria-selected={tab === 'settings'}
            >
              <SettingsIcon size={16} />
              إعدادات المؤسسة
            </button>
            <button
              className={`${styles.tab} ${tab === 'members' ? styles.active : ''}`}
              onClick={() => setTab('members')}
              aria-selected={tab === 'members'}
            >
              <UsersIcon size={16} />
              أعضاء المؤسسة
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {tab === 'orgs' ? <OrganizationManagement /> : tab === 'settings' ? <OrganizationSettings /> : <OrgMembersManagement />}
      </div>
    </div>
  );
};

export default OrganizationManagementTabs;
