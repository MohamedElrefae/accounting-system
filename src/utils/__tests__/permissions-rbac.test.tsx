import React from 'react';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  buildPermissionCacheSnapshot,
  flattenPermissions,
  hasActionInSnapshot,
  hasRouteInSnapshot,
  hydrateSnapshot,
  type PermissionCode,
} from '../../lib/permissions';
interface AuthMockReturn {
  user: null | { id: string };
  loading: boolean;
  permissionsLoading: boolean;
  hasRouteAccess: (pathname: string) => boolean;
  hasActionAccess: (action: PermissionCode) => boolean;
}

type NavigateProps = {
  to: string;
  state?: unknown;
  replace?: boolean;
};
type NavigateResult = { __type: 'navigate'; props: NavigateProps };

function createNavigateResult(props: NavigateProps): NavigateResult {
  return { __type: 'navigate', props };
}

const mocks = vi.hoisted(() => ({
  useLocationMock: vi.fn(),
  navigateMock: vi.fn<[NavigateProps], NavigateResult>(createNavigateResult),
  useAuthMock: vi.fn(),
}));

const { useLocationMock, navigateMock, useAuthMock } = mocks;

vi.mock('react-router-dom', () => ({
  useLocation: useLocationMock,
  Navigate: navigateMock,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: useAuthMock,
}));

let ProtectedRoute: typeof import('../../components/routing/ProtectedRoute').default;

beforeAll(async () => {
  ProtectedRoute = (await import('../../components/routing/ProtectedRoute')).default;
});

describe('permissions matrix helpers', () => {
  it('honours role inheritance when flattening permissions', () => {
    const aggregate = flattenPermissions(['manager']);

    expect(aggregate.actions.has('templates.manage')).toBe(true);
    expect(aggregate.actions.has('transaction_line_items.read')).toBe(true);
    expect(aggregate.routes.has('/documents')).toBe(true);
  });

  it('builds and hydrates cache snapshots that preserve access rules', () => {
    const snapshot = buildPermissionCacheSnapshot(['accountant']);
    const hydrated = hydrateSnapshot(snapshot);

    expect(hydrated).not.toBeNull();
    expect(hydrated && hasRouteInSnapshot(hydrated, '/main-data/sub-tree')).toBe(true);
    expect(hydrated && hasActionInSnapshot(hydrated, 'transaction_line_items.read')).toBe(true);
  });

  it('invalid snapshot versions are rejected upon hydration', () => {
    const snapshot = buildPermissionCacheSnapshot(['viewer']);
    const mutated = { ...snapshot, version: 'legacy' };

    expect(hydrateSnapshot(mutated)).toBeNull();
  });

  it('matches dynamic and wildcard routes within hydrated snapshots', () => {
    const hydrated = hydrateSnapshot(buildPermissionCacheSnapshot(['manager']));

    expect(hydrated).not.toBeNull();
    expect(hydrated && hasRouteInSnapshot(hydrated, '/reports/balance-sheet')).toBe(true);
    expect(hydrated && hasRouteInSnapshot(hydrated, '/documents/123')).toBe(true);
    expect(hydrated && hasRouteInSnapshot(hydrated, '/projects/example/attachments')).toBe(true);
  });
});

const allowAll = () => true;

const buildAuthState = (overrides: Partial<AuthMockReturn> = {}): AuthMockReturn => ({
  user: { id: 'user-1' },
  loading: false,
  permissionsLoading: false,
  hasRouteAccess: allowAll,
  hasActionAccess: allowAll,
  ...overrides,
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useLocationMock.mockReset();
    navigateMock.mockReset();
    useAuthMock.mockReset();

    navigateMock.mockImplementation(createNavigateResult);
    useLocationMock.mockReturnValue({ pathname: '/main-data/accounts-tree' });
  });

  const setAuthState = (overrides: Partial<AuthMockReturn>) => {
    useAuthMock.mockReturnValue(buildAuthState(overrides));
  };

  it('renders a loading placeholder while authentication or permissions are pending', () => {
    setAuthState({ loading: true });

    const element = ProtectedRoute({ children: <div>child</div> });

    expect(React.isValidElement(element)).toBe(true);
    expect((element as React.ReactElement).props.children.props.children).toContain('Loading authentication');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users to the login page', () => {
    setAuthState({ user: null });

    const result = ProtectedRoute({ children: <div>child</div> });

    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.type).toBe(navigateMock);
    expect(element.props).toEqual(
      expect.objectContaining({ to: '/login', replace: true, state: { from: { pathname: '/main-data/accounts-tree' } } }),
    );
  });

  it('denies access when the route guard rejects the current path', () => {
    const routeGuard = vi.fn().mockReturnValue(false);
    setAuthState({ hasRouteAccess: routeGuard });

    const result = ProtectedRoute({ children: <div>restricted</div> });

    expect(routeGuard).toHaveBeenCalledWith('/main-data/accounts-tree');
    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.type).toBe(navigateMock);
    expect(element.props).toEqual(expect.objectContaining({ to: '/unauthorized', replace: true }));
  });

  it('honours custom redirect destinations', () => {
    const routeGuard = vi.fn().mockReturnValue(false);
    setAuthState({ hasRouteAccess: routeGuard });

    const result = ProtectedRoute({
      children: <div>restricted</div>,
      redirectTo: '/no-access',
    });

    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.type).toBe(navigateMock);
    expect(element.props).toEqual(expect.objectContaining({ to: '/no-access', replace: true }));
  });

  it('renders fallback content when provided', () => {
    const fallback = <span>blocked</span>;
    setAuthState({ hasRouteAccess: () => false });

    const result = ProtectedRoute({ children: <div>restricted</div>, fallback });

    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.props.children).toBe(fallback);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('requires explicit action access when specified', () => {
    const actionGuard = vi.fn().mockReturnValue(false);
    setAuthState({ hasActionAccess: actionGuard });

    const result = ProtectedRoute({
      children: <div>restricted</div>,
      requiredAction: 'documents.manage',
    });

    expect(actionGuard).toHaveBeenCalledWith('documents.manage');
    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.type).toBe(navigateMock);
    expect(element.props).toEqual(expect.objectContaining({ to: '/unauthorized', replace: true }));
  });

  it('renders protected children when both route and action checks pass', () => {
    const children = <div data-testid="protected">ok</div>;
    setAuthState({});

    const result = ProtectedRoute({ children });

    expect(React.isValidElement(result)).toBe(true);
    const element = result as React.ReactElement;
    expect(element.props.children).toBe(children);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
