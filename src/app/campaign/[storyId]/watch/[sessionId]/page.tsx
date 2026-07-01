"use client";

import { useParams } from "next/navigation";
import SpectatorRoom from "@/components/campaign/manuscript/SpectatorRoom";

export default function WatchSessionPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const sessionId = params.sessionId as string;
  return <SpectatorRoom storyId={storyId} sessionId={sessionId} />;
}
