import React, { useEffect, useMemo, useState } from 'react';
import { Building2, UserPlus2, Users2, Trash2, Shield, RefreshCw } from 'lucide-react';
import styles from './OrgMembersManagement.module.css';
import { useToast } from '../../contexts/ToastContext';
import { getOrganizations, type Organization } from '../../services/organization';
import type { User } from '../../types/common';
import { 
  listOrgMembers, 
  addOrgMember, 
  updateOrgMemberRole, 
  removeOrgMember, 
  searchUsersNotInOrg, 
  type OrgMemberRole, 
  type OrgMemberWithUser 
} from '../../services/org-memberships';
import { getDefaultRoleForNewMember } from '../../data/mock-org-permissions';

const ROLE_OPTIONS: { value: OrgMemberRole; label: string }[] = [
  { value: 'viewer', label: 'مشاهد' },
  { value: 'manager', label: 'مدير' },
  { value: 'admin', label: 'مسؤول' },
];

const OrgMembersManagement: React.FC = () => {
  const { showToast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [members, setMembers] = useState<OrgMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>(getDefaultRoleForNewMember());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers(selectedOrgId);
    }
  }, [selectedOrgId]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await getOrganizations();
      setOrgs(data);
      if (data.length > 0) {
        setSelectedOrgId(data[0].id);
      }
    } catch {
      showToast('فشل تحميل المؤسسات', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      setRefreshing(true);
      const list = await listOrgMembers(orgId);
      setMembers(list);
    } catch {
      showToast('فشل تحميل الأعضاء', { severity: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenAdd = async () => {
    setUserQuery('');
    setSelectedUserId('');
    setSelectedRole(getDefaultRoleForNewMember());
    setAddDialogOpen(true);
    await fetchUserOptions('');
  };

  const fetchUserOptions = async (query: string) => {
    if (!selectedOrgId) return;
    try {
      const users = await searchUsersNotInOrg(selectedOrgId, query, 20);
      setUserOptions(users);
    } catch {
      setUserOptions([]);
    }
  };

  const handleAddMember = async () => {
    if (!selectedOrgId || !selectedUserId) return;
    setSaving(true);
    try {
      await addOrgMember(selectedOrgId, selectedUserId, selectedRole);
      setAddDialogOpen(false);
      await loadMembers(selectedOrgId);
      showToast('تم إضافة العضو بنجاح', { severity: 'success' });
    } catch {
      showToast('فشل إضافة العضو', { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: OrgMemberRole) => {
    if (!selectedOrgId) return;
    try {
      await updateOrgMemberRole(selectedOrgId, userId, role);
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      showToast('تم تحديث دور العضو', { severity: 'success' });
    } catch {
      showToast('فشل تحديث الدور', { severity: 'error' });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!selectedOrgId) return;
    if (!window.confirm('هل أنت متأكد من إزالة هذا العضو؟')) return;
    try {
      await removeOrgMember(selectedOrgId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      showToast('تم إزالة العضو', { severity: 'success' });
    } catch {
      showToast('فشل إزالة العضو', { severity: 'error' });
    }
  };

  const selectedOrg = useMemo(() => orgs.find(o => o.id === selectedOrgId) || null, [orgs, selectedOrgId]);

  if (loading) {
    return (
      <div className={styles.loadingContainer} dir="rtl">
        <div className={styles.loadingSpinner} />
        جاري تحميل الصفحة...
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Users2 size={28} />
            </div>
            <div className={styles.headerText}>
              <h1>أعضاء المؤسسة</h1>
              <p>إدارة الأعضاء وتعيين أدوارهم داخل المؤسسة المختارة</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <select
              className={styles.select}
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
              ))}
            </select>

            <button className={styles.refreshButton} onClick={() => selectedOrgId && loadMembers(selectedOrgId)} disabled={refreshing}>
              <RefreshCw size={18} />
              تحديث
            </button>

            <button className={styles.addButton} onClick={handleOpenAdd}>
              <UserPlus2 size={18} />
              إضافة عضو
            </button>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {(!selectedOrg || members.length === 0) ? (
            <div className={styles.emptyState}>
              <Building2 size={64} />
              <h3>{selectedOrg ? 'لا يوجد أعضاء بعد' : 'اختر مؤسسة لعرض أعضائها'}</h3>
              <p>{selectedOrg ? 'ابدأ بإضافة أعضاء للمؤسسة' : 'يرجى اختيار مؤسسة من القائمة'}</p>
              {selectedOrg && (
                <button className={styles.addButton} onClick={handleOpenAdd}>
                  <UserPlus2 size={18} />
                  إضافة عضو
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البريد</th>
                    <th>القسم</th>
                    <th>الدور</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.user_id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatarCircle}>{(m.user.first_name?.[0] || m.user.email[0] || 'U').toUpperCase()}</div>
                          <div>
                            <div className={styles.userName}>{m.user.first_name || ''} {m.user.last_name || ''}</div>
                            <div className={styles.userNameAr}>{m.user.full_name_ar || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.muted}>{m.user.email}</td>
                      <td className={styles.muted}>{m.user.department || '—'}</td>
                      <td>
                        <div className={styles.roleCell}>
                          <Shield size={16} />
                          <select 
                            className={styles.selectSmall}
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user_id, e.target.value as OrgMemberRole)}
                          >
                            {ROLE_OPTIONS.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleRemove(m.user_id)}>
                          <Trash2 size={16} />
                          إزالة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {addDialogOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>إضافة عضو جديد</h2>
              <button className={styles.closeButton} onClick={() => setAddDialogOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>اختيار المستخدم</label>
                  <input 
                    type="text" 
                    placeholder="ابحث بالبريد..."
                    value={userQuery}
                    onChange={async (e) => { 
                      const v = e.target.value; 
                      setUserQuery(v); 
                      await fetchUserOptions(v);
                    }}
                  />
                  <select 
                    className={styles.select}
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="" disabled>اختر مستخدم</option>
                    {userOptions.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>الدور</label>
                  <select 
                    className={styles.select}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as OrgMemberRole)}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setAddDialogOpen(false)} disabled={saving}>إلغاء</button>
              <button className={styles.saveButton} onClick={handleAddMember} disabled={saving || !selectedUserId}>
                {saving ? (<><div className={`${styles.loadingSpinner} ${styles.loadingSpinnerSmall}`} /> جاري الحفظ...</>) : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgMembersManagement;
