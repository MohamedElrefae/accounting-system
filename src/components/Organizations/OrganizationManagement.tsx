import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, CheckCircle, XCircle, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization, type Organization } from '../../services/organization';
import { useToast } from '../../contexts/ToastContext';
import styles from './OrganizationManagement.module.css';

interface OrganizationFormData {
  code: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  status: 'active' | 'inactive';
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
    status: 'active'
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
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
  };

  const handleAdd = () => {
    setEditingOrg(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      tax_number: '',
      status: 'active'
    });
    setDialogOpen(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      code: org.code,
      name: org.name,
      description: org.description || '',
      address: org.address || '',
      phone: org.phone || '',
      email: org.email || '',
      tax_number: org.tax_number || '',
      status: org.status
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

  const handleDelete = async (org: Organization) => {
    if (!window.confirm(`هل أنت متأكد من حذف المؤسسة "${org.name}"؟`)) return;

    try {
      await deleteOrganization(org.id);
      setOrganizations(prev => prev.filter(o => o.id !== org.id));
      showToast('تم حذف المؤسسة بنجاح', { severity: 'success' });
    } catch (error) {
      console.error('Error deleting organization:', error);
      showToast('فشل حذف المؤسسة', { severity: 'error' });
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
            </div>
          </div>
          <button className={styles.addButton} onClick={handleAdd}>
            <Plus size={20} />
            إضافة مؤسسة
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {organizations.length === 0 ? (
            <div className={styles.emptyState}>
              <Building2 size={64} />
              <h3>لا توجد مؤسسات</h3>
              <p>ابدأ بإضافة مؤسسة جديدة لإدارة أعمالك</p>
              <button className={styles.addButton} onClick={handleAdd}>
                <Plus size={20} />
                إضافة مؤسسة
              </button>
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
                    <div className={`${styles.statusBadge} ${org.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                      {org.status === 'active' ? 'نشطة' : 'غير نشطة'}
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
                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEdit(org)}>
                      <Edit size={16} />
                      تعديل
                    </button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(org)}>
                      <Trash2 size={16} />
                      حذف
                    </button>
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

                  <div className={styles.formField}>
                    <label htmlFor="status">الحالة</label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    >
                      <option value="active">نشطة</option>
                      <option value="inactive">غير نشطة</option>
                    </select>
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
