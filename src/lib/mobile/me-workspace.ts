import { PAYMENT_OPTIONS } from "@/lib/google/templates";
import type { WorkspaceConfig } from "@/lib/google/workspace-store";

export type MobileWorkspace = {
  ready: boolean;
  template_id: string;
  spreadsheet_id: string;
  spreadsheet_title: string;
  payment_options: string[];
  staff_names: string[];
  outlets: string[];
  default_outlet: string | null;
  photo_proof: boolean;
};

/** Workspace slice the Android app reads from GET /api/auth/mobile/me. */
export function mobileWorkspace(ws: WorkspaceConfig): MobileWorkspace {
  return {
    ready:
      Boolean(ws.spreadsheet_id) &&
      Boolean(ws.column_map && Object.keys(ws.column_map).length > 0),
    template_id: ws.template_id,
    spreadsheet_id: ws.spreadsheet_id,
    spreadsheet_title: ws.spreadsheet_title,
    payment_options: [...(PAYMENT_OPTIONS[ws.template_id] ?? [])],
    staff_names: ws.staff_names,
    outlets: ws.outlets,
    default_outlet: ws.default_outlet,
    photo_proof: Boolean(ws.photo_proof),
  };
}
