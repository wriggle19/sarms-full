import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AssetsList } from './pages/AssetsList';
import { AssetDetail } from './pages/AssetDetail';
import { RegisterAsset } from './pages/RegisterAsset';
import { Requests } from './pages/Requests';
import { Approvals } from './pages/Approvals';
import { IssuanceQueue } from './pages/IssuanceQueue';
import { Maintenance } from './pages/Maintenance';
import { Incidents } from './pages/Incidents';
import { Disposal } from './pages/Disposal';
import { Procurement } from './pages/Procurement';
import { Stocktake } from './pages/Stocktake';
import { GlobalSearch } from './pages/GlobalSearch';
import { Clearance } from './pages/Clearance';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ScanAsset } from './pages/ScanAsset';
import { Profile } from './pages/Profile';
import { AuditLogs } from './pages/AuditLogs';
import { Reservations } from './pages/Reservations';
import { Calendar } from './pages/Calendar';
import { Imports } from './pages/Imports';
import { Bulk } from './pages/Bulk';
import { ResetPassword } from './pages/ResetPassword';
import { NotificationsPage } from './pages/NotificationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
