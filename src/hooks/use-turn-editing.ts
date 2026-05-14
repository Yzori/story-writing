"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Turn } from "@/types/campaign";

interface UseTurnEditingOptions {
  storyTurns: Turn[];
  currentUserId: string | null;
  activePlayerId: string | null;
  onEditTurn?: (turnId: string, newContent: string) => void;
}

interface UseTurnEditingResult {
  editableTurn: Turn | null;
  editingTurnId: string | null;
  editContent: string;
  setEditContent: Dispatch<SetStateAction<string>>;
  handleEditClick: (turn: Turn) => void;
  handleEditSave: () => void;
  handleEditCancel: () => void;
}

export function useTurnEditing({
  storyTurns,
  currentUserId,
  activePlayerId,
  onEditTurn,
}: UseTurnEditingOptions): UseTurnEditingResult {
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [lastSubmittedTurnId, setLastSubmittedTurnId] = useState<string | null>(null);
  const [editWindowOpen, setEditWindowOpen] = useState(false);
  const editWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTurnCountRef = useRef(storyTurns.length);
  const prevActivePlayerIdRef = useRef(activePlayerId);

  const closeEditor = useCallback(() => {
    setEditingTurnId(null);
    setEditContent("");
  }, []);

  const closeEditWindow = useCallback(() => {
    setEditWindowOpen(false);
    closeEditor();
  }, [closeEditor]);

  const startEditWindow = useCallback((turnId: string) => {
    setLastSubmittedTurnId(turnId);
    setEditWindowOpen(true);

    if (editWindowRef.current) {
      clearTimeout(editWindowRef.current);
    }

    editWindowRef.current = setTimeout(() => {
      setEditWindowOpen(false);
      closeEditor();
    }, 30000);
  }, [closeEditor]);

  const editableTurn = useMemo(() => {
    const last = storyTurns.at(-1);
    if (!last) return null;
    if (last.id !== lastSubmittedTurnId) return null;
    if (last.userId !== currentUserId) return null;
    if (!editWindowOpen) return null;
    return last;
  }, [currentUserId, editWindowOpen, lastSubmittedTurnId, storyTurns]);

  useEffect(() => {
    if (prevActivePlayerIdRef.current !== activePlayerId && editWindowOpen) {
      const timeoutId = setTimeout(closeEditWindow, 0);
      prevActivePlayerIdRef.current = activePlayerId;
      return () => clearTimeout(timeoutId);
    }
    prevActivePlayerIdRef.current = activePlayerId;
  }, [activePlayerId, closeEditWindow, editWindowOpen]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (storyTurns.length > prevTurnCountRef.current) {
      const newest = storyTurns.at(-1);
      if (newest?.userId === currentUserId && newest.type !== "scene-break") {
        timeoutId = setTimeout(() => startEditWindow(newest.id), 0);
      }
    }
    prevTurnCountRef.current = storyTurns.length;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentUserId, startEditWindow, storyTurns]);

  useEffect(() => {
    return () => {
      if (editWindowRef.current) {
        clearTimeout(editWindowRef.current);
      }
    };
  }, []);

  const handleEditClick = useCallback((turn: Turn) => {
    setEditingTurnId(turn.id);
    setEditContent(turn.content);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingTurnId || !editContent.trim()) return;
    onEditTurn?.(editingTurnId, editContent.trim());
    closeEditor();
  }, [closeEditor, editContent, editingTurnId, onEditTurn]);

  return {
    editableTurn,
    editingTurnId,
    editContent,
    setEditContent,
    handleEditClick,
    handleEditSave,
    handleEditCancel: closeEditor,
  };
}
