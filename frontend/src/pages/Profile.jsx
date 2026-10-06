import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = { name: formData.name };
      if (formData.password) {
        dataToSubmit.password = formData.password;
      }
      
      const res = await axiosInstance.put(`/users/${user.id}`, dataToSubmit);
      alert('Profile updated successfully!');
      
      // Update local state with new user info
      setUser({ ...user, name: res.data.user.name });
      setIsEditing(false);
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await axiosInstance.delete(`/users/${user.id}`);
      alert("Your account has been deleted.");
      logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>My Profile</h2>
        
        {!isEditing ? (
          <div>
            <div style={styles.infoGroup}>
              <label style={styles.label}>Name</label>
              <p style={styles.value}>{user?.name}</p>
            </div>
            <div style={styles.infoGroup}>
              <label style={styles.label}>Email</label>
              <p style={styles.value}>{user?.email}</p>
            </div>
            <div style={styles.infoGroup}>
              <label style={styles.label}>Role</label>
              <p style={styles.value}>
                <span style={styles.roleBadge}>{user?.role?.roleName}</span>
              </p>
            </div>
            
            <div style={styles.actionButtons}>
              <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                Edit Profile
              </button>
              <button onClick={handleDeleteAccount} style={styles.deleteBtn}>
                Delete Account
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            <div style={styles.infoGroup}>
              <label style={styles.label}>Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                style={styles.input} 
                required 
              />
            </div>
            <div style={styles.infoGroup}>
              <label style={styles.label}>Email (Cannot be changed)</label>
              <input 
                type="email" 
                value={user?.email} 
                style={{ ...styles.input, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} 
                disabled 
              />
            </div>
            <div style={styles.infoGroup}>
              <label style={styles.label}>New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleInputChange} 
                style={styles.input} 
                placeholder="••••••••" 
              />
            </div>
            
            <div style={styles.actionButtons}>
              <button type="submit" style={styles.saveBtn}>Save Changes</button>
              <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
  },
  heading: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#1f2937',
  },
  infoGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
    fontWeight: '500'
  },
  value: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#111827',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  editBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: 1
  },
  deleteBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: 1
  },
  saveBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: 1
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#9ca3af',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    flex: 1
  }
};

export default Profile;