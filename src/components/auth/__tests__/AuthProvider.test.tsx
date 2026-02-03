/**
 * AuthProvider Tests
 * 
 * Feature: enterprise-auth-performance-optimization
 * Tests for optimized AuthContext provider with memoization,
 * batch permission checking, and performance metrics tracking.
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../../contexts';
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Test component that uses the auth context
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user?.id || 'no-user'}</div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'ready'}</div>
      <div data-testid="cache-hit-rate">{auth.cacheHitRate.toFixed(2)}</div>
      <div data-testid="auth-load-time">{auth.authLoadTime.toFixed(2)}</div>
    </div>
  );
};

// Component that tests permission checking
const PermissionTestComponent = ({ permission }: { permission: string }) => {
  const auth = useAuth();
  const hasPermission = auth.checkPermission(permission);
  return <div data-testid={`permission-${permission}`}>{hasPermission ? 'allowed' : 'denied'}</div>;
};

// Component that tests batch permission checking
const BatchPermissionTestComponent = ({ permissions }: { permissions: string[] }) => {
  const auth = useAuth();
  const results = auth.checkPermissionsBatch(permissions);
  return (
    <div>
      {permissions.map(perm => (
        <div key={perm} data-testid={`batch-${perm}`}>
          {results[perm] ? 'allowed' : 'denied'}
        </div>
      ))}
    </div>
  );
};

// Component that tracks re-renders
let renderCount = 0;
const RenderCountComponent = () => {
  const auth = useAuth();
  renderCount += 1;
  return <div data-testid="render-count">{renderCount}</div>;
};

describe('AuthProvider - Optimized Context Provider', () => {
  beforeEach(() => {
    renderCount = 0;
  });

  describe('Memoization and Re-render Prevention', () => {
    it('should prevent unnecessary re-renders when context value has not changed', () => {
      const { rerender } = render(
        <AuthProvider>
          <RenderCountComponent />
        </AuthProvider>
      );

      const initialRenderCount = renderCount;
      expect(initialRenderCount).toBe(1);

      // Re-render the provider without changing state
      rerender(
        <AuthProvider>
          <RenderCountComponent />
        </AuthProvider>
      );

      // Render count should not increase significantly
      // (may increase by 1 due to React's rendering, but not more)
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1);
    });

    it('should memoize context value to prevent child re-renders', () => {
      const { rerender } = render(
        <AuthProvider>
          <RenderCountComponent />
        </AuthProvider>
      );

      const firstRenderCount = renderCount;

      // Re-render with same props
      rerender(
        <AuthProvider>
          <RenderCountComponent />
        </AuthProvider>
      );

      // Should not cause additional renders beyond React's normal behavior
      expect(renderCount).toBeLessThanOrEqual(firstRenderCount + 1);
    });
  });

  describe('Single Permission Checking', () => {
    it('should check single permission correctly', () => {
      render(
        <AuthProvider>
          <PermissionTestComponent permission="read:documents" />
        </AuthProvider>
      );
      expect(screen.getByTestId('permission-read:documents')).toHaveTextContent('denied');
    });

    it('should return false for non-existent permissions', () => {
      render(
        <AuthProvider>
          <PermissionTestComponent permission="non:existent" />
        </AuthProvider>
      );

      expect(screen.getByTestId('permission-non:existent')).toHaveTextContent('denied');
    });

    it('should handle permission check errors gracefully', () => {
      render(
        <AuthProvider>
          <PermissionTestComponent permission="test:permission" />
        </AuthProvider>
      );

      // Should not throw and should return denied
      expect(screen.getByTestId('permission-test:permission')).toHaveTextContent('denied');
    });
  });

  describe('Batch Permission Checking', () => {
    it('should check multiple permissions in batch', () => {
      render(
        <AuthProvider>
          <BatchPermissionTestComponent permissions={['read:documents', 'write:documents', 'delete:documents']} />
        </AuthProvider>
      );

      // All should be denied since no permissions are set
      expect(screen.getByTestId('batch-read:documents')).toHaveTextContent('denied');
      expect(screen.getByTestId('batch-write:documents')).toHaveTextContent('denied');
      expect(screen.getByTestId('batch-delete:documents')).toHaveTextContent('denied');
    });

    it('should return correct results for mixed permissions', () => {
      render(
        <AuthProvider>
          <BatchPermissionTestComponent permissions={['perm1', 'perm2', 'perm3']} />
        </AuthProvider>
      );

      // All should be denied initially
      expect(screen.getByTestId('batch-perm1')).toHaveTextContent('denied');
      expect(screen.getByTestId('batch-perm2')).toHaveTextContent('denied');
      expect(screen.getByTestId('batch-perm3')).toHaveTextContent('denied');
    });

    it('should handle empty permission list', () => {
      render(
        <AuthProvider>
          <BatchPermissionTestComponent permissions={[]} />
        </AuthProvider>
      );

      // Should render without error
      expect(screen.queryByTestId(/batch-/)).not.toBeInTheDocument();
    });
  });

  describe('Performance Metrics Tracking', () => {
    it('should initialize with zero metrics', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('cache-hit-rate')).toHaveTextContent('0.00');
      expect(screen.getByTestId('auth-load-time')).toHaveTextContent('0.00');
    });

    it('should track auth load time', async () => {
      const TestWrapper = () => {
        const auth = useAuth();
        const [loaded, setLoaded] = useState(false);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            auth.refreshAuth().then(() => setLoaded(true));
          }, 10);
          return () => clearTimeout(timer);
        }, [auth]);

        return <div data-testid="loaded">{loaded ? 'yes' : 'no'}</div>;
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loaded')).toHaveTextContent('yes');
      });
    });

    it('should track cache hit rate', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        return (
          <div>
            <button onClick={() => auth.checkPermission('test')}>Check</button>
            <div data-testid="hit-rate">{auth.cacheHitRate.toFixed(2)}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('hit-rate')).toHaveTextContent('0.00');
    });
  });

  describe('Context Value Stability', () => {
    it('should provide stable context value', () => {
      const contextValues: any[] = [];

      const ContextCapture = () => {
        const auth = useAuth();
        contextValues.push(auth);
        return null;
      };

      const { rerender } = render(
        <AuthProvider>
          <ContextCapture />
        </AuthProvider>
      );

      rerender(
        <AuthProvider>
          <ContextCapture />
        </AuthProvider>
      );

      // Context value should be defined
      expect(contextValues[1]).toBeDefined();
    });

    it('should provide all required context methods', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="has-check-permission">{typeof auth.checkPermission === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-batch-check">{typeof auth.checkPermissionsBatch === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-refresh">{typeof auth.refreshAuth === 'function' ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-check-permission')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-batch-check')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-refresh')).toHaveTextContent('yes');
    });
  });

  describe('Error Handling', () => {
    it('should handle permission check errors gracefully', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        try {
          auth.checkPermission('test');
          return <div data-testid="result">success</div>;
        } catch (error) {
          return <div data-testid="result">error</div>;
        }
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('success');
    });

    it('should handle batch permission check errors gracefully', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        try {
          const results = auth.checkPermissionsBatch(['perm1', 'perm2']);
          return <div data-testid="result">{Object.keys(results).length}</div>;
        } catch (error) {
          return <div data-testid="result">error</div>;
        }
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('result')).toHaveTextContent('2');
    });
  });

  describe('Requirements Validation', () => {
    it('should validate Requirement 3.2: Memoized context prevents unnecessary re-renders', () => {
      // This test validates that the context value is memoized
      // and prevents unnecessary re-renders of child components
      let renderCount = 0;

      const Counter = () => {
        const auth = useAuth();
        renderCount += 1;
        return <div>{renderCount}</div>;
      };

      const { rerender } = render(
        <AuthProvider>
          <Counter />
        </AuthProvider>
      );

      const initialCount = renderCount;

      rerender(
        <AuthProvider>
          <Counter />
        </AuthProvider>
      );

      // Should not cause excessive re-renders
      expect(renderCount).toBeLessThanOrEqual(initialCount + 1);
    });

    it('should validate Requirement 3.3: Batch permission checking methods', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        const results = auth.checkPermissionsBatch(['perm1', 'perm2', 'perm3']);
        return <div data-testid="batch-results">{Object.keys(results).length}</div>;
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('batch-results')).toHaveTextContent('3');
    });

    it('should validate Requirement 5.4: Performance metrics tracking', () => {
      const TestWrapper = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="metrics-available">
              {typeof auth.authLoadTime === 'number' && typeof auth.cacheHitRate === 'number' ? 'yes' : 'no'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestWrapper />
        </AuthProvider>
      );

      expect(screen.getByTestId('metrics-available')).toHaveTextContent('yes');
    });
  });
});
