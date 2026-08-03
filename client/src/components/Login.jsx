import React, { useState } from 'react';
import { fetchClient } from '../api/fetchClient';

export const Login = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '', role: 'customer' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetchClient('/login', {
        method: 'POST',
        body: credentials,
      });

      if (res?.success && res?.data) {
        const userPayload = { ...res.data.user, token: res.data.token };
        localStorage.setItem('token', res.data.token);
        if (onLoginSuccess) {
          onLoginSuccess(userPayload);
        }
      } else {
        setMessage(res?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setMessage(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetchClient('/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail },
      });

      setMessage(res?.message || 'Password reset link sent to your email!');
    } catch (err) {
      setMessage(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '80px auto', padding: '30px', border: '1px solid #ddd', borderRadius: '12px', backgroundColor: '#fff', fontFamily: 'sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
      {isForgotPassword ? (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Reset Password</h2>
          <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>
            Enter your email and we will send a reset link.
          </p>

          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>User Management Portal</h2>

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="email"
              placeholder="Email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />

            <select
              value={credentials.role}
              onChange={(e) => setCredentials({ ...credentials, role: e.target.value })}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="customer">Customer</option>
            </select>

            <div style={{ textAlign: 'right', marginTop: '-5px' }}>
              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px' }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      )}

      {message && (
        <p style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px', textAlign: 'center', fontSize: '14px', color: '#333' }}>
          {message}
        </p>
      )}
    </div>
  );
};