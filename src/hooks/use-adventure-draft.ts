"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export function adventureDraftContentKey(sessionId: string) {
  return `quiloria-draft-${sessionId}`;
}

export function adventureDraftTypeKey(sessionId: string) {
  return `quiloria-draft-type-${sessionId}`;
}

type UseAdventureDraftOptions = {
  sessionId: string;
  initialType: string;
};

type CommitAdventureDraftOptions = {
  draftContent: string;
  draftType: string;
  isGM: boolean;
  myCharName: string | null;
  isListening: boolean;
  stopListening: () => void;
  onCommitDraft: (content: string, type: string, metadata?: string) => void | Promise<void>;
  clearDraft: () => void;
  /** Optional metadata JSON to attach to the turn (e.g. `{markEligible:true}`). */
  metadata?: string;
};

function loadDraftContent(sessionId: string) {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(adventureDraftContentKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

function loadDraftType(sessionId: string, initialType: string) {
  if (typeof window === "undefined") return initialType;
  try {
    return localStorage.getItem(adventureDraftTypeKey(sessionId)) ?? initialType;
  } catch {
    return initialType;
  }
}

export async function commitAdventureDraft({
  draftContent,
  draftType,
  isGM,
  myCharName,
  isListening,
  stopListening,
  onCommitDraft,
  clearDraft,
  metadata,
}: CommitAdventureDraftOptions) {
  if (!draftContent.trim()) return false;

  let content = draftContent.trim();
  if (!isGM && myCharName) {
    // Escape regex metacharacters (names are arbitrary user input) and
    // require at least one whitespace after the name so "Ash" doesn't
    // strip the prefix of "Ashes fell from the sky".
    const escapedName = myCharName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namePattern = new RegExp(`^${escapedName}\\s+`, "i");
    content = content.replace(namePattern, "");
    if (!content) return false;
  }

  if (isListening) {
    stopListening();
  }

  await onCommitDraft(content, draftType, metadata);
  clearDraft();
  return true;
}

export function useAdventureDraft({ sessionId, initialType }: UseAdventureDraftOptions) {
  const initialDraftContent = loadDraftContent(sessionId);
  const [draftContent, setDraftContentState] = useState(initialDraftContent);
  const [draftType, setDraftType] = useState<string>(() => loadDraftType(sessionId, initialType));
  const [draftSaved, setDraftSaved] = useState(false);
  const [showTurnHelp, setShowTurnHelp] = useState(false);
  const draftContentRef = useRef(initialDraftContent);

  const setDraftContent: Dispatch<SetStateAction<string>> = useCallback((next) => {
    const previous = draftContentRef.current;
    const resolved = typeof next === "function" ? next(previous) : next;
    if (previous === "" && resolved !== "") {
      setShowTurnHelp(false);
    }
    draftContentRef.current = resolved;
    setDraftSaved(false);
    setDraftContentState(resolved);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (draftContent) {
          localStorage.setItem(adventureDraftContentKey(sessionId), draftContent);
          setDraftSaved(true);
        } else {
          localStorage.removeItem(adventureDraftContentKey(sessionId));
        }
      } catch {
        // Quota errors should not interrupt the live writing flow.
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [draftContent, sessionId]);

  useEffect(() => {
    try {
      if (draftType) {
        localStorage.setItem(adventureDraftTypeKey(sessionId), draftType);
      } else {
        localStorage.removeItem(adventureDraftTypeKey(sessionId));
      }
    } catch {
      // Non-critical draft preference.
    }
  }, [draftType, sessionId]);

  const clearDraft = useCallback(() => {
    draftContentRef.current = "";
    setDraftContentState("");
    setDraftSaved(false);
    try {
      localStorage.removeItem(adventureDraftContentKey(sessionId));
      localStorage.removeItem(adventureDraftTypeKey(sessionId));
    } catch {
      // Nothing to recover here; the in-memory draft is already cleared.
    }
  }, [sessionId]);

  return {
    draftContent,
    setDraftContent,
    draftType,
    setDraftType,
    draftSaved,
    showTurnHelp,
    setShowTurnHelp,
    clearDraft,
  };
}
