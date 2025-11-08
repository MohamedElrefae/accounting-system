import React, { memo } from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import type { PermissionCode } from '../../lib/permissions';

interface OptimizedRouteProps {
  path: string;
  element: React.ReactNode;
  requiredAction?: PermissionCode;
  protected?: boolean;
}

const OptimizedRoute: React.FC<OptimizedRouteProps> = memo(({
  path,
  element,
  requiredAction,
  protected: isProtected = true
}) => {
  const wrappedElement = isProtected ? (
    <ProtectedRoute requiredAction={requiredAction}>
      <React.Suspense fallback={<div>Loading...</div>}>
        {element}
      </React.Suspense>
    </ProtectedRoute>
  ) : (
    <React.Suspense fallback={<div>Loading...</div>}>
      {element}
    </React.Suspense>
  );

  return <Route path={path} element={wrappedElement} />;
});

OptimizedRoute.displayName = 'OptimizedRoute';

export default OptimizedRoute;