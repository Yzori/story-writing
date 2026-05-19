"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { mentionPluginKey, MentionCharacter } from "./extensions/CharacterMention";

interface MentionDropdownProps {
  editor: Editor;
  characters: MentionCharacter[];
}

export default function MentionDropdown({ editor, characters }: MentionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    characters.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    ),
    [characters, query]
  );

  const activeIndex = Math.min(selectedIndex, Math.max(filtered.length - 1, 0));

  const insertMention = useCallback(
    (character: MentionCharacter) => {
      const pluginState = mentionPluginKey.getState(editor.state);
      if (!pluginState) return;

      const { from } = pluginState;
      const to = editor.state.selection.from;

      // Delete the @query text, then insert the mention node
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertMention({
          id: character.id,
          name: character.name,
          color: character.color,
        })
        .run();

      setOpen(false);
    },
    [editor]
  );

  // Listen to editor state changes to detect @ trigger
  useEffect(() => {
    const handleUpdate = () => {
      const pluginState = mentionPluginKey.getState(editor.state);
      if (!pluginState) return;

      if (pluginState.active) {
        setQuery(pluginState.query);
        setSelectedIndex(0);

        // Position below the cursor
        const coords = editor.view.coordsAtPos(editor.state.selection.from);
        setPosition({ x: coords.left, y: coords.bottom + 8 });

        if (!open) setOpen(true);
      } else if (open) {
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, open]);

  // Handle keyboard events dispatched from the ProseMirror plugin
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: Event) => {
      const key = (e as CustomEvent).detail;

      if (key === "ArrowDown") {
        setSelectedIndex((i) => filtered.length > 0 ? Math.min(i + 1, filtered.length - 1) : 0);
      } else if (key === "ArrowUp") {
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (key === "Enter" || key === "Tab") {
        if (filtered[activeIndex]) {
          insertMention(filtered[activeIndex]);
        }
      } else if (key === "Escape") {
        setOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    };

    window.addEventListener("mention-keydown", handleKey);
    return () => window.removeEventListener("mention-keydown", handleKey);
  }, [open, filtered, activeIndex, insertMention]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <AnimatePresence>
      {open && filtered.length > 0 && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="fixed z-50"
          style={{ left: position.x, top: position.y }}
        >
          <div
            role="listbox"
            aria-label="Mention a character"
            aria-activedescendant={
              filtered[activeIndex]
                ? `mention-item-${activeIndex}`
                : undefined
            }
            className="w-[240px] py-1.5 rounded-xl bg-elevated/95 backdrop-blur-xl border border-border-active shadow-2xl shadow-black/50 overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-text-ghost px-3 py-1.5">
              Characters
            </p>
            {filtered.map((character, index) => (
              <button
                key={character.id}
                id={`mention-item-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(character);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === activeIndex
                    ? "bg-amber/10 text-paper"
                    : "text-text-secondary hover:text-paper"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: character.color }}
                />
                <span className="text-sm truncate">{character.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
