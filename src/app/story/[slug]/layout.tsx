import Navbar from "@/components/shared/Navbar";

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      <main className="pt-14">{children}</main>
    </div>
  );
}
