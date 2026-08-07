import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AsyncStorage } from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const AuthContext = createContext(null);

const FACEBOOK_AUTH_REDIRECT = 'medscan://auth/facebook';

let isGoogleConfigured = false;
let lastGoogleConfigWarning = null;

function configureGoogleSignIn() {
  if (!GoogleSignin || isGoogleConfigured) return true;

  const webClientId = 'YOUR_GOOGLE_WEB_CLIENT_ID'; // Replace with actual from env
  if (!webClientId || webClientId.includes('YOUR_')) {
    const warningKey = 'GOOGLE_WEB_CLIENT_ID missing in env config';
    if (warningKey !== lastGoogleConfigWarning) {
      console.warn('[MedScan] GOOGLE_WEB_CLIENT_ID missing in env config');
      lastGoogleConfigWarning = warningKey;
    }
    return false;
  }

  try {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    isGoogleConfigured = true;
    return true;
  } catch (e) {
    console.error('[MedScan] GoogleSignin configure failed:', e);
    return false;
  }
}

function getGoogleSignInErrorMessage(error) {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'DEVELOPER_ERROR' || message.includes('DEVELOPER_ERROR')) {
    return 'Google Sign-In is misconfigured. Check your Google Cloud OAuth client, package name (com.medscan), and SHA-1 fingerprint.';
  }

  if (message.includes('10:') || message.includes('12500')) {
    return 'Google Play services or the Google account setup is not valid on this device.';
  }

  if (code === 'SIGN_IN_CANCELLED' || message.includes('CANCELLED')) {
    return 'Sign in was cancelled.';
  }

  return 'Google Sign-In failed. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleIncomingUrl = async (url) => {
      if (!url) return;
      if (!url.includes('/auth/v1/callback') && !url.includes('/auth/callback')) return;

      try {
        const result = await supabase.auth.getSession();
        const currentSession = result?.data?.session ?? null;
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (e) {
        console.log('Deep link session error:', e);
      }
    };

    // Initial session
    const boot = async () => {
      try {
        const timeout = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1200),
        );
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeout,
        ]);
        if (!mounted) return;
        const currentSession = result?.data?.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (e) {
        console.log('Boot session error:', e);
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    // Auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Deep linking
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    const getInitialUrl = Linking.getInitialURL().then(handleIncomingUrl);

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
      linkingSub?.remove?.();
    };
  }, []);

  const signInStub = (partial = {}) => {
    setUser((prev) => ({
      id: prev?.id ?? 'local-stub-user',
      profileComplete: false,
      ...prev,
      ...partial,
    }));
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return { success: true, data };
  };

  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return { success: true, data };
  };

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In package not installed');
    }

    const configured = configureGoogleSignIn();

    if (!configured) {
      throw new Error('Google Sign-In setup failed. Check the Google configuration and environment variables.');
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      if (error?.code === 'SIGN_IN_CANCELLED') {
        return { cancelled: true };
      }
      throw new Error(getGoogleSignInErrorMessage(error));
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: FACEBOOK_AUTH_REDIRECT,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      throw new Error(error?.message || 'Facebook Sign-In failed');
    }
  };

  const signOut = async () => {
    try {
      if (GoogleSignin) await GoogleSignin.signOut();
    } catch (_) {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!session;

  const value = {
    user,
    session,
    loading,
    isAuthenticated,
    signInStub,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
