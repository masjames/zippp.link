"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ExtractResponse, Receipt } from "@/types/receipt";
import { RESTO_INVENTORY_FIELDS } from "@/lib/google/templates";

type WorkspacePublic = {
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
};

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(receipt: Receipt): string {
  const header = [
    "merchant",
    "date",
    "currency",
    "description",
    "qty",
    "unit_price",
    "amount",
    "subtotal",
    "tax",
    "total",
  ].join(",");

  const rows = (receipt.line_items.length ? receipt.line_items : [null]).map(
    (item) =>
      [
        csvEscape(receipt.merchant),
        csvEscape(receipt.date),
        csvEscape(receipt.currency),
        csvEscape(item?.description ?? null),
        csvEscape(item?.qty ?? null),
        csvEscape(item?.unit_price ?? null),
        csvEscape(item?.amount ?? null),
        csvEscape(receipt.subtotal),
        csvEscape(receipt.tax),
        csvEscape(receipt.total),
      ].join(",")
  );

  return [header, ...rows].join("\n");
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${ms} ms (${(ms / 1000).toFixed(2)} s)`;
  return `${ms} ms`;
}

type ClientTimings = {
  app_load_ms: number;
  capture_ms: number;
  resize_ms: number;
  bytes_sent: number;
  request_ms: number;
  server_ms: number;
  network_ms: number;
  effective_upload_mbps: number | null;
  effectiveType: string | null;
  downlink_mbps: number | null;
  rtt_ms: number | null;
  model_ms: number;
  render_ms: number;
  total_ms: number;
};

type NavConnection = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

function readConnection(): {
  effectiveType: string | null;
  downlink_mbps: number | null;
  rtt_ms: number | null;
} {
  const nav = navigator as Navigator & {
    connection?: NavConnection;
    mozConnection?: NavConnection;
    webkitConnection?: NavConnection;
  };
  const c = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!c) {
    return { effectiveType: null, downlink_mbps: null, rtt_ms: null };
  }
  return {
    effectiveType: typeof c.effectiveType === "string" ? c.effectiveType : null,
    downlink_mbps: typeof c.downlink === "number" ? c.downlink : null,
    rtt_ms: typeof c.rtt === "number" ? c.rtt : null,
  };
}

const MAX_EDGE = 1280;

function downscaleImage(
  file: File
): Promise<{ blob: Blob; resize_ms: number }> {
  const t0 = performance.now();
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const longest = Math.max(w, h);
      const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("resize failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("resize failed"));
            return;
          }
          resolve({
            blob,
            resize_ms: Math.round(performance.now() - t0),
          });
        },
        "image/jpeg",
        0.72
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("resize failed"));
    };
    img.src = url;
  });
}

function cameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Camera permission denied.";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return "No camera.";
    }
  }
  return "No camera.";
}

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [reading, setReading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appLoadMs, setAppLoadMs] = useState(0);
  const [timings, setTimings] = useState<ClientTimings | null>(null);
  const [auth, setAuth] = useState<{
    signedIn: boolean;
    googleUserId: string | null;
    oauthConfigured: boolean;
  } | null>(null);
  const [authBanner, setAuthBanner] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePublic | null>(null);
  const [sheetCandidates, setSheetCandidates] = useState<
    { id: string; name: string; modifiedTime: string | null }[]
  >([]);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetMsg, setSheetMsg] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<Record<string, string>>({});
  const [editConstants, setEditConstants] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState("");
  const [outlet, setOutlet] = useState("");
  const [appendBusy, setAppendBusy] = useState(false);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [appendMsg, setAppendMsg] = useState<string | null>(null);
  const fromCaptureRef = useRef(false);
  const totalStartRef = useRef<number | null>(null);
  const renderStartRef = useRef<number | null>(null);
  const captureMsRef = useRef(0);
  const resizeMsRef = useRef(0);
  const bytesSentRef = useRef(0);
  const requestMsRef = useRef(0);
  const serverMsRef = useRef(0);
  const modelMsRef = useRef(0);

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  useEffect(() => {
    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    const ms =
      nav && nav.domInteractive > 0 ? nav.domInteractive : performance.now();
    setAppLoadMs(Math.round(ms));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthAndWorkspace() {
      try {
        const meRes = await fetch("/api/auth/me");
        const data = await meRes.json();
        if (cancelled) return;
        const signedIn = Boolean(data.signedIn);
        setAuth({
          signedIn,
          googleUserId:
            typeof data.googleUserId === "string" ? data.googleUserId : null,
          oauthConfigured: Boolean(data.oauthConfigured),
        });
        if (signedIn) {
          const wsRes = await fetch("/api/sheets/workspace");
          if (cancelled) return;
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            if (wsData.workspace) {
              applyWorkspace(wsData.workspace as WorkspacePublic);
            }
          } else {
            setWorkspace(null);
          }
        } else {
          setWorkspace(null);
        }
      } catch {
        // ignore
      }
    }

    loadAuthAndWorkspace();

    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    if (authParam === "ok") setAuthBanner("Google connected.");
    else if (authParam === "logged_out") {
      setAuthBanner("Google disconnected.");
      setWorkspace(null);
    } else if (authParam === "error") {
      const reason = params.get("reason") || "unknown";
      setAuthBanner(`Google sign-in failed (${reason}).`);
    }
    if (authParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("auth");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!camOn || !video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [camOn]);

  useLayoutEffect(() => {
    if (!receipt || renderStartRef.current == null) return;
    const started = renderStartRef.current;
    renderStartRef.current = null;
    const finish = () => {
      const render_ms = Math.round(performance.now() - started);
      const totalOrigin = totalStartRef.current ?? started;
      const request_ms = requestMsRef.current;
      const server_ms = serverMsRef.current;
      const bytes_sent = bytesSentRef.current;
      const network_ms = request_ms - server_ms;
      const conn = readConnection();
      const next: ClientTimings = {
        app_load_ms: appLoadMs,
        capture_ms: captureMsRef.current,
        resize_ms: resizeMsRef.current,
        bytes_sent,
        request_ms,
        server_ms,
        network_ms,
        effective_upload_mbps:
          network_ms > 0 ? (bytes_sent * 8) / network_ms : null,
        effectiveType: conn.effectiveType,
        downlink_mbps: conn.downlink_mbps,
        rtt_ms: conn.rtt_ms,
        model_ms: modelMsRef.current,
        render_ms,
        total_ms: Math.round(performance.now() - totalOrigin),
      };
      setTimings(next);
      console.log(next);
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(finish);
    });
  }, [receipt, appLoadMs]);

  function choose(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setReceipt(null);
    setError(null);
    setTimings(null);
    setAppendError(null);
    setAppendMsg(null);
  }

  function chooseFile(next: File | null) {
    fromCaptureRef.current = false;
    const t0 = performance.now();
    choose(next);
    captureMsRef.current = next ? Math.round(performance.now() - t0) : 0;
  }

  async function startCam() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("No camera.");
      return;
    }
    stopCam();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "OverconstrainedError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw err;
        }
      }
      streamRef.current = stream;
      setCamOn(true);
    } catch (err) {
      setError(cameraErrorMessage(err));
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setError("Camera is not ready.");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Capture failed.");
      return;
    }
    const t0 = performance.now();
    fromCaptureRef.current = true;
    totalStartRef.current = t0;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Capture failed.");
          return;
        }
        captureMsRef.current = Math.round(performance.now() - t0);
        choose(new File([blob], "webcam.jpg", { type: blob.type || "image/jpeg" }));
        stopCam();
      },
      "image/jpeg",
      0.92
    );
  }

  function applyWorkspace(ws: WorkspacePublic) {
    setWorkspace(ws);
    setEditMap({ ...ws.column_map });
    setEditConstants({ ...ws.constants });
    setSheetCandidates([]);
    if (ws.default_outlet) {
      setOutlet(ws.default_outlet);
    } else if (ws.outlets.length === 1) {
      setOutlet(ws.outlets[0]);
    }
    // Keep staff if still in list; else clear when list exists
    setStaff((prev) => {
      if (ws.staff_names.length === 0) return prev;
      return ws.staff_names.includes(prev) ? prev : "";
    });
  }

  async function connectSheet(spreadsheetId?: string) {
    setSheetBusy(true);
    setSheetError(null);
    setSheetMsg(null);
    try {
      const res = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          spreadsheetId ? { spreadsheetId } : {}
        ),
      });
      const data = await res.json();

      if (data.needsPick && Array.isArray(data.candidates)) {
        setSheetCandidates(data.candidates);
        setSheetMsg("Several [zippp] sheets found — pick one.");
        return;
      }

      if (!res.ok || !data.ok) {
        const hint = data.needsReconsent
          ? " Disconnect Google, then Sign in again to grant Drive file access."
          : "";
        setSheetError((data.error || "Connect failed.") + hint);
        return;
      }

      if (data.workspace) {
        applyWorkspace(data.workspace as WorkspacePublic);
      }
      const created = data.created ? "Created and connected" : "Connected";
      const title = data.workspace?.spreadsheet_title ?? "";
      const tab = data.workspace?.sheet_tab ?? "";
      setSheetMsg(`${created}: ${title} / ${tab}`);
      setSheetCandidates([]);
    } catch {
      setSheetError("Connect failed.");
    } finally {
      setSheetBusy(false);
    }
  }

  async function saveMap() {
    if (!workspace) return;
    setSheetBusy(true);
    setSheetError(null);
    setSheetMsg(null);
    try {
      const res = await fetch("/api/sheets/map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          column_map: editMap,
          constants: editConstants,
          sheet_tab: workspace.sheet_tab,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSheetError(data.error || "Save map failed.");
        return;
      }
      applyWorkspace(data.workspace as WorkspacePublic);
      setSheetMsg("Column map saved.");
    } catch {
      setSheetError("Save map failed.");
    } finally {
      setSheetBusy(false);
    }
  }

  async function disconnectSheet() {
    setSheetBusy(true);
    setSheetError(null);
    setSheetMsg(null);
    try {
      await fetch("/api/sheets/workspace", { method: "DELETE" });
      setWorkspace(null);
      setEditMap({});
      setEditConstants({});
      setSheetCandidates([]);
      setSheetMsg("Spreadsheet disconnected (Google login kept).");
    } catch {
      setSheetError("Disconnect sheet failed.");
    } finally {
      setSheetBusy(false);
    }
  }

  function setMapField(fieldId: string, header: string) {
    setEditMap((prev) => {
      const next = { ...prev };
      if (!header || header === "—") delete next[fieldId];
      else next[fieldId] = header;
      return next;
    });
  }

  async function extract() {
    if (!file) return;
    setReading(true);
    setError(null);
    setReceipt(null);
    setTimings(null);
    setAppendError(null);
    setAppendMsg(null);
    try {
      const { blob, resize_ms } = await downscaleImage(file);
      resizeMsRef.current = resize_ms;
      bytesSentRef.current = blob.size;
      const form = new FormData();
      form.append("image", blob, "receipt.jpg");
      const requestStart = performance.now();
      if (!fromCaptureRef.current) {
        totalStartRef.current = requestStart;
      }
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json()) as ExtractResponse;
      requestMsRef.current = Math.round(performance.now() - requestStart);
      if (!data.ok) {
        setError(data.error);
        return;
      }
      modelMsRef.current = data.timings.model_ms;
      serverMsRef.current = data.timings.server_ms;
      renderStartRef.current = performance.now();
      setReceipt(data.receipt);
    } catch {
      setError("Extract failed.");
    } finally {
      setReading(false);
    }
  }


  function updateHeaderField(
    field: "merchant" | "date" | "currency" | "subtotal" | "tax" | "total",
    raw: string
  ) {
    setReceipt((prev) => {
      if (!prev) return prev;
      if (field === "merchant" || field === "date" || field === "currency") {
        return { ...prev, [field]: raw.trim() === "" ? null : raw };
      }
      const n = raw.trim() === "" ? null : Number(raw);
      return {
        ...prev,
        [field]: n !== null && Number.isFinite(n) ? n : null,
      };
    });
  }

  function updateLineField(
    index: number,
    field: "description" | "qty" | "unit_price" | "amount",
    raw: string
  ) {
    setReceipt((prev) => {
      if (!prev) return prev;
      const line_items = prev.line_items.map((item, i) => {
        if (i !== index) return item;
        if (field === "description") {
          return { ...item, description: raw.trim() === "" ? null : raw };
        }
        const n = raw.trim() === "" ? null : Number(raw);
        return {
          ...item,
          [field]: n !== null && Number.isFinite(n) ? n : null,
        };
      });
      return { ...prev, line_items };
    });
  }

  async function sendToSheet() {
    if (!receipt || !workspace) return;
    const staffTrim = staff.trim();
    if (!staffTrim) {
      setAppendError("Staff is required before sending to the sheet.");
      return;
    }
    setAppendBusy(true);
    setAppendError(null);
    setAppendMsg(null);
    try {
      const outletTrim = outlet.trim();
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt,
          staff: staffTrim,
          outlet: outletTrim === "" ? null : outletTrim,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const hint = data.needsReconsent
          ? " Disconnect Google, then Sign in again to grant Sheets + Drive file access."
          : "";
        setAppendError((data.error || "Send to sheet failed.") + hint);
        return;
      }
      const n = typeof data.rows_written === "number" ? data.rows_written : 0;
      const title =
        data.spreadsheet_title ||
        workspace.spreadsheet_title ||
        "Google Sheet";
      setAppendMsg(`Landed ${n} row${n === 1 ? "" : "s"} in ${title}.`);
    } catch {
      setAppendError("Send to sheet failed.");
    } finally {
      setAppendBusy(false);
    }
  }

  return (
    <main>
      <h1>zippp</h1>
      <p>Drop a receipt or invoice. Get a table. Download CSV or JSON.</p>

      <p style={{ marginTop: 12 }}>
        {auth?.signedIn ? (
          <>
            Google connected
            {auth.googleUserId ? ` (${auth.googleUserId})` : ""}.{" "}
            <a href="/api/auth/logout">Disconnect Google</a>
          </>
        ) : (
          <>
            <a href="/api/auth/login">Sign in with Google</a>
            {auth && !auth.oauthConfigured
              ? " (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local)"
              : null}
          </>
        )}
      </p>
      {authBanner ? <p>{authBanner}</p> : null}

      {auth?.signedIn ? (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Connect spreadsheet</h2>
          <p style={{ marginTop: 0 }}>
            Finds or creates a Google Sheet whose name contains{" "}
            <code>[zippp]</code> (template <code>resto-inventory</code>).
            After extract, use <b>Send to sheet</b> to append line rows (never
            auto-sends).
          </p>
          <p style={{ fontSize: 14, color: "#555" }}>
            After a scope update:{" "}
            <a href="/api/auth/logout">Disconnect Google</a>, then{" "}
            <a href="/api/auth/login">Sign in again</a> so Drive file access
            (<code>drive.file</code>) is granted.
          </p>

          {workspace ? (
            <p>
              <b>Connected:</b> {workspace.spreadsheet_title}{" "}
              (<code>{workspace.spreadsheet_id}</code>) / tab{" "}
              <code>{workspace.sheet_tab}</code>
            </p>
          ) : (
            <p>No spreadsheet connected yet.</p>
          )}

          <p>
            <button
              type="button"
              onClick={() => connectSheet()}
              disabled={sheetBusy}
            >
              {sheetBusy
                ? "Working..."
                : workspace
                  ? "Reconnect [zippp] sheet"
                  : "Connect [zippp] sheet"}
            </button>{" "}
            {workspace ? (
              <button
                type="button"
                onClick={disconnectSheet}
                disabled={sheetBusy}
              >
                Disconnect sheet
              </button>
            ) : null}
          </p>

          {sheetCandidates.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <p>
                <b>Pick a sheet:</b>
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {sheetCandidates.map((c) => (
                  <li key={c.id} style={{ marginBottom: 8 }}>
                    <button
                      type="button"
                      disabled={sheetBusy}
                      onClick={() => connectSheet(c.id)}
                    >
                      {c.name}
                    </button>{" "}
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {c.modifiedTime
                        ? new Date(c.modifiedTime).toLocaleString()
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {sheetError ? <p style={{ color: "#a00" }}>{sheetError}</p> : null}
          {sheetMsg ? <p>{sheetMsg}</p> : null}

          {workspace ? (
            <>
              <h3>Headers (row 1)</h3>
              <p>
                {workspace.headers.length
                  ? workspace.headers.join(" · ")
                  : "(empty header row)"}
              </p>

              <h3>Column map (resto-inventory)</h3>
              <p>
                Each mill/op field → sheet header. Unmapped fields stay empty on
                write later.
              </p>
              <table
                border={1}
                cellPadding={6}
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Sheet column</th>
                  </tr>
                </thead>
                <tbody>
                  {RESTO_INVENTORY_FIELDS.map((field) => (
                    <tr key={field.id}>
                      <td>
                        {field.label} <code>({field.id})</code>
                      </td>
                      <td>
                        <select
                          value={editMap[field.id] ?? ""}
                          onChange={(e) =>
                            setMapField(field.id, e.target.value)
                          }
                          disabled={sheetBusy}
                        >
                          <option value="">—</option>
                          {workspace.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3>Constants</h3>
              <p>
                Fixed values written into a header column (e.g. Category → Bahan
                baku). Key = header name.
              </p>
              {Object.keys(editConstants).length === 0 ? (
                <p>
                  <i>No constants auto-matched. Add below if needed.</i>
                </p>
              ) : null}
              <ul>
                {Object.entries(editConstants).map(([header, value]) => (
                  <li key={header}>
                    <code>{header}</code> ={" "}
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setEditConstants((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      disabled={sheetBusy}
                    />{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setEditConstants((prev) => {
                          const next = { ...prev };
                          delete next[header];
                          return next;
                        })
                      }
                      disabled={sheetBusy}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {workspace.headers
                .filter((h) => !(h in editConstants))
                .map((h) => (
                  <button
                    key={h}
                    type="button"
                    style={{ marginRight: 8, marginBottom: 8 }}
                    disabled={sheetBusy}
                    onClick={() =>
                      setEditConstants((prev) => ({
                        ...prev,
                        [h]:
                          h.toLowerCase() === "category" ? "Bahan baku" : "",
                      }))
                    }
                  >
                    + constant “{h}”
                  </button>
                ))}

              <p style={{ marginTop: 16 }}>
                <button type="button" onClick={saveMap} disabled={sheetBusy}>
                  Save map
                </button>
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          chooseFile(e.dataTransfer.files?.[0] ?? null);
        }}
        style={{
          border: "1px dashed #333",
          padding: 40,
          marginTop: 24,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="receipt preview"
            style={{ maxWidth: "100%", maxHeight: 240 }}
          />
        ) : (
          <span>Drop a photo here, or click to choose a file</span>
        )}
      </div>

      <p style={{ marginTop: 16 }}>
        <button type="button" onClick={startCam} disabled={reading}>
          Use webcam
        </button>{" "}
        <button type="button" onClick={capture} disabled={!camOn || reading}>
          Capture
        </button>
      </p>

      {camOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: "block", maxWidth: "100%", maxHeight: 240 }}
        />
      ) : null}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <p style={{ marginTop: 16 }}>
        <button type="button" disabled={!file || reading} onClick={extract}>
          {reading ? "Reading..." : "Extract"}
        </button>
      </p>

      {error ? <p>{error}</p> : null}

      {receipt ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Correct before send</h2>
          <p>
            <b>Merchant</b>{" "}
            <input
              type="text"
              value={receipt.merchant ?? ""}
              onChange={(e) => updateHeaderField("merchant", e.target.value)}
              style={{ minWidth: 200 }}
            />
          </p>
          <p>
            <b>Date</b>{" "}
            <input
              type="text"
              value={receipt.date ?? ""}
              onChange={(e) => updateHeaderField("date", e.target.value)}
            />
          </p>
          <p>
            <b>Currency</b>{" "}
            <input
              type="text"
              value={receipt.currency ?? ""}
              onChange={(e) => updateHeaderField("currency", e.target.value)}
              style={{ width: 80 }}
            />
          </p>
          <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>description</th>
                <th>qty</th>
                <th>unit_price</th>
                <th>amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.line_items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={item.description ?? ""}
                      onChange={(e) =>
                        updateLineField(i, "description", e.target.value)
                      }
                      style={{ minWidth: 160, width: "100%" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={item.qty ?? ""}
                      onChange={(e) => updateLineField(i, "qty", e.target.value)}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={item.unit_price ?? ""}
                      onChange={(e) =>
                        updateLineField(i, "unit_price", e.target.value)
                      }
                      style={{ width: 100 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={item.amount ?? ""}
                      onChange={(e) =>
                        updateLineField(i, "amount", e.target.value)
                      }
                      style={{ width: 100 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <b>Subtotal</b>{" "}
            <input
              type="number"
              step="any"
              value={receipt.subtotal ?? ""}
              onChange={(e) => updateHeaderField("subtotal", e.target.value)}
              style={{ width: 120 }}
            />
          </p>
          <p>
            <b>Tax</b>{" "}
            <input
              type="number"
              step="any"
              value={receipt.tax ?? ""}
              onChange={(e) => updateHeaderField("tax", e.target.value)}
              style={{ width: 120 }}
            />
          </p>
          <p>
            <b>Total</b>{" "}
            <input
              type="number"
              step="any"
              value={receipt.total ?? ""}
              onChange={(e) => updateHeaderField("total", e.target.value)}
              style={{ width: 120 }}
            />
          </p>

          {workspace ? (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            >
              <p style={{ marginTop: 0 }}>
                Destination: <b>{workspace.spreadsheet_title}</b> /{" "}
                <code>{workspace.sheet_tab}</code>
              </p>
              <p>
                <b>Staff</b>{" "}
                {workspace.staff_names.length > 0 ? (
                  <select
                    value={staff}
                    onChange={(e) => setStaff(e.target.value)}
                    required
                  >
                    <option value="">— pick staff —</option>
                    {workspace.staff_names.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={staff}
                    onChange={(e) => setStaff(e.target.value)}
                    placeholder="Required"
                    required
                  />
                )}
              </p>
              <p>
                <b>Outlet</b>{" "}
                {workspace.outlets.length > 0 ? (
                  <select
                    value={outlet}
                    onChange={(e) => setOutlet(e.target.value)}
                  >
                    <option value="">
                      {workspace.default_outlet
                        ? `— default: ${workspace.default_outlet} —`
                        : "— optional —"}
                    </option>
                    {workspace.outlets.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={outlet}
                    onChange={(e) => setOutlet(e.target.value)}
                    placeholder={
                      workspace.default_outlet
                        ? `Default: ${workspace.default_outlet}`
                        : "Optional"
                    }
                  />
                )}
              </p>
              <p>
                <button
                  type="button"
                  onClick={sendToSheet}
                  disabled={
                    appendBusy || !staff.trim() || receipt.line_items.length === 0
                  }
                >
                  {appendBusy ? "Sending..." : "Send to sheet"}
                </button>
              </p>
              {appendError ? (
                <p style={{ color: "#a00" }}>{appendError}</p>
              ) : null}
              {appendMsg ? <p style={{ color: "#060" }}>{appendMsg}</p> : null}
            </div>
          ) : (
            <p style={{ marginTop: 16, color: "#555" }}>
              Connect [zippp] sheet first to send rows. CSV/JSON still work.
            </p>
          )}

          <p style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => download("receipt.csv", toCsv(receipt), "text/csv")}
            >
              Download CSV
            </button>{" "}
            <button
              type="button"
              onClick={() =>
                download(
                  "receipt.json",
                  JSON.stringify(receipt, null, 2),
                  "application/json"
                )
              }
            >
              Download JSON
            </button>
          </p>
        </section>
      ) : null}

      {timings ? (
        <section style={{ marginTop: 24 }}>
          <h2>Timings</h2>
          <p>model_ms: {formatMs(timings.model_ms)}</p>
          <p>
            request_ms: {formatMs(timings.request_ms)} (includes server
            round-trip)
          </p>
          <p>server_ms: {formatMs(timings.server_ms)}</p>
          <p>
            network_ms: {formatMs(timings.network_ms)} (request minus server,
            mostly image upload)
          </p>
          <p>bytes_sent: {timings.bytes_sent} bytes</p>
          <p>
            effective_upload_mbps:{" "}
            {timings.effective_upload_mbps == null
              ? "n/a"
              : timings.effective_upload_mbps.toFixed(3)}
          </p>
          <p>effectiveType: {timings.effectiveType ?? "n/a"}</p>
          <p>
            downlink:{" "}
            {timings.downlink_mbps == null
              ? "n/a"
              : `${timings.downlink_mbps} Mbps`}
          </p>
          <p>
            rtt: {timings.rtt_ms == null ? "n/a" : `${timings.rtt_ms} ms`}
          </p>
          <p>resize_ms: {formatMs(timings.resize_ms)}</p>
          <p>capture_ms: {formatMs(timings.capture_ms)}</p>
          <p>app_load_ms: {formatMs(timings.app_load_ms)}</p>
          <p>render_ms: {formatMs(timings.render_ms)}</p>
          <p>total_ms: {formatMs(timings.total_ms)}</p>
        </section>
      ) : null}
    </main>
  );
}
