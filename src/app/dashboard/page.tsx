import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { getAbsence, getStudioSnapshot } from "@/server/services/studio";
import GlassStage from "@/components/dashboard/glass/GlassStage";

// The studio is one person's desk — never cached, never shared.
export const dynamic = "force-dynamic";

/**
 * /dashboard — the Studio, in a hub's geometry.
 *
 * Server-rendered: the snapshot is built here, so the chair (with the
 * reader's own closing lines and bridge note) is in the first HTML the
 * browser paints. The skeleton follows what successful home surfaces share:
 * resume on top in fixed slots, an event feed, the works grid, one stat strip.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  // Middleware guards /dashboard; this is the belt to its braces.
  if (!userId) redirect("/login?callbackUrl=/dashboard");

  const [snapshot, away, { tab }] = await Promise.all([
    getStudioSnapshot(userId),
    getAbsence(userId),
    searchParams,
  ]);

  return (
    <GlassStage
      initial={snapshot}
      away={away}
      firstName={session?.user?.name?.split(" ")[0]}
      initialTab={tab === "read" || tab === "stats" ? tab : "studio"}
    />
  );
}
