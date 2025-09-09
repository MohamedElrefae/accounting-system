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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import type { GroupByBuilderProps, ReportGroupBy } from '../../types/reports';

const GroupByBuilder: React.FC<GroupByBuilderProps> = ({
  availableFields,
  groupBy,
  onGroupByChange,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentGroupBy, setCurrentGroupBy] = useState<Partial<ReportGroupBy>>({
    field: '',
  });

  const groupableFields = availableFields.filter(field => field.groupable);

  const handleAddGroupBy = () => {
    setCurrentGroupBy({
      field: '',
    });
    setDialogOpen(true);
  };

  const handleDeleteGroupBy = (index: number) => {
    const newGroupBy = groupBy.filter((_, i) => i !== index);
    onGroupByChange(newGroupBy);
  };

  const handleSaveGroupBy = () => {
    if (!currentGroupBy.field) return;

    const field = availableFields.find(f => f.name === currentGroupBy.field);
    const newGroupByItem: ReportGroupBy = {
      field: currentGroupBy.field,
      label: field?.label,
    };

    // Check if field is already in group by
    if (groupBy.some(g => g.field === currentGroupBy.field)) {
      return;
    }

    const newGroupBy = [...groupBy, newGroupByItem];
    onGroupByChange(newGroupBy);
    setDialogOpen(false);
  };

  const getGroupByDescription = (group: ReportGroupBy): string => {
    const field = availableFields.find(f => f.name === group.field);
    return field?.label || group.field;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        تجميع النتائج
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        اختر الحقول لتجميع النتائج بها (اختياري)
      </Typography>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">
            التجميع المطبق ({groupBy.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddGroupBy}
            disabled={disabled || groupableFields.length === 0}
            variant="outlined"
            size="small"
          >
            إضافة تجميع
          </Button>
        </Box>

        {groupableFields.length === 0 ? (
          <Alert severity="info">
            لا توجد حقول قابلة للتجميع في مصدر البيانات المحدد.
          </Alert>
        ) : groupBy.length === 0 ? (
          <Alert severity="info" icon={<GroupIcon />}>
            لم يتم تحديد تجميع. سيتم عرض النتائج بدون تجميع.
          </Alert>
        ) : (
          <List>
            {groupBy.map((group, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={group.label || group.field}
                        variant="outlined"
                        color="primary"
                      />
                      <Typography variant="body2">
                        {getGroupByDescription(group)}
                      </Typography>
                    </Box>
                  }
                  secondary={`مستوى التجميع ${index + 1}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteGroupBy(index)}
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

      {/* Add GroupBy Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          إضافة تجميع جديد
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>الحقل</InputLabel>
              <Select
                value={currentGroupBy.field || ''}
                onChange={(e) => {
                  setCurrentGroupBy(prev => ({
                    ...prev,
                    field: e.target.value,
                  }));
                }}
                label="الحقل"
              >
                {groupableFields
                  .filter(field => !groupBy.some(g => g.field === field.name))
                  .map((field) => (
                    <MenuItem key={field.name} value={field.name}>
                      {field.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {groupBy.length > 0 && (
              <Alert severity="info">
                ملاحظة: التجميع بأكثر من حقل قد يؤدي إلى نتائج معقدة. تأكد من أن الحقول المختارة مناسبة للتجميع معاً.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveGroupBy}
            variant="contained"
            disabled={
              !currentGroupBy.field ||
              groupBy.some(g => g.field === currentGroupBy.field)
            }
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupByBuilder;
