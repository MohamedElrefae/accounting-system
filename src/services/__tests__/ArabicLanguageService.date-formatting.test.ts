import { ArabicLanguageService } from '../ArabicLanguageService'

describe('ArabicLanguageService - Date Formatting', () => {
  beforeEach(() => {
    // Set to English for consistent testing
    ArabicLanguageService.setLanguage('en')
  })

  describe('formatDate', () => {
    it('should format valid date strings correctly', () => {
      const result = ArabicLanguageService.formatDate('2024-01-15')
      expect(result).toBe('01/15/2024')
    })

    it('should format Date objects correctly', () => {
      const date = new Date('2024-01-15')
      const result = ArabicLanguageService.formatDate(date)
      expect(result).toBe('01/15/2024')
    })

    it('should handle empty string gracefully', () => {
      const result = ArabicLanguageService.formatDate('')
      expect(result).toBe('--/--/----')
    })

    it('should handle null gracefully', () => {
      const result = ArabicLanguageService.formatDate(null as any)
      expect(result).toBe('--/--/----')
    })

    it('should handle undefined gracefully', () => {
      const result = ArabicLanguageService.formatDate(undefined as any)
      expect(result).toBe('--/--/----')
    })

    it('should handle invalid date strings gracefully', () => {
      const result = ArabicLanguageService.formatDate('invalid-date')
      expect(result).toBe('--/--/----')
    })

    it('should handle whitespace-only strings gracefully', () => {
      const result = ArabicLanguageService.formatDate('   ')
      expect(result).toBe('--/--/----')
    })

    it('should format with custom format string', () => {
      const result = ArabicLanguageService.formatDate('2024-01-15', 'yyyy-MM-dd')
      expect(result).toBe('2024-01-15')
    })
  })

  describe('formatDateTime', () => {
    it('should format valid date strings correctly', () => {
      const result = ArabicLanguageService.formatDateTime('2024-01-15T14:30:00')
      expect(result).toMatch(/01\/15\/2024 - \d{2}:\d{2}/)
    })

    it('should handle empty string gracefully', () => {
      const result = ArabicLanguageService.formatDateTime('')
      expect(result).toBe('--/--/---- - --:--')
    })

    it('should handle null gracefully', () => {
      const result = ArabicLanguageService.formatDateTime(null as any)
      expect(result).toBe('--/--/---- - --:--')
    })

    it('should handle undefined gracefully', () => {
      const result = ArabicLanguageService.formatDateTime(undefined as any)
      expect(result).toBe('--/--/---- - --:--')
    })

    it('should handle invalid date strings gracefully', () => {
      const result = ArabicLanguageService.formatDateTime('invalid-date')
      expect(result).toBe('--/--/---- - --:--')
    })
  })

  describe('Arabic language formatting', () => {
    beforeEach(() => {
      ArabicLanguageService.setLanguage('ar')
    })

    it('should format dates in Arabic format', () => {
      const result = ArabicLanguageService.formatDate('2024-01-15')
      expect(result).toBe('15/01/2024')
    })

    it('should handle invalid dates in Arabic', () => {
      const result = ArabicLanguageService.formatDate('')
      expect(result).toBe('--/--/----')
    })
  })
})