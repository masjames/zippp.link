import { isAdmin } from "./billing/config";
import {
    hasTokens,
    loadTokens,
    peekGoogleEmail,
    peekGoogleUserId,
} from "./google/token-store";

export type CurrentUser = {
    signedIn: boolean;
    userId: string | null;
    email: string | null;
    admin: boolean;
};

/** Server-side view of the signed-in user. Never trusts the browser. */
export async function currentUser(): Promise<CurrentUser> {
    if (!(await hasTokens())) {
        return { signedIn: false, userId: null, email: null, admin: false };
    }
    const tokens = await loadTokens();
    const email = tokens?.email ?? (await peekGoogleEmail());
    const userId = tokens?.google_user_id ?? (await peekGoogleUserId());
    return {
        signedIn: true,
        userId: userId ?? null,
        email: email ?? null,
        admin: isAdmin(email),
    };
}
