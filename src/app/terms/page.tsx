import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection, PlainWords } from "@/components/shared/DocPage";

export const metadata: Metadata = {
  title: "Terms of Service — Quiloria",
  description:
    "The agreement between you and Quiloria: your stories stay yours, creators keep 70% of what readers spend on them, and the house rules that keep the library open.",
};

export default function TermsPage() {
  return (
    <DocPage
      eyebrow="The agreement"
      title="Terms of Service"
      updated="August 3, 2026"
      intro="These terms are the agreement between you and Quiloria. We’ve written them to be read, not skimmed — and each section carries a plain-words summary, because a platform for writers should never hide behind language."
    >
      <DocSection title="1. Who we are">
        <p>
          Quiloria is a collaborative story-writing platform: a place to write novels,
          poetry, screenplays, webtoons, and illustrated stories; to read them; and to
          make them together — in workshops, open calls, and live adventures. By
          creating an account or using the site, you agree to these terms.
        </p>
      </DocSection>

      <DocSection title="2. Your account">
        <p>
          You need an account to write, follow, comment, or spend Ink Drops. You’re
          responsible for what happens under your account and for keeping your
          password to yourself. You must be at least 13 years old to use Quiloria;
          purchases require you to be 18 or have a parent or guardian’s permission.
        </p>
        <p>
          You can export everything you’ve made or delete your account entirely from{" "}
          <Link href="/settings">Settings</Link>, at any time, no questions asked.
        </p>
        <PlainWords>
          One account per person, guard your password, 13+ to join, and you can pack
          up your library and leave whenever you want.
        </PlainWords>
      </DocSection>

      <DocSection title="3. Your stories stay yours">
        <p>
          Everything you write on Quiloria belongs to you. Publishing here does not
          transfer copyright to us or to anyone else. You grant Quiloria a
          non-exclusive license to host, display, and distribute your work on the
          platform — that’s the license that lets us show your chapters to readers,
          render previews, and send your updates to followers. It ends when you
          delete the work or your account, except for copies readers have already
          lawfully exported.
        </p>
        <p>
          For co-written work — collaborations, adventures at the table, open call
          responses — authorship is shared among the credited contributors as
          recorded on the work. Collaboration agreements made in the Workshop are
          binding between collaborators.
        </p>
        <PlainWords>
          You own your words. We only get the permission we need to put them in front
          of readers, and it ends when you take them down.
        </PlainWords>
      </DocSection>

      <DocSection title="4. Ink Drops, subscriptions, and paying creators">
        <p>
          Ink Drops are Quiloria’s currency for supporting creators — gifts, chapter
          unlocks, Circle subscriptions, Crossroads votes, and commissions all run on
          them. Drops are not money, don’t earn interest, and can’t be traded between
          readers.
        </p>
        <ul>
          <li>
            <strong className="text-text">Creators keep 70%</strong> of every drop
            spent on their work, on every revenue stream. The remaining 30% covers
            payment processing, hosting, moderation, and keeping the lamps lit.
          </li>
          <li>
            Unspent drops can be refunded within 14 days of purchase. Drops already
            spent on a creator are theirs — we don’t claw back a writer’s earnings.
          </li>
          <li>
            Creator payouts unlock at $25 USD-equivalent and are processed weekly via
            Stripe Connect.
          </li>
          <li>
            Subscriptions (reader plans and creator Circles) renew until cancelled.
            Cancel anytime from Settings; access runs to the end of the paid period.
          </li>
          <li>
            Commissions are held in escrow: the writer or artist is paid when the
            work is delivered, and disputes are reviewed by Quiloria.
          </li>
        </ul>
        <PlainWords>
          Readers’ support goes 70% to the maker, 30% to the platform. Unspent drops
          are refundable for 14 days. Cancel subscriptions whenever you like.
        </PlainWords>
      </DocSection>

      <DocSection title="5. House rules">
        <p>On Quiloria you may not:</p>
        <ul>
          <li>Post work that isn’t yours to post, or that infringes someone’s copyright.</li>
          <li>Harass, threaten, or impersonate other people.</li>
          <li>Post sexual content involving minors, or content that celebrates real-world violence. This is grounds for immediate removal.</li>
          <li>Spam, scrape, or use the platform to train AI models on other writers’ work.</li>
          <li>Manipulate sparks, votes, or earnings with fake accounts.</li>
        </ul>
        <p>
          Every story and comment carries a flag control. Reports go to human
          moderators. We may remove content or suspend accounts that break these
          rules — for serious or repeated violations, permanently.
        </p>
        <PlainWords>
          Write what you like, even dark and difficult things — but only your own
          work, aimed at no real person, and never involving children.
        </PlainWords>
      </DocSection>

      <DocSection title="6. AI at the desk">
        <p>
          Quiloria’s writing assistant is stage crew, never the pen: it only acts
          when you invoke it, on your own draft, and what it suggests only enters
          your story if you accept it. We do not use your stories to train AI
          models, and we don’t allow others to. Work you publish is presented as
          yours; presenting wholly machine-generated work as your own writing is
          against the spirit of the house, and stories may be flagged for it.
        </p>
        <PlainWords>
          The AI helps only when you ask. Your writing is never training data.
        </PlainWords>
      </DocSection>

      <DocSection title="7. Endings and changes">
        <p>
          We may update these terms as the platform grows. For meaningful changes
          we’ll tell you by email or an in-app notice at least 14 days before they
          take effect; continuing to use Quiloria after that means you accept them.
          If we ever have to close the platform, we’ll give you at least 90 days and
          working export tools to take your stories with you.
        </p>
        <p>
          Quiloria is provided &ldquo;as is.&rdquo; To the extent the law allows, our
          liability to you is limited to the amount you’ve paid us in the past twelve
          months. Nothing in these terms limits liability that can’t legally be
          limited.
        </p>
        <PlainWords>
          If the rules change, you’ll hear about it first. If the library ever
          closes, you’ll have time and tools to carry your work out.
        </PlainWords>
      </DocSection>

      <DocSection title="8. Questions">
        <p>
          Write to us at{" "}
          <a href="mailto:support@quiloria.app">support@quiloria.app</a>, or start
          with the <Link href="/help">Help page</Link>. See also our{" "}
          <Link href="/privacy">Privacy Policy</Link> — what we know about you and
          what we do with it.
        </p>
      </DocSection>
    </DocPage>
  );
}
