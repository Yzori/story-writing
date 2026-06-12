import FilmLanding from "@/components/landing/FilmLanding";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getLandingTales, getPublicStoryCount } from "@/lib/landing-data";

export default async function Page() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  // Real stories for the First Line + Ledger and a real count for the
  // "…and N more in the stacks" receipt. Both degrade gracefully: the
  // component falls back to fixtures when the platform is empty.
  const tales = await getLandingTales(5);
  const storyCount = await getPublicStoryCount();

  return <FilmLanding tales={tales} storyCount={storyCount} />;
}
