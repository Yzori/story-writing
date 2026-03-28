import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import WelcomeContent from "./WelcomeContent";

export const metadata = {
  title: "Welcome to Quiloria",
  description: "Begin your journey as a writer, reader, or collaborator.",
};

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const firstName = session.user.name?.split(" ")[0] || "Writer";

  return <WelcomeContent firstName={firstName} />;
}
