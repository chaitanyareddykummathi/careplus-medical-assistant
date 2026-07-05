import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Footer from './components/Footer';
import Navbar from './components/Navbar';
import About from './pages/About';
import Appointments from './pages/Appointments';
import Dashboard from './pages/Dashboard';
import HealthProfile from './pages/HealthProfile';
import Hospitals from './pages/Hospitals';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import SymptomChecker from './pages/SymptomChecker';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { getStoredSession, logoutUser } from './services/api';

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

  const handleLogout = async () => {
    await logoutUser();
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
                <Navigate replace to="/" />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate replace to="/" /> : <Register onRegisterSuccess={handleLoginSuccess} />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/hospitals" element={<Hospitals />} />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Appointments user={session?.user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HealthProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
