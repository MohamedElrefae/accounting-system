import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as UseTemplateIcon,
  Info as InfoIcon,
  FilterList as FilterIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  getReportTemplates,
  getTemplatesByCategory,
  searchTemplates,
  getCategoryInfo,
  getDifficultyInfo,
  type ReportTemplate,
} from '../../utils/reportTemplates';

interface ReportTemplateSelectorProps {
  onTemplateSelect: (template: ReportTemplate) => void;
  availableDatasets: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

const ReportTemplateSelector: React.FC<ReportTemplateSelectorProps> = ({
  onTemplateSelect,
  availableDatasets,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const allTemplates = getReportTemplates();
  
  const filteredTemplates = searchTerm 
    ? searchTemplates(searchTerm)
    : selectedCategory === 'all'
    ? allTemplates
    : getTemplatesByCategory(selectedCategory as ReportTemplate['category']);

  const categories = [
    { value: 'all', label: 'جميع الفئات' },
    { value: 'financial', label: 'المالية' },
    { value: 'operational', label: 'التشغيلية' },
    { value: 'analytical', label: 'التحليلية' },
    { value: 'compliance', label: 'الامتثال' },
  ];

  const handlePreviewTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleUseTemplate = (template: ReportTemplate) => {
    const matchingDataset = availableDatasets.find(d => d.name === template.datasetName);
    if (!matchingDataset) {
      alert(`Dataset "${template.datasetName}" not found. Please ensure the required dataset is available.`);
      return;
    }
    
    onTemplateSelect(template);
    setPreviewDialogOpen(false);
  };

  const renderTemplateCard = (template: ReportTemplate) => {
    const categoryInfo = getCategoryInfo(template.category);
    const difficultyInfo = getDifficultyInfo(template.difficulty);
    const isDatasetAvailable = availableDatasets.some(d => d.name === template.datasetName);

    return (
            <Grid xs={12} sm={6} md={4} key={template.id}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            opacity: isDatasetAvailable ? 1 : 0.6,
            border: isDatasetAvailable ? 'none' : '1px dashed #ccc',
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography variant="h3" component="span" sx={{ fontSize: '1.5rem' }}>
                {template.icon}
              </Typography>
              <Typography variant="h6" component="h3">
                {template.nameAr}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              {template.descriptionAr}
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              <Chip
                size="small"
                label={categoryInfo.name}
                color={categoryInfo.color}
                icon={<span>{categoryInfo.icon}</span>}
              />
              <Chip
                size="small"
                label={difficultyInfo.name}
                color={difficultyInfo.color}
                variant="outlined"
              />
              <Chip
                size="small"
                label={template.estimatedExecutionTime}
                icon={<TimeIcon fontSize="small" />}
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary">
              مصدر البيانات: {template.datasetName}
            </Typography>

            {!isDatasetAvailable && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
                مصدر البيانات غير متوفر
              </Alert>
            )}
          </CardContent>

          <CardActions>
            <Button
              size="small"
              startIcon={<InfoIcon />}
              onClick={() => handlePreviewTemplate(template)}
            >
              معاينة
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<UseTemplateIcon />}
              onClick={() => handleUseTemplate(template)}
              disabled={disabled || !isDatasetAvailable}
            >
              استخدام
            </Button>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        قوالب التقارير الجاهزة
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ابدأ بسرعة باستخدام قوالب التقارير المعدة مسبقاً لأشهر السيناريوهات التجارية
      </Typography>

      {/* Search and Filter Controls */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          size="small"
          placeholder="البحث في القوالب..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="الفئة"
            startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1 }} />}
          >
            {categories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filteredTemplates.length} من {allTemplates.length} قالب
      </Typography>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Alert severity="info">
          لم يتم العثور على قوالب مطابقة. جرب البحث بكلمات أخرى أو اختر فئة مختلفة.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredTemplates.map(renderTemplateCard)}
        </Grid>
      )}

      {/* Template Preview Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        {selectedTemplate && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h3" component="span" sx={{ fontSize: '1.5rem' }}>
                  {selectedTemplate.icon}
                </Typography>
                {selectedTemplate.nameAr}
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Typography paragraph>
                {selectedTemplate.descriptionAr}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid xs={4}>
                  <Typography variant="subtitle2">الفئة:</Typography>
                  <Chip 
                    size="small"
                    label={getCategoryInfo(selectedTemplate.category).name}
                    color={getCategoryInfo(selectedTemplate.category).color}
                  />
                </Grid>
                <Grid xs={4}>
                  <Typography variant="subtitle2">المستوى:</Typography>
                  <Chip 
                    size="small"
                    label={getDifficultyInfo(selectedTemplate.difficulty).name}
                    color={getDifficultyInfo(selectedTemplate.difficulty).color}
                  />
                </Grid>
                <Grid xs={4}>
                  <Typography variant="subtitle2">الوقت المتوقع:</Typography>
                  <Typography variant="body2">{selectedTemplate.estimatedExecutionTime}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                تفاصيل القالب:
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="مصدر البيانات"
                    secondary={selectedTemplate.datasetName}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="الحقول المحددة"
                    secondary={`${selectedTemplate.template.selected_fields.length} حقل`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="المرشحات"
                    secondary={`${selectedTemplate.template.filters.length} مرشح`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="الترتيب"
                    secondary={`${selectedTemplate.template.sorts.length} ترتيب`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="التجميع"
                    secondary={`${selectedTemplate.template.group_by.length} تجميع`}
                  />
                </ListItem>
              </List>

              {selectedTemplate.sampleFilters && selectedTemplate.sampleFilters.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    أمثلة لمرشحات إضافية:
                  </Typography>
                  {selectedTemplate.sampleFilters.map((filter, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">{filter.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {filter.description}
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setPreviewDialogOpen(false)}>
                إغلاق
              </Button>
              <Button
                variant="contained"
                startIcon={<UseTemplateIcon />}
                onClick={() => handleUseTemplate(selectedTemplate)}
                disabled={disabled || !availableDatasets.some(d => d.name === selectedTemplate.datasetName)}
              >
                استخدام القالب
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ReportTemplateSelector;
