/**
 * Advanced Arabic Text Processing Engine
 * Provides comprehensive Arabic text processing, RTL support, and export formatting
 * Built from the ground up for reliable Arabic text handling across all formats
 */

// Arabic character ranges and utilities
const ARABIC_RANGES = {
  BASIC: /[\u0600-\u06FF]/,
  EXTENDED: /[\u0750-\u077F]/,
  SUPPLEMENT: /[\u08A0-\u08FF]/,
  PRESENTATION_A: /[\uFB50-\uFDFF]/,
  PRESENTATION_B: /[\uFE70-\uFEFF]/,
  COMBINED: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
};

// RTL control characters
const RTL_CONTROLS = {
  RLM: '\u200F',     // Right-to-Left Mark
  LRM: '\u200E',     // Left-to-Right Mark
  RLE: '\u202B',     // Right-to-Left Embedding
  LRE: '\u202A',     // Left-to-Right Embedding
  PDF: '\u202C',     // Pop Directional Formatting
  RLO: '\u202E',     // Right-to-Left Override
  LRO: '\u202D',     // Left-to-Right Override
  FSI: '\u2068',     // First Strong Isolate
  PDI: '\u2069',     // Pop Directional Isolate
  LRI: '\u2066',     // Left-to-Right Isolate
  RLI: '\u2067'      // Right-to-Left Isolate
};

// Arabic numeral mapping
const ARABIC_NUMERALS = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

const WESTERN_NUMERALS = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// Arabic letter connection mapping placeholder (removed unused detailed mapping)

// Diacritics to remove for clean export
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

// Tatweel (kashida) character
const TATWEEL = /\u0640/g;

export interface ArabicTextOptions {
  useArabicNumerals?: boolean;
  cleanDiacritics?: boolean;
  applyRTLMarks?: boolean;
  forExport?: boolean;
  preserveSpacing?: boolean;
  useConnectedForms?: boolean;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  removeRTLMarks?: boolean;
  useWesternNumerals?: boolean;
  escapeSpecialChars?: boolean;
}

export class ArabicTextEngine {
  private static instance: ArabicTextEngine;

  private constructor() {}

  public static getInstance(): ArabicTextEngine {
    if (!ArabicTextEngine.instance) {
      ArabicTextEngine.instance = new ArabicTextEngine();
    }
    return ArabicTextEngine.instance;
  }

  /**
   * Detect if text contains Arabic characters
   */
  public containsArabic(text: string): boolean {
    if (!text) return false;
    return ARABIC_RANGES.COMBINED.test(text);
  }

  /**
   * Get text direction based on content
   */
  public getTextDirection(text: string): 'rtl' | 'ltr' | 'auto' {
    if (!text) return 'auto';
    
    const arabicChars = (text.match(ARABIC_RANGES.COMBINED) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (arabicChars > totalChars * 0.6) return 'rtl';
    if (arabicChars > 0) return 'auto';
    return 'ltr';
  }

  /**
   * Clean text by removing unwanted characters
   */
  public cleanText(text: string, options: ArabicTextOptions = {}): string {
    if (!text) return '';
    
    let cleaned = text;
    
    // Remove diacritics if requested
    if (options.cleanDiacritics !== false) {
      cleaned = cleaned.replace(DIACRITICS, '');
    }
    
    // Remove tatweel (kashida) characters
    cleaned = cleaned.replace(TATWEEL, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove zero-width characters
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return cleaned;
  }

  /**
   * Convert numerals between Arabic and Western
   */
  public convertNumerals(text: string, toArabic: boolean = true): string {
    if (!text) return '';
    
    const mapping = toArabic ? ARABIC_NUMERALS : WESTERN_NUMERALS;
    
    return text.replace(/[0-9٠-٩]/g, (digit) => mapping[digit as keyof typeof mapping] || digit);
  }

  /**
   * Remove RTL control characters
   */
  public removeRTLControls(text: string): string {
    if (!text) return '';
    
    return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  }

  /**
   * Add appropriate RTL markers
   */
  public addRTLMarkers(text: string, force: boolean = false): string {
    if (!text) return '';
    
    if (!force && !this.containsArabic(text)) return text;
    
    // Use RLM for simple RTL marking
    return RTL_CONTROLS.RLM + text;
  }

  /**
   * Process Arabic text for better display
   */
  public processArabicText(text: string, options: ArabicTextOptions = {}): string {
    if (!text) return '';
    
    let processed = this.cleanText(text, options);
    
    // Convert numerals if needed
    if (options.useArabicNumerals) {
      processed = this.convertNumerals(processed, true);
    }
    
    // Add RTL markers if needed
    if (options.applyRTLMarks && this.containsArabic(processed)) {
      processed = this.addRTLMarkers(processed);
    }
    
    return processed;
  }

  /**
   * Format currency with Arabic support
   */
  public formatCurrency(
    amount: number,
    currency: string = 'EGP',
    options: ArabicTextOptions = {}
  ): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return currency === 'none' ? '۰ګ۰۰' : '۰ګ۰۰ ج.م'
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    
    const formatted = formatter.format(Math.abs(amount))
    
    let result: string
    if (currency === 'none') {
      // No currency symbol, just the number
      result = formatted
    } else {
      const currencySymbol = currency === 'EGP' ? 'ج.م' : currency
      result = `${formatted} ${currencySymbol}`
    }
    
    if (amount < 0) result = `-${result}`
    
    // Convert to Arabic numerals if needed
    if (options.useArabicNumerals !== false && !options.forExport) {
      result = this.convertNumerals(result, true)
    }
    
    return result
  }

  /**
   * Format date with Arabic support
   */
  public formatDate(date: string | Date, options: ArabicTextOptions = {}): string {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const formatted = dateObj.toLocaleDateString('ar-EG');
      
      // Clean RTL controls for export
      if (options.forExport) {
        return this.removeRTLControls(formatted);
      }
      
      return formatted;
    } catch {
      return String(date);
    }
  }

  /**
   * Format text for export
   */
  public formatForExport(text: string, options: ExportOptions): string {
    if (!text) return '';
    
    let formatted = String(text);
    
    // Remove RTL marks for certain formats
    if (options.removeRTLMarks) {
      formatted = this.removeRTLControls(formatted);
    }
    
    // Convert numerals if needed
    if (options.useWesternNumerals) {
      formatted = this.convertNumerals(formatted, false);
    }
    
    // Escape special characters for CSV/HTML
    if (options.escapeSpecialChars) {
      if (options.format === 'csv') {
        formatted = formatted.replace(/"/g, '""');
        if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
          formatted = `"${formatted}"`;
        }
      } else if (options.format === 'html') {
        formatted = formatted
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
    }
    
    return formatted;
  }
}

// Export singleton instance and helper functions
export const arabicEngine = ArabicTextEngine.getInstance();

export const processArabicText = (text: string, options?: ArabicTextOptions) =>
  arabicEngine.processArabicText(text, options);

export const formatArabicCurrency = (amount: number, currency?: string, options?: ArabicTextOptions) =>
  arabicEngine.formatCurrency(amount, currency, options);

export const formatArabicDate = (date: string | Date, options?: ArabicTextOptions) =>
  arabicEngine.formatDate(date, options);

export const formatForExport = (text: string, options: ExportOptions) =>
  arabicEngine.formatForExport(text, options);

export const cleanArabicText = (text: string) =>
  arabicEngine.cleanText(text);

