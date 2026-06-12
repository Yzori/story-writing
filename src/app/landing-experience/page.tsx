import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import LandingExperience from "./LandingExperience";
import type { World } from "./LandingExperience";
import { getShoreTales } from "@/lib/landing-data";

// The reader's test drive. The film homepage's "read →" door arrives here
// with ?world=reader — clicking that door WAS the doors stage, so deep
// entries land straight in their world. Plain /landing-experience keeps the
// two-door overture for direct visits.

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ world?: string }>;
}

export default async function LandingExperiencePage({ searchParams }: PageProps) {
  // members don't need the test drive — their library is real
  const session = await auth();
  if (session?.user?.id) redirect("/read");

  const { world } = await searchParams;
  const initialWorld: World | null = world === "reader" || world === "writer" ? world : null;

  // Real tales dress the genre shores when the platform has them; on any
  // failure (fresh install, no DB) the experience falls back to fixtures.
  let shoreTales = null;
  try {
    shoreTales = await getShoreTales();
  } catch {
    shoreTales = null;
  }

  return <LandingExperience initialWorld={initialWorld} shoreTales={shoreTales} />;
}
