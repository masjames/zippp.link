import { promises as fs } from "fs";
import path from "path";

export type TemplateId = "resto-inventory" | "personal-expense" | "custom";

/** mill_field | op_field → actual sheet header string */
export type ColumnMap = Record<string, string>;

/** sheet header → constant value (e.g. Category → Bahan baku) */
export type ConstantsMap = Record<string, string>;

export type WorkspaceConfig = {
  google_user_id: string;
  spreadsheet_id: string;
  spreadsheet_title: string;
  sheet_tab: string;
  template_id: TemplateId;
  column_map: ColumnMap;
  constants: ConstantsMap;
  staff_names: string[];
  outlets: string[];
  default_outlet: string | null;
  headers: string[];
  updated_at: string;
};

type FileShape = {
  version: 1;
  workspace: WorkspaceConfig | null;
};

function dataDir(): string {
  return (
    process.env.ZIPPP_DATA_DIR ||
    path.join(process.cwd(), ".data")
  );
}

function workspacePath(): string {
  return path.join(dataDir(), "workspace.json");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
}

async function readFile(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(workspacePath(), "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    if (parsed?.version !== 1) {
      return { version: 1, workspace: null };
    }
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { version: 1, workspace: null };
    throw err;
  }
}

async function writeFile(data: FileShape): Promise<void> {
  await ensureDir();
  const tmp = `${workspacePath()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.rename(tmp, workspacePath());
}

export async function saveWorkspace(
  config: Omit<WorkspaceConfig, "updated_at"> & { updated_at?: string }
): Promise<WorkspaceConfig> {
  const record: WorkspaceConfig = {
    ...config,
    updated_at: config.updated_at ?? new Date().toISOString(),
  };
  await writeFile({ version: 1, workspace: record });
  return record;
}

export async function loadWorkspace(): Promise<WorkspaceConfig | null> {
  const file = await readFile();
  return file.workspace;
}

export async function deleteWorkspace(): Promise<void> {
  await writeFile({ version: 1, workspace: null });
}

/** Public view — no secrets (tokens live elsewhere). */
export function workspacePublic(ws: WorkspaceConfig) {
  return {
    google_user_id: ws.google_user_id,
    spreadsheet_id: ws.spreadsheet_id,
    spreadsheet_title: ws.spreadsheet_title,
    sheet_tab: ws.sheet_tab,
    template_id: ws.template_id,
    column_map: ws.column_map,
    constants: ws.constants,
    staff_names: ws.staff_names,
    outlets: ws.outlets,
    default_outlet: ws.default_outlet,
    headers: ws.headers,
    updated_at: ws.updated_at,
  };
}
