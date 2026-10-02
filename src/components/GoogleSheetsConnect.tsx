"use client";

import { useState } from "react";
import { APP_COPY } from "@/components/app/copy";
import type { Language } from "@/components/copy";

interface GoogleSheetsConnectProps {
  language: Language;
  onConnect?: () => void;
}

interface Workspace {
  google_user_id: string;
  spreadsheet_id: string;
  spreadsheet_title: string;
  sheet_tab: string;
  template_id: string;
  column_map: Record<string, string>;
  constants: Record<string, string>;
  staff_names: string[];
  outlets: string[];
  default_outlet: string | null;
  headers: string[];
  updated_at: string;
}

interface ConnectResponse {
  ok: boolean;
  created?: boolean;
  workspace?: Workspace;
  needsPick?: boolean;
  candidates?: Array<{
    id: string;
    name: string;
    modifiedTime: string;
  }>;
  error?: string;
}

export default function GoogleSheetsConnect({ language, onConnect }: GoogleSheetsConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string; modifiedTime: string }>>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    setCandidates([]);
    setShowCandidates(false);
    setSelectedSpreadsheetId(null);

    try {
      const response = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: selectedSpreadsheetId ? JSON.stringify({ spreadsheetId: selectedSpreadsheetId }) : "{}",
      });

      const data: ConnectResponse = await response.json();

      if (data.ok) {
        if (onConnect) onConnect();
        // Connection successful
      } else if (data.needsPick && data.candidates) {
        setCandidates(data.candidates);
        setShowCandidates(true);
        setError(data.error || "Multiple spreadsheets found. Please select one.");
      } else {
        setError(data.error || "Failed to connect to Google Sheets.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickCandidate = async (spreadsheetId: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedSpreadsheetId(spreadsheetId);

    try {
      const response = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data: ConnectResponse = await response.json();

      if (data.ok) {
        if (onConnect) onConnect();
        setShowCandidates(false);
      } else {
        setError(data.error || "Failed to connect to selected spreadsheet.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {APP_COPY[language].connectSheets}
        </h2>
        <p className="text-sm text-gray-600">
          {APP_COPY[language].connectSheetsDesc}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showCandidates && candidates.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {APP_COPY[language].selectSpreadsheet}
          </h3>
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePickCandidate(candidate.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{candidate.name}</p>
                    <p className="text-sm text-gray-500">
                      Modified: {formatDateTime(candidate.modifiedTime)}
                    </p>
                  </div>
                  <span className="text-sm text-blue-600">
                    {APP_COPY[language].select}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {APP_COPY[language].connecting}
          </span>
        ) : (
          APP_COPY[language].connectSheets
        )}
      </button>
    </div>
  );
}