import "./global.css";
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "./lib/api";

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
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        // Fetch user from Laravel API
        const response = await api.get('/me');
        const user = response.data;
        
        let rawRole = user.role || "donor";
        let formattedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
        
        setUserName(user.name || user.first_name || formattedRole);
        setUserRole(formattedRole as "Donor" | "Recipient");
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("Not authenticated or token expired", error);
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (role: "Donor" | "Recipient") => {
    setLoading(true);
    await checkAuthStatus(); 
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.post('/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    await AsyncStorage.removeItem('auth_token');
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