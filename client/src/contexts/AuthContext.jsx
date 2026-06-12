import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'rtcc_jwt_token';
const PROFILE_CACHE_KEY = 'rtcc_profile_cache';

function getCachedProfile() {
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const { profile, expiresAt } = JSON.parse(cached);
      if (Date.now() < expiresAt) return profile;
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedProfile(profile) {
  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      profile,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 min cache
    }));
  } catch { /* ignore */ }
}

function clearCachedProfile() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;

    try {
      const data = await api.get('/api/auth/me');
      const p = data.profile || data;
      setProfile(p);
      setUser(p); // user = profile in JWT mode
      setCachedProfile(p);
      setAuthError(null);
      return p;
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
      // Token is invalid or expired
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setProfile(null);
      clearCachedProfile();
      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          if (mounted) setLoading(false);
          return;
        }

        // Use cached profile for instant load
        const cached = getCachedProfile();
        if (cached && mounted) {
          setProfile(cached);
          setUser(cached);
          setLoading(false);
          // Refresh profile in background
          fetchProfile();
          return;
        }

        // No cache — fetch from server
        const p = await fetchProfile();
        if (!p && mounted) {
          // Token invalid
          setAuthError(null);
        }
      } catch (err) {
        console.error('Auth init error:', err.message);
        if (mounted) {
          setAuthError('Connection to server failed. Please check your internet and refresh.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      signOut();
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  async function signIn(email, password) {
    setAuthError(null);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      // Store token
      localStorage.setItem(TOKEN_KEY, data.token);

      // Set profile
      const p = data.profile;
      setProfile(p);
      setUser(p);
      setCachedProfile(p);
      setAuthError(null);

      return { profile: p };
    } catch (err) {
      throw err;
    }
  }

  async function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    clearCachedProfile();
    setUser(null);
    setProfile(null);
    setAuthError(null);
  }

  const value = {
    user,
    profile,
    loading,
    authError,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
