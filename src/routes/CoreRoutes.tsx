import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SkeletonLoader from '../components/Common/SkeletonLoader';

// Core routes that should load immediately
const LandingDecider = React.lazy(() => import('../pages/LandingDecider'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Welcome = React.lazy(() => import('../pages/Welcome'));

const CoreRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={
        <React.Suspense fallback={<SkeletonLoader />}>
          <LandingDecider />
        </React.Suspense>
      } />
      <Route path="/dashboard" element={
        <React.Suspense fallback={<SkeletonLoader />}>
          <Dashboard />
        </React.Suspense>
      } />
      <Route path="/welcome" element={
        <React.Suspense fallback={<SkeletonLoader />}>
          <Welcome />
        </React.Suspense>
      } />
    </Routes>
  );
};

export default CoreRoutes;