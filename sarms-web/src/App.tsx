import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Route-level code splitting: each page is its own chunk, fetched on first
// visit. Login and Dashboard stay eager (first paint), everything else is
// lazy - most users touch a handful of pages per session. This keeps the
// initial bundle small instead of shipping one ~1.3MB chunk.
const AssetsList = lazy(() => import('./pages/AssetsList').then((m) => ({ default: m.AssetsList })));
const AssetDetail = lazy(() => import('./pages/AssetDetail').then((m) => ({ default: m.AssetDetail })));
const RegisterAsset = lazy(() => import('./pages/RegisterAsset').then((m) => ({ default: m.RegisterAsset })));
const Requests = lazy(() => import('./pages/Requests').then((m) => ({ default: m.Requests })));
const Approvals = lazy(() => import('./pages/Approvals').then((m) => ({ default: m.Approvals })));
const IssuanceQueue = lazy(() => import('./pages/IssuanceQueue').then((m) => ({ default: m.IssuanceQueue })));
const Maintenance = lazy(() => import('./pages/Maintenance').then((m) => ({ default: m.Maintenance })));
const Incidents = lazy(() => import('./pages/Incidents').then((m) => ({ default: m.Incidents })));
const Disposal = lazy(() => import('./pages/Disposal').then((m) => ({ default: m.Disposal })));
const Procurement = lazy(() => import('./pages/Procurement').then((m) => ({ default: m.Procurement })));
const Stocktake = lazy(() => import('./pages/Stocktake').then((m) => ({ default: m.Stocktake })));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch').then((m) => ({ default: m.GlobalSearch })));
const Clearance = lazy(() => import('./pages/Clearance').then((m) => ({ default: m.Clearance })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ScanAsset = lazy(() => import('./pages/ScanAsset').then((m) => ({ default: m.ScanAsset })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const Reservations = lazy(() => import('./pages/Reservations').then((m) => ({ default: m.Reservations })));
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })));
const Imports = lazy(() => import('./pages/Imports').then((m) => ({ default: m.Imports })));
const Bulk = lazy(() => import('./pages/Bulk').then((m) => ({ default: m.Bulk })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));

function PageFallback() {
  return (
    <div className="py-16 text-center text-text-secondary text-sm" role="status" aria-live="polite">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/scan/:qrToken" element={<ScanAsset />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<AssetsList />} />
              <Route path="/assets/new" element={<RegisterAsset />} />
              <Route path="/assets/:id" element={<AssetDetail />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/issuance" element={<IssuanceQueue />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/disposal" element={<Disposal />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/stocktake" element={<Stocktake />} />
              <Route path="/search" element={<GlobalSearch />} />
              <Route path="/clearance" element={<Clearance />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/imports" element={<Imports />} />
              <Route path="/bulk" element={<Bulk />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
