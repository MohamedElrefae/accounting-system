import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Autocomplete,
  Checkbox,
  ListItemButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FilterIcon from '@mui/icons-material/FilterAlt';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { FilterBuilderProps, ReportFilter } from '../../types/reports';
import { supabase } from '../../utils/supabase';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

const operatorLabels: Record<string, string> = {
  eq: 'يساوي',
  neq: 'لا يساوي',
  gt: 'أكبر من',
  gte: 'أكبر من أو يساوي',
  lt: 'أصغر من',
  lte: 'أصغر من أو يساوي',
  like: 'يحتوي على',
  ilike: 'يحتوي على (غير حساس للحالة)',
  in: 'ضمن القائمة',
  not_in: 'ليس ضمن القائمة',
  is_null: 'فارغ',
  not_null: 'غير فارغ',
};

const getOperatorsByFieldType = (fieldType: string): string[] => {
  switch (fieldType) {
    case 'number':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is_null', 'not_null'];
    case 'date':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null', 'not_null'];
    case 'boolean':
      return ['eq', 'neq', 'is_null', 'not_null'];
    default:
      return ['eq', 'neq', 'like', 'ilike', 'in', 'not_in', 'is_null', 'not_null'];
  }
};

interface FilterBuilderPropsExtended extends FilterBuilderProps {
  datasetTableName?: string;
}

