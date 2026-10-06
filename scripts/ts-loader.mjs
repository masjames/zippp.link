/**
 * Minimal ESM resolver for running the TypeScript sources directly in Node.
 *
 * Node's type stripping handles the syntax, but it does not understand the
 * project's extensionless relative imports or the `@/` alias. This loader maps
 * those to real files. Used by `npm run eval`; not part of the Next build.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = process.cwd();

function isFile(candidate) {
    try {
        return statSync(candidate).isFile();
    } catch {
        return false;
    }
}

function withExtensions(target) {
    return [
        `${target}.ts`,
        `${target}.tsx`,
        target,
        path.join(target, "index.ts"),
    ];
}

async function tryResolve(target, context, nextResolve) {
    for (const candidate of withExtensions(target)) {
        if (isFile(candidate)) {
            return nextResolve(pathToFileURL(candidate).href, context);
        }
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
        const target = path.join(ROOT, "src", specifier.slice(2));
        const resolved = await tryResolve(target, context, nextResolve);
        if (resolved) return resolved;
    } else if (specifier.startsWith(".")) {
        const parent = context.parentURL
            ? path.dirname(fileURLToPath(context.parentURL))
            : ROOT;
        const target = path.resolve(parent, specifier);
        if (!path.extname(specifier)) {
            const resolved = await tryResolve(target, context, nextResolve);
            if (resolved) return resolved;
        }
    }
    return nextResolve(specifier, context);
}
