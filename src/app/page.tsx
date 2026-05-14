import Navbar from "@/components/shared/Navbar";
import InteractiveSplitLayout from "@/components/landing/InteractiveSplitLayout";
import TrendingHome from "@/components/home/TrendingHome";
import { auth } from "@/server/auth";
import { getFeaturedStory, getShelfStories } from "@/lib/landing-data";

export default async function Home() {
  const session = await auth();

  // Signed-in → trending home dashboard with hero carousel + rows.
  // Anon → marketing landing (with the video + interactive canvas).
  if (session?.user?.id) {
    return <TrendingHome />;
  }

  // Pull real featured + shelf data on the server so the anon homepage
  // ships with live content instead of hardcoded fixtures. Both helpers
  // return null/[] on empty, and the client component falls back to
  // mock data — so a brand-new install still renders sensibly.
  const featured = await getFeaturedStory();
  const shelf = await getShelfStories(5, featured?.slug ?? null);

  return (
    <main className="bg-void overflow-x-hidden w-full min-h-screen">
      <Navbar />
      <InteractiveSplitLayout featured={featured} shelf={shelf} />
    </main>
  );
}
