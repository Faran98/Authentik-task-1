import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UpdateProfile } from './components/UpdateProfile';
import { ArchivedUsers } from './components/ArchivedUsers';

const getDashboardPath = (role) => {
  if (role === 'admin') return '/dashboard';
  if (role === 'manager') return '/dashboard';
  return '/dashboard';
};

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData?.token || localStorage.getItem('token'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    const nextUser = { ...user, ...updatedUser };
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={getDashboardPath(user.role)} replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="/" element={<Navigate to={user ? getDashboardPath(user.role) : '/login'} replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <UpdateProfile user={user} onUpdateSuccess={handleProfileUpdate} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archived-users"
          element={
            <ProtectedRoute user={user}>
              <ArchivedUsers user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? getDashboardPath(user.role) : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;