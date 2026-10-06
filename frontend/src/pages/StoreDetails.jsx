import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StoreDetails = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchStoreDetails();
    fetchProducts(1);
  }, [storeId]);

  const fetchStoreDetails = async () => {
    try {
      const res = await axiosInstance.get(`/stores/${storeId}`);
      setStore(res.data.store);
    } catch (err) {
      console.error(err);
      alert('Failed to load store details');
    }
  };

  const fetchProducts = async (pageNum) => {
    try {
      const res = await axiosInstance.get(`/products/${storeId}?page=${pageNum}&limit=5`);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async () => {
    try {
      const res = await axiosInstance.post(`/chat/conversations/${storeId}`);
      navigate(`/chat/${res.data.conversation.id}`);
    } catch (err) {
      console.error(err);
      alert('Could not start chat');
    }
  };

  const getGoogleMapsUrl = () => {
    if (!store || !store.addresses || store.addresses.length === 0) return '#';
    const { latitude, longitude } = store.addresses[0];
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  };

  if (loading) return <div style={styles.container}>Loading store details...</div>;
  if (!store) return <div style={styles.container}>Store not found.</div>;

  const address = store.addresses?.[0];

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.backBtn}>&larr; Back to Stores</button>
      
      <div style={styles.storeCard}>
        <h2>{store.name}</h2>
        {address && (
          <p style={{ color: '#4b5563' }}>
            {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
          </p>
        )}
        
        <div style={styles.actions}>
          <a href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer" style={styles.navBtn}>
            🗺️ Navigate in Google Maps
          </a>
          
          {user?.role?.roleName === 'customer' && (
            <button onClick={startChat} style={styles.chatBtn}>
              💬 Chat with Owner
            </button>
          )}
        </div>
      </div>

      <div style={styles.productsSection}>
        <h3>Products</h3>
        
        {products.length === 0 ? (
          <p>No products available in this store.</p>
        ) : (
          <div style={styles.grid}>
            {products.map(product => (
              <div key={product.id} style={styles.productCard}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h4>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#10b981' }}>
                  ${parseFloat(product.price).toFixed(2)}
                </p>
                {product.description && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    {product.description}
                  </p>
                )}
                <p style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.5rem' }}>
                  In Stock: {product.stock}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div style={styles.pagination}>
            <button 
              disabled={page === 1} 
              onClick={() => fetchProducts(page - 1)}
              style={styles.pageBtn}
            >
              Previous
            </button>
            <span style={{ margin: '0 1rem' }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button 
              disabled={page === pagination.totalPages} 
              onClick={() => fetchProducts(page + 1)}
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem',
  },
  backBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  storeCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  navBtn: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  chatBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  productsSection: {
    marginTop: '2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  productCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e5e7eb'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '2rem'
  },
  pageBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default StoreDetails;
