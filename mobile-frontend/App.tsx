import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import api from "./lib/api";
import { supabase } from "./lib/supabase";

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

const normalizeRole = (raw: string | undefined | null): "Donor" | "Recipient" => {
  const r = (raw || "donor").toLowerCase();
  return r === "recipient" ? "Recipient" : "Donor";
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"Donor" | "Recipient" | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<"Donor" | "Recipient" | null>(null);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveringPassword(true);
        return;
      }
      if (event === "SIGNED_IN" && session) {
        await loadUserProfile();
      }
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserName("");
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data;
      const role = normalizeRole(user.role);
      setUserName(user.name || user.firstName || user.first_name || role);
      setUserRole(role);
      setIsAuthenticated(true);
    } catch (err) {
      console.warn("Failed to load user profile", err);
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await loadUserProfile();
      }
    } catch (error) {
      console.log("Auth check failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (_role: "Donor" | "Recipient") => {
    setLoading(true);
    await loadUserProfile();
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setLoading(false);
  };

  let content;

  if (loading) {
      content = (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF4F8' }}>
             <ActivityIndicator size="large" color="#FF1493" />
         </View>
      );
  } else if (isRecoveringPassword) {
      content = <ResetPasswordScreen onPasswordUpdated={() => setIsRecoveringPassword(false)} />;
  } else if (isAuthenticated && userRole) {
    if (userRole === "Recipient") {
      content = (
        <RecipientDashboard
          onLogout={handleLogout}
          userName={userName}
          onRoleChange={setUserRole}
        />
      );
    } else {
      content = (
        <DonorDashboard
          onLogout={handleLogout}
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
        onLogin={handleLoginSuccess}
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
