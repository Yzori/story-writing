import Navbar from "@/components/shared/Navbar";

export default function JamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      <main className="pt-16">{children}</main>
    </div>
  );
}
