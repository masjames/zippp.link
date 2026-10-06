"use client";

import { useState } from "react";
import IntroScreen from "@/components/app/screens/IntroScreen";
import SignInScreen from "@/components/app/screens/SignInScreen";
import { useApp } from "@/components/app/AppProvider";

/** Logged-out entry: Intro, then Sign in. */
export default function StartPage() {
    const { t, authError, login } = useApp();
    const [signIn, setSignIn] = useState(false);

    return signIn ? (
        <SignInScreen t={t} onSignIn={login} error={authError} />
    ) : (
        <IntroScreen t={t} onStart={() => setSignIn(true)} />
    );
}
