import type { LegacyReceiptSummary } from "../../../src/lib/cashflow/legacy-summary";

export type SessionState =
  | { kind: "localPreview"; userId: string }
  | { kind: "signedOut" }
  | { kind: "signedIn"; userId: string }
  | { kind: "error" };

export type HomeDataState =
  | SessionState
  | { kind: "noWorkspace" }
  | { kind: "unsupported" }
  | { kind: "ready"; workspaceTitle: string; summary: LegacyReceiptSummary };

export type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type Fetcher = (
  url: string,
  init?: { cache?: RequestCache; signal?: AbortSignal },
) => Promise<FetchResponse>;

type SessionPayload = {
  signedIn: boolean;
  userId: string | null;
  localPreview?: boolean;
};

type WorkspacePayload = {
  ok: boolean;
  workspace: { template_id: string; spreadsheet_title: string } | null;
};

type SummaryPayload = {
  ok: boolean;
  code?: string;
  summary?: LegacyReceiptSummary;
};

export async function loadSession(fetcher: Fetcher, signal?: AbortSignal): Promise<SessionState> {
  try {
    const response = await fetcher("/api/auth/session", { cache: "no-store", signal });
    if (!response.ok) return { kind: "error" };
    const session = await response.json() as SessionPayload;
    if (session.localPreview) {
      // Never let a development-only synthetic identity enter the Expo web app.
      return { kind: "signedOut" };
    }
    if (!session.signedIn) return { kind: "signedOut" };
    if (!session.userId) return { kind: "error" };
    return { kind: "signedIn", userId: session.userId };
  } catch {
    if (signal?.aborted) return { kind: "error" };
    return { kind: "error" };
  }
}

export async function loadHomeData(
  fetcher: Fetcher,
  timeZone: string,
  signal?: AbortSignal,
): Promise<HomeDataState> {
  const session = await loadSession(fetcher, signal);
  if (session.kind !== "signedIn") return session;
  if (!timeZone) return { kind: "error" };

  try {
    const workspaceResponse = await fetcher("/api/sheets/workspace", { cache: "no-store", signal });
    if (workspaceResponse.status === 404) return { kind: "noWorkspace" };
    if (!workspaceResponse.ok) return { kind: "error" };

    const workspaceData = await workspaceResponse.json() as WorkspacePayload;
    if (!workspaceData.ok || !workspaceData.workspace) return { kind: "error" };
    if (workspaceData.workspace.template_id !== "personal-expense") return { kind: "unsupported" };

    const query = new URLSearchParams({ timeZone, expectedUserId: session.userId });
    const summaryResponse = await fetcher(`/api/cashflow/legacy-summary?${query}`, {
      cache: "no-store",
      signal,
    });
    const summaryData = await summaryResponse.json() as SummaryPayload;
    if (summaryData.code === "UNSUPPORTED_TEMPLATE") return { kind: "unsupported" };
    if (!summaryResponse.ok || !summaryData.ok || !summaryData.summary) return { kind: "error" };

    return {
      kind: "ready",
      workspaceTitle: workspaceData.workspace.spreadsheet_title,
      summary: summaryData.summary,
    };
  } catch {
    return { kind: "error" };
  }
}
