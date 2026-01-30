import React, { useCallback, useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, FileText, Eraser } from 'lucide-react';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganizationCascade, purgeOrganizationData, type Organization } from '../../services/organization';
import { useToast } from '../../contexts/ToastContext';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import styles from './OrganizationManagement.module.css';

interface OrganizationFormData {
  code: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  is_active: boolean;
}

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<OrganizationFormData>({
    code: '',
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    tax_number: '',
    is_active: true
  });

  const { showToast } = useToast();
  const { hasActionAccess } = useOptimizedAuth();
  
  // Check permissions - use existing permission codes
  // Organizations are managed by users with settings.manage or users.manage permissions
  const canCreate = hasActionAccess('settings.manage') || hasActionAccess('users.manage');
  const canUpdate = hasActionAccess('settings.manage') || hasActionAccess('users.manage');
  const canDelete = hasActionAccess('settings.manage') || hasActionAccess('users.manage');
  
  // Allow viewing organizations for all authenticated users
  // Most users need to see organizations to select them for transactions
  const hasAnyManagementPermission = canCreate || canUpdate || canDelete;

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Error loading organizations:', error);
      showToast('فشل تحميل المؤسسات', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleAdd = () => {
    if (!canCreate) {
      showToast('ليس لديك صلاحية لإضافة مؤسسات', { severity: 'error' });
      return;
    }
    
    setEditingOrg(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      tax_number: '',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleEdit = (org: Organization) => {
    if (!canUpdate) {
      showToast('ليس لديك صلاحية لتعديل المؤسسات', { severity: 'error' });
      return;
    }
    
    setEditingOrg(org);
    setFormData({
      code: org.code,
      name: org.name,
      description: org.description || '',
      address: org.address || '',
      phone: org.phone || '',
      email: org.email || '',
      tax_number: org.tax_number || '',
      is_active: !!org.is_active
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      showToast('الكود والاسم مطلوبان', { severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editingOrg) {
        const updated = await updateOrganization(editingOrg.id, formData);
        setOrganizations(prev => prev.map(org => org.id === editingOrg.id ? updated : org));
        showToast('تم تحديث المؤسسة بنجاح', { severity: 'success' });
      } else {
        const created = await createOrganization(formData);
        setOrganizations(prev => [...prev, created]);
        showToast('تم إضافة المؤسسة بنجاح', { severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving organization:', error);
      showToast('فشل حفظ المؤسسة', { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePurge = async (org: Organization) => {
    if (!canDelete) {
      showToast('ليس لديك صلاحية لتفريغ بيانات المؤسسات', { severity: 'error' });
      return;
    }
    
    const warning = `تنبيه مهم:\nسيتم حذف جميع البيانات المرتبطة بالمؤسسة "${org.code} — ${org.name}" (مشاريع، إعدادات، المخزون، التقارير ...)، مع الإبقاء على سجل المؤسسة.\nلا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟`;
    if (!window.confirm(warning)) return;
    setSaving(true);
    try {
      await purgeOrganizationData(org.id);
      await loadOrganizations();
      showToast('تم تفريغ بيانات المؤسسة بنجاح (مع بقاء المؤسسة)', { severity: 'success' });
    } catch (error: any) {
      console.error('Error purging organization data:', error);
      const msg = error?.message || 'فشل تفريغ بيانات المؤسسة';
      showToast(msg, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!canDelete) {
      showToast('ليس لديك صلاحية لحذف المؤسسات', { severity: 'error' });
      return;
    }
    
    const warning = `تنبيه مهم:\nسيتم حذف المؤسسة "${org.code} — ${org.name}" وجميع البيانات المرتبطة بها نهائيًا (مشاريع، إعدادات، المخزون، التقارير ...).\nلا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟`;
    if (!window.confirm(warning)) return;

    try {
      await deleteOrganizationCascade(org.id);
      setOrganizations(prev => prev.filter(o => o.id !== org.id));
      showToast('تم حذف المؤسسة وكافة بياناتها المرتبطة', { severity: 'success' });
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      const msg = error?.message || 'فشل حذف المؤسسة بسبب ارتباطات في الجداول';
      showToast(msg, { severity: 'error' });
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        جاري تحميل المؤسسات...
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Building2 size={32} />
            </div>
            <div className={styles.headerText}>
              <h1>إدارة المؤسسات</h1>
              <p>إدارة المؤسسات والفروع في النظام</p>
              {!hasAnyManagementPermission && (
                <p style={{ color: '#f59e0b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  ⚠️ وضع القراءة فقط - ليس لديك صلاحية لتعديل المؤسسات
                </p>
              )}
            </div>
          </div>
          {canCreate && (
            <button className={styles.addButton} onClick={handleAdd}>
              <Plus size={20} />
              إضافة مؤسسة
            </button>
          )}
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {organizations.length === 0 ? (
            <div className={styles.emptyState}>
              <Building2 size={64} />
              <h3>لا توجد مؤسسات</h3>
              <p>ابدأ بإضافة مؤسسة جديدة لإدارة أعمالك</p>
              {canCreate && (
                <button className={styles.addButton} onClick={handleAdd}>
                  <Plus size={20} />
                  إضافة مؤسسة
                </button>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {organizations.map(org => (
                <div key={org.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.orgInfo}>
                      <h3>{org.code}</h3>
                      <h4>{org.name}</h4>
                    </div>
                    <div className={`${styles.statusBadge} ${org.is_active ? styles.statusActive : styles.statusInactive}`}>
                      {org.is_active ? 'نشطة' : 'غير نشطة'}
                    </div>
                  </div>
                  
                  {org.description && (
                    <p className={styles.description}>{org.description}</p>
                  )}
                  
                  <div className={styles.details}>
                    {org.address && (
                      <div className={styles.detailItem}>
                        <MapPin className={styles.detailIcon} size={16} />
                        <span>{org.address}</span>
                      </div>
                    )}
                    {org.phone && (
                      <div className={styles.detailItem}>
                        <Phone className={styles.detailIcon} size={16} />
                        <span>{org.phone}</span>
                      </div>
                    )}
                    {org.email && (
                      <div className={styles.detailItem}>
                        <Mail className={styles.detailIcon} size={16} />
                        <span>{org.email}</span>
                      </div>
                    )}
                    {org.tax_number && (
                      <div className={styles.detailItem}>
                        <FileText className={styles.detailIcon} size={16} />
                        <span>الرقم الضريبي: {org.tax_number}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.actions}>
                    {canUpdate && (
                      <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEdit(org)}>
                        <Edit size={16} />
                        تعديل
                      </button>
                    )}
                    {canDelete && (
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handlePurge(org)}>
                        <Eraser size={16} />
                        تفريغ البيانات
                      </button>
                    )}
                    {canDelete && (
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(org)}>
                        <Trash2 size={16} />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {dialogOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingOrg ? 'تعديل المؤسسة' : 'إضافة مؤسسة جديدة'}</h2>
              <button className={styles.closeButton} onClick={() => setDialogOpen(false)}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label htmlFor="code">الكود *</label>
                    <input
                      type="text"
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="مثال: MAIN"
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="name">الاسم *</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="اسم المؤسسة"
                      required
                    />
                  </div>

                  <div className={`${styles.formField} ${styles.checkboxField}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                      المؤسسة نشطة
                    </label>
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="phone">الهاتف</label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="رقم الهاتف"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="email">البريد الإلكتروني</label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="البريد الإلكتروني"
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="tax_number">الرقم الضريبي</label>
                    <input
                      type="text"
                      id="tax_number"
                      value={formData.tax_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                      placeholder="الرقم الضريبي"
                    />
                  </div>

                  <div className={`${styles.formField} ${styles.formFieldFull}`}>
                    <label htmlFor="description">الوصف</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="وصف المؤسسة"
                      rows={3}
                    />
                  </div>

                  <div className={`${styles.formField} ${styles.formFieldFull}`}>
                    <label htmlFor="address">العنوان</label>
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="عنوان المؤسسة"
                      rows={2}
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                type="button" 
                className={styles.cancelButton} 
                onClick={() => setDialogOpen(false)} 
                disabled={saving}
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                className={styles.saveButton} 
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? (
                  <>
                    <div className={`${styles.loadingSpinner} ${styles.loadingSpinnerSmall}`} />
                    جاري الحفظ...
                  </>
                ) : (
                  editingOrg ? 'تحديث' : 'إضافة'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizationManagement;
