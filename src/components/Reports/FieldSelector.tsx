import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Checkbox,
  TextField,
  Alert,
  Chip,
  Paper,
  Divider,
  Button,
  Collapse,
} from '@mui/material';
import TextIcon from '@mui/icons-material/TextFields';
import NumberIcon from '@mui/icons-material/Numbers';
import DateIcon from '@mui/icons-material/Event';
import BooleanIcon from '@mui/icons-material/CheckBox';
import SearchIcon from '@mui/icons-material/Search';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectAllIcon from '@mui/icons-material/DeselectOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { FieldSelectorProps, ReportField } from '../../types/reports';

const getFieldIcon = (type: string) => {
  switch (type) {
    case 'number':
      return <NumberIcon fontSize="small" />;
    case 'date':
      return <DateIcon fontSize="small" />;
    case 'boolean':
      return <BooleanIcon fontSize="small" />;
    default:
      return <TextIcon fontSize="small" />;
  }
};

const getFieldTypeLabel = (type: string) => {
  switch (type) {
    case 'number':
      return 'رقم';
    case 'date':
      return 'تاريخ';
    case 'boolean':
      return 'نعم/لا';
    default:
      return 'نص';
  }
};

const FieldSelector: React.FC<FieldSelectorProps> = ({
  availableFields,
  selectedFields,
  onFieldsChange,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedView, setGroupedView] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['text', 'number', 'date', 'boolean'])
  );

  const filteredFields = availableFields.filter(field => {
    if (!field || !field.name || !field.label) return false;
    const search = searchTerm.toLowerCase();
    return field.name.toLowerCase().includes(search) ||
           field.label.toLowerCase().includes(search);
  });

  const groupedFields = filteredFields.reduce((groups, field) => {
    const type = field.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(field);
    return groups;
  }, {} as Record<string, ReportField[]>);

  const handleFieldToggle = (fieldName: string) => {
    if (disabled) return;
    
    const newSelectedFields = selectedFields.includes(fieldName)
      ? selectedFields.filter(f => f !== fieldName)
      : [...selectedFields, fieldName];
    
    onFieldsChange(newSelectedFields);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onFieldsChange(filteredFields.map(f => f.name));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onFieldsChange([]);
  };

  const toggleGroupExpansion = (groupType: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupType)) {
      newExpanded.delete(groupType);
    } else {
      newExpanded.add(groupType);
    }
    setExpandedGroups(newExpanded);
  };

  const renderFieldsList = (fields: ReportField[]) => (
    <List dense>
      {fields.map((field) => (
        <ListItem key={field.name} disablePadding>
          <ListItemButton
            onClick={() => handleFieldToggle(field.name)}
            disabled={disabled}
            dense
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={selectedFields.includes(field.name)}
                tabIndex={-1}
                disableRipple
                size="small"
              />
            </ListItemIcon>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {getFieldIcon(field.type)}
            </ListItemIcon>
            <ListItemText
              primary={field.label}
              secondary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {field.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={getFieldTypeLabel(field.type)}
                    variant="outlined"
                    sx={{ height: 16, fontSize: 10 }}
                  />
                  {field.filterable && (
                    <Chip
                      size="small"
                      label="قابل للتصفية"
                      variant="outlined"
                      color="primary"
                      sx={{ height: 16, fontSize: 10 }}
                    />
                  )}
                  {field.sortable && (
                    <Chip
                      size="small"
                      label="قابل للترتيب"
                      variant="outlined"
                      color="secondary"
                      sx={{ height: 16, fontSize: 10 }}
                    />
                  )}
                </Box>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  if (availableFields.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          اختر الحقول
        </Typography>
        <Alert severity="info">
          لا توجد حقول متاحة. يرجى اختيار مصدر البيانات أولاً.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        اختر الحقول
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        اختر الحقول التي تريد عرضها في التقرير
      </Typography>

      {/* Search and Controls */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <TextField
            size="small"
            placeholder="بحث في الحقول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
            }}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            disabled={disabled || filteredFields.length === 0}
          >
            اختيار الكل
          </Button>
          <Button
            size="small"
            startIcon={<DeselectAllIcon />}
            onClick={handleDeselectAll}
            disabled={disabled || selectedFields.length === 0}
          >
            إلغاء الكل
          </Button>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2">
            الحقول المحددة: {selectedFields.length} / {availableFields.length}
          </Typography>
          <Button
            size="small"
            onClick={() => setGroupedView(!groupedView)}
          >
            {groupedView ? 'عرض مسطح' : 'عرض مجموعات'}
          </Button>
        </Box>
      </Paper>

      {/* Selected Fields Preview */}
      {selectedFields.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            الحقول المحددة:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {selectedFields.map((fieldName) => {
              const field = availableFields.find(f => f.name === fieldName);
              return field ? (
                <Chip
                  key={fieldName}
                  label={field.label}
                  onDelete={() => handleFieldToggle(fieldName)}
                  size="small"
                  color="primary"
                  variant="outlined"
                  disabled={disabled}
                />
              ) : null;
            })}
          </Box>
        </Paper>
      )}

      {/* Fields List */}
      <Paper elevation={1}>
        {groupedView ? (
          // Grouped View
          Object.entries(groupedFields).map(([groupType, fields]) => (
            <Box key={groupType}>
              <ListItemButton
                onClick={() => toggleGroupExpansion(groupType)}
                sx={{ bgcolor: 'grey.50' }}
              >
                <ListItemIcon>
                  {getFieldIcon(groupType)}
                </ListItemIcon>
                <ListItemText
                  primary={`${getFieldTypeLabel(groupType)} (${fields.length})`}
                />
                {expandedGroups.has(groupType) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={expandedGroups.has(groupType)} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 2 }}>
                  {renderFieldsList(fields)}
                </Box>
              </Collapse>
              <Divider />
            </Box>
          ))
        ) : (
          // Flat View
          renderFieldsList(filteredFields)
        )}
      </Paper>

      {selectedFields.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          يجب اختيار حقل واحد على الأقل للمتابعة
        </Alert>
      )}

      {selectedFields.length > 0 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          تم اختيار {selectedFields.length} حقل. يمكنك الآن الانتقال لإعداد المرشحات.
        </Alert>
      )}
    </Box>
  );
};

export default FieldSelector;
