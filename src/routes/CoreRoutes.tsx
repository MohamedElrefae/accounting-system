import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SkeletonLoader from '../components/Common/SkeletonLoader';

// Core routes that should load immediately
// NOTE: We now land directly on Dashboard for '/', to avoid any extra async
// indirection that could keep the main shell stuck on "Loading..." after refresh.
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Welcome = React.lazy(() => import('../pages/Welcome'));

const CoreRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Default landing: always go straight to Dashboard */}
      <Route
        index
        element={
          <React.Suspense fallback={<SkeletonLoader />}>
            <Dashboard />
          </React.Suspense>
        }
      />

      {/* Explicit routes remain available */}
      <Route
        path="/dashboard"
        element={
          <React.Suspense fallback={<SkeletonLoader />}>
            <Dashboard />
          </React.Suspense>
        }
      />
      <Route
        path="/welcome"
        element={
          <React.Suspense fallback={<SkeletonLoader />}>
            <Welcome />
          </React.Suspense>
        }
      />
    </Routes>
  );
};

export default CoreRoutes;
