/**
 * Centralized Date Utilities for Consistent Date Handling
 * Handles conversion between different date formats used across the application
 */

import { getCompanyConfig } from '../services/company-config'

export interface DateFormatOptions {
  format?: string
  locale?: string
  useCompanyFormat?: boolean
}

// Common date formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',           // Database format
  US: 'MM/DD/YYYY',            // US format
  EU: 'DD/MM/YYYY',            // European format
  ARABIC: 'DD/MM/YYYY',        // Arabic preferred format
} as const

// Get company date format preference
let cachedDateFormat: string | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getCompanyDateFormat(): Promise<string> {
  const now = Date.now()
  
  if (cachedDateFormat && now - cacheTime < CACHE_DURATION) {
    return cachedDateFormat
  }
  
  try {
    const config = await getCompanyConfig()
    cachedDateFormat = config.date_format || DATE_FORMATS.ISO
    cacheTime = now
    return cachedDateFormat
  } catch (error) {
    console.error('Error getting company date format:', error)
    return DATE_FORMATS.ISO
  }
}

/**
 * Convert date string from one format to another
 */
export function convertDateFormat(
  dateString: string, 
  fromFormat: string, 
  toFormat: string
): string {
  if (!dateString) return ''
  
  try {
    const date = parseDateString(dateString, fromFormat)
    return formatDate(date, toFormat)
  } catch (error) {
    console.error('Date conversion error:', error)
    return dateString // Return original if conversion fails
  }
}

/**
 * Parse date string according to specified format
 */
export function parseDateString(dateString: string, format: string): Date {
  if (!dateString) throw new Error('Date string is empty')
  
  const cleaned = dateString.replace(/[^\d]/g, '') // Remove non-numeric characters
  let year: number, month: number, day: number
  
  switch (format) {
    case DATE_FORMATS.ISO: // YYYY-MM-DD
      if (cleaned.length !== 8) throw new Error('Invalid ISO date format')
      year = parseInt(cleaned.substring(0, 4), 10)
      month = parseInt(cleaned.substring(4, 6), 10) - 1 // JS months are 0-indexed
      day = parseInt(cleaned.substring(6, 8), 10)
      break
      
    case DATE_FORMATS.US: // MM/DD/YYYY
      if (cleaned.length !== 8) throw new Error('Invalid US date format')
      month = parseInt(cleaned.substring(0, 2), 10) - 1
      day = parseInt(cleaned.substring(2, 4), 10)
      year = parseInt(cleaned.substring(4, 8), 10)
      break
      
    case DATE_FORMATS.EU:
    case DATE_FORMATS.ARABIC: // DD/MM/YYYY
      if (cleaned.length !== 8) throw new Error('Invalid EU/Arabic date format')
      day = parseInt(cleaned.substring(0, 2), 10)
      month = parseInt(cleaned.substring(2, 4), 10) - 1
      year = parseInt(cleaned.substring(4, 8), 10)
      break
      
    default:
      // Try to parse as ISO first, then fallback to Date constructor
      const isoAttempt = new Date(dateString)
      if (!isNaN(isoAttempt.getTime())) {
        return isoAttempt
      }
      throw new Error(`Unsupported date format: ${format}`)
  }
  
  const date = new Date(year, month, day)
  
  // Validate the parsed date
  if (isNaN(date.getTime()) || 
      date.getFullYear() !== year || 
      date.getMonth() !== month || 
      date.getDate() !== day) {
    throw new Error(`Invalid date: ${dateString}`)
  }
  
  return date
}

/**
 * Format Date object according to specified format
 */
export function formatDate(date: Date, format: string): string {
  if (!date || isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  switch (format) {
    case DATE_FORMATS.ISO:
      return `${year}-${month}-${day}`
      
    case DATE_FORMATS.US:
      return `${month}/${day}/${year}`
      
    case DATE_FORMATS.EU:
    case DATE_FORMATS.ARABIC:
      return `${day}/${month}/${year}`
      
    default:
      return date.toISOString().split('T')[0] // Fallback to ISO
  }
}

/**
 * Format date for Supabase (always YYYY-MM-DD)
 */
export function formatDateForSupabase(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    // First, try to determine the format and parse accordingly
    if (dateInput.includes('-')) {
      // Likely ISO format
      const date = new Date(dateInput)
      if (!isNaN(date.getTime())) {
        return formatDate(date, DATE_FORMATS.ISO)
      }
    } else if (dateInput.includes('/')) {
      // Could be US or EU format, try to detect
      const parts = dateInput.split('/')
      if (parts.length === 3) {
        const [first, second, third] = parts.map(p => parseInt(p, 10))
        
        // Heuristic: if first part > 12, it's likely DD/MM/YYYY
        // if third part < 100, it's likely MM/DD/YY
        // otherwise assume MM/DD/YYYY for now (can be made configurable)
        let date: Date
        
        if (first > 12) {
          // DD/MM/YYYY format
          date = new Date(third, second - 1, first)
        } else {
          // MM/DD/YYYY format
          date = new Date(third, first - 1, second)
        }
        
        if (!isNaN(date.getTime())) {
          return formatDate(date, DATE_FORMATS.ISO)
        }
      }
    }
    
    // Fallback: try direct parsing
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) {
      throw new Error(`Cannot parse date: ${dateInput}`)
    }
    return formatDate(date, DATE_FORMATS.ISO)
  }
  
  return formatDate(dateInput, DATE_FORMATS.ISO)
}

/**
 * Format date for display according to company preferences
 */
export async function formatDateForDisplay(dateInput: Date | string): Promise<string> {
  if (!dateInput) return ''
  
  try {
    const companyFormat = await getCompanyDateFormat()
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    return formatDate(date, companyFormat)
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return 'Invalid Date'
  }
}

/**
 * Get HTML input date format (always YYYY-MM-DD for date inputs)
 */
export function formatDateForInput(dateInput: Date | string): string {
  if (!dateInput) return ''
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return ''
    
    return formatDate(date, DATE_FORMATS.ISO) // HTML date inputs always use ISO format
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

/**
 * Validate if a date string is valid
 */
export function isValidDateString(dateString: string, format?: string): boolean {
  if (!dateString) return false
  
  try {
    if (format) {
      parseDateString(dateString, format)
    } else {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Get current date in specified format
 */
export function getCurrentDate(format: string = DATE_FORMATS.ISO): string {
  return formatDate(new Date(), format)
}

/**
 * Convert date from HTML input format to company display format
 */
export async function convertInputToDisplay(inputDate: string): Promise<string> {
  if (!inputDate) return ''
  
  try {
    // HTML date inputs are always in YYYY-MM-DD format
    const date = parseDateString(inputDate.replace(/-/g, ''), DATE_FORMATS.ISO)
    return await formatDateForDisplay(date)
  } catch (error) {
    console.error('Error converting input to display format:', error)
    return inputDate
  }
}

/**
 * Clear date format cache (useful after company settings change)
 */
export function clearDateFormatCache(): void {
  cachedDateFormat = null
  cacheTime = 0
}
