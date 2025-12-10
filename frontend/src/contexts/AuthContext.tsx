import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  username: string;
  theme: 'light' | 'dark';
  llm_model: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (theme?: 'light' | 'dark', llmModel?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user when token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user', error);
        // Token is invalid, clear it
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/api/auth/login`, formData);
    const { access_token } = response.data;

    localStorage.setItem('token', access_token);
    setToken(access_token);

    // Fetch user data
    const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    setUser(userResponse.data);
  };

  const register = async (email: string, username: string, password: string) => {
    await axios.post(`${API_URL}/api/auth/register`, {
      email,
      username,
      password
    });

    // Auto-login after registration
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (theme?: 'light' | 'dark', llmModel?: string) => {
    if (!token) return;

    const response = await axios.put(
      `${API_URL}/api/auth/profile`,
      {
        theme: theme || user?.theme,
        llm_model: llmModel || user?.llm_model
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    setUser(response.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
