import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Footer from './components/Footer';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HealthProfile from './pages/HealthProfile';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import SymptomChecker from './pages/SymptomChecker';
import { clearStoredSession, getStoredSession } from './services/api';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return children;
}

function App() {
  const initialSession = useMemo(() => getStoredSession(), []);
  const [session, setSession] = useState(initialSession);

  const handleLoginSuccess = (nextSession) => {
    setSession(nextSession);
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
  };

  const isAuthenticated = Boolean(session?.accessToken);

  return (
    <div className="page-shell">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate replace to="/dashboard" />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate replace to="/dashboard" /> : <Register />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard user={session?.user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HealthProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/symptom-checker"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SymptomChecker />
              </ProtectedRoute>
            }
          />
          <Route path="/symptoms" element={<Navigate replace to="/symptom-checker" />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
