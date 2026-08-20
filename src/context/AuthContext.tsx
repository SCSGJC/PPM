import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, company?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resetIdleTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const previousUserIdRef = useRef<string | null>(null);

  // Clear all timers
  const clearTimers = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  };

  // Handle session timeout
  const handleTimeout = async () => {
    setShowTimeoutWarning(false);
    clearTimers();
    if (supabase && user) {
      await supabase.auth.signOut();
      alert('Your session has expired due to inactivity. Please sign in again.');
    }
  };

  // Reset idle timer on activity
  const resetIdleTimer = () => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
    clearTimers();

    // Set warning timer (show warning 2 minutes before timeout)
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Set timeout timer (sign out after 30 minutes)
    idleTimerRef.current = setTimeout(handleTimeout, IDLE_TIMEOUT);
  };

  // Setup activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer
    resetIdleTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const newUserId = session?.user?.id ?? null;
        const hasUserChanged = previousUserIdRef.current !== newUserId;

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          previousUserIdRef.current = newUserId;
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'TOKEN_REFRESHED' && hasUserChanged) {
          previousUserIdRef.current = newUserId;
          setSession(session);
          setUser(session?.user ?? null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, company?: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company: company || '',
        },
      },
    });

    // If signup succeeded, create the profile
    if (!error && data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            company: company || '',
            approved: false, // Pending approval by admin
            role: 'viewer',
            is_admin: false,
          });

        if (profileError) {
          console.error('Failed to create profile:', profileError);
          // Don't return error - user was created successfully
          // The admin can fix missing profiles if needed
        }
      } catch (profileError) {
        console.error('Failed to create profile:', profileError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    // Clear the fresh login flag when signing out
    sessionStorage.removeItem('scs_fresh_login');
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resetIdleTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showTimeoutWarning && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Timeout Warning
            </h3>
            <p className="text-gray-700 mb-4">
              Your session will expire in 2 minutes due to inactivity. Click anywhere to continue working.
            </p>
            <button
              onClick={resetIdleTimer}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Continue Session
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
