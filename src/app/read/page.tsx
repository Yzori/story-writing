import ForYouReader from "@/components/reader/ForYouReader";
import { auth } from "@/server/auth";

/**
 * /read — the For You reader.
 *
 * A candlelit room. Signed-in readers land directly inside a chapter;
 * anonymous visitors get a 3-story demo loop. See docs/FOR_YOU_READER.md.
 */
export default async function ReadPage() {
  const session = await auth();
  const mode = session?.user?.id ? "personalized" : "demo";
  return <ForYouReader mode={mode} />;
}

export const dynamic = "force-dynamic";
