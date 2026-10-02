"use client";

import { useState, useEffect } from "react";
import EmptyScreen from "@/components/app/EmptyScreen";
import ReadingScreen from "@/components/app/ReadingScreen";
import ResultScreen from "@/components/app/ResultScreen";
import BadPhotoScreen from "@/components/app/BadPhotoScreen";
import GoogleAuth from "@/components/GoogleAuth";
import GoogleSheetsConnect from "@/components/GoogleSheetsConnect";
import GoogleSheetsStatus from "@/components/GoogleSheetsStatus";
import { COPY } from "@/components/copy";

import type { Language } from "@/components/copy";
import type { ExtractResponse, Receipt } from "@/types/receipt";

type State =
    | { screen: "empty" }
    | { screen: "reading" }
    | { screen: "result"; receipt: Receipt }
    | { screen: "bad" };

interface AppPageProps {
  language: Language;
}

export default function AppPage({ language: initialLanguage }: AppPageProps) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [state, setState] = useState<State>({ screen: "empty" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSheetsConnect, setShowSheetsConnect] = useState(false);

  async function extract(file: File) {
    setState({ screen: "reading" });
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json()) as ExtractResponse;
      
      if (data.ok) {
        // If authenticated, try to append to Google Sheets
        if (isAuthenticated) {
          await appendToSheets(data.receipt);
        }
        setState({ screen: "result", receipt: data.receipt });
      } else {
        setState({ screen: "bad" });
      }
    } catch {
      setState({ screen: "bad" });
    }
  }

  const appendToSheets = async (receipt: Receipt) => {
    try {
      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          receipt,
          staff: "default", // This should come from user input
          outlet: null // This should come from user input
        }),
      });

      const data = await response.json();
      if (data.ok) {
        console.log("Receipt appended to Google Sheets:", data);
      } else {
        console.error("Failed to append to Google Sheets:", data.error);
      }
    } catch (err) {
      console.error("Error appending to Google Sheets:", err);
    }
  };

  const reset = () => setState({ screen: "empty" });

  const handleAuthChange = (isSignedIn: boolean) => {
    setIsAuthenticated(isSignedIn);
  };

  const handleSheetsConnect = () => {
    setShowSheetsConnect(false);
  };

  // Check if we should show sheets connect modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connect-sheets') === 'true') {
      setShowSheetsConnect(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" lang={language}>
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={reset}
          className="text-2xl font-bold text-gray-900"
        >
          zippp
        </button>
        <div className="flex items-center space-x-4">
          <GoogleAuth 
            language={language} 
            onAuthChange={handleAuthChange}
          />
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">EN</option>
              <option value="id">ID</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-8">
        {/* Google Sheets Connect Modal */}
        {showSheetsConnect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Connect Google Sheets
                </h2>
                <button
                  onClick={() => setShowSheetsConnect(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <GoogleSheetsConnect 
                language={language} 
                onConnect={handleSheetsConnect}
              />
            </div>
          </div>
        )}

        {/* Main App Content */}
        <div className="space-y-6">
          {/* Google Sheets Status */}
          <GoogleSheetsStatus 
            language={language}
            onStatusChange={(isConnected) => {
              if (isConnected) {
                console.log("Google Sheets connected");
              }
            }}
          />

          {/* Receipt Processing Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {state.screen === "empty" && (
              <EmptyScreen language={language} onFile={extract} />
            )}
            {state.screen === "reading" && <ReadingScreen language={language} />}
            {state.screen === "result" && (
              <ResultScreen
                language={language}
                receipt={state.receipt}
                onFile={extract}
              />
            )}
            {state.screen === "bad" && (
              <BadPhotoScreen language={language} onRetry={reset} />
            )}
          </div>

          {/* Action Buttons */}
          {isAuthenticated && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowSheetsConnect(true)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Connect to Google Sheets
                </button>
                <button
                  onClick={() => {
                    // Export functionality would go here
                    console.log("Export functionality");
                  }}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Export Data
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}