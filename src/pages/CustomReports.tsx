import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import Grid from '@mui/material/Unstable_Grid2';
import PlayIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableIcon from '@mui/icons-material/TableChart';
import { useToast } from '../contexts/ToastContext';
import { useReportPresets } from '../hooks/useReportPresets';
import { useUniversalReportSync } from '../hooks/useUniversalReportSync';
import {
  getReportDatasets,
  getDatasetFields,
  runCustomReport,
  previewReport,
  saveReportDefinition,
  getUserReportDefinitions,
  exportToCSV,
  validateReportDefinition,
  type ReportDataset,
  type ReportDefinition,
  type SaveReportDefinitionParams,
} from '../services/reports';
import type {
  ReportBuilderState,
  ReportFilter,
  ReportSort,
  ReportGroupBy,
} from '../types/reports';
import DatasetSelector from '../components/Reports/DatasetSelector';
import FieldSelector from '../components/Reports/FieldSelector';
import FilterBuilder from '../components/Reports/FilterBuilder';
import SortBuilder from '../components/Reports/SortBuilder';
import GroupByBuilder from '../components/Reports/GroupByBuilder';
import ReportPreview from '../components/Reports/ReportPreview';
import ReportResults from '../components/Reports/ReportResults';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const REPORT_KEY = 'custom_reports_builder';

