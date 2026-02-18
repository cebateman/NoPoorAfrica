import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './data/AuthContext';
import { DataProvider } from './data/DataContext';
import { CurrencyProvider } from './data/CurrencyContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataUpload from './pages/DataUpload';
import Login from './pages/Login';

function ProtectedRoute({ children, adminOnly }) {
  const { user, profile, loading, authEnabled } = useAuth();

  // Firebase not configured — run in local mode, no auth required
  if (!authEnabled) return children;

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // User exists but profile not yet loaded → show loading
  if (!profile) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // Admin-only route check
  if (adminOnly && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, authEnabled } = useAuth();

  return (
    <Routes>
      {/* Login route — redirect to dashboard if already logged in */}
      <Route
        path="login"
        element={
          !authEnabled || user ? <Navigate to="/" replace /> : <Login />
        }
      />
      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="upload"
          element={
            <ProtectedRoute adminOnly>
              <DataUpload />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <CurrencyProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </CurrencyProvider>
      </DataProvider>
    </AuthProvider>
  );
}
