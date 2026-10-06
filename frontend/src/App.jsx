import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { io } from 'socket.io-client';

import Login from './pages/Login';
import Register from './pages/Register';
import Stores from './pages/Stores';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import MyStores from './pages/MyStores';
import Conversations from './pages/Conversations';
import ManageProducts from './pages/ManageProducts';
import StoreDetails from './pages/StoreDetails';

// A simple layout with a navbar and logout button
const DashboardLayout = ({ children, unreadCount }) => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>Store Locator</div>
        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>Stores & Map</Link>
          
          {user?.role?.roleName === 'owner' && (
            <Link to="/my-stores" style={styles.link}>My Stores</Link>
          )}

          <Link to="/chat" style={styles.link}>Chats</Link>

          <Link to="/profile" style={styles.link}>Profile</Link>

          {/* Global Chat Notification Badge */}
          {unreadCount > 0 && (
            <span style={styles.notificationBadge}>
              💬 {unreadCount} New Message{unreadCount > 1 ? 's' : ''}
            </span>
          )}

          <span style={styles.userText}>Hello, {user?.name} ({user?.role?.roleName})</span>
          <button onClick={logout} style={styles.logoutButton}>Logout</button>
        </div>
      </nav>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
};

// Global Socket manager and Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    
    // Connect to global socket for notifications
    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      // In a real app, you might emit 'join_global' or loop over all user's conversations to join them,
      // but if the backend broadcasts to users directly, you can listen here.
      // For now, we listen to any incoming 'new_message' if we adapt the backend.
      // But since backend emits to rooms (`conversation_${id}`), we only get it if we join rooms.
      // The easiest way for notifications without major backend changes is polling or modifying backend to emit to user rooms.
      // For demonstration, let's just show an alert if any new message event leaks here.
    });

    socket.on('new_message', (msg) => {
      // If we are not on the chat page, show notification
      if (!location.pathname.startsWith('/chat/')) {
        setUnreadCount(prev => prev + 1);
        // HTML5 Notification could also go here
        if (Notification.permission === 'granted') {
          new Notification('New Message', { body: msg.message });
        }
      }
    });

    // Request desktop notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, location.pathname]);

  // Reset unread count when visiting chat
  useEffect(() => {
    if (location.pathname.startsWith('/chat/')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <DashboardLayout unreadCount={unreadCount}>{children}</DashboardLayout>;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
          <Route path="/stores/:storeId" element={<ProtectedRoute><StoreDetails /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/my-stores" element={<ProtectedRoute><MyStores /></ProtectedRoute>} />
          <Route path="/my-stores/:storeId/products" element={<ProtectedRoute><ManageProducts /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Conversations /></ProtectedRoute>} />
          <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1f2937',
    color: 'white',
  },
  navBrand: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  userText: {
    fontSize: '0.875rem',
    borderLeft: '1px solid #4b5563',
    paddingLeft: '1.5rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    animation: 'pulse 2s infinite',
  },
  main: {
    padding: 0,
    height: 'calc(100vh - 64px)',
  }
};

export default App;
