import Navbar from "@/components/shared/Navbar";

export default function ReadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <Navbar />
      {children}
    </div>
  );
}
