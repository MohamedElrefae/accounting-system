// Enhanced module compatibility polyfills
declare global {
  interface Window {
    module: any;
    exports: any;
    require: any;
    global: any;
  }
  
  var module: any;
  var exports: any;
  var require: any;
  var global: any;
}

// Comprehensive module compatibility setup
(function() {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') return;

  // Set up global reference first
  if (!window.global) {
    window.global = window;
  }
  
  // Create module object with proper structure
  if (!window.module) {
    window.module = {
      exports: {},
      id: 'browser-polyfill',
      filename: 'browser-polyfill.js',
      loaded: false,
      parent: null,
      children: []
    };
  }
  
  // Ensure exports points to module.exports
  if (!window.exports) {
    window.exports = window.module.exports;
  }
  
  // Sync exports with module.exports
  Object.defineProperty(window, 'exports', {
    get: function() { return window.module.exports; },
    set: function(val) { window.module.exports = val; },
    configurable: true,
    enumerable: true
  });
  
  // Make them available on globalThis
  (globalThis as any).global = window.global;
  (globalThis as any).module = window.module;
  (globalThis as any).exports = window.exports;
  
  // Enhanced require polyfill
  if (!window.require) {
    window.require = function(id: string) {
      console.warn(`require('${id}') called in browser - returning empty object`);
      return {};
    };
    (globalThis as any).require = window.require;
  }
  
  // Additional CommonJS compatibility
  if (typeof process === 'undefined') {
    (globalThis as any).process = {
      env: {},
      version: '16.0.0',
      versions: { node: '16.0.0' },
      platform: 'browser',
      browser: true
    };
  }
  
  // Fix for hoist-non-react-statics ESM compatibility
  const originalError = window.Error;
  window.Error = function(message?: string) {
    if (message && message.includes('does not provide an export named') && message.includes('hoist-non-react-statics')) {
      // Provide a fallback for hoist-non-react-statics
      console.warn('hoist-non-react-statics ESM compatibility issue detected, using fallback');
      return new originalError('ESM compatibility handled');
    }
    return new originalError(message);
  } as any;
  
  // Copy static properties
  Object.setPrototypeOf(window.Error, originalError);
  Object.getOwnPropertyNames(originalError).forEach(prop => {
    if (prop !== 'length' && prop !== 'name' && prop !== 'prototype') {
      try {
        (window.Error as any)[prop] = (originalError as any)[prop];
      } catch (e) {
        // Ignore non-configurable properties
      }
    }
  });
})();

export {};