# Enhanced Sidebar Theme Specification

## Current User Font Selection

### Default Language Settings
- **Current Default Language:** Arabic (`'ar'`)
- **Font Family (Arabic):** `"Segoe UI", "Tahoma", "Arial", sans-serif`
- **Font Family (English):** `"Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif`

### Font Configuration
```typescript
const getFontFamily = (language: Language) => {
  return language === 'ar' 
    ? '"Segoe UI", "Tahoma", "Arial", sans-serif'
    : '"Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif';
};
```

---

## Complete Theme Specification

### Light Theme Colors

#### Primary Palette
```css
--primary-main: #2076FF;        /* Accent Blue */
--primary-light: #4A90FF;      /* Light Blue */
--primary-dark: #1A5FE6;       /* Dark Blue */
--primary-contrastText: #FFFFFF;
```

#### Secondary Palette
```css
--secondary-main: #21C197;      /* Success Green */
```

#### Background Colors
```css
--background-default: #F5F6FA;  /* Main Background */
--background-paper: #FFFFFF;    /* Surface/Card Background */
```

#### Text Colors
```css
--text-primary: #181C23;       /* Primary Text */
--text-secondary: #70778A;      /* Secondary/Muted Text */
--text-disabled: rgba(24, 28, 35, 0.38);
```

#### Border & Divider
```css
--divider: #E2E6ED;            /* Border Color */
```

#### Status Colors
```css
--error-main: #DE3F3F;
--error-light: #FF6B6B;
--error-dark: #C53030;

--warning-main: #FFC048;
--warning-light: #FFD369;
--warning-dark: #F6A000;

--success-main: #21C197;
--success-light: #4ED4A8;
--success-dark: #16A085;

--info-main: #2076FF;
--info-light: #4A90FF;
--info-dark: #1A5FE6;
```

#### Action Colors
```css
--action-hover: rgba(32, 118, 255, 0.08);
--action-selected: rgba(32, 118, 255, 0.12);
--action-disabled: rgba(24, 28, 35, 0.12);
--action-disabledBackground: rgba(24, 28, 35, 0.12);
```

---

### Dark Theme Colors

#### Primary Palette
```css
--primary-main: #2076FF;        /* Accent Blue */
--primary-light: #4A90FF;      /* Light Blue */
--primary-dark: #1A5FE6;       /* Dark Blue */
--primary-contrastText: #FFFFFF;
```

#### Secondary Palette
```css
--secondary-main: #21C197;      /* Success Green */
```

#### Background Colors
```css
--background-default: #181A20;  /* Main Background */
--background-paper: #23272F;    /* Surface/Card Background */
```

#### Text Colors
```css
--text-primary: #EDEDED;       /* Primary Text */
--text-secondary: #8D94A2;      /* Secondary/Muted Text */
--text-disabled: rgba(237, 237, 237, 0.38);
```

#### Border & Divider
```css
--divider: #393C43;            /* Border Color */
```

#### Status Colors
```css
--error-main: #DE3F3F;
--error-light: #FF6B6B;
--error-dark: #C53030;

--warning-main: #FFC048;
--warning-light: #FFD369;
--warning-dark: #F6A000;

--success-main: #21C197;
--success-light: #4ED4A8;
--success-dark: #16A085;

--info-main: #2076FF;
--info-light: #4A90FF;
--info-dark: #1A5FE6;
```

#### Action Colors
```css
--action-hover: rgba(32, 118, 255, 0.08);
--action-selected: rgba(32, 118, 255, 0.12);
--action-disabled: rgba(237, 237, 237, 0.12);
--action-disabledBackground: rgba(237, 237, 237, 0.12);
```

---

## Typography System

### Font Families
```css
/* Arabic */
--font-family-ar: "Segoe UI", "Tahoma", "Arial", sans-serif;

/* English */
--font-family-en: "Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif;
```

### Font Sizes
```css
--font-size-h1: 2.125rem;      /* 34px */
--font-size-h2: 1.875rem;      /* 30px */
--font-size-h3: 1.5rem;        /* 24px */
--font-size-h4: 1.25rem;       /* 20px */
--font-size-h5: 1.125rem;      /* 18px */
--font-size-h6: 1rem;          /* 16px */
--font-size-body1: 0.875rem;   /* 14px */
--font-size-body2: 0.75rem;    /* 12px */
--font-size-caption: 0.75rem;  /* 12px */
```

### Font Weights
```css
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Line Heights
```css
--line-height-tight: 1.2;
--line-height-normal: 1.43;
--line-height-relaxed: 1.6;
```

---

## Sidebar Specific Styling

### Dimensions
```css
--sidebar-width-expanded: 280px;
--sidebar-width-collapsed: 64px;
--sidebar-item-height: 52px;
```

### Border Radius
```css
--border-radius-small: 8px;
--border-radius-medium: 12px;
--border-radius-large: 16px;
--border-radius-xl: 24px;
```

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 20px;
--spacing-2xl: 24px;
--spacing-3xl: 32px;
```

