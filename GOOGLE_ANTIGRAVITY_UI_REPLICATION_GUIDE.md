# Google Antigravity UI Replication Guide

## Overview
This guide provides detailed instructions for replicating the hover effects, colors, and interactions from Google's Antigravity AI agent interface. The design features a futuristic, weightless aesthetic with microgravity-style animations and a custom color palette.

## Color System

### Primary Antigravity Color Palette
```css
:root {
  /* Core Antigravity Colors */
  --zero-g-white: #FFFFFF;
  --event-horizon-black: #0A0A0F;
  --ion-glow-blue: #2076FF;
  --quantum-mint: #21C197;
  --gravity-well-pink: #FF6B9D;
  
  /* Supporting Colors */
  --cosmic-gray: #70778A;
  --stellar-surface: #F5F6FA;
  --deep-space: #181A20;
  --nebula-purple: #8B5CF6;
  --aurora-teal: #14B8A6;
  
  /* Semantic Colors */
  --success: var(--quantum-mint);
  --warning: #FFC048;
  --error: #DE3F3F;
  --info: var(--ion-glow-blue);
}
```

### Dark Theme Variations
```css
[data-theme="dark"] {
  --stellar-surface: #23272F;
  --deep-space: #181A20;
  --cosmic-gray: #8D94A2;
  --zero-g-white: #EDEDED;
}
```

## Typography System

