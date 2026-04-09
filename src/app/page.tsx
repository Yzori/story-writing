import Navbar from "@/components/shared/Navbar";
import InteractiveSplitLayout from "@/components/landing/InteractiveSplitLayout";
import TrendingHome from "@/components/home/TrendingHome";
import { auth } from "@/server/auth";

export default async function Home() {
  const session = await auth();

  // Signed-in → trending home dashboard with hero carousel + rows.
  // Anon → marketing landing (with the video + interactive canvas).
  if (session?.user?.id) {
    return <TrendingHome />;
  }

  return (
    <main className="bg-void overflow-x-hidden w-screen min-h-screen">
      <Navbar />
      <InteractiveSplitLayout />
    </main>
  );
}
