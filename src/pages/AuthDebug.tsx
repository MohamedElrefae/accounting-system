import React, { useEffect } from 'react';
import { useOptimizedAuth } from '../hooks/useOptimizedAuth';

export default function AuthDebugPage() {
  const auth = useOptimizedAuth();

  useEffect(() => {
    console.log('🔍 AUTH DEBUG PAGE - Full State:', {
      user: auth.user,
      profile: auth.profile,
      roles: auth.roles,
      loading: auth.loading,
      hasResolvedPermissions: !!auth.resolvedPermissions,
      resolvedPermissions: auth.resolvedPermissions ? {
        routes: Array.from(auth.resolvedPermissions.routes),
        actions: Array.from(auth.resolvedPermissions.actions),
      } : null,
    });

    // Test the specific permission
    const hasApprovalsReview = auth.hasActionAccess('approvals.review');
    console.log('🔍 hasActionAccess("approvals.review"):', hasApprovalsReview);
  }, [auth]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Debug Page</h1>
      <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        {JSON.stringify({
          user: auth.user?.email || 'No user',
          roles: auth.roles,
          loading: auth.loading,
          hasResolvedPermissions: !!auth.resolvedPermissions,
          actionsCount: auth.resolvedPermissions?.actions.size || 0,
          routesCount: auth.resolvedPermissions?.routes.size || 0,
        }, null, 2)}
      </pre>
      <p>Check the console for full details</p>
    </div>
  );
}
