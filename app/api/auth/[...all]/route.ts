import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Mounts better-auth at /api/auth/*. Handles sign-in, sign-up, sign-out,
// session refresh, password reset, etc.
export const { POST, GET } = toNextJsHandler(auth.handler);