### Shadows
```css
--shadow-light: 0 2px 8px rgba(0,0,0,0.08);
--shadow-medium: 0 4px 12px rgba(0,0,0,0.15);
--shadow-heavy: 0 8px 24px rgba(0,0,0,0.20);
--shadow-sidebar: 4px 0 24px rgba(0, 0, 0, 0.12);
```

### Transitions
```css
--transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Sidebar Component States

### Default State
```css
.sidebar-item {
  background-color: transparent;
  color: var(--text-primary);
  border-radius: var(--border-radius-medium);
  min-height: var(--sidebar-item-height);
  transition: var(--transition-normal);
}
```

### Hover State
```css
.sidebar-item:hover {
  background-color: var(--action-hover);
  transform: translateX(4px);
  box-shadow: var(--shadow-medium);
}
```

### Active State
```css
.sidebar-item.active {
  background-color: var(--primary-main);
  color: var(--primary-contrastText);
  border: 1px solid var(--primary-light);
}
```

### Active Hover State
```css
.sidebar-item.active:hover {
  background-color: var(--primary-dark);
}
```

### Expanded Parent State
```css
.sidebar-item.expanded {
  background-color: var(--action-selected);
  color: var(--primary-main);
}
```

---

## RTL Support

### Direction Configuration
```css
/* LTR (English) */
[dir="ltr"] {
  direction: ltr;
}

/* RTL (Arabic) */
[dir="rtl"] {
  direction: rtl;
}
```

### RTL Adjustments
```css
[dir="rtl"] .sidebar-item {
  /* Flip margins and padding */
  margin-left: var(--spacing-sm);
  margin-right: 0;
  padding-left: var(--spacing-lg);
  padding-right: var(--spacing-md);
}

[dir="rtl"] .sidebar {
  /* Flip shadow and border */
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  border-left: 1px solid var(--divider);
  border-right: none;
}
```

---

## Gradients

### Header Background
```css
.header-gradient {
  background: linear-gradient(135deg, 
    rgba(32, 118, 255, 0.15) 0%, 
    rgba(74, 144, 255, 0.10) 100%);
}
```

### Logo Background
```css
.logo-gradient {
  background: linear-gradient(135deg, 
    var(--primary-main) 0%, 
    var(--primary-dark) 100%);
}
```

### Active Item Accent
```css
.accent-gradient {
  background: linear-gradient(180deg, 
    var(--primary-contrastText) 0%, 
    rgba(255, 255, 255, 0.8) 100%);
}
```

---

## Animation Keyframes

### Fade In Animation
```css
@keyframes fadeIn {
  0% { 
    opacity: 0; 
    transform: translateX(-10px); 
  }
  100% { 
    opacity: 1; 
    transform: translateX(0); 
  }
}
```

### Slide In Animation
```css
@keyframes slideIn {
  0% { 
    opacity: 0; 
    transform: translateY(-10px); 
  }
  100% { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
```

---

## Usage Examples

### React Component Implementation
```tsx
import { useAppStore } from './store/useAppStore';

const SidebarItem = ({ isActive, children }) => {
  const { language, theme } = useAppStore();
  const isRtl = language === 'ar';
  const isDark = theme === 'dark';

  return (
    <div
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        fontFamily: isRtl 
          ? '"Segoe UI", "Tahoma", "Arial", sans-serif'
          : '"Segoe UI", "Tahoma", "Geneva", "Verdana", sans-serif',
        backgroundColor: isActive 
          ? '#2076FF' 
          : 'transparent',
        color: isActive 
          ? '#FFFFFF' 
          : isDark ? '#EDEDED' : '#181C23',
      }}
    >
      {children}
    </div>
  );
};
```

### CSS Custom Properties Usage
```css
.sidebar {
  font-family: var(--font-family-ar);
  background-color: var(--background-paper);
  color: var(--text-primary);
  width: var(--sidebar-width-expanded);
  transition: var(--transition-normal);
}

.sidebar.collapsed {
  width: var(--sidebar-width-collapsed);
}

.sidebar-item:hover {
  background-color: var(--action-hover);
  transform: translateX(4px);
  box-shadow: var(--shadow-medium);
}
```

---

## Implementation Notes

1. **Font Priority:** The system uses Segoe UI as the primary font with fallbacks for both Arabic and English
2. **Theme Persistence:** Theme and language preferences are persisted in localStorage
3. **RTL Support:** Full RTL support with proper direction handling and flipped layouts
4. **Accessibility:** All color combinations meet WCAG AA contrast requirements
5. **Performance:** CSS custom properties enable efficient theme switching
6. **Responsive:** Sidebar collapses appropriately on smaller screens

This specification provides a complete reference for implementing the exact same styling and behavior in your new application.
