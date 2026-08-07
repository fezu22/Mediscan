import { NativeModules } from 'react-native';

const FALLBACK_ENV = {
  SUPABASE_URL: 'https://bluqahzgizrschligjri.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdXFhaHpnaXpyc2NobGlnanJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjczOTUsImV4cCI6MjEwMTI0MzM5NX0.OCDp21bH7tibcHQOh7xweejqG2wU7Zdxcvt0gBbNDUY',
  GOOGLE_WEB_CLIENT_ID: '186159003701-0olhjsh4ii29lbnk07a5djpvpu4ogoa2.apps.googleusercontent.com',
  FACEBOOK_REDIRECT_URL: 'https://bluqahzgizrschligjri.supabase.co/auth/v1/callback',
};

let runtimeEnv = {};

try {
  const RNConfig = require('react-native-config');
  runtimeEnv = RNConfig?.default ?? RNConfig ?? {};
} catch (error) {
  runtimeEnv = {};
}

const nativeConfig = NativeModules?.RNConfig ?? NativeModules?.RNConfigModule ?? {};
const processEnv = process.env || {};

export const ENV = Object.fromEntries(
  Object.entries(FALLBACK_ENV).map(([key, fallbackValue]) => {
    const rawValue =
      runtimeEnv?.[key] ??
      runtimeEnv?.default?.[key] ??
      nativeConfig?.[key] ??
      processEnv?.[key] ??
      fallbackValue;

    return [key, typeof rawValue === 'string' ? rawValue : fallbackValue];
  }),
);
