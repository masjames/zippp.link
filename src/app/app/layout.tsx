import type { ReactNode } from "react";
import AppProvider from "@/components/app/AppProvider";
import AppShell from "@/components/app/AppShell";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const { region } = await getLocale();
    const wording = loadWording();

    return (
        <AppProvider wording={wording} region={region}>
            <AppShell>{children}</AppShell>
        </AppProvider>
    );
}
