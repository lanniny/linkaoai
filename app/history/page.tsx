import { redirect } from "next/navigation";

// Legacy path → moved into /console/history.
export default function HistoryLegacyRedirect() {
  redirect("/console/history");
}
