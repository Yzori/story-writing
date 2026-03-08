"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Chapter } from "@/lib/store";
import { SearchMatch, searchInChapters, replaceInHtml, SearchOptions } from "@/lib/search";

interface SearchReplaceProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onNavigateToChapter: (chapterId: string) => void;
  onUpdateChapterContent: (chapterId: string, content: string) => void;
  onClose: () => void;
}

export default function SearchReplace({
  chapters,
  activeChapterId,
  onNavigateToChapter,
  onUpdateChapterContent,
  onClose,
}: SearchReplaceProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [allChapters, setAllChapters] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const options: SearchOptions = { caseSensitive, wholeWord };

  const doSearch = useCallback(() => {
    if (!query.trim()) {
      setMatches([]);
      return;
    }
    const searchScope = allChapters
      ? chapters
      : chapters.filter((c) => c.id === activeChapterId);

    const results = searchInChapters(searchScope, query, options);
    setMatches(results);
    setActiveMatch(0);
  }, [query, chapters, activeChapterId, allChapters, caseSensitive, wholeWord]);

  useEffect(() => {
    const timer = setTimeout(doSearch, 200);
    return () => clearTimeout(timer);
  }, [doSearch]);

  const handleReplace = () => {
    if (matches.length === 0) return;
    const match = matches[activeMatch];
    const chapter = chapters.find((c) => c.id === match.chapterId);
    if (!chapter) return;

    const newContent = replaceInHtml(chapter.content, query, replacement, options, false);
    onUpdateChapterContent(chapter.id, newContent);

    // Re-search after replacement
    setTimeout(doSearch, 50);
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;

    const scope = allChapters
      ? chapters
      : chapters.filter((c) => c.id === activeChapterId);

    for (const chapter of scope) {
      const newContent = replaceInHtml(chapter.content, query, replacement, options, true);
      if (newContent !== chapter.content) {
        onUpdateChapterContent(chapter.id, newContent);
      }
    }

    setTimeout(doSearch, 50);
  };

  const handleMatchClick = (match: SearchMatch, index: number) => {
    setActiveMatch(index);
    if (match.chapterId !== activeChapterId) {
      onNavigateToChapter(match.chapterId);
    }
  };

  const prevMatch = () => setActiveMatch((v) => (v > 0 ? v - 1 : matches.length - 1));
  const nextMatch = () => setActiveMatch((v) => (v < matches.length - 1 ? v + 1 : 0));

  return (
    <motion.div
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -48, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute top-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-xl border-b border-border shadow-lg shadow-black/20"
    >
      {/* Search row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) prevMatch();
                else nextMatch();
              }
            }}
            placeholder="Search..."
            className="flex-1 bg-elevated border border-border rounded-md px-3 py-1.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors min-w-0"
          />
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleReplace();
            }}
            placeholder="Replace with..."
            className="flex-1 bg-elevated border border-border rounded-md px-3 py-1.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors min-w-0"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
              caseSensitive ? "bg-amber/15 text-amber" : "text-text-ghost hover:text-text-secondary"
            }`}
            title="Case Sensitive"
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord((v) => !v)}
            className={`px-2 py-1 rounded text-[11px] transition-all ${
              wholeWord ? "bg-amber/15 text-amber" : "text-text-ghost hover:text-text-secondary"
            }`}
            title="Whole Word"
          >
            W
          </button>
          <button
            onClick={() => setAllChapters((v) => !v)}
            className={`px-2 py-1 rounded text-[11px] transition-all ${
              allChapters ? "bg-amber/15 text-amber" : "text-text-ghost hover:text-text-secondary"
            }`}
            title="Search All Chapters"
          >
            All
          </button>
        </div>

        {/* Match count + nav */}
        <div className="flex items-center gap-1 text-[11px] text-text-ghost tabular-nums shrink-0">
          {matches.length > 0 ? (
            <>
              <span>{activeMatch + 1}/{matches.length}</span>
              <button onClick={prevMatch} className="p-1 rounded hover:bg-subtle transition-colors">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M7 3L5 5l2 2" />
                </svg>
              </button>
              <button onClick={nextMatch} className="p-1 rounded hover:bg-subtle transition-colors">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 3l2 2-2 2" />
                </svg>
              </button>
            </>
          ) : query ? (
            <span>No results</span>
          ) : null}
        </div>

        {/* Replace actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReplace}
            disabled={matches.length === 0}
            className="px-2.5 py-1 rounded-md text-[11px] text-text-ghost hover:text-text-secondary disabled:opacity-30 transition-colors border border-border"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            className="px-2.5 py-1 rounded-md text-[11px] text-text-ghost hover:text-text-secondary disabled:opacity-30 transition-colors border border-border"
          >
            All
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </button>
      </div>

      {/* Results list (shown when there are matches) */}
      {matches.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto border-t border-border">
          {matches.map((match, i) => (
            <button
              key={`${match.chapterId}-${match.position}`}
              onClick={() => handleMatchClick(match, i)}
              className={`w-full text-left px-4 py-2 flex items-start gap-3 hover:bg-subtle/30 transition-colors ${
                i === activeMatch ? "bg-amber/[0.04]" : ""
              }`}
            >
              {allChapters && (
                <span className="text-[10px] text-text-ghost shrink-0 mt-0.5">
                  {match.chapterTitle}
                </span>
              )}
              <span className="text-[12px] text-text-secondary leading-relaxed">
                {match.context}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
