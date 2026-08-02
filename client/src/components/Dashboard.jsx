import React, { useState, useEffect } from 'react';
import { fetchClient } from '../api/fetchClient';

export const Dashboard = ({ user, onLogout }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [currentTab, setCurrentTab] = useState('active');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', status: 'active', role: 'user' });
  
  // State for Editing User Profile
  const [editingUser, setEditingUser] = useState(null); 
  const [editFormData, setEditFormData] = useState({ name: '', email: '', status: 'active' });
  const [passwordResetData, setPasswordResetData] = useState({ userId: '', password: '', confirmPassword: '' });

  const fetchData = async () => {
    try {
      const activeRes = await fetchClient('/users/active');
      const deletedRes = await fetchClient('/users/deleted');
      setActiveUsers(activeRes?.data || []);
      setDeletedUsers(deletedRes?.data || []);
    } catch (err) {
      console.error('Data fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Create User
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetchClient('/users', { method: 'POST', body: { ...newUser, actorRole: user?.role } });
      setNewUser({ name: '', email: '', password: '', status: 'active', role: 'user' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------------- UPDATE USER PROFILE LOGIC ----------------
  const handleOpenEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditFormData({ name: userToEdit.name, email: userToEdit.email, status: userToEdit.isDeleted ? 'inactive' : 'active' });
  };

  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchClient(`/users/${editingUser._id}`, {
        method: 'PUT',
        body: { ...editFormData, actorRole: user?.role },
      });
      setEditingUser(null);
      fetchData();
      alert('User profile updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update user profile');
    }
  };

  // Action Handlers
  const handleSoftDelete = async (id) => {
    try {
      await fetchClient(`/users/soft-delete/${id}`, { method: 'PATCH', body: { actorRole: user?.role } });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestore = async (id) => {
    try {
      await fetchClient(`/users/restore/${id}`, { method: 'PATCH', body: { actorRole: user?.role } });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleHardDelete = async (id) => {
    try {
      await fetchClient(`/users/hard-delete/${id}`, { method: 'DELETE', body: { actorRole: user?.role } });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (passwordResetData.password !== passwordResetData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await fetchClient(`/users/${passwordResetData.userId}/reset-password`, {
        method: 'PATCH',
        body: { password: passwordResetData.password, actorRole: user?.role },
      });
      alert('Password updated successfully');
      setPasswordResetData({ userId: '', password: '', confirmPassword: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Logged in as: <strong>{user?.name || user?.email}</strong></span>
          <button 
            onClick={onLogout} 
            style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Create Form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', flexWrap: 'wrap' }}>
        <input placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required style={{ flex: '1 1 180px', padding: '8px' }} />
        <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required style={{ flex: '1 1 180px', padding: '8px' }} />
        <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required style={{ flex: '1 1 180px', padding: '8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 140px' }}>
          <label><input type="radio" name="newUserStatus" checked={newUser.status === 'active'} onChange={() => setNewUser({ ...newUser, status: 'active' })} /> Active</label>
          <label><input type="radio" name="newUserStatus" checked={newUser.status === 'inactive'} onChange={() => setNewUser({ ...newUser, status: 'inactive' })} /> Inactive</label>
        </div>
        {user?.role === 'admin' && (
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ flex: '1 1 140px', padding: '8px' }}>
            <option value="user">User</option>
            <option value="manager">Manager</option>
          </select>
        )}
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create User</button>
      </form>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => setCurrentTab('active')} 
          style={{ padding: '8px 16px', fontWeight: currentTab === 'active' ? 'bold' : 'normal', backgroundColor: currentTab === 'active' ? '#e5e7eb' : 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          Active Users ({activeUsers.length})
        </button>
        <button 
          onClick={() => setCurrentTab('trash')} 
          style={{ marginLeft: '10px', padding: '8px 16px', fontWeight: currentTab === 'trash' ? 'bold' : 'normal', backgroundColor: currentTab === 'trash' ? '#fee2e2' : 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          Recycle Bin / Inactive ({deletedUsers.length})
        </button>
      </div>

      {/* Password Reset Form */}
      <form onSubmit={handlePasswordReset} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', flexWrap: 'wrap' }}>
        <select
          value={passwordResetData.userId}
          onChange={(e) => setPasswordResetData({ ...passwordResetData, userId: e.target.value })}
          required
          style={{ flex: '1 1 180px', padding: '8px' }}
        >
          <option value="">Select a user</option>
          {[...activeUsers, ...deletedUsers].map((user) => (
            <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
          ))}
        </select>
        <input type="password" placeholder="New password" value={passwordResetData.password} onChange={(e) => setPasswordResetData({ ...passwordResetData, password: e.target.value })} required style={{ flex: '1 1 180px', padding: '8px' }} />
        <input type="password" placeholder="Confirm password" value={passwordResetData.confirmPassword} onChange={(e) => setPasswordResetData({ ...passwordResetData, confirmPassword: e.target.value })} required style={{ flex: '1 1 180px', padding: '8px' }} />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reset Password</button>
      </form>

      {/* User Table with Status & Edit Options */}
      <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderColor: '#ddd' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(currentTab === 'active' ? activeUsers : deletedUsers).length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>No users found</td>
            </tr>
          ) : (
            (currentTab === 'active' ? activeUsers : deletedUsers).map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                
                {/* 1. STATUS COLUMN */}
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    backgroundColor: u.isDeleted ? '#fee2e2' : '#dcfce7', 
                    color: u.isDeleted ? '#dc2626' : '#16a34a' 
                  }}>
                    {u.status === 'inactive' || u.isDeleted ? 'Inactive' : 'Active'}
                  </span>
                </td>

                {/* 2. EDIT & ACTION BUTTONS */}
                <td>
                  {currentTab === 'active' ? (
                    <>
                      <button 
                        onClick={() => handleOpenEditModal(u)} 
                        style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}
                      >
                        Edit Profile
                      </button>
                      <button 
                        onClick={() => handleSoftDelete(u._id)} 
                        style={{ padding: '6px 12px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Soft Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleRestore(u._id)} style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Restore</button>
                      <button onClick={() => handleHardDelete(u._id)} style={{ marginLeft: '10px', padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Permanent Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ---------------- EDIT USER PROFILE MODAL ---------------- */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Update Profile</h3>
            <form onSubmit={handleUpdateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Name</label>
                <input 
                  type="text" 
                  value={editFormData.name} 
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Email</label>
                <input 
                  type="email" 
                  value={editFormData.email} 
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} 
                  required 
                  style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Status</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label><input type="radio" name="editUserStatus" checked={editFormData.status === 'active'} onChange={() => setEditFormData({ ...editFormData, status: 'active' })} /> Active</label>
                  <label><input type="radio" name="editUserStatus" checked={editFormData.status === 'inactive'} onChange={() => setEditFormData({ ...editFormData, status: 'inactive' })} /> Inactive</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)} 
                  style={{ padding: '8px 14px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};