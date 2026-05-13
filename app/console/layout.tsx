import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getUserRole } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

export const runtime = "nodejs";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/console");
  }

  const role = getUserRole(session.user);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col">
        <Header userEmail={session.user.email ?? ""} role={role} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