const FilterBuilder: React.FC<FilterBuilderPropsExtended> = ({
  availableFields,
  filters,
  onFiltersChange,
  disabled = false,
  datasetTableName,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentFilter, setCurrentFilter] = useState<Partial<ReportFilter>>({
    field: '',
    operator: 'eq',
    value: '',
  });
  const [fieldValues, setFieldValues] = useState<Record<string, string[]>>({});
  const [loadingValues, setLoadingValues] = useState(false);
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]);

  const filterableFields = availableFields.filter(field => field.filterable);

  // Fetch distinct values for a field from the database
  const fetchFieldValues = useCallback(async (fieldName: string, tableName?: string) => {
    if (!tableName || !fieldName) return;
    
    // Check cache first
    if (fieldValues[fieldName]) return;
    
    setLoadingValues(true);
    try {
      const cleanTableName = tableName.replace(/^public\./, '');
      
      // Query distinct values (limit to 100 for performance)
      const { data, error } = await supabase
        .from(cleanTableName)
        .select(fieldName)
        .not(fieldName, 'is', null)
        .limit(100);
      
      if (error) {
        console.error('Error fetching field values:', error);
        return;
      }
      
      // Extract unique values
      const uniqueValues = [...new Set(
        (data as Array<Record<string, unknown>>)
          ?.map((row) => String(row[fieldName]))
          .filter(v => v && v !== 'null' && v !== 'undefined')
      )].sort();
      
      setFieldValues(prev => ({
        ...prev,
        [fieldName]: uniqueValues
      }));
    } catch (err) {
      console.error('Error fetching field values:', err);
    } finally {
      setLoadingValues(false);
    }
  }, [fieldValues]);

  // Fetch values when field changes
  useEffect(() => {
    if (currentFilter.field && datasetTableName) {
      fetchFieldValues(currentFilter.field, datasetTableName);
    }
  }, [currentFilter.field, datasetTableName, fetchFieldValues]);

  const handleAddFilter = () => {
    setEditingIndex(null);
    setCurrentFilter({
      field: '',
      operator: 'eq',
      value: '',
    });
    setSelectedMultiValues([]);
    setDialogOpen(true);
  };

  const handleEditFilter = (index: number) => {
    setEditingIndex(index);
    const filter = filters[index];
    setCurrentFilter(filter);
    
    // Handle multi-select values
    if (['in', 'not_in'].includes(filter.operator)) {
      const values = typeof filter.value === 'string' 
        ? filter.value.split(',').map(v => v.trim())
        : Array.isArray(filter.value) ? filter.value : [];
      setSelectedMultiValues(values);
    } else {
      setSelectedMultiValues([]);
    }
    setDialogOpen(true);
  };

  const handleDeleteFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
  };

  const handleSaveFilter = () => {
    if (!currentFilter.field || !currentFilter.operator) return;

    // Get value based on operator type
    let filterValue = currentFilter.value;
    if (['in', 'not_in'].includes(currentFilter.operator)) {
      filterValue = selectedMultiValues.join(',');
    }

    // Validate value for operators that require it
    if (!['is_null', 'not_null'].includes(currentFilter.operator) && !filterValue) {
      return;
    }

    const field = availableFields.find(f => f.name === currentFilter.field);
    const newFilter: ReportFilter = {
      field: currentFilter.field,
      operator: currentFilter.operator as ReportFilter['operator'],
      value: filterValue,
      label: field?.label,
    };

    let newFilters: ReportFilter[];
    if (editingIndex !== null) {
      newFilters = [...filters];
      newFilters[editingIndex] = newFilter;
    } else {
      newFilters = [...filters, newFilter];
    }

    onFiltersChange(newFilters);
    setDialogOpen(false);
  };

  const getFieldType = (fieldName: string): string => {
    const field = availableFields.find(f => f.name === fieldName);
    return field?.type || 'text';
  };

  const renderValueInput = () => {
    if (['is_null', 'not_null'].includes(currentFilter.operator || '')) {
      return null;
    }

    const fieldType = getFieldType(currentFilter.field || '');
    const fieldName = currentFilter.field || '';
    const availableValues = fieldValues[fieldName] || [];
    const hasDropdownValues = availableValues.length > 0;

    // Multi-select for 'in' and 'not_in' operators
    if (['in', 'not_in'].includes(currentFilter.operator || '')) {
      if (loadingValues) {
        return (
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography variant="body2">جاري تحميل القيم...</Typography>
          </Box>
        );
      }

      if (hasDropdownValues) {
        return (
          <Autocomplete
            multiple
            options={availableValues}
            disableCloseOnSelect
            value={selectedMultiValues}
            onChange={(_, newValue) => setSelectedMultiValues(newValue)}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox
                  icon={icon}
                  checkedIcon={checkedIcon}
                  style={{ marginRight: 8 }}
                  checked={selected}
                />
                {option}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="اختر القيم"
                placeholder="ابحث واختر..."
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
          />
        );
      }

      return (
        <TextField
          fullWidth
          label="القيم (مفصولة بفواصل)"
          placeholder="قيمة1, قيمة2, قيمة3"
          value={selectedMultiValues.join(', ')}
          onChange={(e) => setSelectedMultiValues(e.target.value.split(',').map(v => v.trim()))}
          helperText="أدخل القيم مفصولة بفواصل"
        />
      );
    }

    // Date picker
    if (fieldType === 'date') {
      return (
        <TextField
          fullWidth
          label="التاريخ"
          type="date"
          value={currentFilter.value || ''}
          onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
          InputLabelProps={{
            shrink: true,
          }}
        />
      );
    }

    // Number input
    if (fieldType === 'number') {
      return (
        <TextField
          fullWidth
          label="القيمة الرقمية"
          type="number"
          value={currentFilter.value || ''}
          onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
        />
      );
    }

    // Boolean dropdown
    if (fieldType === 'boolean') {
      return (
        <FormControl fullWidth>
          <InputLabel>القيمة</InputLabel>
          <Select
            value={currentFilter.value || ''}
            onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
            label="القيمة"
          >
            <MenuItem value="true">نعم</MenuItem>
            <MenuItem value="false">لا</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Text field with dropdown if values available
    if (loadingValues) {
      return (
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={20} />
          <Typography variant="body2">جاري تحميل القيم...</Typography>
        </Box>
      );
    }

    if (hasDropdownValues) {
      return (
        <Autocomplete
          freeSolo
          options={availableValues}
          value={currentFilter.value || ''}
          onChange={(_, newValue) => setCurrentFilter(prev => ({ ...prev, value: newValue || '' }))}
          onInputChange={(_, newValue) => setCurrentFilter(prev => ({ ...prev, value: newValue }))}
          renderInput={(params) => (
            <TextField
              {...params}
              label="اختر أو أدخل قيمة"
              placeholder="ابحث أو اكتب..."
            />
          )}
          renderOption={(props, option) => (
            <ListItemButton {...props} component="li">
              <ListItemText primary={option} />
            </ListItemButton>
          )}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label="القيمة النصية"
        value={currentFilter.value || ''}
        onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
      />
    );
  };

  if (filterableFields.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          إعداد المرشحات
        </Typography>
        <Alert severity="info">
          لا توجد حقول قابلة للتصفية في مصدر البيانات المحدد.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        إعداد المرشحات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        أضف مرشحات لتحديد البيانات المطلوبة (اختياري)
      </Typography>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">
            المرشحات النشطة ({filters.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddFilter}
            disabled={disabled}
            variant="outlined"
            size="small"
          >
            إضافة مرشح
          </Button>
        </Box>

        {filters.length === 0 ? (
          <Alert severity="info" icon={<FilterIcon />}>
            لم يتم إضافة أي مرشحات بعد. سيتم عرض جميع البيانات المتاحة.
          </Alert>
        ) : (
          <List>
            {filters.map((filter, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={filter.label || filter.field}
                        variant="outlined"
                        color="primary"
                      />
                      <Chip
                        size="small"
                        label={operatorLabels[filter.operator]}
                        variant="filled"
                        color="secondary"
                      />
                      {!['is_null', 'not_null'].includes(filter.operator) && (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {String(filter.value).length > 30 
                            ? String(filter.value).substring(0, 30) + '...'
                            : filter.value}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleEditFilter(index)}
                    disabled={disabled}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteFilter(index)}
                    disabled={disabled}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Add/Edit Filter Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'تعديل المرشح' : 'إضافة مرشح جديد'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>الحقل</InputLabel>
              <Select
                value={currentFilter.field || ''}
                onChange={(e) => {
                  setCurrentFilter(prev => ({
                    ...prev,
                    field: e.target.value,
                    operator: 'eq',
                    value: '',
                  }));
                  setSelectedMultiValues([]);
                }}
                label="الحقل"
              >
                {filterableFields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    <Box display="flex" justifyContent="space-between" width="100%">
                      <span>{field.label}</span>
                      <Chip size="small" label={field.type} variant="outlined" sx={{ ml: 1 }} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {currentFilter.field && (
              <FormControl fullWidth>
                <InputLabel>نوع المرشح</InputLabel>
                <Select
                  value={currentFilter.operator || 'eq'}
                  onChange={(e) => {
                    setCurrentFilter(prev => ({ 
                      ...prev, 
                      operator: e.target.value as ReportFilter['operator'],
                      value: '',
                    }));
                    setSelectedMultiValues([]);
                  }}
                  label="نوع المرشح"
                >
                  {getOperatorsByFieldType(getFieldType(currentFilter.field)).map((op) => (
                    <MenuItem key={op} value={op}>
                      {operatorLabels[op]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {currentFilter.field && currentFilter.operator && renderValueInput()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveFilter}
            variant="contained"
            disabled={
              !currentFilter.field ||
              !currentFilter.operator ||
              (!['is_null', 'not_null'].includes(currentFilter.operator) && 
               !currentFilter.value && 
               selectedMultiValues.length === 0)
            }
          >
            {editingIndex !== null ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilterBuilder;
