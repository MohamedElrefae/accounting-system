import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Chip,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Collapse,
  Divider,
  Stack,
  MenuItem,
} from '@mui/material';
import ResizableTable from '../Common/ResizableTable';
import type { ColumnConfig as GridCol } from '../Common/ResizableTable';
import ColumnConfiguration from '../Common/ColumnConfiguration';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import { useAuth } from '../../hooks/useAuth';
import {
  SaveIcon,
  TableChartIcon as TableIcon,
  FilterListIcon,
  SortIcon,
  GroupWorkIcon,
  ClearIcon,
  BugReportIcon,
} from '../icons/SimpleIcons';
import type { ReportResultsProps } from '../../types/reports';
import ExportButtons from '../Common/ExportButtons';
import type { UniversalTableData } from '../../utils/UniversalExportManager';

// Types for filter, sort, and group
interface FilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface GroupConfig {
  field: string;
  aggregations: { field: string; type: 'sum' | 'count' | 'avg' | 'min' | 'max' }[];
}

const ReportResults: React.FC<ReportResultsProps> = ({
  data,
  loading = false,
  error = null,
  onExport: _onExport, // Legacy prop, now using ExportButtons
  onSave,
  dataset,
  tableKey,
}) => {
  const [configOpen, setConfigOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  // Filter, Sort, Group state
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [groupConfig, setGroupConfig] = useState<GroupConfig | null>(null);

  // Temp state for adding new filter
  const [newFilter, setNewFilter] = useState<FilterConfig>({ field: '', operator: 'contains', value: '' });
  
  // Build default columns from result metadata (memoized to avoid infinite loops)
  const defaults: GridCol[] = React.useMemo(() => (
    (data?.columns || []).map((c) => ({
      key: c.field,
      label: c.label || c.field,
      visible: true,
      width: 140,
      minWidth: 100,
      maxWidth: 420,
      resizable: true,
      sortable: true,
      type: (c.type as any) || 'text',
      frozen: ['entry_date','entry_number'].includes(c.field),
      pinPriority: ['entry_date','entry_number'].includes(c.field) ? (c.field === 'entry_date' ? 2 : 1) : 0,
    }))
  ), [data?.columns]);
  const prefKey = tableKey || `reports/custom/${dataset?.key || dataset?.id || 'unknown'}`;
  const { columns, handleColumnResize, handleColumnConfigChange, resetToDefaults } = useColumnPreferences({
    storageKey: prefKey,
    defaultColumns: defaults,
    userId: user?.id,
  });

  // Apply filters to data
  const applyFilters = (rows: any[]): any[] => {
    if (filters.length === 0) return rows;
    
    return rows.filter(row => {
      return filters.every(filter => {
        const value = row[filter.field];
        const filterValue = filter.value.toLowerCase();
        const cellValue = String(value ?? '').toLowerCase();
        
        switch (filter.operator) {
          case 'equals':
            return cellValue === filterValue;
          case 'contains':
            return cellValue.includes(filterValue);
          case 'startsWith':
            return cellValue.startsWith(filterValue);
          case 'endsWith':
            return cellValue.endsWith(filterValue);
          case 'gt':
            return Number(value) > Number(filter.value);
          case 'lt':
            return Number(value) < Number(filter.value);
          case 'gte':
            return Number(value) >= Number(filter.value);
          case 'lte':
            return Number(value) <= Number(filter.value);
          default:
            return true;
        }
      });
    });
  };

  // Apply sorting to data
  const applySort = (rows: any[]): any[] => {
    if (!sortConfig) return rows;
    
    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];
      
      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal), 'ar');
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Apply grouping to data
  const applyGrouping = (rows: any[]): any[] => {
    if (!groupConfig) return rows;
    
    const groups = new Map<string, any[]>();
    
    rows.forEach(row => {
      const key = String(row[groupConfig.field] ?? 'غير محدد');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });
    
    // Create grouped result with aggregations
    const result: any[] = [];
    groups.forEach((groupRows, groupKey) => {
      // Add group header row
      const groupRow: any = {
        _isGroupHeader: true,
        _groupKey: groupKey,
        _groupCount: groupRows.length,
        [groupConfig.field]: `📁 ${groupKey} (${groupRows.length})`,
      };
      
      // Calculate aggregations
      groupConfig.aggregations.forEach(agg => {
        const values = groupRows.map(r => Number(r[agg.field]) || 0);
        switch (agg.type) {
          case 'sum':
            groupRow[`${agg.field}_agg`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'count':
            groupRow[`${agg.field}_agg`] = values.length;
            break;
          case 'avg':
            groupRow[`${agg.field}_agg`] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            groupRow[`${agg.field}_agg`] = Math.min(...values);
            break;
          case 'max':
            groupRow[`${agg.field}_agg`] = Math.max(...values);
            break;
        }
      });
      
      result.push(groupRow);
      result.push(...groupRows);
    });
    
    return result;
  };

  // Process data through filter -> sort -> group pipeline
  const processedData = useMemo(() => {
    if (!data?.data) return [];
    let result = [...data.data];
    result = applyFilters(result);
    result = applySort(result);
    result = applyGrouping(result);
    return result;
  }, [data?.data, filters, sortConfig, groupConfig]);

  // Filter handlers
  const addFilter = () => {
    if (newFilter.field && newFilter.value) {
      setFilters([...filters, { ...newFilter }]);
      setNewFilter({ field: '', operator: 'contains', value: '' });
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setSortConfig(null);
    setGroupConfig(null);
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortConfig?.field === field) {
      setSortConfig(sortConfig.direction === 'asc' 
        ? { field, direction: 'desc' } 
        : null
      );
    } else {
      setSortConfig({ field, direction: 'asc' });
    }
  };

  // Group handler
  const handleGroup = (field: string) => {
    if (groupConfig?.field === field) {
      setGroupConfig(null);
    } else {
      setGroupConfig({ field, aggregations: [] });
    }
  };

  // Convert report data to UniversalTableData format for export
  const exportData: UniversalTableData = useMemo(() => {
    if (!data) return { columns: [], rows: [] };
    
    return {
      columns: data.columns.map(col => ({
        key: col.field,
        header: col.label || col.field,
        type: col.type as any || 'text',
        visible: true,
      })),
      rows: processedData,
      title: dataset?.name || 'تقرير مخصص',
      subtitle: `${processedData.length} صف - ${new Date().toLocaleDateString('ar-SA')}`,
    };
  }, [data, processedData, dataset]);

  const [debugMode, setDebugMode] = useState(false);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            جارٍ تشغيل التقرير...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Alert severity="error">
          حدث خطأ أثناء تشغيل التقرير: {error}
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          نتائج التقرير
        </Typography>
        <Alert severity="info" icon={<TableIcon />}>
          لم يتم تشغيل التقرير بعد. اذهب إلى تبويب "إنشاء التقرير" لتشغيل التقرير.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          نتائج التقرير
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {onSave && (
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={onSave}
            >
              حفظ التقرير
            </Button>
          )}
        </Box>
      </Box>

      {/* Universal Export Toolbar - Same as accounts-tree */}
      {data && data.data.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <ExportButtons
            data={exportData}
            config={{
              title: dataset?.name || 'تقرير مخصص',
            }}
            showAllFormats={true}
            showCustomizedPDF={true}
            showBatchExport={false}
            size="medium"
            layout="horizontal"
          />
          <Button
            size="small"
            variant={debugMode ? 'contained' : 'outlined'}
            color="warning"
            startIcon={<BugReportIcon />}
            onClick={() => setDebugMode(!debugMode)}
            sx={{ ml: 1 }}
          >
            Debug
          </Button>
        </Box>
      )}

      {/* Debug Info */}
      {debugMode && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Debug Info:</Typography>
          <Typography variant="body2">Dataset: {dataset?.name || 'N/A'} (ID: {dataset?.id || 'N/A'})</Typography>
          <Typography variant="body2">Table: {dataset?.table_name || 'N/A'}</Typography>
          <Typography variant="body2">Columns: {data?.columns?.length || 0}</Typography>
          <Typography variant="body2">Rows: {data?.data?.length || 0} (Processed: {processedData.length})</Typography>
          <Typography variant="body2">Execution Time: {data?.execution_time_ms || 0}ms</Typography>
          <Typography variant="body2">Export Data Columns: {exportData.columns.length}</Typography>
        </Paper>
      )}

      {/* Summary Info */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Chip size="medium" label={`${processedData.length.toLocaleString('ar-SA')} صف`} color="primary" />
        <Chip size="medium" label={`${data.columns.length} عمود`} color="secondary" />
        <Chip size="medium" label={`${data.execution_time_ms} مللي ثانية`} color="info" />
        <Button variant="outlined" onClick={() => setConfigOpen(true)}>إعداد الأعمدة</Button>
        <Button 
          variant={showFilters ? "contained" : "outlined"} 
          startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          تصفية وترتيب
        </Button>
        {(filters.length > 0 || sortConfig || groupConfig) && (
          <Button variant="text" color="error" startIcon={<ClearIcon />} onClick={clearAllFilters}>
            مسح الكل
          </Button>
        )}
      </Box>

      {/* Filter/Sort/Group Toolbar */}
      <Collapse in={showFilters}>
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Stack spacing={2}>
            {/* Add Filter Row */}
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <FilterListIcon color="action" />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>الحقل</InputLabel>
                <Select
                  value={newFilter.field}
                  label="الحقل"
                  onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
                >
                  {data.columns.map(col => (
                    <MenuItem key={col.field} value={col.field}>{col.label || col.field}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>العملية</InputLabel>
                <Select
                  value={newFilter.operator}
                  label="العملية"
                  onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as any })}
                >
                  <MenuItem value="contains">يحتوي</MenuItem>
                  <MenuItem value="equals">يساوي</MenuItem>
                  <MenuItem value="startsWith">يبدأ بـ</MenuItem>
                  <MenuItem value="endsWith">ينتهي بـ</MenuItem>
                  <MenuItem value="gt">أكبر من</MenuItem>
                  <MenuItem value="lt">أصغر من</MenuItem>
                  <MenuItem value="gte">أكبر أو يساوي</MenuItem>
                  <MenuItem value="lte">أصغر أو يساوي</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="القيمة"
                value={newFilter.value}
                onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                sx={{ minWidth: 150 }}
              />
              <Button variant="contained" size="small" onClick={addFilter} disabled={!newFilter.field || !newFilter.value}>
                إضافة فلتر
              </Button>
            </Box>

            {/* Active Filters */}
            {filters.length > 0 && (
              <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                <Typography variant="body2" color="text.secondary">الفلاتر النشطة:</Typography>
                {filters.map((filter, idx) => (
                  <Chip
                    key={idx}
                    label={`${filter.field} ${filter.operator} "${filter.value}"`}
                    onDelete={() => removeFilter(idx)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            <Divider />

            {/* Sort Row */}
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <SortIcon color="action" />
              <Typography variant="body2" color="text.secondary">ترتيب حسب:</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={sortConfig?.field || ''}
                  displayEmpty
                  onChange={(e) => e.target.value ? handleSort(e.target.value) : setSortConfig(null)}
                >
                  <MenuItem value="">بدون ترتيب</MenuItem>
                  {data.columns.map(col => (
                    <MenuItem key={col.field} value={col.field}>{col.label || col.field}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {sortConfig && (
                <Chip
                  label={sortConfig.direction === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
                  onClick={() => handleSort(sortConfig.field)}
                  size="small"
                  color="secondary"
                />
              )}
            </Box>

            <Divider />

            {/* Group Row */}
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <GroupWorkIcon color="action" />
              <Typography variant="body2" color="text.secondary">تجميع حسب:</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={groupConfig?.field || ''}
                  displayEmpty
                  onChange={(e) => e.target.value ? handleGroup(e.target.value) : setGroupConfig(null)}
                >
                  <MenuItem value="">بدون تجميع</MenuItem>
                  {data.columns.map(col => (
                    <MenuItem key={col.field} value={col.field}>{col.label || col.field}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {groupConfig && (
                <Chip
                  label={`مجمع حسب: ${groupConfig.field}`}
                  onDelete={() => setGroupConfig(null)}
                  size="small"
                  color="success"
                />
              )}
            </Box>
          </Stack>
        </Paper>
      </Collapse>

      {processedData.length === 0 ? (
        <Alert severity="warning">لا توجد نتائج تطابق الشروط المحددة</Alert>
      ) : (
        <Paper elevation={1} sx={{ p: 0 }}>
          {/* Make the grid area tall for full-page feel */}
          <Box sx={{ height: '70vh' }}>
            <ResizableTable
              columns={columns as GridCol[]}
              data={processedData}
              onColumnResize={handleColumnResize}
              className="wrap"
              headerHeight={48}
              rowHeight={44}
            />
          </Box>
        </Paper>
      )}

      <ColumnConfiguration
        columns={columns as GridCol[]}
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        onConfigChange={handleColumnConfigChange as any}
        onReset={resetToDefaults}
      />

      {data.total_count > 1000 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>تلميح:</strong> يحتوي التقرير على عدد كبير من النتائج. استخدم المرشحات لتقليل النتائج أو قم بالتصدير.
        </Alert>
      )}
    </Box>
  );
};

export default ReportResults;
