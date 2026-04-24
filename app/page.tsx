import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Gate from "./_gate";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const ok = await verifySession(token);

  if (ok) {
    const { next } = await searchParams;
    const dest =
      typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/hub";
    redirect(dest);
  }

  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
