import React, { useState } from 'react';
import { fetchClient } from '../api/fetchClient';

export const UpdateProfile = ({ user, onUpdateSuccess }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchClient('/update-profile', {
        method: 'PUT',
        body: { userId: user._id, name, email },
      });
      alert(res.message);
      if (onUpdateSuccess) onUpdateSuccess(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '15px 0' }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Update Name"
        required
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Update Email"
        required
        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {loading ? 'Saving...' : 'Update Profile'}
      </button>
    </form>
  );
};