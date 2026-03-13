import Navbar from "@/components/shared/Navbar";
import InteractiveSplitLayout from "@/components/landing/InteractiveSplitLayout";

export default function Home() {
  return (
    <main className="bg-void overflow-x-hidden w-screen min-h-screen">
      <Navbar />
      <InteractiveSplitLayout />
    </main>
  );
}
