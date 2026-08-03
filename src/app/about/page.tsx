import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/shared/DocPage";

export const metadata: Metadata = {
  title: "About — Quiloria",
  description:
    "Quiloria is a home for stories written together — novels, poetry, screenplays, webtoons, and live adventures, made by writers and carried by readers.",
};

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="The house"
      title="About Quiloria"
      intro="Most writing dies alone — in a drawer, in a drafts folder, in a group chat that went quiet. Quiloria is built on a simple belief: stories survive when they’re made and read together."
    >
      <DocSection title="A library with the lamps still lit">
        <p>
          Quiloria is a home for serialized stories in five forms — novels, poetry,
          screenplays, webtoons, and illustrated stories — each with an editor built
          for its craft and a reader built for its pleasures. Writers publish
          chapter by chapter; readers follow along as the ink dries, keep streaks,
          and leave sparks in the margins.
        </p>
      </DocSection>

      <DocSection title="Written together">
        <p>
          Co-writing usually dies of silence: momentum fades, partners ghost,
          nothing finished remains. Quiloria treats that as the central problem to
          solve. Workshops give collaborators real roles — writer, illustrator,
          editor, worldbuilder — with agreements, suggestions, and shared lore.
          Open calls help stories find the hands they’re missing. And at the{" "}
          <Link href="/adventures">table</Link>, a Director and a few writers
          improvise a story live, scene by scene, in front of an audience — a game’s
          body with a book’s soul, and a finished, readable story as the artifact.
        </p>
      </DocSection>

      <DocSection title="Readers carry the story">
        <p>
          Readers here aren’t traffic; they’re patrons. Ink Drops let them gift a
          writer, unlock chapters, join a creator’s Circle, vote at Crossroads, and
          commission new work. Creators keep 70% of every drop spent on their work —
          the same split on every stream, with no thresholds hidden in footnotes.
          See <Link href="/pricing">Pricing</Link> for the whole honest table.
        </p>
      </DocSection>

      <DocSection title="AI is stage crew, never the pen">
        <p>
          There is a writing assistant, and it knows its place: it acts only when
          invoked, suggests rather than writes, and touches nothing you don’t
          accept. Your stories are never training data — not for us, not for anyone.
          The words on the page are yours, and the byline means what it says.
        </p>
      </DocSection>

      <DocSection title="Come in">
        <p>
          The door isn’t locked. You can{" "}
          <Link href="/demo/try">try the desk without an account</Link>, wander the{" "}
          <Link href="/browse">library</Link>, or{" "}
          <Link href="/register">sign your name in</Link> and start tonight’s page.
        </p>
        <p>
          Questions? The <Link href="/help">Help page</Link> answers the common
          ones, and <a href="mailto:hello@quiloria.app">hello@quiloria.app</a>{" "}
          reaches a human for the rest.
        </p>
      </DocSection>
    </DocPage>
  );
}
