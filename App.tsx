import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import DonorDashboard from "./screens/dashboard/DonorDashboard";
import RecipientDashboard from "./screens/dashboard/RecipientDashboard";
import LoginScreen from "./screens/auth/LoginScreen";
import SignupScreen from "./screens/auth/SignupScreen";
import VerificationScreen from "./screens/auth/VerificationScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";

import { NavigationContainer } from "@react-navigation/native";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#FFF4F8" }}>
          <Text style={{ fontSize: 22, color: "#e53e3e", fontWeight: "bold", marginBottom: 10 }}>App Crashed</Text>
          <Text style={{ color: "#333", textAlign: "center", marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<"Donor" | "Recipient" | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<"Donor" | "Recipient" | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          // If we just signed in and have a pending role from signup, use it!
          if (pendingRole) {
            setUserRole(pendingRole);
            setPendingRole(null);
            setLoading(false);
            // background fetch to make sure DB is in sync
            fetchRole(session.user.id);
          } else {
            fetchRole(session.user.id);
          }
        } else {
           setUserRole(null);
           setIsRecoveringPassword(false);
           setLoading(false);
        }
      }
    );

    // ── Real-time Profile Listener ──────────────
    // This allows role switching to update the UI instantly
    let profileSubscription: any;
    
    if (session?.user.id) {
      profileSubscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
          (payload) => {
            if (payload.new && payload.new.role) {
              setUserRole(payload.new.role);
            }
          }
        )
        .subscribe();
    }

    return () => {
       authListener.subscription.unsubscribe();
       if (profileSubscription) profileSubscription.unsubscribe();
    };
  }, [session?.user.id]); // Re-run when session id changes to restart subscription

  const fetchRole = async (userId: string) => {
      const { data, error } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', userId)
         .single();
      
      if (!error && data && data.role) {
         setUserRole(data.role as "Donor" | "Recipient");
      } else {
         // Second chance: check session metadata if DB profile isn't ready
         const { data: { session } } = await supabase.auth.getSession();
         const metaRole = session?.user.user_metadata?.role;
         if (metaRole === "Recipient" || metaRole === "Donor") {
            setUserRole(metaRole);
         } else {
            setUserRole("Donor"); // Final Fallback
         }
      }
      setLoading(false);
  };

  let content;

  if (loading || (session && !userRole)) {
      content = (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF4F8' }}>
             <ActivityIndicator size="large" color="#FF1493" />
         </View>
      );
  } else if (isRecoveringPassword) {
      content = <ResetPasswordScreen onPasswordUpdated={() => setIsRecoveringPassword(false)} />;
  } else if (session && userRole) {
    const userName = session.user.user_metadata?.full_name || userRole;
    
    if (userRole === "Recipient") {
      content = (
        <RecipientDashboard 
          onLogout={async () => await supabase.auth.signOut()} 
          userName={userName} 
          onRoleChange={setUserRole} 
        />
      );
    } else {
      content = (
        <DonorDashboard 
          onLogout={async () => await supabase.auth.signOut()} 
          userName={userName} 
          onRoleChange={setUserRole} 
        />
      );
    }
  } else if (pendingEmail) {
    content = (
      <VerificationScreen
        email={pendingEmail}
        onVerified={() => setPendingEmail(null)}
        onGoBack={() => { setPendingEmail(null); setShowSignup(true); }}
      />
    );
  } else if (showSignup) {
    content = (
      <SignupScreen
        onSignupComplete={() => {}}
        onNeedsVerification={(email: string, role: "Donor" | "Recipient") => { 
          setShowSignup(false); 
          setPendingEmail(email); 
          setPendingRole(role);
        }}
        onSwitchToLogin={() => setShowSignup(false)}
      />
    );
  } else {
    content = (
      <LoginScreen
        onLogin={() => {}}
        onSwitchToSignup={() => setShowSignup(true)}
        onPasswordRecovery={() => setIsRecoveringPassword(true)}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          {content}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}