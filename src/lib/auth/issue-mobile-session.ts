// @implements FEAT-113
import { randomUUID } from "node:crypto";
import { signMobileToken } from "@/lib/auth/mobile-token";
import { registerDevice } from "@/lib/auth/device-store";
import { loadWorkspaceForUser } from "@/lib/google/workspace-store";
import { balance } from "@/lib/billing/ledger";
import { billingConfigured } from "@/lib/billing/redis";
import { sendPairingAlert } from "@/lib/telegram/alerts";

export type MobileSessionDeviceInput = {
  userId: string;
  email: string | null;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  platform?: string;
  sendAlert?: boolean;
};

export type MobileSessionSuccess = {
  ok: true;
  token: string;
  expires_at: number;
  user: {
    email: string | null;
    credits: number;
    billing_configured: boolean;
  };
  workspace: {
    ready: boolean;
    spreadsheet_name: string | null;
    template_id: string | null;
    headers: string[];
    column_map: Record<string, string>;
    staff_names: string[];
    outlets: string[];
    default_outlet: string | null;
    photo_proof: boolean;
  };
  device: { id: string; name: string };
};

export type MobileSessionFailure = {
  ok: false;
  code:
    | "DEVICE_CONFLICT"
    | "DEVICE_REGISTRATION_FAILED"
    | "SERVER_MISCONFIGURED"
    | "INVALID_DEVICE_ID";
};

function validDeviceId(value: string): boolean {
  return /^[A-Za-z0-9._-]{8,128}$/.test(value);
}

export async function issueMobileSession(
  input: MobileSessionDeviceInput
): Promise<MobileSessionSuccess | MobileSessionFailure> {
  const requested =
    typeof input.deviceId === "string" ? input.deviceId.trim() : "";
  const deviceId =
    requested && validDeviceId(requested) ? requested : randomUUID();
  const deviceName =
    typeof input.deviceName === "string"
      ? input.deviceName.trim().slice(0, 80)
      : "Android Device";
  const appVersion =
    typeof input.appVersion === "string"
      ? input.appVersion.trim().slice(0, 32)
      : "1.0.0";
  const platform =
    typeof input.platform === "string"
      ? input.platform.trim().slice(0, 32)
      : "android";
  const jti = randomUUID();

  try {
    await registerDevice({
      deviceId,
      userId: input.userId,
      deviceName,
      appVersion,
      platform,
      jti,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DEVICE_REGISTRATION_FAILED";
    if (message === "DEVICE_CONFLICT") {
      return { ok: false, code: "DEVICE_CONFLICT" };
    }
    if (message === "INVALID_DEVICE_ID") {
      return { ok: false, code: "INVALID_DEVICE_ID" };
    }
    return { ok: false, code: "DEVICE_REGISTRATION_FAILED" };
  }

  let token: string;
  let expiresAt: number;
  try {
    const signed = signMobileToken({
      userId: input.userId,
      email: input.email,
      deviceId,
      jti,
    });
    token = signed.token;
    expiresAt = signed.claims.exp;
  } catch {
    return { ok: false, code: "SERVER_MISCONFIGURED" };
  }

  const workspace = await loadWorkspaceForUser(input.userId);
  let credits = 0;
  if (billingConfigured()) {
    try {
      credits = (await balance(input.userId)).credits;
    } catch {
      credits = 0;
    }
  }

  if (input.sendAlert !== false) {
    void sendPairingAlert({
      userId: input.userId,
      deviceName,
      appVersion,
    });
  }

  return {
    ok: true,
    token,
    expires_at: expiresAt,
    user: {
      email: input.email,
      credits,
      billing_configured: billingConfigured(),
    },
    workspace: workspace
      ? {
          ready: Boolean(
            workspace.spreadsheet_id &&
              workspace.sheet_tab &&
              workspace.column_map &&
              Object.keys(workspace.column_map).length > 0
          ),
          spreadsheet_name: workspace.spreadsheet_title ?? null,
          template_id: workspace.template_id ?? null,
          headers: workspace.headers ?? [],
          column_map: workspace.column_map ?? {},
          staff_names: workspace.staff_names ?? [],
          outlets: workspace.outlets ?? [],
          default_outlet: workspace.default_outlet ?? null,
          photo_proof: workspace.photo_proof ?? false,
        }
      : {
          ready: false,
          spreadsheet_name: null,
          template_id: null,
          headers: [],
          column_map: {},
          staff_names: [],
          outlets: [],
          default_outlet: null,
          photo_proof: false,
        },
    device: { id: deviceId, name: deviceName },
  };
}
