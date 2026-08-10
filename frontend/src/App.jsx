import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import EightBallLoader from './components/EightBallLoader';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import TableManagement from './pages/admin/TableManagement';
import Home from './pages/user/Home';
import BookingHistory from './pages/user/BookingHistory';
import BookingSuccess from './pages/user/BookingSuccess';
import Settings from './pages/user/Settings';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <EightBallLoader />;

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/" />;

  return children;
};

import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

import WaitlistSuccess from './pages/user/WaitlistSuccess';

import AdminQuickLogin from './pages/AdminQuickLogin';

function AppRoutes() {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
       {/* User Routes */}
      <Route path="/" element={<ProtectedRoute>{(user?.role === 'admin' || user?.role === 'superadmin') ? <Navigate to="/admin" replace /> : <Home />}</ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
      <Route path="/booking-success/:id" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/tables" element={<ProtectedRoute adminOnly><TableManagement /></ProtectedRoute>} />
      <Route path="/:name" element={<AdminQuickLogin />} />
    </Routes>
  );
}

import ParticleBackground from './components/ParticleBackground';

function App() {
  return (
    <ErrorBoundary>
      <ParticleBackground />
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
