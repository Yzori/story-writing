"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getPromptsForFormat } from "@/lib/writing-prompts";

// localStorage keys — same ones the register page reads on first signup
export const DEMO_DRAFT_KEY = "quiloria-demo-draft-v1";

interface DemoDraft {
  title: string;
  content: string; // Tiptap HTML
  updatedAt: number;
}

// Demo always pitches the novel format (the most universal entry point).
// Once they sign up, the import flow lands them in a novel draft anyway.
const DEMO_PROMPTS = getPromptsForFormat("novel").slice(0, 3);

export default function TryEditorPage() {
  const [title, setTitle] = useState("Untitled");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContentRef = useRef<string>("<p></p>");
  const [hydrated, setHydrated] = useState(false);

  // Load any existing draft from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEMO_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as DemoDraft;
        setTitle(draft.title || "Untitled");
        initialContentRef.current = draft.content || "<p></p>";
        setSavedAt(draft.updatedAt || null);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({
          placeholder: "Start your story here. Press / for formatting…",
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
        Typography,
        Underline,
        CharacterCount,
      ],
      content: initialContentRef.current,
      editorProps: {
        attributes: {
          class:
            "prose prose-invert max-w-none focus:outline-none min-h-[60vh] text-[16px] leading-[1.75] font-reading text-paper",
          spellcheck: "true",
        },
      },
      autofocus: "end",
      immediatelyRender: false,
    },
    [hydrated],
  );

  const persistDraft = useCallback(() => {
    if (!editor) return;
    try {
      const draft: DemoDraft = {
        title: title.trim() || "Untitled",
        content: editor.getHTML(),
        updatedAt: Date.now(),
      };
      localStorage.setItem(DEMO_DRAFT_KEY, JSON.stringify(draft));
      setSavedAt(draft.updatedAt);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1200);
    } catch {}
  }, [editor, title]);

  // Debounced auto-save on editor or title changes.
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persistDraft, 800);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, persistDraft]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persistDraft, 800);
  }, [title, hydrated, persistDraft]);

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0;
  const hasContent = wordCount > 0;

  const insertPrompt = (text: string) => {
    if (!editor) return;
    const html = text
      .split("\n\n")
      .map((para) => `<p><em>${para.replace(/\n/g, "<br>")}</em></p>`)
      .join("");
    editor.chain().focus("end").insertContent(html).run();
  };

  return (
    <div className="min-h-screen bg-void text-paper">
      {/* Sticky save-and-signup strip */}
      <div className="sticky top-0 z-30 bg-void/85 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <svg className="w-5 h-5 text-amber" viewBox="0 0 32 32" fill="none">
              <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="currentColor" opacity="0.85" />
            </svg>
            <span className="font-display text-[13px] font-semibold tracking-wide hidden sm:inline">Quiloria</span>
            <span className="text-[10px] text-text-ghost uppercase tracking-[0.14em] border-l border-border pl-2 ml-1 hidden sm:inline">
              Try the editor
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] text-text-ghost tabular-nums hidden sm:inline">
              {wordCount} word{wordCount === 1 ? "" : "s"}
            </span>
            <Link
              href="/register?source=demo"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber text-void text-[12px] font-semibold hover:bg-amber-light transition-all shadow-lg shadow-amber/15"
            >
              {hasContent ? "Save & Sign up" : "Sign up free"}
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Editor canvas */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Title input */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          aria-label="Story title"
          className="w-full bg-transparent text-3xl sm:text-4xl font-display font-bold text-paper outline-none placeholder:text-text-ghost/40 mb-6"
        />

        {/* Prompts (shown until the user has written anything) */}
        {!hasContent && hydrated && (
          <div className="mb-8 rounded-xl border border-amber/15 bg-amber/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-amber/70 font-medium mb-3">
              Stuck? Try one of these openings
            </p>
            <ul className="space-y-2">
              {DEMO_PROMPTS.map((p) => (
                <li key={p.label}>
                  <button
                    type="button"
                    onClick={() => insertPrompt(p.insert)}
                    title={p.hint}
                    className="w-full text-left text-[13px] text-text-secondary hover:text-paper transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber/[0.06] cursor-pointer"
                  >
                    <span className="font-medium text-paper">{p.label}</span>
                    {p.hint && (
                      <span className="block text-[11px] text-text-ghost mt-0.5">{p.hint}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tiptap surface */}
        {hydrated && editor && (
          <EditorContent editor={editor} />
        )}

        {/* Footer reassurance */}
        <div className="mt-16 pt-8 border-t border-border-subtle text-center">
          <p className="text-[12px] text-text-ghost leading-relaxed max-w-md mx-auto">
            Your draft saves to this browser automatically. When you sign up, we'll bring it with you — first chapter, exactly as you wrote it.
          </p>
          <Link
            href="/register?source=demo"
            className="inline-flex items-center gap-1.5 mt-4 text-[12px] text-amber hover:text-amber-light transition-colors"
          >
            Continue with a free account
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Saved toast */}
      <AnimatePresence>
        {showSavedToast && savedAt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-elevated/95 border border-border-subtle text-[11px] text-text-secondary backdrop-blur"
          >
            Draft saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
