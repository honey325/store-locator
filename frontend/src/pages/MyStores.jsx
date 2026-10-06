import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MyStores = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editStoreId, setEditStoreId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    fetchMyStores();
  }, []);

  const fetchMyStores = async () => {
    try {
      const res = await axiosInstance.get('/stores/my-stores');
      setStores(res.data.stores);
    } catch (err) {
      console.error(err);
      alert('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    try {
      if (editStoreId) {
        await axiosInstance.put(`/stores/${editStoreId}`, formData);
        alert('Store updated successfully!');
      } else {
        await axiosInstance.post('/stores', formData);
        alert('Store created successfully!');
      }
      
      setShowForm(false);
      setEditStoreId(null);
      setFormData({
        name: '', addressLine1: '', addressLine2: '', 
        city: '', state: '', pincode: '', latitude: '', longitude: ''
      });
      fetchMyStores();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save store');
    }
  };

  const handleEditClick = (store) => {
    const address = store.addresses?.[0] || {};
    setFormData({
      name: store.name || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      latitude: address.latitude || '',
      longitude: address.longitude || ''
    });
    setEditStoreId(store.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await axiosInstance.delete(`/stores/${id}`);
        fetchMyStores();
      } catch (err) {
        alert('Failed to delete store');
      }
    }
  };

  if (loading) return <div style={styles.container}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>My Stores</h2>
        <button onClick={() => {
          setShowForm(!showForm);
          if (showForm) setEditStoreId(null);
          setFormData({
            name: '', addressLine1: '', addressLine2: '', 
            city: '', state: '', pincode: '', latitude: '', longitude: ''
          });
        }} style={styles.createBtn}>
          {showForm ? 'Cancel' : 'Add New Store'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveStore} style={styles.formCard}>
          <h3>{editStoreId ? 'Edit Store' : 'Add New Store'}</h3>
          <div style={styles.grid}>
            <input type="text" name="name" placeholder="Store Name" required value={formData.name} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="addressLine1" placeholder="Address Line 1" required value={formData.addressLine1} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="addressLine2" placeholder="Address Line 2 (Optional)" value={formData.addressLine2} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="city" placeholder="City" required value={formData.city} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="state" placeholder="State" required value={formData.state} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="pincode" placeholder="Pincode" required value={formData.pincode} onChange={handleInputChange} style={styles.input} />
            <input type="number" step="any" name="latitude" placeholder="Latitude (e.g. 23.0225)" required value={formData.latitude} onChange={handleInputChange} style={styles.input} />
            <input type="number" step="any" name="longitude" placeholder="Longitude (e.g. 72.5714)" required value={formData.longitude} onChange={handleInputChange} style={styles.input} />
          </div>
          <button type="submit" style={styles.submitBtn}>Save Store</button>
        </form>
      )}

      <div style={styles.list}>
        {stores.length === 0 ? <p>You have not created any stores yet.</p> : (
          stores.map(store => {
            const address = store.addresses?.[0];
            return (
              <div key={store.id} style={styles.card}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{store.name}</h3>
                  {address && (
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem' }}>
                      {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
                    </p>
                  )}
                </div>
                <div style={styles.actions}>
                  <button onClick={() => navigate(`/my-stores/${store.id}/products`)} style={styles.productsBtn}>Products</button>
                  <button onClick={() => handleEditClick(store)} style={styles.editBtn}>Edit</button>
                  <button onClick={() => handleDelete(store.id)} style={styles.deleteBtn}>Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  createBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  formCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box'
  },
  submitBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e5e7eb'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  deleteBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  productsBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};

export default MyStores;
