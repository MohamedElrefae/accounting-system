import React, { useState, useEffect } from 'react'
import { Type, Settings, RotateCcw, Eye, Save } from 'lucide-react'
import { 
  getUserFontPreferences, 
  updateUserFontPreferences, 
  resetFontPreferences,
  applyFontPreferencesToCSS,
  getFontPreviewText,
  AVAILABLE_FONTS,
  FONT_WEIGHTS,
  type FontPreferences 
} from '../../services/font-preferences'
import { useToast } from '../../contexts/ToastContext'

const FontSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<FontPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'ar' | 'mixed'>('mixed')
  const [formData, setFormData] = useState({
    font_family: 'Segoe UI, sans-serif',
    font_size_scale: 1.0,
    line_height_scale: 1.0,
    font_weight: 'normal',
    letter_spacing_scale: 1.0,
    is_arabic_optimized: false,
  })

  const { showToast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const userPrefs = await getUserFontPreferences()
      setPreferences(userPrefs)
      setFormData({
        font_family: userPrefs.font_family,
        font_size_scale: userPrefs.font_size_scale,
        line_height_scale: userPrefs.line_height_scale,
        font_weight: userPrefs.font_weight,
        letter_spacing_scale: userPrefs.letter_spacing_scale,
        is_arabic_optimized: userPrefs.is_arabic_optimized,
      })
      // Apply current preferences immediately
      applyFontPreferencesToCSS(userPrefs)
    } catch (error) {
      console.error('Error loading font preferences:', error)
      showToast('فشل تحميل إعدادات الخطوط', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewUpdate = (updates: Partial<typeof formData>) => {
    const newFormData = { ...formData, ...updates }
    setFormData(newFormData)
    
    // Apply preview immediately (without saving)
    const previewPrefs: FontPreferences = {
      ...preferences!,
      ...newFormData,
    }
    applyFontPreferencesToCSS(previewPrefs)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedPrefs = await updateUserFontPreferences(formData)
      setPreferences(updatedPrefs)
      applyFontPreferencesToCSS(updatedPrefs)
      showToast('تم حفظ إعدادات الخطوط بنجاح', { severity: 'success' })
    } catch (error) {
      console.error('Error saving font preferences:', error)
      showToast('فشل حفظ إعدادات الخطوط', { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (window.confirm('هل تريد إعادة تعيين إعدادات الخطوط إلى الإعدادات الافتراضية؟')) {
      setSaving(true)
      try {
        const resetPrefs = await resetFontPreferences()
        setPreferences(resetPrefs)
        setFormData({
          font_family: resetPrefs.font_family,
          font_size_scale: resetPrefs.font_size_scale,
          line_height_scale: resetPrefs.line_height_scale,
          font_weight: resetPrefs.font_weight,
          letter_spacing_scale: resetPrefs.letter_spacing_scale,
          is_arabic_optimized: resetPrefs.is_arabic_optimized,
        })
        applyFontPreferencesToCSS(resetPrefs)
        showToast('تم إعادة تعيين إعدادات الخطوط بنجاح', { severity: 'success' })
      } catch (error) {
        console.error('Error resetting font preferences:', error)
        showToast('فشل إعادة تعيين إعدادات الخطوط', { severity: 'error' })
      } finally {
        setSaving(false)
      }
    }
  }

  const previewText = getFontPreviewText(previewLanguage)
  const selectedFont = AVAILABLE_FONTS.find(f => f.value === formData.font_family)

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        جاري تحميل إعدادات الخطوط...
      </div>
    )
  }

  return (
    <div className="font-settings" dir="rtl">
      <div className="settings-header">
        <div className="header-content">
          <div className="header-icon">
            <Type size={32} />
          </div>
          <div>
            <h1 className="settings-title">إعدادات الخطوط والتنسيق</h1>
            <p className="settings-subtitle">تخصيص عائلة الخطوط وحجمها وتنسيقها لتحسين تجربة القراءة</p>
          </div>
        </div>
      </div>

      <div className="settings-form">
        {/* Font Family Selection */}
        <div className="settings-section">
          <div className="section-header">
            <Type size={20} />
            <h2>عائلة الخط</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="font_family">اختر الخط</label>
              <select
                id="font_family"
                value={formData.font_family}
                onChange={(e) => handlePreviewUpdate({ font_family: e.target.value })}
              >
                <optgroup label="خطوط النظام">
                  {AVAILABLE_FONTS.filter(f => f.category === 'system').map(font => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="خطوط مُحسنة للعربية">
                  {AVAILABLE_FONTS.filter(f => f.category === 'arabic').map(font => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="خطوط Serif">
                  {AVAILABLE_FONTS.filter(f => f.category === 'serif').map(font => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="خطوط Monospace">
                  {AVAILABLE_FONTS.filter(f => f.category === 'monospace').map(font => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <small>اختر الخط الذي تفضله للواجهة</small>
            </div>

            <div className="form-field">
              <label htmlFor="font_weight">وزن الخط</label>
              <select
                id="font_weight"
                value={formData.font_weight}
                onChange={(e) => handlePreviewUpdate({ font_weight: e.target.value })}
              >
                {FONT_WEIGHTS.map(weight => (
                  <option key={weight.value} value={weight.value}>
                    {weight.name}
                  </option>
                ))}
              </select>
              <small>سماكة الخط المستخدم في النصوص</small>
            </div>
          </div>
        </div>

        {/* Font Size and Spacing */}
        <div className="settings-section">
          <div className="section-header">
            <Settings size={20} />
            <h2>الحجم والمسافات</h2>
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="font_size_scale">
                حجم الخط ({Math.round(formData.font_size_scale * 100)}%)
              </label>
              <input
                type="range"
                id="font_size_scale"
                min="0.7"
                max="1.5"
                step="0.1"
                value={formData.font_size_scale}
                onChange={(e) => handlePreviewUpdate({ font_size_scale: parseFloat(e.target.value) })}
                className="range-slider"
              />
              <div className="range-labels">
                <span>صغير</span>
                <span>متوسط</span>
                <span>كبير</span>
              </div>
              <small>تغيير حجم النص في جميع أنحاء التطبيق</small>
            </div>

            <div className="form-field">
              <label htmlFor="line_height_scale">
                ارتفاع السطر ({Math.round(formData.line_height_scale * 100)}%)
              </label>
              <input
                type="range"
                id="line_height_scale"
                min="0.8"
                max="2.0"
                step="0.1"
                value={formData.line_height_scale}
                onChange={(e) => handlePreviewUpdate({ line_height_scale: parseFloat(e.target.value) })}
                className="range-slider"
              />
              <div className="range-labels">
                <span>مضغوط</span>
                <span>عادي</span>
                <span>واسع</span>
              </div>
              <small>المسافة بين الأسطر لتحسين القراءة</small>
            </div>

            <div className="form-field">
              <label htmlFor="letter_spacing_scale">
                تباعد الأحرف ({Math.round(formData.letter_spacing_scale * 100)}%)
              </label>
              <input
                type="range"
                id="letter_spacing_scale"
                min="0.8"
                max="1.5"
                step="0.05"
                value={formData.letter_spacing_scale}
                onChange={(e) => handlePreviewUpdate({ letter_spacing_scale: parseFloat(e.target.value) })}
                className="range-slider"
              />
              <div className="range-labels">
                <span>ضيق</span>
                <span>عادي</span>
                <span>واسع</span>
              </div>
              <small>المسافة بين الحروف</small>
            </div>
          </div>

          <div className="form-field checkbox-field">
            <label>
              <input
                type="checkbox"
                checked={formData.is_arabic_optimized}
                onChange={(e) => handlePreviewUpdate({ is_arabic_optimized: e.target.checked })}
              />
              <span className="checkmark"></span>
              تحسين للنص العربي
            </label>
            <small>تطبيق تحسينات خاصة بالخطوط العربية وتحسين المسافات</small>
          </div>
        </div>

        {/* Live Preview */}
        <div className="settings-section">
          <div className="section-header">
            <Eye size={20} />
            <h2>معاينة مباشرة</h2>
          </div>
          
          <div className="preview-container">
            <div className="preview-controls">
              <label htmlFor="preview_language">لغة المعاينة:</label>
              <select
                id="preview_language"
                value={previewLanguage}
                onChange={(e) => setPreviewLanguage(e.target.value as 'en' | 'ar' | 'mixed')}
              >
                <option value="mixed">مختلط (عربي/إنجليزي)</option>
                <option value="ar">عربي فقط</option>
                <option value="en">إنجليزي فقط</option>
              </select>
            </div>

            <div className="preview-box" style={{
              fontFamily: formData.font_family,
              fontSize: `${formData.font_size_scale}rem`,
              lineHeight: formData.line_height_scale,
              fontWeight: formData.font_weight,
              letterSpacing: `${(formData.letter_spacing_scale - 1) * 0.5}px`,
            }}>
              <h3 className="preview-heading">{previewText.heading}</h3>
              <p className="preview-body">{previewText.body}</p>
              <div className="preview-numbers">
                <strong>الأرقام / Numbers: </strong>
                <span>{previewText.numbers}</span>
              </div>
              <div className="preview-selected-font">
                <small>الخط المحدد: {selectedFont?.name || formData.font_family}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            type="button" 
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="loading-spinner small" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save size={16} />
                حفظ الإعدادات
              </>
            )}
          </button>

          <button 
            type="button" 
            className="reset-btn"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw size={16} />
            إعادة تعيين
          </button>
        </div>
      </div>

      <style>{`
        .font-settings {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          background: var(--background);
          color: var(--text);
          min-height: 100vh;
        }

        .settings-header {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, var(--accent) 0%, var(--success) 100%);
          border-radius: var(--radius-lg);
          color: var(--button_text);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .settings-subtitle {
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem;
          background: var(--table_header_bg);
          border-bottom: 1px solid var(--border);
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--heading);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
        }

        .form-field label {
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        .form-field select,
        .form-field input[type="range"] {
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--field_bg);
          color: var(--text);
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }

        .form-field select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(32, 118, 255, 0.1);
        }

        .form-field small {
          margin-top: 0.25rem;
          font-size: 0.8rem;
          color: var(--muted_text);
        }

        .range-slider {
          width: 100%;
          height: 6px;
          background: var(--border);
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
        }

        .range-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--accent);
          border-radius: 50%;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(32, 118, 255, 0.3);
        }

        .range-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--accent);
          border: none;
          border-radius: 50%;
          cursor: pointer;
        }

        .range-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: var(--muted_text);
        }

        .checkbox-field label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-field input[type="checkbox"] {
          width: auto;
          margin: 0;
          padding: 0;
          accent-color: var(--accent);
        }

        .preview-container {
          padding: 1.5rem;
        }

        .preview-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .preview-controls label {
          font-weight: 500;
          color: var(--text);
        }

        .preview-controls select {
          padding: 0.5rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--field_bg);
          color: var(--text);
        }

        .preview-box {
          padding: 2rem;
          background: var(--background);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          margin: 1rem 0;
          transition: all var(--transition-fast);
        }

        .preview-heading {
          margin: 0 0 1rem 0;
          color: var(--heading);
          font-size: 1.5em;
        }

        .preview-body {
          margin: 0 0 1rem 0;
          color: var(--text);
          line-height: inherit;
        }

        .preview-numbers {
          margin: 1rem 0;
          padding: 0.75rem;
          background: var(--field_bg);
          border-radius: var(--radius-md);
          color: var(--text);
        }

        .preview-selected-font {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          color: var(--muted_text);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          padding: 1.5rem 0;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent);
          color: var(--button_text);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(32, 118, 255, 0.4);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: var(--muted_text);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .reset-btn:hover:not(:disabled) {
          background: var(--hover-bg);
          color: var(--text);
          border-color: var(--muted_text);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner.small {
          width: 16px;
          height: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 3rem;
          color: var(--muted_text);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .font-settings {
            padding: 1rem;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .preview-box {
            border-width: 3px;
          }
          
          .save-btn, .reset-btn {
            border-width: 2px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default FontSettings