### Font Stack
```css
:root {
  --font-primary: 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Typography Scale
```css
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
```

## Card Hover Effects

### Basic Drifting Card
```css
.antigravity-card {
  background: var(--zero-g-white);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.antigravity-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(32, 118, 255, 0.05) 0%, 
    rgba(33, 193, 151, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.antigravity-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 12px 24px rgba(32, 118, 255, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(32, 118, 255, 0.2);
}

.antigravity-card:hover::before {
  opacity: 1;
}

.antigravity-card:active {
  transform: translateY(-2px) scale(1.01);
  transition: all 0.1s ease;
}
```

### Floating Card with Microgravity Motion
```css
.floating-card {
  animation: float 6s ease-in-out infinite;
  background: var(--zero-g-white);
  border-radius: 20px;
  padding: 24px;
  position: relative;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.floating-card:hover {
  animation-play-state: paused;
  transform: translateY(-12px) rotateX(5deg) rotateY(5deg);
  box-shadow: 
    0 20px 40px rgba(32, 118, 255, 0.2),
    0 12px 24px rgba(0, 0, 0, 0.15);
}

.floating-card::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, 
    var(--ion-glow-blue), 
    var(--quantum-mint), 
    var(--gravity-well-pink));
  border-radius: 20px;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  filter: blur(8px);
}

.floating-card:hover::after {
  opacity: 0.6;
}
```

## Button Hover Effects

### Primary Antigravity Button
```css
.btn-primary {
  background: linear-gradient(135deg, var(--ion-glow-blue), #1A5FE6);
  color: var(--zero-g-white);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255, 255, 255, 0.3), 
    transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 16px rgba(32, 118, 255, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #4A90FF, var(--ion-glow-blue));
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(32, 118, 255, 0.2);
}
```

### Secondary Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: var(--ion-glow-blue);
  border: 2px solid var(--ion-glow-blue);
  border-radius: 12px;
  padding: 10px 22px;
  font-weight: 600;
  font-size: 0.875rem;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
}

.btn-ghost::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--ion-glow-blue);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.btn-ghost:hover {
  color: var(--zero-g-white);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(32, 118, 255, 0.2);
}

.btn-ghost:hover::before {
  transform: scaleX(1);
}
```

### Floating Action Button
```css
.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--gravity-well-pink), var(--nebula-purple));
  border: none;
  color: var(--zero-g-white);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.fab::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, 
    var(--gravity-well-pink), 
    var(--nebula-purple), 
    var(--ion-glow-blue));
  border-radius: 50%;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.3s ease;
  filter: blur(4px);
}

.fab:hover {
  transform: scale(1.1) rotate(15deg);
  box-shadow: 
    0 12px 24px rgba(139, 92, 246, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.2);
}

.fab:hover::before {
  opacity: 0.7;
}

.fab:active {
  transform: scale(1.05) rotate(10deg);
}
```

## Interactive Elements

### Search Bar with Floating Effect
```css
.search-container {
  position: relative;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 16px 20px 16px 48px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--stellar-surface);
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.search-input:focus {
  outline: none;
  border-color: var(--ion-glow-blue);
  background: var(--zero-g-white);
  box-shadow: 
    0 8px 24px rgba(32, 118, 255, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--cosmic-gray);
  transition: color 0.3s ease;
}

.search-input:focus + .search-icon {
  color: var(--ion-glow-blue);
}
```

### Toggle Switch with Antigravity Styling
```css
.toggle-switch {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--cosmic-gray);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: var(--zero-g-white);
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active {
  background: linear-gradient(90deg, var(--ion-glow-blue), var(--quantum-mint));
}

.toggle-switch.active::before {
  transform: translateX(24px);
  box-shadow: 0 4px 8px rgba(32, 118, 255, 0.3);
}

.toggle-switch:hover::before {
  transform: scale(1.1);
}

.toggle-switch.active:hover::before {
  transform: translateX(24px) scale(1.1);
}
```

## Advanced Hover Effects

### Particle Field Background Effect
```css
.particle-field {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: -1;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: var(--ion-glow-blue);
  border-radius: 50%;
  opacity: 0.3;
  animation: drift 20s infinite linear;
}

@keyframes drift {
  0% {
    transform: translate(0, 100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translate(100px, -100vh) rotate(360deg);
    opacity: 0;
  }
}

/* Generate multiple particles with different delays */
.particle:nth-child(1) { left: 10%; animation-delay: 0s; }
.particle:nth-child(2) { left: 20%; animation-delay: 2s; }
.particle:nth-child(3) { left: 30%; animation-delay: 4s; }
.particle:nth-child(4) { left: 40%; animation-delay: 6s; }
.particle:nth-child(5) { left: 50%; animation-delay: 8s; }
.particle:nth-child(6) { left: 60%; animation-delay: 10s; }
.particle:nth-child(7) { left: 70%; animation-delay: 12s; }
.particle:nth-child(8) { left: 80%; animation-delay: 14s; }
.particle:nth-child(9) { left: 90%; animation-delay: 16s; }
.particle:nth-child(10) { left: 95%; animation-delay: 18s; }
```

### Glow Effect on Hover
```css
.glow-effect {
  position: relative;
  transition: all 0.3s ease;
}

.glow-effect::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, 
    rgba(32, 118, 255, 0.3) 0%, 
    transparent 70%);
  transform: translate(-50%, -50%);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: -1;
}

.glow-effect:hover::before {
  width: 200%;
  height: 200%;
}

.glow-effect:hover {
  transform: translateY(-2px);
  color: var(--ion-glow-blue);
}
```

## React Component Examples

### Antigravity Card Component
```jsx
import React from 'react';
import './AntigravityCard.css';

const AntigravityCard = ({ children, className = '', floating = false }) => {
  const cardClass = `antigravity-card ${floating ? 'floating-card' : ''} ${className}`;
  
  return (
    <div className={cardClass}>
      {children}
    </div>
  );
};

export default AntigravityCard;
```

### Antigravity Button Component
```jsx
import React from 'react';
import './AntigravityButton.css';

const AntigravityButton = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  disabled = false 
}) => {
  const buttonClass = `btn-${variant} ${className}`;
  
  return (
    <button 
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default AntigravityButton;
```

## Implementation Tips

### 1. Performance Optimization
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Limit the number of animated elements on screen
- Use `will-change` sparingly and only when needed
- Implement reduced motion preferences for accessibility

### 2. Accessibility Considerations
```css
@media (prefers-reduced-motion: reduce) {
  .antigravity-card,
  .floating-card,
  .btn-primary,
  .btn-ghost,
  .fab {
    animation: none;
    transition: none;
  }
  
  .antigravity-card:hover {
    transform: none;
  }
}
```

### 3. RTL Support
```css
[dir="rtl"] .btn-ghost::before {
  transform-origin: right;
}

[dir="rtl"] .toggle-switch.active::before {
  transform: translateX(-24px);
}
```

### 4. Dark Mode Integration
```css
@media (prefers-color-scheme: dark) {
  .antigravity-card {
    background: var(--stellar-surface);
    color: var(--zero-g-white);
  }
  
  .search-input {
    background: rgba(35, 39, 47, 0.8);
    color: var(--zero-g-white);
  }
}
```

## Testing Checklist

### Visual Testing
- [ ] Hover effects work smoothly on all interactive elements
- [ ] Colors match the Antigravity palette in both light and dark modes
- [ ] Animations feel weightless and futuristic
- [ ] Border effects appear correctly on hover
- [ ] Glow effects are subtle but noticeable

### Functional Testing
- [ ] All buttons remain clickable during hover states
- [ ] Cards don't interfere with nearby elements when lifting
- [ ] Search input maintains focus state properly
- [ ] Toggle switches respond correctly to clicks

### Responsive Testing
- [ ] Effects work on mobile devices
- [ ] Touch interactions feel natural
- [ ] Performance remains smooth on lower-end devices

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Fallbacks for Older Browsers
```css
.antigravity-card {
  /* Fallback for browsers without CSS custom properties */
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@supports (backdrop-filter: blur(10px)) {
  .search-input {
    backdrop-filter: blur(10px);
  }
}
```

## Conclusion

This guide provides the foundation for replicating Google's Antigravity UI aesthetic. The key principles are:

1. **Weightless Design**: Elements should feel like they're floating or drifting
2. **Smooth Transitions**: Use cubic-bezier easing for natural motion
3. **Subtle Gradients**: Apply gradient overlays for depth without overwhelming
4. **Consistent Color System**: Stick to the Antigravity palette for cohesion
5. **Micro-interactions**: Small hover effects that provide feedback

Remember to test thoroughly and adjust the intensity of effects based on your specific use case and audience preferences.
