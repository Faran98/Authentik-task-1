import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClient } from '../api/fetchClient';

export const UpdateProfile = ({ user, onUpdateSuccess, onLogout }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      alert('New password and confirm password must match.');
      return;
    }
    setLoading(true);
    try {
      const targetId = user?.id || user?._id;
      if (user?.role === 'manager' && password) {
        await fetchClient('/password-change-requests', {
          method: 'POST',
          body: { targetUserId: targetId, password, actorRole: user?.role, requesterId: targetId },
        });
        alert('Password change request submitted for admin approval');
      } else {
        const res = await fetchClient(`/users/${targetId}`, {
          method: 'PUT',
          body: { name, email, password: password || undefined, actorRole: user?.role },
        });
        alert(res.message || 'Profile updated');
        if (onUpdateSuccess) onUpdateSuccess({ ...user, ...res.data, name, email });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 20px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Edit Profile</h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280' }}>Update your information and secure your account.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password (optional)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button type="button" onClick={onLogout} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};