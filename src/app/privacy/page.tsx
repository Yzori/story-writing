import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection, PlainWords } from "@/components/shared/DocPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Quiloria",
  description:
    "What Quiloria knows about you, why, and how to take it with you or make it disappear. Your drafts are private, your data is exportable, and nothing is sold.",
};

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="The record"
      title="Privacy Policy"
      updated="August 3, 2026"
      intro="This is the honest inventory of what Quiloria knows about you, why we keep it, and how you can take it with you or make it disappear. The short version: your drafts are private, we don’t sell data, and everything about you is exportable and deletable from Settings."
    >
      <DocSection title="1. What we collect">
        <ul>
          <li>
            <strong className="text-text">Account</strong> — your display name, email
            address, and a hashed password (we can’t read it). If you sign in with
            Google or GitHub, we receive your name and email from them; we never see
            those passwords.
          </li>
          <li>
            <strong className="text-text">Your work</strong> — stories, chapters,
            comments, lore entries, and everything else you write here. Drafts are
            visible only to you and collaborators you’ve explicitly invited.
            Quiloria staff don’t read your drafts.
          </li>
          <li>
            <strong className="text-text">Reading life</strong> — follows, sparks,
            reading progress, and streaks, so your library remembers your place and
            your recommendations improve.
          </li>
          <li>
            <strong className="text-text">Payments</strong> — handled by Stripe. We
            keep a record of your purchases and balance; your card number never
            touches our servers.
          </li>
          <li>
            <strong className="text-text">Technical basics</strong> — logs of
            requests (IP address, browser) kept briefly for security and debugging.
          </li>
        </ul>
        <PlainWords>
          We keep what the product needs to work: who you are, what you wrote, what
          you read, what you bought. No tracking beyond that.
        </PlainWords>
      </DocSection>

      <DocSection title="2. What we never do">
        <ul>
          <li>We don’t sell your data. To anyone. Ever.</li>
          <li>We don’t use your stories to train AI models, and we don’t let others.</li>
          <li>We don’t run third-party advertising or ad trackers.</li>
          <li>We don’t read your drafts or private workshop discussions, except when a specific piece of content is flagged and a human moderator must review it.</li>
        </ul>
      </DocSection>

      <DocSection title="3. Email and notifications">
        <p>
          We send account email (sign-up welcome, password resets, receipts) and,
          if you keep them on, activity email — replies, new followers, digest
          summaries. Every notification type has its own switch in{" "}
          <Link href="/settings">Settings</Link>, and every email carries an
          unsubscribe link. Push notifications are strictly opt-in and can be turned
          off from the same place, or from your browser.
        </p>
      </DocSection>

      <DocSection title="4. The AI assistant">
        <p>
          When you invoke the writing assistant, the passage you’re working on is
          sent to our AI provider to generate the suggestion, then discarded — it is
          not used for training, and nothing is sent unless you ask. Free-tier taste
          requests are counted per account so we can enforce limits, and that
          counter is all we keep.
        </p>
        <PlainWords>
          Your words go to the AI only when you press the button, come back as a
          suggestion, and aren’t kept or learned from.
        </PlainWords>
      </DocSection>

      <DocSection title="5. Cookies">
        <p>
          We use a session cookie to keep you signed in, a CSRF token to protect
          your account from forged requests, and localStorage for preferences like
          your theme. That’s the whole list — there are no analytics or advertising
          cookies, so there’s no cookie banner to click through.
        </p>
      </DocSection>

      <DocSection title="6. Where your data lives, and for how long">
        <p>
          Data is hosted in the EU and US depending on your region. We keep it for
          as long as you have an account. Deleted stories go immediately; server
          backups age out within 30 days. Payment records are kept as long as tax
          law requires, even after account deletion.
        </p>
      </DocSection>

      <DocSection title="7. Your rights">
        <p>
          Wherever you live, we hold to one standard — the strictest one (GDPR):
        </p>
        <ul>
          <li>
            <strong className="text-text">Export</strong> — download everything
            (stories as DOCX/PDF, your data as a machine-readable archive) from
            Settings.
          </li>
          <li>
            <strong className="text-text">Delete</strong> — remove your account and
            everything in it from Settings. This is immediate and permanent.
          </li>
          <li>
            <strong className="text-text">Correct</strong> — edit your profile and
            account details yourself, anytime.
          </li>
          <li>
            <strong className="text-text">Ask</strong> — email us to exercise any
            right you can’t reach through Settings, and we’ll answer within 30 days.
          </li>
        </ul>
        <PlainWords>
          Your data is yours to see, take, fix, or destroy — self-serve, from
          Settings, no support ticket needed.
        </PlainWords>
      </DocSection>

      <DocSection title="8. Children">
        <p>
          Quiloria is for writers and readers aged 13 and up. We don’t knowingly
          collect data from children under 13; if you believe a child is using the
          platform, write to us and we’ll remove the account.
        </p>
      </DocSection>

      <DocSection title="9. Changes and contact">
        <p>
          If this policy changes in a way that matters, we’ll tell you by email or
          in-app notice before it takes effect. Questions, requests, or concerns:{" "}
          <a href="mailto:privacy@quiloria.app">privacy@quiloria.app</a>. See also
          the <Link href="/terms">Terms of Service</Link>.
        </p>
      </DocSection>
    </DocPage>
  );
}
