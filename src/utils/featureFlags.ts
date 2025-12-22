import React from 'react';

/**
 * Feature Flags System for Performance Optimizations
 * 
 * This system allows gradual rollout and safe testing of performance optimizations
 * with the ability to quickly rollback if issues are detected.
 */

interface FeatureFlagConfig {
  // Phase 1: Quick Wins (Always enabled in production)
  EXTENDED_AUTH_CACHE: boolean;
  NETWORK_AWARE_PRELOADING: boolean;
  ENHANCED_LOADING_INDICATORS: boolean;
  
  // Phase 2: Core Optimizations (Flag-controlled)
  PARALLEL_AUTH_QUERIES: boolean;
  PERMISSION_CACHING: boolean;
  SMART_ROUTE_PRELOADING: boolean;
  
  // Debug flags
  PERFORMANCE_LOGGING: boolean;
  DEBUG_CACHE: boolean;
}

// Default configuration
const DEFAULT_FLAGS: FeatureFlagConfig = {
  // Phase 1: Quick Wins - enabled by default
  EXTENDED_AUTH_CACHE: true,
  NETWORK_AWARE_PRELOADING: true,
  ENHANCED_LOADING_INDICATORS: true,
  
  // Phase 2: Core Optimizations - disabled by default for safe rollout
  PARALLEL_AUTH_QUERIES: false,
  PERMISSION_CACHING: false,
  SMART_ROUTE_PRELOADING: false,
  
  // Debug flags - disabled in production
  PERFORMANCE_LOGGING: import.meta.env.DEV,
  DEBUG_CACHE: import.meta.env.DEV
};

// Feature flag storage key
const FEATURE_FLAG_STORAGE_KEY = 'accounting_app_feature_flags';

/**
 * Feature Flags Manager
 * 
 * Manages feature flag state with localStorage persistence
 * and provides methods to toggle features safely.
 */
export class FeatureFlags {
  private static instance: FeatureFlags;
  private flags: FeatureFlagConfig;
  private listeners: Array<(flags: FeatureFlagConfig) => void> = [];
  
  private constructor() {
    // Load from localStorage or use defaults
    this.flags = this.loadFromStorage() || { ...DEFAULT_FLAGS };
  }
  
  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }
  
  /**
   * Get current flag configuration
   */
  public getFlags(): FeatureFlagConfig {
    return { ...this.flags };
  }
  
  /**
   * Get specific flag value
   */
  public isEnabled(flag: keyof FeatureFlagConfig): boolean {
    return this.flags[flag] || false;
  }
  
  /**
   * Set flag value and persist to storage
   */
  public setFlag(flag: keyof FeatureFlagConfig, enabled: boolean): void {
    // Prevent disabling Phase 1 features in production
    if (import.meta.env.PROD && 
        ['EXTENDED_AUTH_CACHE', 'NETWORK_AWARE_PRELOADING', 'ENHANCED_LOADING_INDICATORS'].includes(flag)) {
      console.warn(`[FeatureFlags] Cannot disable Phase 1 feature ${flag} in production`);
      return;
    }
    
    this.flags[flag] = enabled;
    this.saveToStorage();
    this.notifyListeners();
    
    if (import.meta.env.DEV) {
      console.log(`[FeatureFlags] ${flag} = ${enabled}`);
    }
  }
  
  /**
   * Enable all Phase 2 features
   */
  public enableAllPhase2(): void {
    this.setFlag('PARALLEL_AUTH_QUERIES', true);
    this.setFlag('PERMISSION_CACHING', true);
    this.setFlag('SMART_ROUTE_PRELOADING', true);
  }
  
  /**
   * Disable all Phase 2 features (emergency rollback)
   */
  public disableAllPhase2(): void {
    this.setFlag('PARALLEL_AUTH_QUERIES', false);
    this.setFlag('PERMISSION_CACHING', false);
    this.setFlag('SMART_ROUTE_PRELOADING', false);
  }
  
  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveToStorage();
    this.notifyListeners();
    if (import.meta.env.DEV) {
      console.log('[FeatureFlags] Reset to default configuration');
    }
  }
  
  /**
   * Check if all Phase 2 features are enabled
   */
  public areAllPhase2Enabled(): boolean {
    return this.flags.PARALLEL_AUTH_QUERIES &&
           this.flags.PERMISSION_CACHING &&
           this.flags.SMART_ROUTE_PRELOADING;
  }
  
  /**
   * Subscribe to flag changes
   */
  public onChange(callback: (flags: FeatureFlagConfig) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getFlags()));
  }
  
  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): FeatureFlagConfig | null {
    try {
      const stored = localStorage.getItem(FEATURE_FLAG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate structure
        if (this.isValidFlagConfig(parsed)) {
          if (import.meta.env.DEV) {
            console.log('[FeatureFlags] Loaded from storage');
          }
          return parsed;
        }
      }
    } catch (error) {
      console.error('[FeatureFlags] Failed to load from storage:', error);
    }
    return null;
  }
  
  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(FEATURE_FLAG_STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.error('[FeatureFlags] Failed to save to storage:', error);
    }
  }
  
  /**
   * Validate flag configuration structure
   */
  private isValidFlagConfig(config: any): config is FeatureFlagConfig {
    const requiredFlags = [
      'EXTENDED_AUTH_CACHE',
      'NETWORK_AWARE_PRELOADING',
      'ENHANCED_LOADING_INDICATORS',
      'PARALLEL_AUTH_QUERIES',
      'PERMISSION_CACHING',
      'SMART_ROUTE_PRELOADING'
    ];
    
    return requiredFlags.every(flag => typeof config[flag] === 'boolean');
  }
  
  /**
   * Get URL parameter overrides for testing
   */
  public checkUrlOverrides(): void {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    
    // Phase 2 feature overrides
    if (params.has('enable_phase2')) {
      this.enableAllPhase2();
    }
    
    if (params.has('disable_phase2')) {
      this.disableAllPhase2();
    }
    
    // Individual flag overrides
    if (params.has('parallel_auth')) {
      this.setFlag('PARALLEL_AUTH_QUERIES', params.get('parallel_auth') === 'true');
    }
    
    if (params.has('permission_cache')) {
      this.setFlag('PERMISSION_CACHING', params.get('permission_cache') === 'true');
    }
    
    if (params.has('smart_preload')) {
      this.setFlag('SMART_ROUTE_PRELOADING', params.get('smart_preload') === 'true');
    }
    
    // Debug flags
    if (params.has('debug')) {
      this.setFlag('PERFORMANCE_LOGGING', true);
      this.setFlag('DEBUG_CACHE', true);
    }
  }
}

