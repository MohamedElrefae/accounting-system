/**
 * Unit Tests for Memoized Permission Gate Component
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 6: UI Component Memoization
 * Validates: Requirements 3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock AuthContext BEFORE importing components that use it
const mockCheckPermission = vi.fn();
const mockCheckPermissionsBatch = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    checkPermission: mockCheckPermission,
    checkPermissionsBatch: mockCheckPermissionsBatch,
    user: null,
    permissions: new Map(),
    roles: [],
    organizations: [],
    loading: false,
    error: null,
    refreshAuth: vi.fn(),
    authLoadTime: 0,
    cacheHitRate: 0
  }),
  AuthContext: { Provider: ({ children }: { children: ReactNode }) => children }
}));

// Now import components after mocking
import {
  MemoizedPermissionGate,
  useBatchPermissions,
  getCachedPermission,
  setCachedPermission,
  clearPermissionCache,
  getPermissionCacheStats
} from '../MemoizedPermissionGate';

// Wrapper component to provide context
const TestWrapper = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

describe('MemoizedPermissionGate Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissionCache();
  });

  describe('Permission Rendering', () => {
    it('should render children when permission is granted', () => {
      mockCheckPermission.mockReturnValue(true);

      render(
        <TestWrapper>
          <MemoizedPermissionGate permission="transactions:read">
            <div>Allowed Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.getByText('Allowed Content')).toBeDefined();
    });

    it('should render fallback when permission is denied', () => {
      mockCheckPermission.mockReturnValue(false);

      render(
        <TestWrapper>
          <MemoizedPermissionGate
            permission="transactions:write"
            fallback={<div>Denied Content</div>}
          >
            <div>Allowed Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.getByText('Denied Content')).toBeDefined();
      expect(screen.queryByText('Allowed Content')).toBeNull();
    });

    it('should render nothing when permission denied and no fallback', () => {
      mockCheckPermission.mockReturnValue(false);

      render(
        <TestWrapper>
          <MemoizedPermissionGate permission="transactions:write">
            <div>Allowed Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.queryByText('Allowed Content')).toBeNull();
    });
  });

  describe('Resource and Action Permissions', () => {
    it('should check permissions using resource and action when provided', () => {
      mockCheckPermission.mockReturnValue(true);

      render(
        <TestWrapper>
          <MemoizedPermissionGate
            permission="transactions"
            resource="transactions"
            action="write"
            context={{ transactionId: '123' }}
          >
            <div>Edit Transaction</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(mockCheckPermission).toHaveBeenCalledWith(
        'transactions',
        'write',
        { transactionId: '123' }
      );
      expect(screen.getByText('Edit Transaction')).toBeDefined();
    });
  });

  describe('Memoization', () => {
    it('should prevent re-renders when props are unchanged', () => {
      mockCheckPermission.mockReturnValue(true);
      const renderSpy = vi.fn();

      const TestComponent = () => {
        renderSpy();
        return (
          <TestWrapper>
            <MemoizedPermissionGate permission="transactions:read">
              <div>Content</div>
            </MemoizedPermissionGate>
          </TestWrapper>
        );
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should re-render when permission changes', () => {
      mockCheckPermission.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const { rerender } = render(
        <TestWrapper>
          <MemoizedPermissionGate permission="transactions:read">
            <div>Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.getByText('Content')).toBeDefined();

      rerender(
        <TestWrapper>
          <MemoizedPermissionGate permission="transactions:write">
            <div>Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.queryByText('Content')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle permission check errors gracefully', () => {
      mockCheckPermission.mockImplementation(() => {
        throw new Error('Permission check failed');
      });

      render(
        <TestWrapper>
          <MemoizedPermissionGate permission="transactions:read">
            <div>Content</div>
          </MemoizedPermissionGate>
        </TestWrapper>
      );

      expect(screen.queryByText('Content')).toBeNull();
    });
  });
});

describe('useBatchPermissions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check multiple permissions in batch', () => {
    mockCheckPermissionsBatch.mockReturnValue({
      'transactions:read': true,
      'transactions:write': false,
      'reports:export': true
    });

    const TestComponent = () => {
      const permissions = useBatchPermissions([
        'transactions:read',
        'transactions:write',
        'reports:export'
      ]);

      return (
        <div>
          <div>{permissions['transactions:read'] ? 'Can Read' : 'Cannot Read'}</div>
          <div>{permissions['transactions:write'] ? 'Can Write' : 'Cannot Write'}</div>
          <div>{permissions['reports:export'] ? 'Can Export' : 'Cannot Export'}</div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Can Read')).toBeDefined();
    expect(screen.getByText('Cannot Write')).toBeDefined();
    expect(screen.getByText('Can Export')).toBeDefined();
  });

  it('should handle batch permission check errors', () => {
    mockCheckPermissionsBatch.mockImplementation(() => {
      throw new Error('Batch check failed');
    });

    const TestComponent = () => {
      const permissions = useBatchPermissions(['transactions:read', 'transactions:write']);

      return (
        <div>
          <div>{permissions['transactions:read'] ? 'Can Read' : 'Cannot Read'}</div>
          <div>{permissions['transactions:write'] ? 'Can Write' : 'Cannot Write'}</div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Cannot Read')).toBeDefined();
    expect(screen.getByText('Cannot Write')).toBeDefined();
  });
});

describe('Permission Cache', () => {
  beforeEach(() => {
    clearPermissionCache();
  });

  it('should cache permission state', () => {
    setCachedPermission('transactions:read', true);

    const cached = getCachedPermission('transactions:read');
    expect(cached).toBe(true);
  });

  it('should return null for non-existent cache entries', () => {
    const cached = getCachedPermission('non-existent');
    expect(cached).toBeNull();
  });

  it('should track cache statistics', () => {
    setCachedPermission('transactions:read', true);
    setCachedPermission('transactions:write', false);

    const stats = getPermissionCacheStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.validEntries).toBe(2);
    expect(stats.expiredEntries).toBe(0);
  });

  it('should clear cache', () => {
    setCachedPermission('transactions:read', true);
    clearPermissionCache();

    const cached = getCachedPermission('transactions:read');
    expect(cached).toBeNull();
  });
});
