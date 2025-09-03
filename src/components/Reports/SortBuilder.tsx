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
  Sort as SortIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
} from '@mui/icons-material';
import type { SortBuilderProps, ReportSort } from '../../types/reports';

const SortBuilder: React.FC<SortBuilderProps> = ({
  availableFields,
  sorts,
  onSortsChange,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentSort, setCurrentSort] = useState<Partial<ReportSort>>({
    field: '',
    direction: 'asc',
  });

  const sortableFields = availableFields.filter(field => field.sortable);

  const handleAddSort = () => {
    setEditingIndex(null);
    setCurrentSort({
      field: '',
      direction: 'asc',
    });
    setDialogOpen(true);
  };

  const handleEditSort = (index: number) => {
    setEditingIndex(index);
    setCurrentSort(sorts[index]);
    setDialogOpen(true);
  };

  const handleDeleteSort = (index: number) => {
    const newSorts = sorts.filter((_, i) => i !== index);
    onSortsChange(newSorts);
  };

  const handleSaveSort = () => {
    if (!currentSort.field || !currentSort.direction) return;

    const field = availableFields.find(f => f.name === currentSort.field);
    const newSort: ReportSort = {
      field: currentSort.field,
      direction: currentSort.direction as ReportSort['direction'],
      label: field?.label,
    };

    let newSorts: ReportSort[];
    if (editingIndex !== null) {
      newSorts = [...sorts];
      newSorts[editingIndex] = newSort;
    } else {
      newSorts = [...sorts, newSort];
    }

    onSortsChange(newSorts);
    setDialogOpen(false);
  };

  const getSortDescription = (sort: ReportSort): string => {
    const field = availableFields.find(f => f.name === sort.field);
    const fieldLabel = field?.label || sort.field;
    const directionLabel = sort.direction === 'asc' ? 'تصاعدي' : 'تنازلي';
    return `${fieldLabel} (${directionLabel})`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ترتيب النتائج
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        حدد طريقة ترتيب النتائج (اختياري)
      </Typography>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">
            الترتيب المطبق ({sorts.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddSort}
            disabled={disabled || sortableFields.length === 0}
            variant="outlined"
            size="small"
          >
            إضافة ترتيب
          </Button>
        </Box>

        {sortableFields.length === 0 ? (
          <Alert severity="info">
            لا توجد حقول قابلة للترتيب في مصدر البيانات المحدد.
          </Alert>
        ) : sorts.length === 0 ? (
          <Alert severity="info" icon={<SortIcon />}>
            لم يتم تحديد ترتيب. سيتم عرض النتائج بالترتيب الافتراضي.
          </Alert>
        ) : (
          <List>
            {sorts.map((sort, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={sort.label || sort.field}
                        variant="outlined"
                        color="primary"
                      />
                      {sort.direction === 'asc' ? (
                        <AscIcon fontSize="small" color="success" />
                      ) : (
                        <DescIcon fontSize="small" color="info" />
                      )}
                      <Typography variant="body2">
                        {getSortDescription(sort)}
                      </Typography>
                    </Box>
                  }
                  secondary={index === 0 ? 'ترتيب أساسي' : `ترتيب فرعي ${index + 1}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleEditSort(index)}
                    disabled={disabled}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSort(index)}
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

      {/* Add/Edit Sort Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'تعديل الترتيب' : 'إضافة ترتيب جديد'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>الحقل</InputLabel>
              <Select
                value={currentSort.field || ''}
                onChange={(e) => {
                  setCurrentSort(prev => ({
                    ...prev,
                    field: e.target.value,
                  }));
                }}
                label="الحقل"
              >
                {sortableFields.map((field) => (
                  <MenuItem key={field.name} value={field.name}>
                    {field.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>نوع الترتيب</InputLabel>
              <Select
                value={currentSort.direction || 'asc'}
                onChange={(e) => setCurrentSort(prev => ({ 
                  ...prev, 
                  direction: e.target.value as 'asc' | 'desc',
                }))}
                label="نوع الترتيب"
              >
                <MenuItem value="asc">تصاعدي (A-Z, 1-9)</MenuItem>
                <MenuItem value="desc">تنازلي (Z-A, 9-1)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveSort}
            variant="contained"
            disabled={!currentSort.field || !currentSort.direction}
          >
            {editingIndex !== null ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SortBuilder;
