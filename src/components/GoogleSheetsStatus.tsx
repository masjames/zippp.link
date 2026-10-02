"use client";

import { useState, useEffect } from "react";
import { APP_COPY } from "@/components/app/copy";
import type { Language } from "@/components/copy";

interface GoogleSheetsStatusProps {
  language: Language;
  onStatusChange?: (isConnected: boolean) => void;
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

interface StatusResponse {
  ok: boolean;
  workspace?: Workspace;
  error?: string;
}

export default function GoogleSheetsStatus({ language, onStatusChange }: GoogleSheetsStatusProps) {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected" | "error">("loading");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaceStatus();
  }, []);

  const loadWorkspaceStatus = async () => {
    try {
      const response = await fetch("/api/sheets/workspace");
      const data: StatusResponse = await response.json();

      if (data.ok && data.workspace) {
        setStatus("connected");
        setWorkspace(data.workspace);
        if (onStatusChange) onStatusChange(true);
      } else {
        setStatus("disconnected");
        setWorkspace(null);
        if (onStatusChange) onStatusChange(false);
      }
    } catch (err) {
      setStatus("error");
      setError("Failed to load workspace status");
      if (onStatusChange) onStatusChange(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/sheets/workspace", { method: "DELETE" });
      setStatus("disconnected");
      setWorkspace(null);
      setError(null);
      if (onStatusChange) onStatusChange(false);
    } catch (err) {
      setError("Failed to disconnect");
    }
  };

  const handleAppendData = async (receiptData: any) => {
    try {
      const response = await fetch("/api/sheets/append", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receipt: receiptData }),
      });

      const data = await response.json();
      if (data.ok) {
        return { success: true, message: "Data appended successfully" };
      } else {
        return { success: false, message: data.error || "Failed to append data" };
      }
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  if (status === "loading") {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {APP_COPY[language].noSheetsConnected}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {APP_COPY[language].connectSheetsDesc}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {APP_COPY[language].connectionError}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {APP_COPY[language].sheetsConnected}
          </h3>
          <p className="text-sm text-gray-600">
            {workspace?.spreadsheet_title}
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-red-600 hover:text-red-800"
        >
          {APP_COPY[language].disconnect}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">{APP_COPY[language].sheetTab}:</span>
          <span className="font-medium">{workspace?.sheet_tab}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{APP_COPY[language].template}:</span>
          <span className="font-medium">{workspace?.template_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{APP_COPY[language].lastUpdated}:</span>
          <span className="font-medium">
            {workspace?.updated_at ? new Date(workspace.updated_at).toLocaleString() : "Never"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {APP_COPY[language].mappedColumns}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(workspace?.column_map || {}).map(([key, value]) => (
              <div key={key} className="bg-gray-50 p-2 rounded">
                <div className="font-medium text-gray-700">{key}</div>
                <div className="text-gray-500">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}