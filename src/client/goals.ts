import { WritingGoals, WritingSession } from "@/types/editor";

export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getOrCreateSession(
  goals: WritingGoals,
  currentTotalWords: number
): WritingGoals {
  const today = getToday();
  const existing = goals.sessions.find((s) => s.date === today);

  if (existing) {
    return {
      ...goals,
      sessions: goals.sessions.map((s) =>
        s.date === today
          ? {
              ...s,
              wordsAtEnd: currentTotalWords,
              wordsWritten: Math.max(0, currentTotalWords - s.wordsAtStart),
            }
          : s
      ),
    };
  }

  const newSession: WritingSession = {
    date: today,
    wordsAtStart: currentTotalWords,
    wordsAtEnd: currentTotalWords,
    wordsWritten: 0,
  };

  // Keep only last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return {
    ...goals,
    sessions: [
      ...goals.sessions.filter((s) => s.date >= cutoffStr),
      newSession,
    ],
  };
}

export function calculateStreak(
  sessions: WritingSession[],
  dailyTarget: number
): number {
  if (dailyTarget <= 0) return 0;

  const sorted = [...sessions]
    .filter((s) => s.wordsWritten >= dailyTarget)
    .map((s) => s.date)
    .sort()
    .reverse();

  if (sorted.length === 0) return 0;

  let streak = 0;
  const today = getToday();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0;

  let expected = new Date(sorted[0]);
  for (const dateStr of sorted) {
    const date = new Date(dateStr);
    const diff = Math.round(
      (expected.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 1) break;
    streak++;
    expected = date;
  }

  return streak;
}

export function getTodaySession(goals: WritingGoals): WritingSession | null {
  return goals.sessions.find((s) => s.date === getToday()) ?? null;
}

export function getLast7Days(
  goals: WritingGoals
): { date: string; words: number; met: boolean }[] {
  const days: { date: string; words: number; met: boolean }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const session = goals.sessions.find((s) => s.date === dateStr);
    const words = session?.wordsWritten ?? 0;
    days.push({
      date: dateStr,
      words,
      met: words >= goals.dailyWordTarget,
    });
  }

  return days;
}
