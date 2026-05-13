import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

export const runtime = "nodejs";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=supabase_not_configured&next=/console");
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/console");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header userEmail={user.email ?? ""} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
