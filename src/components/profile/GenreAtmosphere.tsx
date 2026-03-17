"use client";

const GENRE_COLORS: Record<string, string> = {
  Fantasy: "200, 150, 60",      // amber
  "Science Fiction": "126, 94, 158", // lavender
  Romance: "158, 59, 66",       // rose
  Mystery: "126, 94, 158",      // violet
  Thriller: "158, 59, 66",      // rose
  Horror: "158, 59, 66",        // rose
  Adventure: "59, 110, 122",    // teal
  Contemporary: "59, 122, 92",  // sage
};

const DEFAULT_COLOR = "200, 150, 60"; // amber

export default function GenreAtmosphere({ genre }: { genre: string | null }) {
  const rgb = (genre && GENRE_COLORS[genre]) || DEFAULT_COLOR;

  return (
    <>
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${rgb}, 0.04) 0%, transparent 70%)`,
          filter: "blur(150px)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${rgb}, 0.03) 0%, transparent 70%)`,
          filter: "blur(150px)",
        }}
      />
    </>
  );
}

export { GENRE_COLORS, DEFAULT_COLOR };
