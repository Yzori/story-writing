"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Chapter } from "@/types/editor";

interface OutlineNode {
  id: string;
  title: string;
  note: string;
}

interface ChapterOutlinePanelProps {
  chapter: Chapter;
  onUpdateOutline: (outline: string) => void;
  onClose: () => void;
}

function parseOutlineNodes(outline: string): OutlineNode[] {
  if (!outline || !outline.trim()) return [];
  try {
    const parsed = JSON.parse(outline);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Plain text fallback: split by lines
    return outline
      .split("\n")
      .filter((line) => line.trim())
      .map((line, i) => ({
        id: `node-${i}`,
        title: line.trim(),
        note: "",
      }));
  }
  return [];
}

function serializeNodes(nodes: OutlineNode[]): string {
  return JSON.stringify(nodes);
}

export default function ChapterOutlinePanel({
  chapter,
  onUpdateOutline,
  onClose,
}: ChapterOutlinePanelProps) {
  const [nodes, setNodes] = useState<OutlineNode[]>(() =>
    parseOutlineNodes(chapter.outline)
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    nodes[0]?.id ?? null
  );
  const [quickJot, setQuickJot] = useState("");

  const saveNodes = useCallback(
    (updated: OutlineNode[]) => {
      setNodes(updated);
      onUpdateOutline(serializeNodes(updated));
    },
    [onUpdateOutline]
  );

  const handleAddNode = useCallback(() => {
    if (!quickJot.trim()) return;
    const newNode: OutlineNode = {
      id: `node-${Date.now()}`,
      title: quickJot.trim(),
      note: "",
    };
    const updated = [...nodes, newNode];
    saveNodes(updated);
    setQuickJot("");
    setActiveNodeId(newNode.id);
  }, [quickJot, nodes, saveNodes]);

  const handleUpdateNote = useCallback(
    (nodeId: string, note: string) => {
      const updated = nodes.map((n) =>
        n.id === nodeId ? { ...n, note } : n
      );
      saveNodes(updated);
    },
    [nodes, saveNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const updated = nodes.filter((n) => n.id !== nodeId);
      saveNodes(updated);
      if (activeNodeId === nodeId) {
        setActiveNodeId(updated[0]?.id ?? null);
      }
    },
    [nodes, activeNodeId, saveNodes]
  );

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-4 bottom-32 right-4 w-72 rounded-2xl bg-paper/[0.02] border border-paper/5 backdrop-blur-2xl shadow-2xl p-5 flex flex-col z-40"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-amber/60">
          Chapter Outline
        </h3>
        <button
          onClick={onClose}
          className="text-paper/30 hover:text-paper transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Timeline nodes */}
      <div className="flex-1 overflow-y-auto no-scrollbar font-body text-sm text-paper/60 space-y-4">
        {nodes.length === 0 && (
          <p className="text-[12px] text-paper/30 text-center py-8">
            No outline yet. Jot down scene beats below.
          </p>
        )}
        {nodes.map((node) => {
          const isActive = node.id === activeNodeId;
          return (
            <div
              key={node.id}
              className={`pl-4 relative cursor-pointer group ${
                isActive ? "border-l border-amber/30" : "border-l border-paper/10"
              }`}
              onClick={() => setActiveNodeId(node.id)}
            >
              {/* Timeline dot */}
              <div
                className={`absolute w-2 h-2 rounded-full -left-[4.5px] top-1.5 transition-all ${
                  isActive
                    ? "bg-amber shadow-[0_0_10px_rgba(200,150,60,0.8)]"
                    : "bg-paper/20 group-hover:bg-paper/40"
                }`}
              />

              <div className="flex items-start justify-between">
                <p className={`transition-colors ${
                  isActive ? "text-amber/90 font-medium" : "text-paper/80"
                }`}>
                  {node.title}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-paper/30 hover:text-rose transition-all shrink-0 ml-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Editable note */}
              {isActive && (
                <textarea
                  value={node.note}
                  onChange={(e) => handleUpdateNote(node.id, e.target.value)}
                  className="w-full bg-transparent text-[12px] text-paper/40 mt-1 outline-none resize-none placeholder:text-paper/20"
                  placeholder="Add a note..."
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {!isActive && node.note && (
                <p className="text-[12px] text-paper/40 mt-1 line-clamp-1">{node.note}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick jot */}
      <div className="mt-4">
        <textarea
          value={quickJot}
          onChange={(e) => setQuickJot(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddNode();
            }
          }}
          className="w-full h-20 bg-paper/[0.03] border border-paper/10 rounded-lg p-3 text-[13px] text-paper/80 outline-none focus:border-amber/40 resize-none font-body"
          placeholder="Quick jot... (Enter to add)"
        />
      </div>
    </motion.div>
  );
}
