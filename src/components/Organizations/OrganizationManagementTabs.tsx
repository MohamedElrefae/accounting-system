import React, { useEffect, useState } from 'react';
import styles from './OrganizationManagementTabs.module.css';
import { Settings as SettingsIcon, Users as UsersIcon, Building2 as OrgsIcon } from 'lucide-react';
import OrganizationSettings from './OrganizationSettings';
import OrgMembersManagement from './OrgMembersManagement';
import OrganizationManagement from './OrganizationManagement';
import { usePermissions } from '../../hooks/usePermissions';

const OrganizationManagementTabs: React.FC = () => {
  const { permissions, loading } = usePermissions();
  const isSuperAdmin = permissions.includes('*');
  const [tab, setTab] = useState<'orgs' | 'settings' | 'members'>(isSuperAdmin ? 'orgs' : 'settings');

  useEffect(() => {
    if (!loading && !isSuperAdmin && tab === 'orgs') {
      setTab('settings');
    }
  }, [loading, isSuperAdmin, tab]);

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>إدارة المؤسسة</h1>
          <div className={styles.tabs}>
            {isSuperAdmin && (
              <button
                className={`${styles.tab} ${tab === 'orgs' ? styles.active : ''}`}
                onClick={() => setTab('orgs')}
                aria-selected={tab === 'orgs'}
              >
                <OrgsIcon size={16} />
                قائمة المؤسسات
              </button>
            )}
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
        {tab === 'orgs' && isSuperAdmin ? <OrganizationManagement /> : tab === 'settings' ? <OrganizationSettings /> : <OrgMembersManagement />}
      </div>
    </div>
  );
};

export default OrganizationManagementTabs;
