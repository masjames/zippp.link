import { promises as fs } from "fs";
import path from "path";
import { remoteTextStore } from "./kv";
import { sessionUserId } from "./session";

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
    return process.env.ZIPPP_DATA_DIR || path.join(process.cwd(), ".data");
}

function safeId(userId: string): string {
    return userId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function workspaceKey(userId: string): string {
    return `workspace/${safeId(userId)}.json`;
}

function workspacePath(userId: string): string {
    return path.join(dataDir(), `workspace-${safeId(userId)}.json`);
}

async function ensureDir(): Promise<void> {
    await fs.mkdir(dataDir(), { recursive: true });
}

function parseShape(raw: string | null): FileShape {
    if (raw == null) return { version: 1, workspace: null };
    const parsed = JSON.parse(raw) as FileShape;
    if (parsed?.version !== 1) return { version: 1, workspace: null };
    return parsed;
}

function storeError(event: string, err: unknown, backend: string, key: string): void {
    console.error(
        JSON.stringify({
            event,
            backend,
            key,
            error: err instanceof Error ? err.message : String(err),
        })
    );
}

async function readFile(userId: string): Promise<FileShape> {
    const key = workspaceKey(userId);
    const remote = remoteTextStore();
    if (remote) {
        try {
            return parseShape(await remote.readText(key));
        } catch (err) {
            storeError("store.read.failed", err, remote.backend, key);
        }
    }
    try {
        const raw = await fs.readFile(workspacePath(userId), "utf8");
        return parseShape(raw);
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { version: 1, workspace: null };
        throw err;
    }
}

async function writeFile(userId: string, data: FileShape): Promise<void> {
    const key = workspaceKey(userId);
    const remote = remoteTextStore();
    if (remote) {
        try {
            await remote.writeText(key, JSON.stringify(data, null, 2));
            return;
        } catch (err) {
            storeError("store.write.failed", err, remote.backend, key);
        }
    }
    await ensureDir();
    const file = workspacePath(userId);
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), {
        encoding: "utf8",
        mode: 0o600,
    });
    await fs.rename(tmp, file);
}

export async function saveWorkspace(
    config: Omit<WorkspaceConfig, "updated_at"> & { updated_at?: string }
): Promise<WorkspaceConfig> {
    const record: WorkspaceConfig = {
        ...config,
        updated_at: config.updated_at ?? new Date().toISOString(),
    };
    await writeFile(config.google_user_id, { version: 1, workspace: record });
    return record;
}

export async function loadWorkspace(): Promise<WorkspaceConfig | null> {
    const userId = await sessionUserId();
    if (!userId) return null;
    const file = await readFile(userId);
    return file.workspace;
}

export async function deleteWorkspace(): Promise<void> {
    const userId = await sessionUserId();
    if (!userId) return;
    await writeFile(userId, { version: 1, workspace: null });
}

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
