"use client";

import { useEffect, useRef, useState } from "react";

interface ShortcutChapters {
  chapters: { id: string }[];
  activeChapterId: string | null;
}

export interface EditorShortcutActions {
  toggleGrimoire: () => void;
  closeGrimoire: () => void;
  toggleAssistant: () => void;
  toggleSearch: () => void;
  toggleGoals: () => void;
  toggleFocus: () => void;
  toggleCodex: () => void;
  toggleShortcuts: () => void;
  openDesk: () => void;
  selectChapter: (id: string) => void;
  save: () => void;
  closePublishDialog: () => void;
}

interface UseEditorShortcutsArgs {
  project: ShortcutChapters | null;
  showDesk: boolean;
  commandOpen: boolean;
  publishDialogOpen: boolean;
  publishDialogPhase: string;
  actions: EditorShortcutActions;
}

/**
 * All keyboard handling for the editor cockpit in one place: the global
 * shortcut map (Grimoire, Desk, Focus, Codex, chapter nav, save, …) plus
 * typing detection.
 *
 * Typing detection is a SEPARATE listener on purpose — it used to share the
 * shortcut effect, whose cleanup cleared the pending 2s reset whenever a dep
 * flipped, so opening the desk within 2s of a keystroke stranded `isTyping`
 * true and hid the status bar forever. Keep them apart.
 *
 * Returns `isTyping` so the chrome can fade while the writer is mid-sentence.
 */
export function useEditorShortcuts({
  project,
  showDesk,
  commandOpen,
  publishDialogOpen,
  publishDialogPhase,
  actions,
}: UseEditorShortcutsArgs): { isTyping: boolean } {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    toggleGrimoire,
    closeGrimoire,
    toggleAssistant,
    toggleSearch,
    toggleGoals,
    toggleFocus,
    toggleCodex,
    toggleShortcuts,
    openDesk,
    selectChapter,
    save,
    closePublishDialog,
  } = actions;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Grimoire toggle: "/" when not in an input, or Cmd+K
      if (
        e.key === "/" &&
        !isMod &&
        !(e.target as HTMLElement)?.closest("[contenteditable], input, textarea, .tiptap-editor")
      ) {
        e.preventDefault();
        toggleGrimoire();
        return;
      }
      if (isMod && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        toggleGrimoire();
        return;
      }
      // Editor's Desk (AI assistant): Cmd+Shift+K
      if (isMod && e.shiftKey && e.key === "K") {
        e.preventDefault();
        toggleAssistant();
        return;
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggleSearch();
      }
      if (isMod && e.shiftKey && e.key === "ArrowDown") {
        e.preventDefault();
        const idx = project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? -1;
        const nextId = idx >= 0 ? project?.chapters[idx + 1]?.id : null;
        if (nextId) selectChapter(nextId);
      }
      if (isMod && e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        const idx = project?.chapters.findIndex((c) => c.id === project.activeChapterId) ?? -1;
        const prevId = idx > 0 ? project?.chapters[idx - 1]?.id : null;
        if (prevId) selectChapter(prevId);
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggleGoals();
      }
      // Focus mode: Cmd/Ctrl+. — the writer's most important toggle
      if (isMod && e.key === ".") {
        e.preventDefault();
        toggleFocus();
      }
      if (isMod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleCodex();
      }
      // The Desk: Cmd/Ctrl+E zooms out to the chapters overview. DeskView owns
      // the close (capture-phase listener) so the zoom-back always plays.
      if (isMod && e.key.toLowerCase() === "e" && !e.shiftKey) {
        e.preventDefault();
        if (!showDesk) openDesk();
      }
      // Ctrl+S — manual save
      if (isMod && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        save();
      }
      // Ctrl+/ — keyboard shortcuts panel
      if (isMod && e.key === "/") {
        e.preventDefault();
        toggleShortcuts();
      }
      if (e.key === "Escape" && commandOpen) {
        closeGrimoire();
      }
      if (e.key === "Escape" && publishDialogOpen && publishDialogPhase !== "publishing") {
        closePublishDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    commandOpen,
    showDesk,
    publishDialogOpen,
    publishDialogPhase,
    project,
    toggleGrimoire,
    closeGrimoire,
    toggleAssistant,
    toggleSearch,
    toggleGoals,
    toggleFocus,
    toggleCodex,
    toggleShortcuts,
    openDesk,
    selectChapter,
    save,
    closePublishDialog,
  ]);

  // Typing detection — its own stable, empty-dep listener (see the doc above).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key.length !== 1) return;
      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  return { isTyping };
}
