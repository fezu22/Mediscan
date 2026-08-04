import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ENV } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(undefined);

let GoogleSignin = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.warn('[MedScan] Google Sign-In package not available');
}

let isGoogleConfigured = false;
let lastGoogleConfigWarning = '';

function configureGoogleSignIn() {
  if (!GoogleSignin || isGoogleConfigured) return true;

  const webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
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
      scopes: ['profile', 'email'],
    });
    isGoogleConfigured = true;
    return true;
  } catch (e) {
    console.warn('[MedScan] GoogleSignin.configure failed', e);
    return false;
  }
}

function getGoogleSignInErrorMessage(error) {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'DEVELOPER_ERROR' || message.includes('DEVELOPER_ERROR')) {
    return 'Google Sign-In is misconfigured. Check your Google Cloud OAuth client, package name (com.medscan), SHA-1 fingerprint, and Android signing setup.';
  }

  if (message.includes('10:') || message.includes('12500')) {
    return 'Google Play services or the Google account setup is not valid on this device.';
  }

  return message || 'Google sign-in failed.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In package not installed');
    }

    const configured = configureGoogleSignIn();

    if (!configured) {
      throw new Error('Google Sign-In setup failed. Check the Google configuration and environment values.');
    }

    if (!ENV.GOOGLE_WEB_CLIENT_ID || ENV.GOOGLE_WEB_CLIENT_ID.includes('YOUR_')) {
      throw new Error('GOOGLE_WEB_CLIENT_ID missing in env config');
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;

      if (!idToken) {
        throw new Error('No ID token returned from Google');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      if (
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.message?.toLowerCase?.().includes('cancel')
      ) {
        return { success: false, cancelled: true };
      }
      const friendlyMessage = getGoogleSignInErrorMessage(error);
      console.error('Google sign-in error:', error);
      const wrappedError = new Error(friendlyMessage);
      wrappedError.originalError = error;
      throw wrappedError;
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

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!session?.user,
      signInStub,
      signInWithGoogle,
      signOut,
    }),
    [user, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}