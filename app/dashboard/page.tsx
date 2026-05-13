import { redirect } from "next/navigation";

// Legacy path → moved into /console.
// Kept for backward-compat with external bookmarks and old emails.
export default function DashboardLegacyRedirect() {
  redirect("/console");
}
