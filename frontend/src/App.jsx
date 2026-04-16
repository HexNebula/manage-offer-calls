import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { configureApi } from './services/api.js';
import Layout from './components/layout/Layout.jsx';
import Spinner from './components/ui/Spinner.jsx';

// Pages
import Login from './pages/Login.jsx';
import PortalOfferList from './pages/portal/PortalOfferList.jsx';
import PortalOfferSubmit from './pages/portal/PortalOfferSubmit.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OfferList from './pages/offers/OfferList.jsx';
import OfferDetail from './pages/offers/OfferDetail.jsx';
import OfferFormPage from './pages/offers/OfferForm.jsx';
import CandidateList from './pages/candidates/CandidateList.jsx';
import NotificationList from './pages/notifications/NotificationList.jsx';
import Reports from './pages/reports/Reports.jsx';
import UserList from './pages/admin/UserList.jsx';
import AuditLog from './pages/admin/AuditLog.jsx';

function ApiConfigurator({ children }) {
  const { accessTokenRef, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    configureApi({
      getToken: () => accessTokenRef.current,
      setToken: (token) => {
        // Update the ref directly — the context state update happens via setAccessToken
        accessTokenRef.current = token;
      },
      onFailure: () => {
        logout();
        navigate('/login');
      },
    });
  }, [accessTokenRef, logout, navigate]);

  return children;
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-brand-orange" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-brand-orange" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ApiConfigurator>
        <Routes>
          {/* Public portal — no auth required */}
          <Route path="/portal" element={<PortalOfferList />} />
          <Route path="/portal/:id" element={<PortalOfferSubmit />} />

          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="offers" element={<OfferList />} />
            <Route path="offers/new" element={<OfferFormPage />} />
            <Route path="offers/:id" element={<OfferDetail />} />
            <Route path="offers/:id/edit" element={<OfferFormPage />} />
            <Route path="candidates" element={<CandidateList />} />
            <Route path="notifications" element={<NotificationList />} />
            <Route path="reports" element={<Reports />} />

            {/* Admin only */}
            <Route
              path="admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserList />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit-log"
              element={
                <ProtectedRoute adminOnly>
                  <AuditLog />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ApiConfigurator>
    </BrowserRouter>
  );
}
