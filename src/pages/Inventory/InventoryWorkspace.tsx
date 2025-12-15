import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, Grid } from '@mui/material'
import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { INVENTORY_TEXTS } from '@/i18n/inventory'

// Link item component
interface LinkItemProps {
  label: { en: string; ar: string }
  path: string
  isExternal?: boolean
}

const LinkItem: React.FC<LinkItemProps> = ({ label, path, isExternal }) => {
  const navigate = useNavigate()
  const { t, isRTL } = useArabicLanguage()
  
  return (
    <Box
      onClick={() => navigate(path)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 0.75,
        px: 1,
        cursor: 'pointer',
        borderRadius: 1,
        color: 'text.primary',
        '&:hover': {
          bgcolor: 'action.hover',
          color: 'primary.main',
        },
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
        {t(label)}
      </Typography>
      {isExternal && (
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>↗</Typography>
      )}
    </Box>
  )
}

// Section component with colored left border
interface SectionProps {
  title: { en: string; ar: string }
  color: string
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({ title, color, children }) => {
  const { t, isRTL } = useArabicLanguage()
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderLeft: isRTL ? 'none' : `3px solid ${color}`,
        borderRight: isRTL ? `3px solid ${color}` : 'none',
        bgcolor: 'background.paper',
        p: 2,
        height: '100%',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          color: color,
          mb: 1.5,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {t(title)}
      </Typography>
      <Box>{children}</Box>
    </Paper>
  )
}


// Main Workspace Component
const InventoryWorkspace: React.FC = () => {
  const { t, isRTL } = useArabicLanguage()

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t(INVENTORY_TEXTS.inventory)}
      </Typography>

      <Grid container spacing={3}>
        {/* Row 1 */}
        {/* Items Catalogue */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Items Catalogue', ar: 'كتالوج الأصناف' }} color="#00bcd4">
            <LinkItem label={INVENTORY_TEXTS.materials} path="/inventory/materials" />
            <LinkItem label={{ en: 'Material Groups', ar: 'مجموعات المواد' }} path="/inventory/materials" />
            <LinkItem label={{ en: 'UOM', ar: 'وحدات القياس' }} path="/inventory/uoms" />
          </Section>
        </Grid>

        {/* Stock Transactions */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Stock Transactions', ar: 'حركات المخزون' }} color="#00bcd4">
            <LinkItem label={INVENTORY_TEXTS.receiveMaterials} path="/inventory/receive" />
            <LinkItem label={INVENTORY_TEXTS.issueToProject} path="/inventory/issue" />
            <LinkItem label={INVENTORY_TEXTS.transferMaterials} path="/inventory/transfer" />
            <LinkItem label={INVENTORY_TEXTS.adjustInventory} path="/inventory/adjust" />
            <LinkItem label={INVENTORY_TEXTS.returnMaterials} path="/inventory/returns" />
            <LinkItem label={{ en: 'All Documents', ar: 'جميع المستندات' }} path="/inventory/documents" />
          </Section>
        </Grid>

        {/* Stock Reports */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Stock Reports', ar: 'تقارير المخزون' }} color="#9e9e9e">
            <LinkItem label={INVENTORY_TEXTS.onHand} path="/inventory/on-hand" />
            <LinkItem label={INVENTORY_TEXTS.movements} path="/inventory/movements" />
            <LinkItem label={INVENTORY_TEXTS.valuation} path="/inventory/valuation" />
            <LinkItem label={INVENTORY_TEXTS.ageing} path="/inventory/ageing" />
            <LinkItem label={INVENTORY_TEXTS.movementSummary} path="/inventory/movement-summary" />
          </Section>
        </Grid>

        {/* Tools */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Tools', ar: 'الأدوات' }} color="#9e9e9e">
            <LinkItem label={{ en: 'Reconciliation', ar: 'المطابقة' }} path="/inventory/reconciliation" />
            <LinkItem label={{ en: 'KPI Dashboard', ar: 'لوحة المؤشرات' }} path="/inventory/kpis" />
            <LinkItem label={{ en: 'Quick Stock Balance', ar: 'رصيد سريع' }} path="/inventory/on-hand" />
          </Section>
        </Grid>

        {/* Row 2 */}
        {/* Settings */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Settings', ar: 'الإعدادات' }} color="#00bcd4">
            <LinkItem label={{ en: 'Inventory Settings', ar: 'إعدادات المخزون' }} path="/inventory/settings" />
            <LinkItem label={INVENTORY_TEXTS.locations} path="/inventory/locations" />
            <LinkItem label={{ en: 'Valuation Methods', ar: 'طرق التقييم' }} path="/inventory/settings" />
          </Section>
        </Grid>

        {/* Location Management */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Location Management', ar: 'إدارة المواقع' }} color="#9e9e9e">
            <LinkItem label={INVENTORY_TEXTS.locations} path="/inventory/locations" />
            <LinkItem label={{ en: 'Warehouse', ar: 'المستودعات' }} path="/inventory/locations" />
            <LinkItem label={{ en: 'Site Locations', ar: 'مواقع العمل' }} path="/inventory/locations" />
          </Section>
        </Grid>

        {/* Key Reports */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Key Reports', ar: 'التقارير الرئيسية' }} color="#00bcd4">
            <LinkItem label={INVENTORY_TEXTS.movementDetail} path="/inventory/movement-detail" />
            <LinkItem label={INVENTORY_TEXTS.projectMovementSummary} path="/inventory/project-movement-summary" />
            <LinkItem label={INVENTORY_TEXTS.valuationByProject} path="/inventory/valuation-by-project" />
          </Section>
        </Grid>

        {/* Other Reports */}
        <Grid item xs={12} sm={6} md={3}>
          <Section title={{ en: 'Other Reports', ar: 'تقارير أخرى' }} color="#9e9e9e">
            <LinkItem label={{ en: 'Stock Ledger', ar: 'دفتر المخزون' }} path="/inventory/movements" />
            <LinkItem label={{ en: 'Stock Projected Qty', ar: 'الكمية المتوقعة' }} path="/inventory/on-hand" />
            <LinkItem label={{ en: 'Item Price Stock', ar: 'أسعار الأصناف' }} path="/inventory/valuation" />
          </Section>
        </Grid>
      </Grid>
    </Box>
  )
}

export default InventoryWorkspace