// Singleton instance
const featureFlags = FeatureFlags.getInstance();

// Check URL overrides on initialization
if (typeof window !== 'undefined') {
  featureFlags.checkUrlOverrides();
}

// Export singleton instance
export default featureFlags;

// Convenience exports
export const isFeatureEnabled = (flag: keyof FeatureFlagConfig): boolean => {
  return featureFlags.isEnabled(flag);
};

// Hook for React components
export const useFeatureFlags = () => {
  const [flags, setFlags] = React.useState<FeatureFlagConfig>(featureFlags.getFlags());
  
  React.useEffect(() => {
    const unsubscribe = featureFlags.onChange((newFlags) => {
      setFlags({ ...newFlags });
    });
    
    return unsubscribe;
  }, []);
  
  return flags;
};

// Server-side rendering support
export const getServerSideFlags = (): FeatureFlagConfig => {
  // On server, return default flags without localStorage
  return { ...DEFAULT_FLAGS };
};

/**
 * Feature Flag Provider for React
 * 
 * Provides feature flag context to the entire application
 */
export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = React.useState<FeatureFlagConfig>(featureFlags.getFlags());
  
  React.useEffect(() => {
    const unsubscribe = featureFlags.onChange((newFlags) => {
      setFlags({ ...newFlags });
    });
    
    return unsubscribe;
  }, []);
  
  return React.createElement(FeatureFlagContext.Provider, { value: flags }, children);
};

// Create context
const FeatureFlagContext = React.createContext<FeatureFlagConfig>(DEFAULT_FLAGS);

// Custom hook for using feature flags in components
export const useFeatureFlag = (flag: keyof FeatureFlagConfig): boolean => {
  const flags = React.useContext(FeatureFlagContext);
  return flags[flag] || false;
};

/**
 * Feature Flag UI Component
 * 
 * Provides a UI for managing feature flags in development
 */
