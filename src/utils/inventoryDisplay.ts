/**
 * Inventory Display Utilities
 * 
 * Helper functions to display inventory data in the correct language
 * based on the current language setting.
 * 
 * Usage:
 *   import { getDisplayName, getDisplayDescription } from '@/utils/inventoryDisplay'
 *   
 *   const materialName = getDisplayName(material)
 *   const description = getDisplayDescription(material)
 */

import { ArabicLanguageService } from '@/services/ArabicLanguageService'

/**
 * Get display name for an entity (material, location, etc.)
 * Returns Arabic name if language is Arabic and Arabic name exists,
 * otherwise returns English name
 */
export const getDisplayName = (item: {
  material_name?: string
  material_name_ar?: string | null
  location_name?: string
  location_name_ar?: string | null
  name?: string
  name_ar?: string | null
} | null | undefined): string => {
  if (!item) return ''
  
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (isArabic) {
    // Try Arabic fields first
    const arabicName = item.material_name_ar || item.location_name_ar || item.name_ar
    if (arabicName && arabicName.trim()) {
      return arabicName
    }
  }
  
  // Fallback to English
  return item.material_name || item.location_name || item.name || ''
}

/**
 * Get display description for an entity
 * Returns Arabic description if language is Arabic and Arabic description exists,
 * otherwise returns English description
 */
export const getDisplayDescription = (item: {
  description?: string | null
  description_ar?: string | null
} | null | undefined): string => {
  if (!item) return ''
  
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (isArabic) {
    const arabicDesc = item.description_ar
    if (arabicDesc && arabicDesc.trim()) {
      return arabicDesc
    }
  }
  
  return item.description || ''
}

/**
 * Get display status in the correct language
 */
export const getDisplayStatus = (status: string): string => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (!isArabic) return status
  
  const statusMap: Record<string, string> = {
    'draft': 'مسودة',
    'approved': 'معتمد',
    'posted': 'مرحّل',
    'void': 'ملغى',
    'open': 'مفتوح',
    'closed': 'مغلق',
    'locked': 'مقفل',
    'completed': 'مكتمل',
    'pending': 'معلق',
    'active': 'نشط',
    'inactive': 'غير نشط'
  }
  
  return statusMap[status.toLowerCase()] || status
}

/**
 * Get display movement type in the correct language
 */
export const getDisplayMovementType = (movementType: string): string => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (!isArabic) return movementType
  
  const movementMap: Record<string, string> = {
    'receipt': 'استلام',
    'issue': 'صرف',
    'transfer_in': 'نقل وارد',
    'transfer_out': 'نقل صادر',
    'adjust_increase': 'تسوية زيادة',
    'adjust_decrease': 'تسوية نقص',
    'return_to_vendor': 'إرجاع للمورد',
    'return_from_project': 'إرجاع من المشروع'
  }
  
  return movementMap[movementType.toLowerCase()] || movementType
}

/**
 * Get display document type in the correct language
 */
export const getDisplayDocumentType = (docType: string): string => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (!isArabic) return docType
  
  const docTypeMap: Record<string, string> = {
    'receipt': 'إيصال استلام',
    'issue': 'إذن صرف',
    'transfer': 'إذن نقل',
    'adjust': 'تسوية',
    'return': 'إرجاع'
  }
  
  return docTypeMap[docType.toLowerCase()] || docType
}

/**
 * Get display valuation method in the correct language
 */
export const getDisplayValuationMethod = (method: string): string => {
  const isArabic = ArabicLanguageService.getCurrentLanguage() === 'ar'
  
  if (!isArabic) return method
  
  const methodMap: Record<string, string> = {
    'moving_average': 'المتوسط المتحرك',
    'last_purchase': 'آخر شراء',
    'standard_cost': 'التكلفة المعيارية',
    'manual': 'يدوي',
    'MOVING_AVERAGE': 'المتوسط المتحرك',
    'LAST_PURCHASE': 'آخر شراء',
    'STANDARD': 'التكلفة المعيارية',
    'MANUAL': 'يدوي'
  }
  
  return methodMap[method] || method
}
