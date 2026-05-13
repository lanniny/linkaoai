import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// /console/admin/** is gated by this layout — only role >= 1 may enter.
// The outer /console layout already ensured the user is logged in.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    redirect("/console?error=admin_required");
  }

  return <>{children}</>;
}
