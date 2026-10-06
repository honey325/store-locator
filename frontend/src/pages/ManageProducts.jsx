import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useParams, useNavigate } from 'react-router-dom';

const ManageProducts = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.get(`/products/${storeId}`);
      setProducts(res.data.products);
    } catch (err) {
      console.error(err);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editProductId) {
        await axiosInstance.put(`/products/${editProductId}`, formData);
        alert('Product updated successfully!');
      } else {
        await axiosInstance.post(`/products/${storeId}`, formData);
        alert('Product created successfully!');
      }
      
      setShowForm(false);
      setEditProductId(null);
      setFormData({ name: '', description: '', price: '', stock: '' });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEditClick = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock
    });
    setEditProductId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axiosInstance.delete(`/products/${id}`);
        fetchProducts();
      } catch (err) {
        alert('Failed to delete product');
      }
    }
  };

  if (loading) return <div style={styles.container}>Loading products...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/my-stores')} style={styles.backBtn}>&larr; Back</button>
          <h2>Manage Products</h2>
        </div>
        <button onClick={() => {
          setShowForm(!showForm);
          if (showForm) setEditProductId(null);
          setFormData({ name: '', description: '', price: '', stock: '' });
        }} style={styles.createBtn}>
          {showForm ? 'Cancel' : 'Add New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveProduct} style={styles.formCard}>
          <h3>{editProductId ? 'Edit Product' : 'Add New Product'}</h3>
          <div style={styles.grid}>
            <input type="text" name="name" placeholder="Product Name" required value={formData.name} onChange={handleInputChange} style={styles.input} />
            <input type="number" step="0.01" name="price" placeholder="Price ($)" required value={formData.price} onChange={handleInputChange} style={styles.input} />
            <input type="number" name="stock" placeholder="Stock Quantity" required value={formData.stock} onChange={handleInputChange} style={styles.input} />
            <input type="text" name="description" placeholder="Description (optional)" value={formData.description} onChange={handleInputChange} style={styles.input} />
          </div>
          <button type="submit" style={styles.submitBtn}>Save Product</button>
        </form>
      )}

      <div style={styles.list}>
        {products.length === 0 ? <p>No products added yet.</p> : (
          products.map(product => (
            <div key={product.id} style={styles.card}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h3>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem' }}>
                  Price: ${product.price} | Stock: {product.stock}
                </p>
                {product.description && (
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
                    {product.description}
                  </p>
                )}
              </div>
              <div style={styles.actions}>
                <button onClick={() => handleEditClick(product)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(product.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))
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
  backBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
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
  }
};

export default ManageProducts;