export const FeatureFlagPanel: React.FC = () => {
  const flags = useFeatureFlags();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const toggleFlag = (flag: keyof FeatureFlagConfig) => {
    featureFlags.setFlag(flag, !featureFlags.isEnabled(flag));
  };
  
  const toggleAllPhase2 = () => {
    if (featureFlags.areAllPhase2Enabled()) {
      featureFlags.disableAllPhase2();
    } else {
      featureFlags.enableAllPhase2();
    }
  };
  
  if (!import.meta.env.DEV) return null;
  
  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
      },
    },
    React.createElement(
      'button',
      {
        onClick: () => setIsOpen(!isOpen),
        style: {
          padding: '10px 15px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        },
      },
      isOpen ? '✕ Close Flags' : '🚩 Feature Flags'
    ),
    isOpen &&
      React.createElement(
        'div',
        {
          style: {
            position: 'absolute',
            bottom: '60px',
            right: '0',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            width: '300px',
          },
        },
        React.createElement('h3', { style: { marginTop: '0', fontSize: '16px', color: '#333' } }, 'Feature Flags'),
        React.createElement(
          'div',
          { style: { marginBottom: '15px' } },
          React.createElement('strong', null, 'Phase 1 (Quick Wins)'),
          React.createElement(
            'div',
            { style: { marginTop: '5px', fontSize: '13px' } },
            React.createElement('div', null, '✅ Extended Auth Cache'),
            React.createElement('div', null, '✅ Network-Aware Preloading'),
            React.createElement('div', null, '✅ Enhanced Loading Indicators')
          )
        ),
        React.createElement(
          'div',
          { style: { marginBottom: '15px' } },
          React.createElement('strong', null, 'Phase 2 (Core Optimizations)'),
          React.createElement(
            'div',
            { style: { marginTop: '5px' } },
            React.createElement(
              'button',
              {
                onClick: toggleAllPhase2,
                style: {
                  padding: '5px 10px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginBottom: '5px',
                },
              },
              flags.PARALLEL_AUTH_QUERIES ? 'Disable All' : 'Enable All'
            ),
            React.createElement(
              'div',
              { style: { fontSize: '13px' } },
              React.createElement(
                'label',
                { style: { display: 'flex', alignItems: 'center', margin: '3px 0' } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: flags.PARALLEL_AUTH_QUERIES,
                  onChange: () => toggleFlag('PARALLEL_AUTH_QUERIES'),
                  style: { marginRight: '8px' },
                }),
                'Parallel Auth Queries'
              ),
              React.createElement(
                'label',
                { style: { display: 'flex', alignItems: 'center', margin: '3px 0' } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: flags.PERMISSION_CACHING,
                  onChange: () => toggleFlag('PERMISSION_CACHING'),
                  style: { marginRight: '8px' },
                }),
                'Permission Caching'
              ),
              React.createElement(
                'label',
                { style: { display: 'flex', alignItems: 'center', margin: '3px 0' } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: flags.SMART_ROUTE_PRELOADING,
                  onChange: () => toggleFlag('SMART_ROUTE_PRELOADING'),
                  style: { marginRight: '8px' },
                }),
                'Smart Route Preloading'
              )
            )
          )
        ),
        React.createElement(
          'div',
          { style: { marginBottom: '15px' } },
          React.createElement('strong', null, 'Debug Flags'),
          React.createElement(
            'div',
            { style: { marginTop: '5px', fontSize: '13px' } },
            React.createElement(
              'label',
              { style: { display: 'flex', alignItems: 'center', margin: '3px 0' } },
              React.createElement('input', {
                type: 'checkbox',
                checked: flags.PERFORMANCE_LOGGING,
                onChange: () => toggleFlag('PERFORMANCE_LOGGING'),
                style: { marginRight: '8px' },
              }),
              'Performance Logging'
            ),
            React.createElement(
              'label',
              { style: { display: 'flex', alignItems: 'center', margin: '3px 0' } },
              React.createElement('input', {
                type: 'checkbox',
                checked: flags.DEBUG_CACHE,
                onChange: () => toggleFlag('DEBUG_CACHE'),
                style: { marginRight: '8px' },
              }),
              'Debug Cache'
            )
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => featureFlags.resetToDefaults(),
            style: {
              padding: '5px 10px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            },
          },
          'Reset to Defaults'
        )
      )
  );
};

/**
 * Feature Flag Helper Hooks
 * 
 * Convenience hooks for common flag checks
 */

// Check if Phase 2 features are enabled
export const usePhase2Features = (): boolean => {
  const flags = useFeatureFlags();
  return flags.PARALLEL_AUTH_QUERIES && 
         flags.PERMISSION_CACHING && 
         flags.SMART_ROUTE_PRELOADING;
};

// Check if any Phase 2 feature is enabled
export const useAnyPhase2Feature = (): boolean => {
  const flags = useFeatureFlags();
  return flags.PARALLEL_AUTH_QUERIES || 
         flags.PERMISSION_CACHING || 
         flags.SMART_ROUTE_PRELOADING;
};

// Export types for TypeScript
export type { FeatureFlagConfig };

/**
 * Usage Examples
 * 
 * // Basic usage
 * if (isFeatureEnabled('PARALLEL_AUTH_QUERIES')) {
 *   // Use parallel auth implementation
 * }
 * 
 * // React component usage
 * const flags = useFeatureFlags();
 * if (flags.PARALLEL_AUTH_QUERIES) {
 *   // Parallel implementation
 * } else {
 *   // Sequential fallback
 * }
 * 
 * // URL override examples
 * // http://app.com/?enable_phase2 - Enable all Phase 2 features
 * // http://app.com/?parallel_auth=true - Enable parallel auth only
 */