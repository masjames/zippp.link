"use client";

import { useState, useEffect } from "react";
import { APP_COPY } from "@/components/app/copy";
import type { Language } from "@/components/copy";

interface GoogleAuthProps {
  language: Language;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

interface AuthStatus {
  signedIn: boolean;
  googleUserId: string | null;
  oauthConfigured: boolean;
}

export default function GoogleAuth({ language, onAuthChange }: GoogleAuthProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    signedIn: false,
    googleUserId: null,
    oauthConfigured: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAuthStatus();
  }, []);

  const loadAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data: AuthStatus = await response.json();
      setAuthStatus(data);
      if (onAuthChange) onAuthChange(data.signedIn);
    } catch (err) {
      console.error("Failed to load auth status:", err);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "GET",
      });
      
      if (response.redirected) {
        // The server will redirect to Google's OAuth consent screen
        window.location.href = response.url;
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      await loadAuthStatus();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectSheets = () => {
    // This would open a modal or navigate to a sheets connection page
    window.location.href = "/app?connect-sheets=true";
  };

  if (!authStatus.oauthConfigured) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Google OAuth not configured
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Please configure Google OAuth environment variables in your .env.local file
          </p>
        </div>
      </div>
    );
  }

  if (!authStatus.signedIn) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {APP_COPY[language].connectSheets}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Sign in with Google to connect your Sheets and sync receipt data
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in with Google"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Google Account Connected
          </h3>
          <p className="text-sm text-gray-600">
            User ID: {authStatus.googleUserId}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {isLoading ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleConnectSheets}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
        >
          {APP_COPY[language].connectSheets}
        </button>
        
        <div className="bg-gray-50 p-3 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Available Features:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Connect to Google Sheets</li>
            <li>• Export receipt data</li>
            <li>• Inventory tracking</li>
            <li>• Multi-location support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}