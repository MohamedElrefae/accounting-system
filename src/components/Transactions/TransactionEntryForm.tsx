import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Alert,
  Collapse,
  Container,
  Paper,
  Divider,
  Snackbar,
} from '@mui/material';
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

import { createClient } from '@supabase/supabase-js';

import { 
  transactionFormSchema, 
  createDefaultFormData,
  createDefaultLine,
  type TransactionFormData 
} from '../../schemas/transactionSchema';
import DraggablePanelContainer from '../Common/DraggablePanelContainer';
import FormLayoutSettings, { type FormFieldConfig } from './FormLayoutSettings';
import TotalsFooter from './TotalsFooter';
import type { Account, Project } from '../../services/transactions';
import type { Organization } from '../../types';
import type { TransactionClassification } from '../../services/transaction-classification';
import type { ExpensesCategoryRow } from '../../types/sub-tree';
import type { WorkItemRow } from '../../types/work-items';
import './TransactionEntryForm.css';

interface TransactionEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  projects: Project[];
  organizations: Organization[];
  classifications: TransactionClassification[];
  categories: ExpensesCategoryRow[];
  workItems: WorkItemRow[];
  costCenters: Array<{ 
    id: string; 
    code: string; 
    name: string; 
    name_ar?: string | null; 
    project_id?: string | null; 
    level: number 
  }>;
}

/**
 * Default field configuration for header fields
 */
const createDefaultFieldConfigs = (): FormFieldConfig[] => [
  { id: 'entry_date', label: 'تاريخ القيد', isVisible: true, isFullWidth: false, order: 0, required: true },
  { id: 'org_id', label: 'المؤسسة', isVisible: true, isFullWidth: false, order: 1, required: true },
  { id: 'description', label: 'وصف المعاملة', isVisible: true, isFullWidth: true, order: 2, required: true },
  { id: 'project_id', label: 'المشروع', isVisible: true, isFullWidth: false, order: 3, required: false },
  { id: 'classification_id', label: 'تصنيف المعاملة', isVisible: true, isFullWidth: false, order: 4, required: false },
  { id: 'reference_number', label: 'الرقم المرجعي', isVisible: true, isFullWidth: false, order: 5, required: false },
  { id: 'default_cost_center_id', label: 'مركز التكلفة (افتراضي)', isVisible: true, isFullWidth: false, order: 6, required: false },
  { id: 'default_work_item_id', label: 'عنصر العمل (افتراضي)', isVisible: true, isFullWidth: false, order: 7, required: false },
  { id: 'default_sub_tree_id', label: 'الشجرة الفرعية (افتراضي)', isVisible: true, isFullWidth: false, order: 8, required: false },
  { id: 'description_ar', label: 'وصف المعاملة بالعربي', isVisible: false, isFullWidth: true, order: 9, required: false },
  { id: 'notes', label: 'ملاحظات', isVisible: true, isFullWidth: true, order: 10, required: false },
  { id: 'notes_ar', label: 'ملاحظات بالعربي', isVisible: false, isFullWidth: true, order: 11, required: false },
];

const STORAGE_KEY_LAYOUT = 'transactionFormLayout';

