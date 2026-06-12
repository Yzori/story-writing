"use client";

// Historical mockup route for the approved six-act film homepage.
// The real implementation lives at / (src/components/landing/FilmLanding.tsx);
// this renders the same experience on fixture data.
import FilmLanding from "@/components/landing/FilmLanding";

export default function FilmHomepageMock() {
  return (
    <>
      <FilmLanding />
      <span className="fixed bottom-4 left-4 z-50 text-[10px] text-text-ghost/70 pointer-events-none">
        mockup v4.6 · six acts — now live at /
      </span>
    </>
  );
}
