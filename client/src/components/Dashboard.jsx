import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClient } from '../api/fetchClient';

const emptyUserForm = { name: '', email: '', password: '', status: 'active', role: 'customer' };

export const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ ...emptyUserForm, confirmPassword: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', status: 'active', role: 'customer' });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', email: '' });
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvalReview, setApprovalReview] = useState({ requestId: '', action: 'Approved', reason: '' });

  const roleLabel = useMemo(() => ({ admin: 'Admin', manager: 'Manager', customer: 'Customer' }), []);

  const normalizeRole = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'user' ? 'customer' : normalized;
  };

  const normalizeStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'inactive' ? 'inactive' : 'active';
  };

  const normalizeUserRecord = (value) => ({
    ...value,
    role: normalizeRole(value?.role),
    status: normalizeStatus(value?.status),
  });

  const isArchivedUser = (item) => Boolean(item?.isArchived || item?.isDeleted);

  // Helper to filter users correctly without losing inactive ones
  const getUsersByRoleStatus = (users = [], role, status) => users.filter((item) => {
    const normalizedRole = normalizeRole(item?.role);
    const normalizedStatus = normalizeStatus(item?.status);
    return normalizedRole === role && normalizedStatus === status && !isArchivedUser(item);
  });

  const fetchData = async () => {
    try {
      const [activeRes, inactiveRes, requestsRes] = await Promise.all([
        fetchClient('/users/active?role=' + (user?.role || 'customer')),
        fetchClient('/users/deleted?role=' + (user?.role || 'customer')),
        user?.role === 'admin' || user?.role === 'manager' ? fetchClient('/password-change-requests') : Promise.resolve({ data: [] }),
      ]);

      setActiveUsers((activeRes?.data || []).map(normalizeUserRecord));
      setInactiveUsers((inactiveRes?.data || []).map(normalizeUserRecord));

      if (user?.role === 'admin' || user?.role === 'manager') {
        setApprovalRequests(requestsRes?.data || []);
      }
    } catch (err) {
      console.error('Data fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      setProfileFormData({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newUser.password && newUser.password !== newUser.confirmPassword) {
      alert('New password and confirm password must match.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...newUser,
        actorRole: user?.role,
        role: user?.role === 'manager' ? 'customer' : newUser.role,
      };
      const endpoint = user?.role === 'admin' ? '/admin/add-user' : '/users';
      await fetchClient(endpoint, { method: 'POST', body: payload });
      setNewUser({ ...emptyUserForm, confirmPassword: '' });
      setShowCreateModal(false);
      // Naya user add hone par poori list refresh karo taaki koi user gayab na ho
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (targetUser) => {
    // FIX 3: Inactive users edit nahi ho sakte
    if (normalizeStatus(targetUser?.status) === 'inactive') {
      alert('This user is inactive. You cannot edit an inactive user. Activate them first.');
      return;
    }
    setEditingUser(targetUser);
    setEditFormData({
      name: targetUser.name,
      email: targetUser.email,
      password: '',
      confirmPassword: '',
      status: targetUser.status || 'active',
      role: targetUser.role || 'customer',
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      alert('New password and confirm password must match.');
      return;
    }
    setLoading(true);
    try {
      if (user?.role === 'manager' && editFormData.password) {
        await fetchClient('/password-change-requests', {
          method: 'POST',
          body: {
            targetUserId: editingUser._id,
            password: editFormData.password,
            actorRole: user?.role,
            requesterId: user?.id || user?._id,
          },
        });
        alert('Password change request submitted for admin approval');
      } else {
        const payload = {
          ...editFormData,
          actorRole: user?.role,
          role: user?.role === 'admin' ? editFormData.role : undefined,
        };
        const endpoint = user?.role === 'admin' ? `/admin/users/${editingUser._id}` : `/users/${editingUser._id}`;
        await fetchClient(endpoint, { method: 'PUT', body: payload });
      }
      setEditingUser(null);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (targetUser) => {
    try {
      await fetchClient(`/users/soft-delete/${targetUser._id}`, { method: 'PATCH', body: { actorRole: user?.role } });
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusToggle = async (targetUser) => {
    try {
      const nextStatus = normalizeStatus(targetUser.status) === 'active' ? 'inactive' : 'active';
      const endpoint = user?.role === 'admin' ? `/admin/toggle-status/${targetUser._id}` : `/users/${targetUser._id}`;
      await fetchClient(endpoint, {
        method: 'PUT',
        body: { status: nextStatus, actorRole: user?.role },
      });
      // Toggle ke baad data refresh karo taaki user gayab hone ki jagah Inactive table mein shift ho
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const targetId = user?.id || user?._id;
      await fetchClient(`/users/${targetId}`, {
        method: 'PUT',
        body: {
          name: profileFormData.name,
          email: profileFormData.email,
          actorRole: user?.role,
        },
      });
      setShowProfileModal(false);
      await fetchData();
      alert('Profile updated');
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeRequest = async () => {
    if (!profilePassword || profilePassword !== profileConfirmPassword) {
      alert('New password and confirm password must match.');
      return;
    }

    setLoading(true);
    try {
      const targetId = user?.id || user?._id;
      await fetchClient('/password-change-requests', {
        method: 'POST',
        body: { targetUserId: targetId, password: profilePassword, actorRole: user?.role, requesterId: targetId },
      });
      setProfilePassword('');
      setProfileConfirmPassword('');
      alert('Password change request submitted for approval');
    } catch (err) {
      alert(err.message || 'Failed to submit password change request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRejectRequest = async (e) => {
    e.preventDefault();
    try {
      await fetchClient(`/password-change-requests/${approvalReview.requestId}/review`, {
        method: 'PATCH',
        body: { action: approvalReview.action, rejectionReason: approvalReview.reason },
      });
      setApprovalReview({ requestId: '', action: 'Approved', reason: '' });
      await fetchData();
      alert('Request review submitted');
    } catch (err) {
      alert(err.message);
    }
  };

  const dismissRequest = async (requestId) => {
    try {
      await fetchClient(`/password-change-requests/${requestId}/review`, {
        method: 'PATCH',
        body: { action: 'Approved' },
      });
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderUserTable = (title, users, allowEdit = true) => {
    const visibleUsers = users.filter((item) => normalizeRole(item?.role) !== 'admin');
    return (
      <div style={{ marginBottom: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>{visibleUsers.length} record(s)</span>
        </div>
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
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>No users found</td>
              </tr>
            ) : (
              visibleUsers.map((item) => {
                const isItemInactive = normalizeStatus(item?.status) === 'inactive';
                return (
                  <tr key={item._id} style={{ opacity: isItemInactive ? 0.75 : 1 }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{item.email}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{roleLabel[item.role] || item.role}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          backgroundColor: !isItemInactive ? '#dcfce7' : '#fee2e2',
                          color: !isItemInactive ? '#166534' : '#991b1b',
                          fontWeight: '500'
                        }}
                      >
                        {!isItemInactive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                      {allowEdit && (
                        <>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            style={{ padding: '6px 12px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}
                          >
                            {isItemInactive ? 'Activate' : 'Inactivate'}
                          </button>
                          
                          {/* FIX 3: Inactive users ke liye Edit Button disable / hide kar diya hai */}
                          <button
                            disabled={isItemInactive}
                            onClick={() => openEditModal(item)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: isItemInactive ? '#9ca3af' : '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: isItemInactive ? 'not-allowed' : 'pointer',
                              marginRight: '8px',
                              opacity: isItemInactive ? 0.6 : 1
                            }}
                            title={isItemInactive ? "Cannot edit inactive user" : "Edit user"}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleArchive(item)}
                            style={{ padding: '6px 12px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Logged-in Customer Status Dynamic Logic (FIX 2)
  const loggedInStatus = normalizeStatus(user?.status);
  const isSelfInactive = loggedInStatus === 'inactive';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{user?.role === 'admin' ? 'Admin Dashboard' : user?.role === 'manager' ? 'Manager Dashboard' : 'Customer Dashboard'}</h2>
          <p style={{ margin: '4px 0 0', color: '#d1d5db' }}>Manage users, approvals, and profile access from one place.</p>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#e5e7eb' }}>Hello, {user?.name || user?.email}</span>
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </button>
          {profileMenuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '54px', background: '#fff', color: '#111827', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', minWidth: '160px', zIndex: 10 }}>
              <button onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Edit Profile</button>
              <button onClick={() => { setProfileMenuOpen(false); onLogout(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px' }}>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button onClick={() => setShowCreateModal(true)} style={{ padding: '10px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Add User
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button onClick={() => navigate('/archived-users')} style={{ padding: '10px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              View Archived Users
            </button>
          )}
        </div>

        {user?.role === 'admin' && approvalRequests.length > 0 && (
          <div style={{ marginBottom: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
            <h3 style={{ marginTop: 0 }}>Pending Password Change Requests</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Requested By</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Target User</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvalRequests.map((request) => (
                  <tr key={request._id}>
                    <td style={{ padding: '10px' }}>{request.requestedBy?.name || request.requestedBy?.email}</td>
                    <td style={{ padding: '10px' }}>{request.targetUser?.name || request.targetUser?.email}</td>
                    <td style={{ padding: '10px' }}>{request.status}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => setApprovalReview({ requestId: request._id, action: 'Approved', reason: '' })} style={{ padding: '6px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '8px' }}>Approve</button>
                      <button onClick={() => setApprovalReview({ requestId: request._id, action: 'Rejected', reason: '' })} style={{ padding: '6px 10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {approvalReview.requestId && (
              <form onSubmit={handleApproveRejectRequest} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select value={approvalReview.action} onChange={(e) => setApprovalReview({ ...approvalReview, action: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
                {approvalReview.action === 'Rejected' && (
                  <textarea value={approvalReview.reason} onChange={(e) => setApprovalReview({ ...approvalReview, reason: e.target.value })} placeholder="Rejection reason" style={{ minHeight: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                )}
                <button type="submit" style={{ alignSelf: 'flex-start', padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Submit Review</button>
              </form>
            )}
          </div>
        )}

        {user?.role === 'manager' && (
          <div style={{ marginBottom: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
            <h3 style={{ marginTop: 0 }}>My Approval Requests</h3>
            {approvalRequests.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No approval requests yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {approvalRequests.map((request) => (
                  <div key={request._id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <strong>{request.targetUser?.name || 'Customer'}</strong>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>{request.targetUser?.email || 'No email'}</div>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: request.status === 'Approved' ? '#dcfce7' : request.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: request.status === 'Approved' ? '#166534' : request.status === 'Rejected' ? '#991b1b' : '#92400e' }}>{request.status}</span>
                    </div>
                    <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>Requested: {new Date(request.createdAt).toLocaleDateString()}</div>
                    {request.rejectionReason && <div style={{ marginTop: '6px', color: '#991b1b', fontSize: '14px' }}>Reason: {request.rejectionReason}</div>}
                    {(request.status === 'Approved' || request.status === 'Rejected') && (
                      <button onClick={() => dismissRequest(request._id)} style={{ marginTop: '10px', padding: '6px 10px', border: 'none', borderRadius: '6px', backgroundColor: '#6b7280', color: '#fff', cursor: 'pointer' }}>Dismiss</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {user?.role === 'admin' ? (
          <>
            {renderUserTable('Managers', getUsersByRoleStatus(activeUsers, 'manager', 'active'), true)}
            {renderUserTable('Customers', getUsersByRoleStatus(activeUsers, 'customer', 'active'), true)}
            {renderUserTable('Inactive Managers', getUsersByRoleStatus(inactiveUsers, 'manager', 'inactive'), true)}
            {renderUserTable('Inactive Customers', getUsersByRoleStatus(inactiveUsers, 'customer', 'inactive'), true)}
          </>
        ) : user?.role === 'manager' ? (
          <>
            {renderUserTable('Customers', getUsersByRoleStatus(activeUsers, 'customer', 'active'), true)}
            {renderUserTable('Inactive Customers', getUsersByRoleStatus(inactiveUsers, 'customer', 'inactive'), true)}
          </>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ background: isSelfInactive ? 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', borderRadius: '16px', padding: '24px' }}>
              <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '12px', opacity: 0.85 }}>Customer Portal</p>
              <h3 style={{ margin: '8px 0 6px', fontSize: '28px' }}>Welcome back, {user?.name || 'Customer'}!</h3>
              <p style={{ margin: 0, opacity: 0.95 }}>Manage your account details and keep your security up to date from one simple view.</p>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '2fr 1fr' }}>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Account Overview</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 6px', fontWeight: 'bold' }}>{user?.name || 'Customer Name'}</p>
                    <p style={{ margin: 0, color: '#6b7280' }}>{user?.email || 'user@example.com'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* FIX 2: Customer Status Ab Real-time Dynamically Badge render karta hai */}
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: !isSelfInactive ? '#dcfce7' : '#fee2e2', color: !isSelfInactive ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
                      {!isSelfInactive ? 'Active' : 'Inactive'}
                    </span>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1e3a8a' }}>Customer</span>
                  </div>
                </div>
                <p style={{ margin: '0 0 8px', color: '#6b7280' }}><strong>Member since:</strong> {new Date().toLocaleDateString()}</p>
                <p style={{ margin: 0, color: isSelfInactive ? '#dc2626' : '#6b7280', fontWeight: isSelfInactive ? 'bold' : 'normal' }}>
                  {isSelfInactive ? 'Warning: Your account is currently inactive. Contact support or admin to restore full access.' : 'Your account is secure, active, and ready for self-service actions.'}
                </p>
              </div>

              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Quick Actions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* FIX 3: Agar Inactive Customer Portal par hai toh Edit Disabled rahega */}
                  <button
                    disabled={isSelfInactive}
                    onClick={() => setShowProfileModal(true)}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isSelfInactive ? '#9ca3af' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSelfInactive ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSelfInactive ? 'Profile Locked (Inactive)' : 'Edit Profile & Security'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <h4 style={{ marginTop: 0 }}>Account Health</h4>
                <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold', color: isSelfInactive ? '#dc2626' : '#16a34a' }}>
                  {isSelfInactive ? 'Restricted' : 'Good'}
                </p>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <h4 style={{ marginTop: 0 }}>Security Status</h4>
                <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold' }}>Encrypted</p>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <h4 style={{ marginTop: 0 }}>Support</h4>
                <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 'bold' }}>24/7</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 25 }}>
          <div style={{ background: '#fff', width: '420px', padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Edit Profile & Security</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', backgroundColor: '#e5e7eb', cursor: 'pointer' }}>Close</button>
            </div>
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input value={profileFormData.name} onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })} placeholder="Name" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input value={profileFormData.email} onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })} placeholder="Email" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="password" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} placeholder="New Password (optional)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                <input type="password" value={profileConfirmPassword} onChange={(e) => setProfileConfirmPassword(e.target.value)} placeholder="Confirm Password" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={handlePasswordChangeRequest} disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {loading ? 'Working...' : 'Request Password Change'}
                </button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
          <div style={{ background: '#fff', width: '360px', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0 }}>Add User</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Name" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="New Password" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input type="password" value={newUser.confirmPassword} onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} placeholder="Confirm Password" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              {user?.role === 'admin' && (
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="customer">Customer</option>
                  <option value="manager">Manager</option>
                </select>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
          <div style={{ background: '#fff', width: '380px', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0 }}>Edit User</h3>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Name" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} placeholder="Email" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input type="password" value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} placeholder="New Password (optional)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              <input type="password" value={editFormData.confirmPassword} onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })} placeholder="Confirm Password" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
              
              <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {user?.role === 'admin' && (
                <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="customer">Customer</option>
                  <option value="manager">Manager</option>
                </select>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ padding: '8px 12px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{loading ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};