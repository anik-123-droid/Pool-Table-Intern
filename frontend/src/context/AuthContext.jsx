import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setUser(data);
    } catch (error) {
      setUser(null);
    }
  };

  const login = async (email, password, captchaToken) => {
    const { data } = await api.post('/auth/login', { email, password, captchaToken });
    setUser(data);
    return data;
  };

  const loginByName = async (name, password, captchaToken) => {
    const { data } = await api.post('/auth/login', { name, password, captchaToken });
    setUser(data);
    return data;
  };

  const register = async (name, email, password, role, captchaToken) => {
    const { data } = await api.post('/auth/register', { name, email, password, role, captchaToken });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed on backend:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, loginByName, register, logout, loading, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
