import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Legacy path → moved into /console/history/[id].
export default async function CourseDetailLegacyRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/console/history/${id}`);
}
