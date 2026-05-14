
export default function RosterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <main className="pt-16">{children}</main>
    </div>
  );
}
