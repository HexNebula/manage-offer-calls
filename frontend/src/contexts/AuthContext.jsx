import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext(null);

const BASE_URL = 'http://localhost:8000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef(null);

  // Keep ref in sync so axios interceptors always see the latest token
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // On mount: silently try to restore session via refresh cookie
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await axios.post(
          `${BASE_URL}/auth/refresh/`,
          {},
          { withCredentials: true }
        );
        const { access } = response.data;
        setAccessToken(access);
        accessTokenRef.current = access;

        // Fetch user profile with the new token
        const meResponse = await axios.get(`${BASE_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${access}` },
          withCredentials: true,
        });
        setUser(meResponse.data);
      } catch {
        // No valid session — user must log in
        setUser(null);
        setAccessToken(null);
        accessTokenRef.current = null;
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(
      `${BASE_URL}/auth/login/`,
      { email, password },
      { withCredentials: true }
    );
    const { access, user: userData } = response.data;
    setAccessToken(access);
    accessTokenRef.current = access;
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${BASE_URL}/auth/logout/`,
        {},
        {
          headers: { Authorization: `Bearer ${accessTokenRef.current}` },
          withCredentials: true,
        }
      );
    } catch {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      accessTokenRef.current = null;
    }
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    accessToken,
    accessTokenRef,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
