import toast from 'react-hot-toast';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse } from '../types';
import { supabase } from '../lib/supabase';
import { getProfilePhotoUrl } from '../lib/storage';
import apiClient from '../api/client';

interface RegisterData {
  userType: string;
  first_name: string;
  last_name: string;
  country: string;
  region: string;
  postal_code: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  loginAs: (role: string) => Promise<void>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Role → dashboard path */
const dashboardPath: Record<string, string> = {
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  wigmaker: '/wigmaker/dashboard',
  recipient: '/recipient/dashboard',
  donor: '/donor/dashboard',
};

/** Demo credentials keyed by role */
const demoCreds: Record<string, { email: string; password: string }> = {
  admin:     { email: 'admin@hairlink.local',          password: 'admin12345'     },
  donor:     { email: 'donor.demo@hairlink.local',     password: 'donor12345'     },
  recipient: { email: 'recipient.demo@hairlink.local', password: 'recipient12345' },
  staff:     { email: 'staff.demo@hairlink.local',     password: 'staff12345'     },
  wigmaker:  { email: 'wigmaker.demo@hairlink.local',  password: 'wigmaker12345'  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // We can't call useNavigate here (outside Router), so we use window.location for redirects
  // that happen before Router context is available. Components use navigate() directly.

  /** Fetch profile from public.users via our backend /auth/me
   * @param token - Optional explicit token to use (bypasses cached token for race-condition safety)
   */
  const fetchProfile = async (token?: string): Promise<User | null> => {
    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const response = await apiClient.get<User>('/auth/me', config);
      const userData = response.data;
      if (userData && userData.profile_photo_url) {
        userData.profile_photo_url = getProfilePhotoUrl(userData.profile_photo_url) || userData.profile_photo_url;
      }
      return userData;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let initialized = false;
    // Marks that an auth event has begun processing, so the fallback timer
    // doesn't flip loading to false while fetchProfile is still in flight
    // (which would briefly show user=null and bounce ProtectedRoute to /login).
    let eventStarted = false;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      eventStarted = true;
      if (session?.user) {
        // Pass the token explicitly to avoid any race with the apiClient interceptor
        const profile = await fetchProfile(session.access_token);
        setUser(profile);
      } else {
        setUser(null);
      }

      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    // Fallback: If no auth event fires at all (e.g. Supabase client stalls),
    // unblock anyway. Once an event has started, let it finish on its own.
    const timer = setTimeout(() => {
      if (!initialized && !eventStarted) {
        setLoading(false);
      }
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  /**
   * Login with email + password via Supabase.
   * If the user's email_verified_at is null, signs them out and sends an OTP,
   * then returns a redirect to /verify-otp.
   */
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { data: loginData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { data: { error: error.message } } };

    // Pass the token explicitly to avoid the race condition where the apiClient
    // interceptor hasn't been updated by onAuthStateChange yet
    const token = loginData.session?.access_token;
    const profile = await fetchProfile(token);
    if (!profile) throw { response: { data: { error: 'Profile not found. Please contact support.' } } };

    // First-login OTP check — skip for demo accounts
    const isDemo = email.endsWith('@hairlink.local');
    if (!isDemo && !profile.emailVerifiedAt) {
      await supabase.auth.signOut();
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      setUser(null);
      return { user: profile, redirect: `/verify-otp?email=${encodeURIComponent(email)}&type=magiclink` };
    }

    setUser(profile);
    return { user: profile, redirect: dashboardPath[profile.role] || '/donor/dashboard' };
  };

  /** One-click demo login (no OTP required) */
  const loginAs = async (role: string): Promise<void> => {
    console.log(`[Auth] Attempting demo login for role: ${role}`);
    const creds = demoCreds[role];
    if (!creds) {
      console.error(`[Auth] No credentials found for role: ${role}`);
      return;
    }
    
    try {
      // If running in development we can call the backend dev-only endpoint
      // which uses the service_role key server-side to generate a session.
      if (import.meta.env.DEV) {
        try {
          const resp = await apiClient.post('/auth/demo', { role });
          const session = resp.data;
          if (session?.access_token && session?.refresh_token) {
            // Set session first, then wait a tick for onAuthStateChange to propagate the token.
            // We also pass the token explicitly to fetchProfile to avoid the race condition
            // where the apiClient interceptor hasn't been updated yet.
            await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
            // Small delay to let onAuthStateChange fire and update currentToken in apiClient
            await new Promise(resolve => setTimeout(resolve, 100));
            const profile = await fetchProfile(session.access_token);
            if (!profile) {
              toast.success('Demo login succeeded but profile could not be loaded. Ensure the database migrations and triggers have run.');
              return;
            }
            setUser(profile);
            window.location.href = dashboardPath[profile.role] || '/donor/dashboard';
            return;
          }
        } catch (e: any) {
          console.error('[Auth] Backend demo auth failed:', e?.response?.data || e.message || e);
          // Give a clear message when the backend server is simply not running
          const isNetworkError = !e?.response && (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network Error'));
          const friendlyMsg = isNetworkError
            ? 'Backend server is not running. Please start it with: cd backend && npm run dev'
            : (e?.response?.data?.error || e?.message || 'Backend demo auth failed');
          toast.error(`Demo login failed: ${friendlyMsg}`);
          return;
        }
      }

      // Fallback: try client-side sign-in using anon key
      const { data: _authData, error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      const profile = await fetchProfile();
      if (!profile) throw new Error('Profile not found');
      setUser(profile);
      window.location.href = dashboardPath[profile.role] || '/donor/dashboard';
    } catch (err: any) {
      console.error('[Auth] Demo login failed:', err);
      toast.error(`Demo login failed: ${err?.message || err?.response?.data?.error || JSON.stringify(err)}`);
    }
  };

  /**
   * Register a new user via Supabase signUp.
   * Supabase will send a confirmation email (OTP or magic link depending on settings).
   * The on_auth_user_created trigger auto-populates public.users.
   */
  const register = async (data: RegisterData): Promise<AuthResponse> => {
    if (data.password !== data.password_confirmation) {
      throw { response: { data: { errors: { password: ['Passwords do not match.'] } } } };
    }

    const role = data.userType || 'donor';
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          role,
          country: data.country,
          region: data.region,
          postal_code: data.postal_code,
          age: data.age ? parseInt(data.age as string) : null,
          gender: data.gender,
          phone: data.phone,
        },
      },
    });

    if (error) throw { response: { data: { error: error.message } } };
    if (!authData.user) throw { response: { data: { error: 'Registration failed. Please try again.' } } };

    // Supabase returns identities: [] when the email already exists in auth.users
    // (silent fake-success to prevent user enumeration). No email is sent in this case.
    if (!authData.session && authData.user.identities?.length === 0) {
      throw {
        response: {
          data: {
            error: 'An account with this email already exists. Please log in, or use "Forgot password" to reset your password.',
          },
        },
      };
    }

    // If email confirmation is enabled, Supabase won't return a session yet —
    // redirect to OTP verification page.
    if (!authData.session) {
      const dummyProfile: User = {
        id: authData.user.id,
        name: `${data.first_name} ${data.last_name}`,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        emailVerifiedAt: null,
        role: role as any,
        profilePhotoPath: null,
        bio: null,
        country: data.country || null,
        region: data.region || null,
        postalCode: data.postal_code || null,
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender || null,
        phone: data.phone || null,
        referralCode: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        user: dummyProfile,
        redirect: `/verify-otp?email=${encodeURIComponent(data.email)}&type=signup`,
      };
    }

    // If confirmation is disabled (e.g. local dev), session is returned immediately
    const profile = await fetchProfile();
    if (!profile) throw { response: { data: { error: 'Could not load profile after registration.' } } };
    setUser(profile);
    return { user: profile, redirect: dashboardPath[role] || '/donor/dashboard' };
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { /* ignore */ }
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    if (updatedUser.profile_photo_url) {
      updatedUser.profile_photo_url = getProfilePhotoUrl(updatedUser.profile_photo_url) || updatedUser.profile_photo_url;
    }
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAs, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
