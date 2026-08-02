import React, { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export function App() {
  const [user, setUser] = useState(null);

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear stored auth token
    setUser(null);                   // Reset user state to trigger Login screen
  };

  // 1. Show Login if no user is authenticated
  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  // 2. Render view based on user role with explicit logout prop passed
  return (
    <div>
      {user?.role === 'admin' ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>User Dashboard</h2>
          <p>Welcome, {user?.name || 'User'}!</p>
          <button 
            onClick={handleLogout} 
            style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default App;