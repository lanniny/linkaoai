"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side better-auth client.
 * Use authClient.signIn.email / authClient.signUp.email / authClient.signOut
 * / authClient.useSession() from client components.
 *
 * The baseURL defaults to current origin in the browser; we pass
 * NEXT_PUBLIC_APP_URL when present for hosts behind a reverse proxy that
 * rewrites the Origin header.
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL
      : window.location.origin,
});

export const { signIn, signUp, signOut, useSession } = authClient;