const CustomReports: React.FC = () => {
  const { showToast } = useToast();
  const canRead = true; // hasPermission('custom_reports.read');
  const canCreate = true; // hasPermission('custom_reports.create');
  const canExport = true; // hasPermission('custom_reports.export');

  // Report presets integration
  const presets = useReportPresets(REPORT_KEY);

  // Real-time sync setup
  useUniversalReportSync({
    reportId: REPORT_KEY,
    tablesToWatch: ['report_datasets', 'report_definitions', 'user_report_presets'],
    enableRealTime: true,
    enableUserPresence: false,
    onDataChange: () => {
      // Refresh datasets if they change
      loadDatasets();
    },
  });

  // UI State
  const [activeTab, setActiveTab] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data State
  const [datasets, setDatasets] = useState<ReportDataset[]>([]);
  const [, setSavedReports] = useState<ReportDefinition[]>([]);
  
  // Report Builder State
  const [builderState, setBuilderState] = useState<ReportBuilderState>({
    selectedDataset: null,
    availableFields: [],
    selectedFields: [],
    filters: [],
    sorts: [],
    groupBy: [],
    limit: 1000,
    previewData: null,
    isLoadingPreview: false,
    isExecuting: false,
    lastExecutionResult: null,
    error: null,
  });

  // Save Dialog State
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    is_public: false,
  });
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  const steps = [
    'اختيار مصدر البيانات', // Select Data Source
    'اختيار الحقول', // Select Fields
    'إعداد المرشحات', // Configure Filters
    'الترتيب والتجميع', // Sort & Group
    'معاينة النتائج', // Preview Results
  ];

  // Load initial data
  useEffect(() => {
    if (!canRead) return;
    loadDatasets();
    loadSavedReports();
    presets.loadPresetsAndApplyLast(applyPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const datasetsData = await getReportDatasets();
      setDatasets(datasetsData);
    } catch (error: any) {
      showToast(error.message || 'Failed to load datasets', { severity: 'error' });
      setBuilderState(prev => ({ ...prev, error: error.message || 'Failed to load datasets' }));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadSavedReports = useCallback(async () => {
    try {
      const reports = await getUserReportDefinitions();
      setSavedReports(reports);
    } catch (error: any) {
      console.error('Failed to load saved reports:', error);
    }
  }, []);

  const loadDatasetFields = useCallback(async (datasetId: string) => {
    try {
      const fields = await getDatasetFields(datasetId);
      setBuilderState(prev => ({
        ...prev,
        availableFields: fields,
        selectedFields: [], // Reset selected fields when dataset changes
        filters: [], // Reset filters when dataset changes
        sorts: [], // Reset sorts when dataset changes
        groupBy: [], // Reset group by when dataset changes
        previewData: null,
        error: null,
      }));
    } catch (error: any) {
      showToast(error.message || 'Failed to load dataset fields', { severity: 'error' });
      setBuilderState(prev => ({ ...prev, error: error.message || 'Failed to load dataset fields' }));
    }
  }, [showToast]);

  const handleDatasetSelect = useCallback((dataset: ReportDataset | null) => {
    setBuilderState(prev => ({ ...prev, selectedDataset: dataset }));
    if (dataset) {
      loadDatasetFields(dataset.id);
      setActiveStep(1); // Move to field selection
    } else {
      setBuilderState(prev => ({
        ...prev,
        availableFields: [],
        selectedFields: [],
        filters: [],
        sorts: [],
        groupBy: [],
        previewData: null,
        error: null,
      }));
      setActiveStep(0);
    }
  }, [loadDatasetFields]);

  const handleFieldsChange = useCallback((fields: string[]) => {
    setBuilderState(prev => ({ ...prev, selectedFields: fields, previewData: null }));
    if (fields.length > 0 && activeStep < 2) {
      setActiveStep(2); // Move to filters
    }
  }, [activeStep]);

  const handleFiltersChange = useCallback((filters: ReportFilter[]) => {
    setBuilderState(prev => ({ ...prev, filters, previewData: null }));
  }, []);

  const handleSortsChange = useCallback((sorts: ReportSort[]) => {
    setBuilderState(prev => ({ ...prev, sorts, previewData: null }));
  }, []);

  const handleGroupByChange = useCallback((groupBy: ReportGroupBy[]) => {
    setBuilderState(prev => ({ ...prev, groupBy, previewData: null }));
  }, []);

  const handlePreviewReport = useCallback(async () => {
    if (!builderState.selectedDataset || builderState.selectedFields.length === 0) {
      showToast('Please select a dataset and at least one field', { severity: 'warning' });
      return;
    }

    try {
      setBuilderState(prev => ({ ...prev, isLoadingPreview: true, error: null }));
      
      const previewData = await previewReport({
        dataset_id: builderState.selectedDataset.id,
        selected_fields: builderState.selectedFields,
        filters: builderState.filters,
        sorts: builderState.sorts,
        group_by: builderState.groupBy,
        limit: 10,
      });

      setBuilderState(prev => ({ ...prev, previewData, isLoadingPreview: false }));
      if (activeStep < 4) {
        setActiveStep(4); // Move to preview step
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to preview report', { severity: 'error' });
      setBuilderState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to preview report',
        isLoadingPreview: false 
      }));
    }
  }, [builderState, showToast, activeStep]);

  const handleRunFullReport = useCallback(async () => {
    if (!builderState.selectedDataset || builderState.selectedFields.length === 0) {
      showToast('Please select a dataset and at least one field', { severity: 'warning' });
      return;
    }

    try {
      setBuilderState(prev => ({ ...prev, isExecuting: true, error: null }));
      
      const result = await runCustomReport({
        dataset_id: builderState.selectedDataset.id,
        selected_fields: builderState.selectedFields,
        filters: builderState.filters,
        sorts: builderState.sorts,
        group_by: builderState.groupBy,
        limit: builderState.limit,
      });

      setBuilderState(prev => ({ 
        ...prev, 
        lastExecutionResult: result, 
        isExecuting: false 
      }));
      
      setActiveTab(1); // Switch to Results tab
      showToast(`Report executed successfully: ${result.total_count} rows`, { severity: 'success' });
    } catch (error: any) {
      showToast(error.message || 'Failed to execute report', { severity: 'error' });
      setBuilderState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to execute report',
        isExecuting: false 
      }));
    }
  }, [builderState, showToast]);

  const handleExportReport = useCallback((format: 'csv' | 'xlsx' | 'pdf') => {
    if (!builderState.lastExecutionResult || builderState.lastExecutionResult.data.length === 0) {
      showToast('No data to export', { severity: 'warning' });
      return;
    }

    try {
      const reportName = builderState.selectedDataset?.name || 'custom_report';
      if (format === 'csv') {
        exportToCSV(builderState.lastExecutionResult, reportName);
        showToast('Report exported to CSV', { severity: 'success' });
      } else {
        showToast(`${format.toUpperCase()} export not implemented yet`, { severity: 'info' });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to export report', { severity: 'error' });
    }
  }, [builderState.lastExecutionResult, builderState.selectedDataset, showToast]);

  const handleSaveReport = useCallback(async () => {
    const definition: SaveReportDefinitionParams = {
      id: currentReportId || undefined,
      name: saveForm.name,
      description: saveForm.description,
      dataset_id: builderState.selectedDataset?.id || '',
      selected_fields: builderState.selectedFields,
      filters: builderState.filters,
      sorts: builderState.sorts,
      group_by: builderState.groupBy,
      limit: builderState.limit,
      is_public: saveForm.is_public,
    };

    const errors = validateReportDefinition(definition);
    if (errors.length > 0) {
      showToast(errors.join(', '), { severity: 'error' });
      return;
    }

    try {
      const saved = await saveReportDefinition(definition);
      setCurrentReportId(saved.id!);
      setSaveDialogOpen(false);
      loadSavedReports();
      showToast(`Report "${saved.name}" saved successfully`, { severity: 'success' });
    } catch (error: any) {
      showToast(error.message || 'Failed to save report', { severity: 'error' });
    }
  }, [saveForm, builderState, currentReportId, showToast, loadSavedReports]);

  const applyPreset = useCallback((preset: any) => {
    if (!preset.filters) return;
    
    try {
      // Find the dataset if specified in the preset
      if (preset.filters.dataset_id) {
        const dataset = datasets.find(d => d.id === preset.filters.dataset_id);
        if (dataset) {
          handleDatasetSelect(dataset);
        }
      }

      // Apply the preset filters to builder state
      setBuilderState(prev => ({
        ...prev,
        selectedFields: preset.filters.selected_fields || [],
        filters: preset.filters.filters || [],
        sorts: preset.filters.sorts || [],
        groupBy: preset.filters.group_by || [],
        limit: preset.filters.limit || 1000,
      }));
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  }, [datasets, handleDatasetSelect]);

  const saveCurrentAsPreset = useCallback(async () => {
    const presetData = {
      dataset_id: builderState.selectedDataset?.id,
      selected_fields: builderState.selectedFields,
      filters: builderState.filters,
      sorts: builderState.sorts,
      group_by: builderState.groupBy,
      limit: builderState.limit,
    };

    await presets.saveCurrentPreset({
      filters: presetData,
      columns: builderState.selectedFields,
    });
  }, [builderState, presets]);

  if (!canRead) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          ليس لديك صلاحية لعرض التقارير المخصصة
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              منشئ التقارير المخصصة
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              أنشئ تقاريرك المخصصة بسهولة ومرونة
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            {canCreate && (
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                disabled={!builderState.selectedDataset || builderState.selectedFields.length === 0}
              >
                حفظ التقرير
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadDatasets}
              disabled={loading}
            >
              تحديث
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Main Tabs */}
      <Paper elevation={1}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="إنشاء التقرير" icon={<DashboardIcon />} />
          <Tab label="النتائج" icon={<TableIcon />} disabled={!builderState.lastExecutionResult} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {/* Report Builder */}
          <Grid container spacing={3}>
            {/* Left Panel - Builder Steps */}
            <Grid xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 3 }}>
                {/* Progress Stepper */}
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {/* Step Content */}
                {activeStep === 0 && (
                  <DatasetSelector
                    datasets={datasets}
                    selectedDataset={builderState.selectedDataset}
                    onDatasetSelect={handleDatasetSelect}
                    loading={loading}
                  />
                )}

                {activeStep === 1 && (
                  <FieldSelector
                    availableFields={builderState.availableFields}
                    selectedFields={builderState.selectedFields}
                    onFieldsChange={handleFieldsChange}
                    disabled={!builderState.selectedDataset}
                  />
                )}

                {activeStep === 2 && (
                  <FilterBuilder
                    availableFields={builderState.availableFields}
                    filters={builderState.filters}
                    onFiltersChange={handleFiltersChange}
                    disabled={builderState.selectedFields.length === 0}
                  />
                )}

                {activeStep === 3 && (
                  <>
                    <SortBuilder
                      availableFields={builderState.availableFields}
                      sorts={builderState.sorts}
                      onSortsChange={handleSortsChange}
                      disabled={builderState.selectedFields.length === 0}
                    />
                    <Divider sx={{ my: 3 }} />
                    <GroupByBuilder
                      availableFields={builderState.availableFields}
                      groupBy={builderState.groupBy}
                      onGroupByChange={handleGroupByChange}
                      disabled={builderState.selectedFields.length === 0}
                    />
                  </>
                )}

                {activeStep === 4 && (
                  <ReportPreview
                    data={builderState.previewData}
                    loading={builderState.isLoadingPreview}
                    error={builderState.error}
                    onRefresh={handlePreviewReport}
                  />
                )}

                {/* Navigation Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep(prev => prev - 1)}
                  >
                    السابق
                  </Button>
                  <Box>
                    {activeStep < 4 ? (
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(prev => prev + 1)}
                        disabled={
                          (activeStep === 0 && !builderState.selectedDataset) ||
                          (activeStep === 1 && builderState.selectedFields.length === 0)
                        }
                      >
                        التالي
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayIcon />}
                        onClick={handleRunFullReport}
                        disabled={builderState.isExecuting || builderState.selectedFields.length === 0}
                      >
                        {builderState.isExecuting ? <CircularProgress size={20} /> : 'تشغيل التقرير'}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Right Panel - Quick Actions & Preview */}
            <Grid xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 24 }}>
                {/* Quick Actions */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      الإجراءات السريعة
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RefreshIcon />}
                        onClick={handlePreviewReport}
                        disabled={
                          !builderState.selectedDataset ||
                          builderState.selectedFields.length === 0 ||
                          builderState.isLoadingPreview
                        }
                      >
                        معاينة
                      </Button>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayIcon />}
                        onClick={handleRunFullReport}
                        disabled={
                          !builderState.selectedDataset ||
                          builderState.selectedFields.length === 0 ||
                          builderState.isExecuting
                        }
                      >
                        تشغيل كامل
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={saveCurrentAsPreset}
                        disabled={!builderState.selectedDataset || builderState.selectedFields.length === 0}
                      >
                        حفظ كنموذج
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Quick Summary */}
                {builderState.selectedDataset && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        ملخص التقرير
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        مصدر البيانات: {builderState.selectedDataset.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        الحقول المحددة: {builderState.selectedFields.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        المرشحات: {builderState.filters.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        الترتيب والتجميع: {builderState.sorts.length + builderState.groupBy.length}
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
<ReportResults
            data={builderState.lastExecutionResult}
            loading={builderState.isExecuting}
            error={builderState.error}
            onExport={canExport ? handleExportReport : undefined}
            onSave={canCreate ? () => setSaveDialogOpen(true) : undefined}
            dataset={builderState.selectedDataset}
            tableKey={builderState.selectedDataset ? `reports/custom/${builderState.selectedDataset.key || builderState.selectedDataset.id}` : undefined}
          />
        </TabPanel>
      </Paper>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حفظ التقرير</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="اسم التقرير"
            fullWidth
            variant="outlined"
            value={saveForm.name}
            onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="الوصف (اختياري)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={saveForm.description}
            onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={saveForm.is_public}
                onChange={(e) => setSaveForm(prev => ({ ...prev, is_public: e.target.checked }))}
              />
            }
            label="مشاركة مع المستخدمين الآخرين"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveReport} variant="contained" disabled={!saveForm.name.trim()}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomReports;
