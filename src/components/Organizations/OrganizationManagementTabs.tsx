import React, { useState } from 'react';
import styles from './OrganizationManagementTabs.module.css';
import { Settings as SettingsIcon, Users as UsersIcon } from 'lucide-react';
import OrganizationSettings from './OrganizationSettings';
import OrgMembersManagement from './OrgMembersManagement';

const OrganizationManagementTabs: React.FC = () => {
  const [tab, setTab] = useState<'settings' | 'members'>('settings');

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>إدارة المؤسسة</h1>
          <div className={styles.tabs}>
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
        {tab === 'settings' ? <OrganizationSettings /> : <OrgMembersManagement />}
      </div>
    </div>
  );
};

export default OrganizationManagementTabs;
