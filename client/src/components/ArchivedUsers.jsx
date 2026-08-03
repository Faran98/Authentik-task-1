import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClient } from '../api/fetchClient';

export const ArchivedUsers = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchArchivedUsers = async () => {
    try {
      const res = await fetchClient('/users/deleted?role=' + (user?.role || 'customer'));
      setArchivedUsers(res?.data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchArchivedUsers();
  }, [user?.role]);

  const handleRestore = async (id) => {
    try {
      await fetchClient(`/users/restore/${id}`, { method: 'PATCH', body: { actorRole: user?.role } });
      fetchArchivedUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDeleteUser) return;
    setLoading(true);
    try {
      await fetchClient(`/users/hard-delete/${confirmDeleteUser._id}`, { method: 'DELETE', body: { actorRole: user?.role } });
      setConfirmDeleteUser(null);
      fetchArchivedUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Archived Users</h2>
          <p style={{ margin: '4px 0 0', color: '#d1d5db' }}>Restore or permanently remove archived accounts.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Back to Dashboard</button>
          <button onClick={onLogout} style={{ padding: '8px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
          <h3 style={{ marginTop: 0 }}>Soft-deleted Accounts</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>No archived users found.</td>
                </tr>
              ) : (
                archivedUsers.map((item) => (
                  <tr key={item._id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.email}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.role}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '999px' }}>Archived</span>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                      <button onClick={() => handleRestore(item._id)} style={{ padding: '6px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>Restore</button>
                      <button onClick={() => setConfirmDeleteUser(item)} style={{ padding: '6px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Permanent Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDeleteUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
          <div style={{ background: '#fff', width: '380px', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0 }}>Confirm Permanent Delete</h3>
            <p>Are you sure you want to permanently delete this user? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={() => setConfirmDeleteUser(null)} style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" disabled={loading} onClick={handlePermanentDelete} style={{ padding: '8px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? 'Deleting...' : 'Delete Permanently'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
