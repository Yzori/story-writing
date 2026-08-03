import SiteFooter from "@/components/shared/SiteFooter";

/*
 * DocPage — shared shell for document pages (Terms, Privacy, About).
 *
 * A single readable column in Literata under a Fraunces title, with the
 * site footer attached. Sections are plain; the optional PlainWords
 * aside carries the human summary of a legal clause.
 */

export function DocPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  updated?: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void flex flex-col">
      <main className="flex-1">
        {/* top padding clears the fixed h-14 navbar */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
          <header className="mb-12">
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.24em] text-gold/70 mb-3">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-4xl sm:text-5xl text-paper">{title}</h1>
            {updated && (
              <p className="mt-3 font-mono text-[12px] text-text-ghost">
                Last updated {updated}
              </p>
            )}
            {intro && (
              <p className="mt-6 font-reading text-[16px] leading-relaxed text-text">
                {intro}
              </p>
            )}
          </header>
          <div className="space-y-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl sm:text-2xl text-paper mb-3">{title}</h2>
      <div className="font-reading text-[15px] leading-relaxed text-text-secondary space-y-3 [&_a]:text-gold [&_a:hover]:text-gold-light [&_a]:transition-colors [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function PlainWords({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 border-l-2 border-gold/40 bg-gold/[0.04] rounded-r-lg px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70 mb-1">
        In plain words
      </p>
      <p className="text-[13px] leading-relaxed text-text">{children}</p>
    </div>
  );
}
