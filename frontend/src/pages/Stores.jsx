import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons not showing in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to dynamically change map center
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const Stores = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India roughly
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is a customer, try to get their location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          fetchNearestStores(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location', error);
          fetchAllStores(); // Fallback
        }
      );
    } else {
      fetchAllStores();
    }
  }, []);

  const fetchAllStores = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/stores?search=${searchQuery}`);
      console.log(res,"res.data.data");
      
      setStores(res.data.stores);
      if (res.data.stores.length > 0) {
        setMapCenter([res.data.stores[0].addresses[0].latitude, res.data.stores[0].addresses[0].longitude]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearestStores = async (lat, lng, rad = 10, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        `/stores/nearest?lat=${lat}&lng=${lng}&radius=${rad}&search=${searchQuery}`
      );
      console.log(res,"restss");
      
      setStores(res.data.stores);
      if (res.data.stores.length > 0) {
        setMapCenter([res.data.stores[0].addresses[0].latitude, res.data.stores[0].addresses[0].longitude]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (userLocation) {
      fetchNearestStores(userLocation.lat, userLocation.lng, radius, search);
    } else {
      fetchAllStores(search);
    }
  };

  const startChat = async (storeId) => {
    try {
      const res = await axiosInstance.post(`/chat/conversations/${storeId}`);
      navigate(`/chat/${res.data.conversation.id}`);
    } catch (err) {
      console.error(err);
      alert('Could not start chat');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.heading}>Stores</h2>
        
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />
          {userLocation && (
            <input
              type="number"
              placeholder="Radius (km)"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              style={styles.radiusInput}
            />
          )}
          <button type="submit" style={styles.button}>Search</button>
        </form>

        {loading ? <p>Loading...</p> : (
          <div style={styles.list}>
            {stores?.map(store => {
              const address = store.addresses?.[0];
              return (
                <div key={store.id} style={styles.storeCard}>
                  <h3 style={styles.storeName}>{store.name}</h3>
                  {address && (
                    <p style={styles.storeAddress}>
                      {address.addressLine1}, {address.city}, {address.state}
                    </p>
                  )}
                  {store.distance !== undefined && (
                    <p style={styles.storeDistance}>
                      Distance: {parseFloat(store.distance).toFixed(2)} km
                    </p>
                  )}
                  {user?.role?.roleName === 'customer' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => navigate(`/stores/${store.id}`)} style={{...styles.chatBtn, backgroundColor: '#3b82f6'}}>
                        View Details
                      </button>
                      <button onClick={() => startChat(store.id)} style={styles.chatBtn}>
                        Chat
                      </button>
                    </div>
                  )}
                  {user?.role?.roleName !== 'customer' && (
                    <button onClick={() => navigate(`/stores/${store.id}`)} style={{...styles.chatBtn, backgroundColor: '#3b82f6'}}>
                      View Details
                    </button>
                  )}
                </div>
              );
            })}
            {stores?.length === 0 && <p>No stores found.</p>}
          </div>
        )}
      </div>

      <div style={styles.mapContainer}>
        <MapContainer center={mapCenter} zoom={13} style={styles.map}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={mapCenter} zoom={12} />
          
          {/* User Location Marker */}
          {userLocation && (
             <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
               <Popup>You are here</Popup>
             </Marker>
          )}

          {/* Store Markers */}
          {stores.map(store => {
            const address = store.addresses?.[0];
            if (!address) return null;
            return (
              <Marker key={store.id} position={[address.latitude, address.longitude]}>
                <Popup>
                  <strong>{store.name}</strong><br />
                  {address.addressLine1}, {address.city}<br/>
                  {user?.role?.roleName === 'customer' && (
                    <button onClick={() => startChat(store.id)} style={{...styles.chatBtn, marginTop: '5px', padding: '4px 8px', fontSize: '12px'}}>
                      Chat
                    </button>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 64px)', // Assuming navbar is ~64px
    width: '100%',
  },
  sidebar: {
    width: '350px',
    padding: '1rem',
    overflowY: 'auto',
    backgroundColor: '#fff',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#1f2937'
  },
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  radiusInput: {
    width: '80px',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  button: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  storeCard: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
  },
  storeName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    color: '#111827'
  },
  storeAddress: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.9rem',
    color: '#4b5563'
  },
  storeDistance: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#10b981'
  },
  chatBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%'
  },
  mapContainer: {
    flex: 1,
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  }
};

export default Stores;