const TransactionEntryForm: React.FC<TransactionEntryFormProps> = ({
  open,
  onClose,
  onSuccess,
  accounts,
  projects,
  organizations,
  classifications,
  categories,
  workItems,
  costCenters,
}) => {
  // Layout state
  const [fieldConfigs, setFieldConfigs] = useState<FormFieldConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
      return saved ? JSON.parse(saved) : createDefaultFieldConfigs();
    } catch {
      return createDefaultFieldConfigs();
    }
  });
  const [columnCount, setColumnCount] = useState<1 | 2 | 3>(2);
  const [layoutSettingsOpen, setLayoutSettingsOpen] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Track expanded lines (for collapsible details)
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  // Draggable panel state for settings
  const layoutPanelDefaults = useMemo(() => ({
    position: () => {
      if (typeof window === 'undefined') {
        return { x: 160, y: 120 };
      }
      return {
        x: window.innerWidth / 2 - 350,
        y: window.innerHeight / 2 - 300,
      };
    },
    size: () => ({ width: 700, height: 600 }),
    dockPosition: 'right' as const,
  }), []);

  // Get default org and project from localStorage
  const defaultOrgId = localStorage.getItem('default_org_id') || (organizations[0]?.id || '');
  const defaultProjectId = localStorage.getItem('default_project_id') || '';

  // react-hook-form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: createDefaultFormData({
      org_id: defaultOrgId,
      project_id: defaultProjectId || null,
    }),
    mode: 'onChange',
  });

  // useFieldArray for lines
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  // Watch lines and org_id for live updates
  const lines = watch('lines');
  const selectedOrgId = watch('org_id');

  // Calculate totals in real-time
  const totals = useMemo(() => {
    const totalDebits = lines.reduce((sum, line) => sum + (Number(line.debit_amount) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (Number(line.credit_amount) || 0), 0);
    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01;
    return { totalDebits, totalCredits, difference, isBalanced };
  }, [lines]);

  // Filter accounts - only postable
  const postableAccounts = useMemo(
    () => accounts.filter(a => a.is_postable).sort((x, y) => x.code.localeCompare(y.code)),
    [accounts]
  );

  // Filter projects by selected org
  const filteredProjects = useMemo(() => {
    if (!selectedOrgId) return projects;
    return projects.filter(p => p.org_id === selectedOrgId);
  }, [projects, selectedOrgId]);

  // Filter categories by selected org
  const filteredCategories = useMemo(() => {
    if (!selectedOrgId) return categories;
    return categories.filter(c => c.org_id === selectedOrgId);
  }, [categories, selectedOrgId]);

  // Get visible and sorted field configs
  const visibleFieldConfigs = useMemo(() => {
    return fieldConfigs
      .filter(config => config.isVisible)
      .sort((a, b) => a.order - b.order);
  }, [fieldConfigs]);

  // Handle layout save
  const handleSaveLayout = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(fieldConfigs));
      setSnackbar({ open: true, message: 'تم حفظ التخطيط بنجاح', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'فشل حفظ التخطيط', severity: 'error' });
    }
  }, [fieldConfigs]);

  // Handle layout reset
  const handleResetLayout = useCallback(() => {
    const defaults = createDefaultFieldConfigs();
    setFieldConfigs(defaults);
    setColumnCount(2);
    try {
      localStorage.removeItem(STORAGE_KEY_LAYOUT);
      setSnackbar({ open: true, message: 'تم إعادة تعيين التخطيط', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'فشل إعادة تعيين التخطيط', severity: 'error' });
    }
  }, []);

  // Add a new line
  const handleAddLine = useCallback(() => {
    const newLineNo = fields.length + 1;
    const headerDefaults = watch();
    append(createDefaultLine(newLineNo, {
      org_id: headerDefaults.org_id,
      project_id: headerDefaults.project_id || undefined,
      cost_center_id: headerDefaults.default_cost_center_id || undefined,
      work_item_id: headerDefaults.default_work_item_id || undefined,
      sub_tree_id: headerDefaults.default_sub_tree_id || undefined,
      classification_id: headerDefaults.classification_id || undefined,
    }));
  }, [fields.length, append, watch]);

  // Remove a line
  const handleRemoveLine = useCallback((index: number) => {
    if (fields.length <= 1) return;
    remove(index);
  }, [fields.length, remove]);

  // Form submission
  const onSubmit = useCallback(async (values: TransactionFormData) => {
    try {
      setIsSubmitting(true);
      // Get Supabase client (adjust based on your setup)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Prepare header and lines data
      const { lines, default_cost_center_id, default_work_item_id, default_sub_tree_id, ...headerData } = values;

      // Call RPC function
      const { error } = await supabase.rpc('create_transaction_with_lines', {
        header_data: headerData,
        lines_data: lines,
      });

      if (error) throw error;

      setSnackbar({ open: true, message: 'تم حفظ المعاملة بنجاح ✅', severity: 'success' });
      
      // Reset form
      reset(createDefaultFormData({
        org_id: defaultOrgId,
        project_id: defaultProjectId || null,
      }));
      
      // Notify parent
      onSuccess();
      
      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Transaction submission error:', error);
      setSnackbar({ 
        open: true, 
        message: `فشل حفظ المعاملة: ${error.message || 'خطأ غير معروف'}`, 
        severity: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [defaultOrgId, defaultProjectId, onClose, onSuccess, reset, setSnackbar]);

  // Toggle line expansion
  const toggleLineExpansion = useCallback((index: number) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting && totals.isBalanced) {
          handleSubmit(onSubmit)();
        }
      }
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, isSubmitting, totals.isBalanced, handleSubmit, onSubmit, onClose]);

  // Render a single header field
  const renderHeaderField = (config: FormFieldConfig) => {
    const fieldError = errors[config.id as keyof TransactionFormData];
    const errorMessage = fieldError?.message as string | undefined;

    switch (config.id) {
      case 'entry_date':
        return (
          <Controller
            name="entry_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="date"
                label={config.label}
                required={config.required}
                error={!!errorMessage}
                helperText={errorMessage || 'تاريخ إجراء المعاملة'}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          />
        );

      case 'org_id':
        return (
          <Controller
            name="org_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth required error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} label={config.label}>
                  <MenuItem value="">اختر المؤسسة...</MenuItem>
                  {organizations.map(org => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.code} - {org.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage || 'المؤسسة المسؤولة عن هذه المعاملة'}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'description':
      case 'description_ar':
        return (
          <Controller
            name={config.id as 'description' | 'description_ar'}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                label={config.label}
                required={config.required}
                error={!!errorMessage}
                helperText={errorMessage || 'وصف واضح وموجز لطبيعة المعاملة'}
                fullWidth
                multiline
                rows={2}
              />
            )}
          />
        );

      case 'project_id':
        return (
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} value={field.value || ''} label={config.label} disabled={!selectedOrgId}>
                  <MenuItem value="">بدون مشروع</MenuItem>
                  {filteredProjects.map(proj => (
                    <MenuItem key={proj.id} value={proj.id}>
                      {proj.code} - {proj.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage || 'المشروع المرتبط بالمعاملة (اختياري)'}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'classification_id':
        return (
          <Controller
            name="classification_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} value={field.value || ''} label={config.label}>
                  <MenuItem value="">بدون تصنيف</MenuItem>
                  {classifications.map(cls => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage || 'يساعد في تصنيف المعاملة (اختياري)'}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'reference_number':
        return (
          <Controller
            name="reference_number"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                label={config.label}
                error={!!errorMessage}
                helperText={errorMessage || 'رقم الفاتورة أو المرجع الخارجي'}
                fullWidth
              />
            )}
          />
        );

      case 'default_cost_center_id':
        return (
          <Controller
            name="default_cost_center_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} value={field.value || ''} label={config.label}>
                  <MenuItem value="">— بدون —</MenuItem>
                  {costCenters.map(cc => (
                    <MenuItem key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'default_work_item_id':
        return (
          <Controller
            name="default_work_item_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} value={field.value || ''} label={config.label}>
                  <MenuItem value="">— بدون —</MenuItem>
                  {workItems.map(wi => (
                    <MenuItem key={wi.id} value={wi.id}>
                      {wi.code} - {wi.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'default_sub_tree_id':
        return (
          <Controller
            name="default_sub_tree_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errorMessage}>
                <InputLabel>{config.label}</InputLabel>
                <Select {...field} value={field.value || ''} label={config.label}>
                  <MenuItem value="">— بدون —</MenuItem>
                  {filteredCategories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.description}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errorMessage}</FormHelperText>
              </FormControl>
            )}
          />
        );

      case 'notes':
      case 'notes_ar':
        return (
          <Controller
            name={config.id as 'notes' | 'notes_ar'}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                label={config.label}
                error={!!errorMessage}
                helperText={errorMessage || 'ملاحظات داخلية (اختياري)'}
                fullWidth
                multiline
                rows={3}
              />
            )}
          />
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
        onClick={onClose}
      >
        <Container
          maxWidth="xl"
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'relative',
            my: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 0,
            pb: '120px', // Space for sticky footer
            maxHeight: 'calc(100vh - 64px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          dir="rtl"
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: 2,
              borderColor: 'primary.main',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              معاملة جديدة
            </Typography>
            <Tooltip title="إعدادات التخطيط">
              <IconButton onClick={() => setLayoutSettingsOpen(true)} sx={{ color: 'inherit' }}>
                <Settings size={24} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ p: 3 }}>
              {/* Header Section */}
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                  معلومات المعاملة
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                    gap: 2,
                  }}
                >
                  {visibleFieldConfigs.map(config => (
                    <Box
                      key={config.id}
                      sx={{
                        gridColumn: config.isFullWidth ? '1 / -1' : 'auto',
                      }}
                    >
                      {renderHeaderField(config)}
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Lines Section */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    القيود التفصيلية ({fields.length} سطر)
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={handleAddLine}
                    size="small"
                  >
                    إضافة سطر
                  </Button>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Lines - Compact Single Row Layout */}
                <div className="tx-lines-grid">
                  {fields.map((field, index) => {
                    const isExpanded = expandedLines.has(index);
                    const lineHasError = !!errors.lines?.[index];
                    
                    return (
                      <div 
                        key={field.id} 
                        className={`tx-line-row ${lineHasError ? 'has-error' : ''}`}
                      >
                        {/* Main Row - Always Visible */}
                        <div className="tx-line-main">
                          {/* Line Number Badge */}
                          <div className="tx-line-number">
                            {index + 1}
                          </div>

                          {/* Account */}
                          <div className="tx-line-field account">
                            <Controller
                              name={`lines.${index}.account_id`}
                              control={control}
                              render={({ field }) => (
                                <FormControl 
                                  fullWidth 
                                  size="small" 
                                  error={!!errors.lines?.[index]?.account_id}
                                >
                                  <InputLabel>الحساب *</InputLabel>
                                  <Select {...field} label="الحساب *">
                                    <MenuItem value="">اختر الحساب...</MenuItem>
                                    {postableAccounts.map(acc => (
                                      <MenuItem key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                  {errors.lines?.[index]?.account_id && (
                                    <FormHelperText>
                                      {errors.lines[index]?.account_id?.message}
                                    </FormHelperText>
                                  )}
                                </FormControl>
                              )}
                            />
                          </div>

                          {/* Description */}
                          <div className="tx-line-field description">
                            <Controller
                              name={`lines.${index}.description`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  size="small"
                                  label="البيان"
                                  fullWidth
                                />
                              )}
                            />
                          </div>

                          {/* Debit Amount */}
                          <div className="tx-line-field amount">
                            <Controller
                              name={`lines.${index}.debit_amount`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  label="مدين"
                                  fullWidth
                                  inputProps={{ step: 0.01, min: 0 }}
                                  error={!!errors.lines?.[index]?.debit_amount}
                                  onChange={(e) => {
                                    const value = Number(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.credit_amount`, 0);
                                    }
                                  }}
                                />
                              )}
                            />
                          </div>

                          {/* Credit Amount */}
                          <div className="tx-line-field amount">
                            <Controller
                              name={`lines.${index}.credit_amount`}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  {...field}
                                  type="number"
                                  size="small"
                                  label="دائن"
                                  fullWidth
                                  inputProps={{ step: 0.01, min: 0 }}
                                  error={!!errors.lines?.[index]?.credit_amount}
                                  onChange={(e) => {
                                    const value = Number(e.target.value) || 0;
                                    field.onChange(value);
                                    if (value > 0) {
                                      setValue(`lines.${index}.debit_amount`, 0);
                                    }
                                  }}
                                />
                              )}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="tx-line-actions">
                            {/* Expand/Collapse Button */}
                            <Tooltip title={isExpanded ? 'إخفاء التفاصيل' : 'إظهار التفاصيل'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleLineExpansion(index)}
                                className={`tx-expand-btn ${isExpanded ? 'expanded' : ''}`}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </IconButton>
                            </Tooltip>

                            {/* Delete Button */}
                            <Tooltip title="حذف السطر">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveLine(index)}
                                  disabled={fields.length <= 1}
                                  color="error"
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Expandable Details Row */}
                        <Collapse in={isExpanded}>
                          <div className="tx-line-details">
                            <div className="tx-line-details-grid">
                              {/* Project */}
                              <Controller
                                name={`lines.${index}.project_id`}
                                control={control}
                                render={({ field }) => (
                                  <FormControl size="small" fullWidth>
                                    <InputLabel>المشروع</InputLabel>
                                    <Select {...field} value={field.value || ''} label="المشروع">
                                      <MenuItem value="">بدون مشروع</MenuItem>
                                      {filteredProjects.map(proj => (
                                        <MenuItem key={proj.id} value={proj.id}>
                                          {proj.code} - {proj.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />

                              {/* Cost Center */}
                              <Controller
                                name={`lines.${index}.cost_center_id`}
                                control={control}
                                render={({ field }) => (
                                  <FormControl size="small" fullWidth>
                                    <InputLabel>مركز التكلفة</InputLabel>
                                    <Select {...field} value={field.value || ''} label="مركز التكلفة">
                                      <MenuItem value="">بدون</MenuItem>
                                      {costCenters.map(cc => (
                                        <MenuItem key={cc.id} value={cc.id}>
                                          {cc.code} - {cc.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />

                              {/* Work Item */}
                              <Controller
                                name={`lines.${index}.work_item_id`}
                                control={control}
                                render={({ field }) => (
                                  <FormControl size="small" fullWidth>
                                    <InputLabel>عنصر العمل</InputLabel>
                                    <Select {...field} value={field.value || ''} label="عنصر العمل">
                                      <MenuItem value="">بدون</MenuItem>
                                      {workItems.map(wi => (
                                        <MenuItem key={wi.id} value={wi.id}>
                                          {wi.code} - {wi.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />

                              {/* Classification */}
                              <Controller
                                name={`lines.${index}.classification_id`}
                                control={control}
                                render={({ field }) => (
                                  <FormControl size="small" fullWidth>
                                    <InputLabel>تصنيف</InputLabel>
                                    <Select {...field} value={field.value || ''} label="تصنيف">
                                      <MenuItem value="">بدون</MenuItem>
                                      {classifications.map(cls => (
                                        <MenuItem key={cls.id} value={cls.id}>
                                          {cls.code} - {cls.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />

                              {/* Sub Tree */}
                              <Controller
                                name={`lines.${index}.sub_tree_id`}
                                control={control}
                                render={({ field }) => (
                                  <FormControl size="small" fullWidth>
                                    <InputLabel>الشجرة الفرعية</InputLabel>
                                    <Select {...field} value={field.value || ''} label="الشجرة الفرعية">
                                      <MenuItem value="">بدون</MenuItem>
                                      {filteredCategories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id}>
                                          {cat.code} - {cat.description}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              />
                            </div>
                          </div>
                        </Collapse>

                        {/* Line Error Alert */}
                        {lineHasError && (
                          <Box sx={{ px: 2, pb: 2 }}>
                            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
                              {errors.lines?.[index]?.message || 'خطأ في هذا السطر'}
                            </Alert>
                          </Box>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Global lines error */}
                {errors.lines && !Array.isArray(errors.lines) && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {errors.lines.message}
                  </Alert>
                )}
              </Paper>
            </Box>
          </form>
          
          {/* Sticky Footer - Fixed at bottom of modal */}
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <TotalsFooter
              totalDebits={totals.totalDebits}
              totalCredits={totals.totalCredits}
              difference={totals.difference}
              isBalanced={totals.isBalanced}
              linesCount={fields.length}
              onSave={handleSubmit(onSubmit)}
              onCancel={onClose}
              isSubmitting={isSubmitting}
              isSaveDisabled={!totals.isBalanced || Object.keys(errors).length > 0}
            />
          </Box>
        </Container>
      </Box>

      {/* Layout Settings - Draggable Resizable Panel */}
      <DraggablePanelContainer
        storageKey="transactionFormLayoutPanel"
        isOpen={layoutSettingsOpen}
        onClose={() => setLayoutSettingsOpen(false)}
        title="إعدادات تخطيط النموذج"
        subtitle="تخصيص الحقول والأعمدة"
        defaults={layoutPanelDefaults}
      >
        <FormLayoutSettings
          open={layoutSettingsOpen}
          onClose={() => setLayoutSettingsOpen(false)}
          fieldConfigs={fieldConfigs}
          onFieldConfigsChange={setFieldConfigs}
          columnCount={columnCount}
          onColumnCountChange={setColumnCount}
          onSave={handleSaveLayout}
          onReset={handleResetLayout}
        />
      </DraggablePanelContainer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TransactionEntryForm;
