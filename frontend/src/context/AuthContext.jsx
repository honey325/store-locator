import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on load
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout(); // Clear invalid token
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (name, email, password, roleName) => {
    const response = await axiosInstance.post('/auth/register', { name, email, password, roleName });
    // After registration, usually they login, or we can log them in automatically
    // Let's just return success for now
    console.log(response,"response");
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
