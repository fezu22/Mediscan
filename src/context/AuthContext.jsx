import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Linking } from 'react-native';
import Config from 'react-native-config';

// Singleton context — prevents duplicate-module crash with Metro/@ alias
const globalKey = '__MEDSCAN_AUTH_CONTEXT__';
const AuthContext = globalThis[globalKey] || createContext(undefined);
if (!globalThis[globalKey]) {
  globalThis[globalKey] = AuthContext;
}

const FACEBOOK_AUTH_REDIRECT = 'medscan://auth/facebook';

let isGoogleConfigured = false;
let lastGoogleConfigWarning = null;

function configureGoogleSignIn() {
  if (!GoogleSignin || isGoogleConfigured) return true;

  const webClientId = Config.GOOGLE_WEB_CLIENT_ID || '';

  if (!webClientId) {
    const warningKey = 'GOOGLE_WEB_CLIENT_ID missing in env config';
    if (warningKey !== lastGoogleConfigWarning) {
      console.warn('[MedScan] GOOGLE_WEB_CLIENT_ID missing in env config');
      lastGoogleConfigWarning = warningKey;
    }
    return false;
  }

  try {
    const hasRequiredMethods =
      typeof GoogleSignin?.configure === 'function' &&
      typeof GoogleSignin?.hasPlayServices === 'function' &&
      typeof GoogleSignin?.signIn === 'function';

    if (!hasRequiredMethods) {
      return false;
    }

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

// Helper: URL se access_token + refresh_token nikaalna
function extractTokensFromUrl(url) {
  try {
    if (!url) return null;

    // Support both hash (#) and query (?) formats
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    let paramsString = '';
    if (hashIndex !== -1) {
      paramsString = url.substring(hashIndex + 1);
    } else if (queryIndex !== -1) {
      paramsString = url.substring(queryIndex + 1);
    }

    if (!paramsString) return null;

    const params = {};
    paramsString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });

    if (params.access_token && params.refresh_token) {
      return {
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      };
    }
    return null;
  } catch (e) {
    console.log('Token extract error:', e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handleIncomingUrl = async (url) => {
      if (!url) return;

      // Facebook / any OAuth deep link handle karo
      const isAuthCallback =
        url.includes('/auth/v1/callback') ||
        url.includes('/auth/callback') ||
        url.includes('medscan://auth/facebook') ||
        url.includes('access_token=') ||
        url.includes('refresh_token=');

      if (!isAuthCallback) return;

      try {
        // Pehle tokens extract karke setSession try karo
        const tokens = extractTokensFromUrl(url);
        if (tokens) {
          const { data, error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });

          if (!error && data?.session) {
            if (!mounted) return;
            setSession(data.session);
            setUser(data.session.user ?? null);
            setLoading(false);
            return;
          }
        }

        // Fallback: normal getSession
        const result = await supabase.auth.getSession();
        const currentSession = result?.data?.session ?? null;
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      } catch (e) {
        console.log('Deep link session error:', e);
      }
    };

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

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    const linkingSub = Linking.addEventListener('url', ({ url }) =>
      handleIncomingUrl(url),
    );
    Linking.getInitialURL().then(handleIncomingUrl);

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
      linkingSub?.remove?.();
    };
  }, []);

  const signInStub = (partial = {}) => {
    setUser((prev) => {
      const next = {
        id: prev?.id ?? 'local-stub-user',
        profileComplete: false,
        ...prev,
        ...partial,
      };
      if (partial.profileComplete || partial.full_name || partial.name) {
        next.user_metadata = {
          ...(prev?.user_metadata || {}),
          ...(partial.user_metadata || {}),
          full_name:
            partial.name ||
            partial.full_name ||
            prev?.user_metadata?.full_name,
          age: partial.age ?? prev?.user_metadata?.age,
          phone: partial.phone ?? prev?.user_metadata?.phone,
          profileComplete:
            partial.profileComplete ??
            prev?.user_metadata?.profileComplete ??
            false,
        };
        next.profileComplete = next.user_metadata.profileComplete;
      }
      return next;
    });
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

  const resetPasswordForEmail = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: 'medscan://auth/reset',
      },
    );
    if (error) throw error;
    return { success: true, data };
  };

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      throw new Error('Google Sign-In package not installed');
    }

    const configured = configureGoogleSignIn();

    if (!configured) {
      throw new Error(
        'Google Sign-In setup failed. Check the Google configuration and environment variables.',
      );
    }

    try {
      if (typeof GoogleSignin.hasPlayServices === 'function') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.idToken || signInResult?.data?.idToken;
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
      if (error?.code === 'SIGN_IN_CANCELLED') {
        return { cancelled: true };
      }
      throw new Error(getGoogleSignInErrorMessage(error));
    }
  };

  // ====================== FIXED FACEBOOK AUTH ======================
  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: FACEBOOK_AUTH_REDIRECT,
          skipBrowserRedirect: true, // important for React Native
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('No Facebook OAuth URL returned');
      }

      // Browser open karo
      const supported = await Linking.canOpenURL(data.url);
      if (!supported) {
        throw new Error('Cannot open Facebook login URL');
      }

      await Linking.openURL(data.url);

      // Note: Session deep link se automatically set ho jayega
      // (handleIncomingUrl ke through)
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
    resetPasswordForEmail,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}