import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// /console/admin/** is gated here — only role >= 1 may enter. The outer
// /console layout already ensured the visitor is logged in, so a missing
// session at this point is a regression and should bounce to /login.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user)) {
    redirect("/console?error=admin_required");
  }
  return <>{children}</>;
}
