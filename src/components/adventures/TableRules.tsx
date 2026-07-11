"use client";

const RULES: Array<{ title: string; body: string }> = [
  {
    title: "The Director",
    body: "Runs the world: opens scenes, answers the cast, keeps the story moving. Never writes your character.",
  },
  {
    title: "Raise your hand",
    body: "Tell the Director you have the next move, with a whisper saying what you're holding. They pass the spotlight — or hold it.",
  },
  {
    title: "Step forward",
    body: "Once per act, take the spotlight without asking. The Director must weave with whatever you write.",
  },
  {
    title: "The book it becomes",
    body: "Every scene is published the moment it's signed. When the adventure ends, it compiles into a finished novel credited to the whole table.",
  },
];

/** The table rules footer — plain caps labels over one gold hairline each. */
export default function TableRules() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 mt-5">
      {RULES.map((rule) => (
        <div
          key={rule.title}
          className="border-t border-gold/25 pt-3.5 px-1 text-[12.5px] text-text-ghost"
        >
          <b className="block font-bold text-[11px] tracking-[0.18em] uppercase text-gold mb-1.5">
            {rule.title}
          </b>
          {rule.body}
        </div>
      ))}
    </div>
  );
}
