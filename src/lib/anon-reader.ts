// Anonymous reader continuity — the place and the taste a stranger
// accumulates before signing up. Register/login import both so nothing is
// lost at the door: the reading position becomes real reading progress and
// the journey's genre signals prefill /welcome/preferences. (WEBTOON's
// guest state, famously discarded at account creation, is the cautionary
// tale; NN/g's recommended pattern — anonymous state first, account
// preserves it — is the blueprint.)

export interface AnonReadingPlace {
  storyId: string;
  slug: string;
  chapterId: string;
  scrollPercent: number;
  pageNumber: number;
  storyTitle?: string;
  updatedAt: number;
}

const PLACE_KEY = "quiloria-anon-reading-v1";
const TASTE_KEY = "quiloria-taste-v1";
// a month: long enough to survive a slow decision, short enough that a
// resurrected position still means something
const PLACE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function saveAnonPlace(place: Omit<AnonReadingPlace, "updatedAt">) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify({ ...place, updatedAt: Date.now() }));
  } catch {}
}

export function readAnonPlace(): AnonReadingPlace | null {
  try {
    const raw = localStorage.getItem(PLACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AnonReadingPlace;
    if (!p?.storyId || !p?.chapterId || !p?.slug) return null;
    if (typeof p.updatedAt !== "number" || Date.now() - p.updatedAt > PLACE_TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearAnonPlace() {
  try {
    localStorage.removeItem(PLACE_KEY);
  } catch {}
}

/**
 * PUT the anonymous place into the member's real reading progress.
 * Call after authentication. Clears the local copy only on success so a
 * failed import can retry on the next sign-in.
 */
export async function importAnonPlace(): Promise<AnonReadingPlace | null> {
  const place = readAnonPlace();
  if (!place) return null;
  try {
    const res = await fetch("/api/reading-progress", {
      method: "PUT",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyId: place.storyId,
        chapterId: place.chapterId,
        scrollPercent: place.scrollPercent,
        pageNumber: place.pageNumber,
      }),
    });
    if (res.ok) clearAnonPlace();
  } catch {}
  return place;
}

// ── taste — genre weights accumulated from the anonymous journey ──

interface TasteStore {
  genres: Record<string, number>;
  updatedAt: number;
}

export function bumpTaste(genres: string[], weight = 1) {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    const store: TasteStore = raw ? (JSON.parse(raw) as TasteStore) : { genres: {}, updatedAt: 0 };
    if (!store.genres || typeof store.genres !== "object") store.genres = {};
    for (const g of genres) {
      if (g) store.genres[g] = (store.genres[g] ?? 0) + weight;
    }
    store.updatedAt = Date.now();
    localStorage.setItem(TASTE_KEY, JSON.stringify(store));
  } catch {}
}

/** Top genres from the journey, strongest signal first. */
export function readTasteGenres(max = 8): string[] {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (!raw) return [];
    const store = JSON.parse(raw) as TasteStore;
    return Object.entries(store.genres ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([g]) => g);
  } catch {
    return [];
  }
}

export function clearTaste() {
  try {
    localStorage.removeItem(TASTE_KEY);
  } catch {}
}
