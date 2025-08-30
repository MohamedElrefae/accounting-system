import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit, Trash2, Building, Calendar, DollarSign } from 'lucide-react';
import { getActiveProjects, createProject, updateProject, deleteProject, type Project } from '../../services/projects';
import { getOrganizations, type Organization } from '../../services/organization';
import { useToast } from '../../contexts/ToastContext';
import styles from './ProjectManagement.module.css';

interface ProjectFormData {
  code: string;
  name: string;
  description: string;
  organization_id: string;
  status: 'active' | 'inactive' | 'completed';
  start_date: string;
  end_date: string;
  budget: number;
}

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    code: '',
    name: '',
    description: '',
    organization_id: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: 0
  });

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, orgsData] = await Promise.all([
        getActiveProjects(),
        getOrganizations()
      ]);
      setProjects(projectsData);
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('فشل تحميل البيانات', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      organization_id: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: 0
    });
    setDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      code: project.code,
      name: project.name,
      description: project.description || '',
      organization_id: (project as any).organization_id || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: (project as any).budget_amount ?? (project as any).budget ?? 0
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
      const projectData = {
        ...formData,
        budget_amount: formData.budget
      };

      if (editingProject) {
        const updated = await updateProject(editingProject.id, projectData);
        setProjects(prev => prev.map(proj => proj.id === editingProject.id ? updated : proj));
        showToast('تم تحديث المشروع بنجاح', { severity: 'success' });
      } else {
        const created = await createProject(projectData);
        setProjects(prev => [...prev, created]);
        showToast('تم إضافة المشروع بنجاح', { severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving project:', error);
      showToast(error.message || 'فشل حفظ المشروع', { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشروع "${project.name}"؟`)) return;

    try {
      await deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      showToast('تم حذف المشروع بنجاح', { severity: 'success' });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      showToast(error.message || 'فشل حذف المشروع', { severity: 'error' });
    }
  };

  const getOrganizationName = (orgId?: string) => {
    if (!orgId) return 'غير محدد';
    const org = organizations.find(o => o.id === orgId);
    return org ? `${org.code} - ${org.name}` : 'غير موجود';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'completed': return 'status-completed';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'completed': return 'مكتمل';
      case 'inactive': return 'غير نشط';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        جاري تحميل المشاريع...
      </div>
    );
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FolderOpen size={32} />
            </div>
            <div className={styles.headerText}>
              <h1>إدارة المشاريع</h1>
              <p>إدارة المشاريع والأنشطة في النظام</p>
            </div>
          </div>
          <button className={styles.addButton} onClick={handleAdd}>
            <Plus size={20} />
            إضافة مشروع
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <FolderOpen size={64} />
              <h3>لا توجد مشاريع</h3>
              <p>ابدأ بإضافة مشروع جديد لإدارة أعمالك</p>
              <button className={styles.addButton} onClick={handleAdd}>
                <Plus size={20} />
                إضافة مشروع
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {projects.map(project => (
                <div key={project.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.projectInfo}>
                      <h3>{project.code}</h3>
                      <h4>{project.name}</h4>
                    </div>
                    <div className={`${styles.statusBadge} ${getStatusColor(project.status) === 'status-active' ? styles.statusActive : getStatusColor(project.status) === 'status-completed' ? styles.statusCompleted : styles.statusInactive}`}>
                      {getStatusText(project.status)}
                    </div>
                  </div>
                  
                  {(project as any).organization_id && (
                    <div className={styles.organizationInfo}>
                      <Building className={styles.organizationIcon} size={16} />
                      <span>{getOrganizationName((project as any).organization_id)}</span>
                    </div>
                  )}
                  
                  {project.description && (
                    <p className={styles.description}>{project.description}</p>
                  )}
                  
                  <div className={styles.details}>
                    {(project.start_date || project.end_date) && (
                      <div className={styles.detailItem}>
                        <Calendar className={styles.detailIcon} size={16} />
                        <span>
                          {project.start_date && project.end_date ? (
                            `${new Date(project.start_date).toLocaleDateString('ar-SA')} - ${new Date(project.end_date).toLocaleDateString('ar-SA')}`
                          ) : project.start_date ? (
                            `يبدأ: ${new Date(project.start_date).toLocaleDateString('ar-SA')}`
                          ) : (
                            `ينتهي: ${new Date(project.end_date!).toLocaleDateString('ar-SA')}`
                          )}
                        </span>
                      </div>
                    )}
                    
                    {project.budget_amount && (
                      <div className={styles.detailItem}>
                        <DollarSign className={styles.detailIcon} size={16} />
                        <span>الميزانية: </span>
                        <span className={styles.budgetAmount}>
                          {project.budget_amount.toLocaleString('ar-SA')} ر.س
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.actions}>
                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => handleEdit(project)}>
                      <Edit size={16} />
                      تعديل
                    </button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(project)}>
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
              <h2>{editingProject ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2>
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
                      placeholder="مثال: PROJ001"
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="name">اسم المشروع *</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="اسم المشروع"
                      required
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="organization_id">المؤسسة</label>
                    <select
                      id="organization_id"
                      value={formData.organization_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                    >
                      <option value="">بدون مؤسسة</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.code} - {org.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="status">الحالة</label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="completed">مكتمل</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="start_date">تاريخ البداية</label>
                    <input
                      type="date"
                      id="start_date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="end_date">تاريخ النهاية</label>
                    <input
                      type="date"
                      id="end_date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="budget">الميزانية (ر.س)</label>
                    <input
                      type="number"
                      id="budget"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className={`${styles.formField} ${styles.formFieldFull}`}>
                    <label htmlFor="description">الوصف</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="وصف المشروع"
                      rows={3}
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
                  editingProject ? 'تحديث' : 'إضافة'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectManagement;
