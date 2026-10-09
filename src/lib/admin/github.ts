/**
 * Open a change request (branch + dossier file + pull request) from an approved
 * lesson. Requires GITHUB_TOKEN with Contents and Pull requests write on
 * GITHUB_REPO (default masjames/zippp.link). When it is missing, callers fall
 * back to a Telegram-only notification.
 *
 * The token is never logged or returned.
 */

const API = "https://api.github.com";

function token(): string {
    return process.env.GITHUB_TOKEN || "";
}

function repo(): string {
    return process.env.GITHUB_REPO || "masjames/zippp.link";
}

export function githubConfigured(): boolean {
    return Boolean(token());
}

type GhInit = {
    method?: string;
    body?: unknown;
};

async function gh<T = Record<string, unknown>>(
    path: string,
    init: GhInit = {}
): Promise<T> {
    const res = await fetch(`${API}${path}`, {
        method: init.method ?? "GET",
        headers: {
            Authorization: `Bearer ${token()}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: "no-store",
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
        json = JSON.parse(text) as Record<string, unknown>;
    } catch {
        /* not JSON */
    }
    if (!res.ok) {
        const message =
            typeof json?.message === "string" ? json.message : text.slice(0, 200);
        throw new Error(`GitHub ${res.status}: ${message}`);
    }
    return json as T;
}

async function defaultBranch(): Promise<string> {
    const repoInfo = await gh<{ default_branch?: string }>(`/repos/${repo()}`);
    return repoInfo.default_branch || "main";
}

export type ChangeRequest = {
    branch: string;
    prUrl: string;
    prNumber: number;
};

/** Create a branch from the default branch, commit a dossier, open a PR. */
export async function openChangeRequest(args: {
    branch: string;
    title: string;
    body: string;
    path: string;
    content: string;
}): Promise<ChangeRequest> {
    const base = await defaultBranch();
    const ref = await gh<{ object?: { sha?: string } }>(
        `/repos/${repo()}/git/ref/heads/${base}`
    );
    const sha = ref.object?.sha;
    if (!sha) throw new Error("GitHub: base branch has no sha");

    try {
        await gh(`/repos/${repo()}/git/refs`, {
            method: "POST",
            body: { ref: `refs/heads/${args.branch}`, sha },
        });
    } catch (err) {
        // A 422 usually means the branch already exists; carry on.
        if (!(err instanceof Error) || !err.message.includes("422")) throw err;
    }

    await gh(`/repos/${repo()}/contents/${args.path}`, {
        method: "PUT",
        body: {
            message: args.title,
            content: Buffer.from(args.content, "utf8").toString("base64"),
            branch: args.branch,
        },
    });

    const pr = await gh<{ html_url?: string; number?: number }>(
        `/repos/${repo()}/pulls`,
        {
            method: "POST",
            body: {
                title: args.title,
                head: args.branch,
                base,
                body: args.body,
            },
        }
    );
    if (!pr.html_url || !pr.number) throw new Error("GitHub: PR not created");
    return { branch: args.branch, prUrl: pr.html_url, prNumber: pr.number };
}
