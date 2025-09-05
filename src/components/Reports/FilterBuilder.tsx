import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import type { FilterBuilderProps, ReportFilter } from '../../types/reports';

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
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null', 'not_null'];
    case 'date':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null', 'not_null'];
    case 'boolean':
      return ['eq', 'neq', 'is_null', 'not_null'];
    default:
      return ['eq', 'neq', 'like', 'ilike', 'in', 'not_in', 'is_null', 'not_null'];
  }
};

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  availableFields,
  filters,
  onFiltersChange,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentFilter, setCurrentFilter] = useState<Partial<ReportFilter>>({
    field: '',
    operator: 'eq',
    value: '',
  });

  const filterableFields = availableFields.filter(field => field.filterable);

  const handleAddFilter = () => {
    setEditingIndex(null);
    setCurrentFilter({
      field: '',
      operator: 'eq',
      value: '',
    });
    setDialogOpen(true);
  };

  const handleEditFilter = (index: number) => {
    setEditingIndex(index);
    setCurrentFilter(filters[index]);
    setDialogOpen(true);
  };

  const handleDeleteFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
  };

  const handleSaveFilter = () => {
    if (!currentFilter.field || !currentFilter.operator) return;

    // Validate value for operators that require it
    if (!['is_null', 'not_null'].includes(currentFilter.operator) && !currentFilter.value) {
      return;
    }

    const field = availableFields.find(f => f.name === currentFilter.field);
    const newFilter: ReportFilter = {
      field: currentFilter.field,
      operator: currentFilter.operator as ReportFilter['operator'],
      value: currentFilter.value,
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

    if (['in', 'not_in'].includes(currentFilter.operator || '')) {
      return (
        <TextField
          fullWidth
          label="القيم (مفصولة بفواصل)"
          placeholder="قيمة1, قيمة2, قيمة3"
          value={currentFilter.value || ''}
          onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
          helperText="أدخل القيم مفصولة بفواصل"
        />
      );
    }

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

    return (
      <TextField
        fullWidth
        label="القيمة النصية"
        value={currentFilter.value || ''}
        onChange={(e) => setCurrentFilter(prev => ({ ...prev, value: e.target.value }))}
      />
    );
  };

  const getFilterDescription = (filter: ReportFilter): string => {
    const field = availableFields.find(f => f.name === filter.field);
    const fieldLabel = field?.label || filter.field;
    const operatorLabel = operatorLabels[filter.operator];
    
    if (['is_null', 'not_null'].includes(filter.operator)) {
      return `${fieldLabel} ${operatorLabel}`;
    }
    
    return `${fieldLabel} ${operatorLabel} ${filter.value}`;
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
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={filter.label || filter.field}
                        variant="outlined"
                        color="primary"
                      />
                      <Typography variant="body2">
                        {getFilterDescription(filter)}
                      </Typography>
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
                    operator: 'eq', // Reset operator when field changes
                    value: '', // Reset value when field changes
                  }));
                }}
                label="الحقل"
              >
                {filterableFields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    {field.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {currentFilter.field && (
              <FormControl fullWidth>
                <InputLabel>نوع المرشح</InputLabel>
                <Select
                  value={currentFilter.operator || 'eq'}
                  onChange={(e) => setCurrentFilter(prev => ({ 
                    ...prev, 
                    operator: e.target.value as ReportFilter['operator'],
                    value: '', // Reset value when operator changes
                  }))}
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
              (!['is_null', 'not_null'].includes(currentFilter.operator) && !currentFilter.value)
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
