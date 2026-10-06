"use client";

import SnapScreen from "@/components/app/screens/SnapScreen";
import SuccessScreen from "@/components/app/screens/SuccessScreen";
import { useApp } from "@/components/app/AppProvider";

/** Single screen: camera + batch review. Success replaces it after a send. */
export default function SnapPage() {
    const { summary } = useApp();
    return summary ? <SuccessScreen /> : <SnapScreen />;
}
