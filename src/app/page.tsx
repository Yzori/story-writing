import InteractiveSplitLayout from "@/components/landing/InteractiveSplitLayout";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getFeaturedStory, getShelfStories } from "@/lib/landing-data";

export default async function Page() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  // Pull real featured + shelf data on the server so the anon homepage
  // ships with live content instead of hardcoded fixtures. Both helpers
  // return null/[] on empty, and the client component falls back to
  // mock data — so a brand-new install still renders sensibly.
  const featured = await getFeaturedStory();
  const shelf = await getShelfStories(5, featured?.slug ?? null);

  return (
    <main className="bg-void overflow-x-hidden w-full min-h-screen">
      <InteractiveSplitLayout featured={featured} shelf={shelf} />
    </main>
  );
}
