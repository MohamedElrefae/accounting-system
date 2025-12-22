import React, { useState, useCallback } from 'react';
import { 
  Settings, 
  Grid, 
  Maximize2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save,
  GripVertical 
} from 'lucide-react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Switch, 
  FormControlLabel, 
  Box, 
  Typography, 
  Tabs,
  Tab,
  List,
  ListItem,
  Divider,
  Chip,
  Stack
} from '@mui/material';
/**
 * Configuration for a single form field
 */
export interface FormFieldConfig {
  id: string;
  label: string;
  isVisible: boolean;
  isFullWidth: boolean;
  order: number;
  required?: boolean;
}

interface FormLayoutSettingsProps {
  open: boolean;
  onClose: () => void;
  fieldConfigs: FormFieldConfig[];
  onFieldConfigsChange: (configs: FormFieldConfig[]) => void;
  columnCount: 1 | 2 | 3;
  onColumnCountChange: (count: 1 | 2 | 3) => void;
  onSave: () => void;
  onReset: () => void;
}

const FormLayoutSettings: React.FC<FormLayoutSettingsProps> = ({
  open,
  onClose,
  fieldConfigs,
  onFieldConfigsChange,
  columnCount,
  onColumnCountChange,
  onSave,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  // Sort configs by order
  const sortedConfigs = [...fieldConfigs].sort((a, b) => a.order - b.order);

  // Toggle visibility
  const handleVisibilityToggle = useCallback((fieldId: string) => {
    onFieldConfigsChange(
      fieldConfigs.map(config =>
        config.id === fieldId
          ? { ...config, isVisible: !config.isVisible }
          : config
      )
    );
  }, [fieldConfigs, onFieldConfigsChange]);

  // Toggle full width
  const handleFullWidthToggle = useCallback((fieldId: string) => {
    onFieldConfigsChange(
      fieldConfigs.map(config =>
        config.id === fieldId
          ? { ...config, isFullWidth: !config.isFullWidth }
          : config
      )
    );
  }, [fieldConfigs, onFieldConfigsChange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, fieldId: string) => {
    setDraggedField(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverField(fieldId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverField(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    setDragOverField(null);

    if (!draggedField || draggedField === targetFieldId) {
      setDraggedField(null);
      return;
    }

    const draggedConfig = fieldConfigs.find(c => c.id === draggedField);
    const targetConfig = fieldConfigs.find(c => c.id === targetFieldId);

    if (!draggedConfig || !targetConfig) {
      setDraggedField(null);
      return;
    }

    // Swap orders
    const newConfigs = fieldConfigs.map(config => {
      if (config.id === draggedField) {
        return { ...config, order: targetConfig.order };
      }
      if (config.id === targetFieldId) {
        return { ...config, order: draggedConfig.order };
      }
      return config;
    });

    onFieldConfigsChange(newConfigs);
    setDraggedField(null);
  }, [draggedField, fieldConfigs, onFieldConfigsChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedField(null);
    setDragOverField(null);
  }, []);

  const handleSaveAndClose = () => {
    onSave();
    onClose();
  };

  const handleResetAndClose = () => {
    onReset();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Settings size={20} />
        <Typography variant="h6" component="span">
          إعدادات تخطيط النموذج
        </Typography>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ px: 2 }}
        >
          <Tab label="الأعمدة" icon={<Grid size={16} />} iconPosition="start" />
          <Tab label="الحقول" icon={<Maximize2 size={16} />} iconPosition="start" />
          <Tab label="الترتيب" icon={<GripVertical size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: 400 }}>
        {/* Tab 0: Column Settings */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              عدد الأعمدة
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              اختر عدد الأعمدة التي تريد عرض الحقول فيها
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              {[1, 2, 3].map(count => (
                <Button
                  key={count}
                  variant={columnCount === count ? 'contained' : 'outlined'}
                  onClick={() => onColumnCountChange(count as 1 | 2 | 3)}
                  sx={{ 
                    flex: 1,
                    flexDirection: 'column',
                    py: 3,
                    gap: 1
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    height: 40,
                    alignItems: 'center'
                  }}>
                    {Array.from({ length: count }, (_, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 20,
                          height: 30,
                          bgcolor: columnCount === count ? 'primary.contrastText' : 'primary.main',
                          borderRadius: 0.5,
                          opacity: 0.7
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2">
                    {count} {count === 1 ? 'عمود' : 'أعمدة'}
                  </Typography>
                </Button>
              ))}
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              معاينة التخطيط
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: 2,
                mt: 2
              }}
            >
              {sortedConfigs.filter(c => c.isVisible).map(config => (
                <Box
                  key={config.id}
                  sx={{
                    gridColumn: config.isFullWidth ? '1 / -1' : 'auto',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    {config.label}
                  </Typography>
                  {config.isFullWidth && (
                    <Chip label="كامل العرض" size="small" sx={{ ml: 1 }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Tab 1: Field Visibility & Width */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              إدارة الحقول
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              تحكم في عرض الحقول وعرضها
            </Typography>

            <List>
              {sortedConfigs.map((config, index) => (
                <React.Fragment key={config.id}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      gap: 2,
                      py: 1.5,
                      bgcolor: !config.isVisible ? 'action.disabledBackground' : 'transparent'
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {config.label}
                      </Typography>
                      {config.required && (
                        <Chip label="مطلوب" size="small" color="error" sx={{ mt: 0.5 }} />
                      )}
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.isVisible}
                          onChange={() => handleVisibilityToggle(config.id)}
                          size="small"
                          disabled={config.required}
                        />
                      }
                      label={config.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                      labelPlacement="start"
                      sx={{ m: 0 }}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.isFullWidth}
                          onChange={() => handleFullWidthToggle(config.id)}
                          size="small"
                        />
                      }
                      label={<Maximize2 size={16} />}
                      labelPlacement="start"
                      sx={{ m: 0 }}
                    />
                  </ListItem>
                  {index < sortedConfigs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {/* Tab 2: Field Ordering */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              ترتيب الحقول
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              اسحب الحقول لإعادة ترتيبها
            </Typography>

            <List>
              {sortedConfigs.map((config, index) => (
                <React.Fragment key={config.id}>
                  <ListItem
                    draggable
                    onDragStart={(e) => handleDragStart(e, config.id)}
                    onDragOver={(e) => handleDragOver(e, config.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, config.id)}
                    onDragEnd={handleDragEnd}
                    sx={{
                      cursor: 'grab',
                      py: 1.5,
                      border: 2,
                      borderColor: dragOverField === config.id ? 'primary.main' : 'transparent',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: draggedField === config.id ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <GripVertical size={20} style={{ marginLeft: 8, opacity: 0.5 }} />
                    
                    <Box sx={{ flex: 1, ml: 2 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {config.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{index + 1}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      {config.required && (
                        <Chip label="مطلوب" size="small" color="error" />
                      )}
                      {config.isFullWidth && (
                        <Chip label="كامل" size="small" />
                      )}
                      {!config.isVisible && (
                        <Chip label="مخفي" size="small" variant="outlined" />
                      )}
                    </Stack>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          إلغاء
        </Button>
        <Button 
          onClick={handleResetAndClose} 
          variant="outlined" 
          color="warning"
          startIcon={<RotateCcw size={16} />}
        >
          إعادة تعيين
        </Button>
        <Button 
          onClick={handleSaveAndClose} 
          variant="contained"
          startIcon={<Save size={16} />}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormLayoutSettings;
