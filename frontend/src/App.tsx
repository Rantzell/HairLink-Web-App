import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layouts/DashboardLayout';
import AuthLayout from './components/layouts/AuthLayout';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DonorDashboard from './pages/DonorDashboard';
import DonorDonate from './pages/DonorDonate';
import DonorTracking from './pages/DonorTracking';
import DonorTrackingDetail from './pages/DonorTrackingDetail';
import DonorCertificate from './pages/DonorCertificate';
import DonorProfile from './pages/DonorProfile';

import RecipientDashboard from './pages/RecipientDashboard';
import RecipientRequest from './pages/RecipientRequest';
import RecipientTracking from './pages/RecipientTracking';
import RecipientTrackingDetail from './pages/RecipientTrackingDetail';

import StaffDashboard from './pages/StaffDashboard';
import StaffVerificationList from './pages/StaffVerificationList';
import StaffVerificationDetail from './pages/StaffVerificationDetail';
import StaffRealtimeTracking from './pages/StaffRealtimeTracking';
import StaffMatching from './pages/StaffMatching';
import StaffWigStock from './pages/StaffWigStock';
import StaffHairStock from './pages/StaffHairStock';

import WigmakerDashboard from './pages/WigmakerDashboard';
import WigmakerTaskDetail from './pages/WigmakerTaskDetail';
import CommunityFeed from './pages/CommunityFeed';

import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminInventory from './pages/AdminInventory';
import AdminEvents from './pages/AdminEvents';
import AdminCommunityModeration from './pages/AdminCommunityModeration';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<AuthLayout><AuthPage initialMode="login" /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><AuthPage initialMode="register" /></AuthLayout>} />

          {/* Donor Routes */}
          <Route path="/donor/*" element={
            <ProtectedRoute allowedRoles={['donor']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<DonorDashboard />} />
                  <Route path="donate" element={<DonorDonate />} />
                  <Route path="tracking" element={<DonorTracking />} />
                  <Route path="tracking/:reference" element={<DonorTrackingDetail />} />
                  <Route path="certificate" element={<DonorCertificate />} />
                  <Route path="profile" element={<DonorProfile />} />
                  <Route path="community" element={<CommunityFeed />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Recipient Routes */}
          <Route path="/recipient/*" element={
            <ProtectedRoute allowedRoles={['recipient']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<RecipientDashboard />} />
                  <Route path="request" element={<RecipientRequest />} />
                  <Route path="tracking" element={<RecipientTracking />} />
                  <Route path="tracking/:reference" element={<RecipientTrackingDetail />} />
                  <Route path="profile" element={<DonorProfile />} /> {/* Recipient uses same profile UI */}
                  <Route path="community" element={<CommunityFeed />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Staff Routes */}
          <Route path="/staff/*" element={
            <ProtectedRoute allowedRoles={['staff']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="verification/:type" element={<StaffVerificationList />} />
                  <Route path="verification/:type/:reference" element={<StaffVerificationDetail />} />
                  <Route path="tracking" element={<StaffRealtimeTracking />} />
                  <Route path="matching" element={<StaffMatching />} />
                  <Route path="wig-stock" element={<StaffWigStock />} />
                  <Route path="hair-stock" element={<StaffHairStock />} />
                  <Route path="profile" element={<DonorProfile />} /> {/* Staff uses same profile UI */}
                  <Route path="community" element={<CommunityFeed />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Wigmaker Routes */}
          <Route path="/wigmaker/*" element={
            <ProtectedRoute allowedRoles={['wigmaker']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<WigmakerDashboard />} />
                  <Route path="task/:taskCode" element={<WigmakerTaskDetail />} />
                  <Route path="profile" element={<DonorProfile />} />
                  <Route path="community" element={<CommunityFeed />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="events" element={<AdminEvents />} />
                  <Route path="community" element={<AdminCommunityModeration />} />
                  <Route path="verification/:type" element={<StaffVerificationList />} />
                  <Route path="verification" element={<Navigate to="verification/donor" replace />} />
                  <Route path="matching" element={<StaffMatching />} />
                  <Route path="operations" element={<StaffRealtimeTracking />} />
                  <Route path="profile" element={<DonorProfile />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
