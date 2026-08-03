import type { Metadata } from "next";
import HelpContent from "./HelpContent";

export const metadata: Metadata = {
  title: "Help — Quiloria",
  description:
    "Answers to the common questions: getting started, writing and publishing, Ink Drops, earning as a creator, adventures at the table, and your account.",
};

export default function HelpPage() {
  return <HelpContent />;
}
