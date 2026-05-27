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

  /** Fetch profile from public.users via our backend /auth/me */
  const fetchProfile = async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<User>('/auth/me');
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Fetch profile if not already set or on sign in
        const profile = await fetchProfile();
        setUser(profile);
      } else {
        setUser(null);
      }
      
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    });

    // Fallback: If no event fires quickly, unblock anyway
    const timer = setTimeout(() => {
      if (!initialized) {
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
    const { data: _loginData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { data: { error: error.message } } };

    const profile = await fetchProfile();
    if (!profile) throw { response: { data: { error: 'Profile not found. Please contact support.' } } };

    // First-login OTP check — skip for demo accounts
    const isDemo = email.endsWith('@hairlink.local');
    if (!isDemo && !profile.emailVerifiedAt) {
      await supabase.auth.signOut();
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      setUser(null);
      return { user: profile, redirect: `/verify-otp?email=${encodeURIComponent(email)}` };
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
      const { data: _authData, error } = await supabase.auth.signInWithPassword(creds);
      if (error) {
        console.error('[Auth] Supabase signIn failed:', error.message);
        alert(`Demo login failed: ${error.message}`);
        return;
      }
      
      console.log('[Auth] Supabase login success, fetching profile...');
      const profile = await fetchProfile();
      if (!profile) {
        console.error('[Auth] Profile fetch returned null');
        alert('Login succeeded but profile could not be loaded. The SQL migration may not have been run yet.');
        return;
      }
      
      console.log(`[Auth] Profile loaded: ${profile.email}. Redirecting...`);
      setUser(profile);
      window.location.href = dashboardPath[profile.role] || '/donor/dashboard';
    } catch (err: any) {
      console.error('[Auth] Unexpected error during loginAs:', err);
      alert('An unexpected error occurred during demo login.');
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
        redirect: `/verify-otp?email=${encodeURIComponent(data.email)}`,
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
