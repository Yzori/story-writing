"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface WorkshopChatPanelProps {
  storyId: string;
  currentUserId: string;
  onClose: () => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export default function WorkshopChatPanel({ storyId, currentUserId, onClose }: WorkshopChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}/chat`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((prev) => [...prev, json.data]);
        setInput("");
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 340, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col"
    >
      <div className="min-w-[340px] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h3 className="text-sm font-medium text-paper">Workshop Chat</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-ghost hover:text-text-secondary transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="10" y2="10" />
              <line x1="10" y1="4" x2="4" y2="10" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-text-ghost/30 border-t-teal rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-ghost mx-auto mb-3">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <p className="text-text-ghost text-[12px]">No messages yet.</p>
              <p className="text-text-ghost text-[11px] mt-1">Start a conversation with your team.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user.id === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-text-ghost mb-1 flex items-center gap-1.5">
                    <span className="font-medium">{isMe ? "You" : msg.user.displayName || "Unknown"}</span>
                    <span>{relativeTime(msg.createdAt)}</span>
                  </span>
                  <div className={`px-3.5 py-2.5 rounded-2xl max-w-[85%] text-[13px] leading-relaxed ${
                    isMe
                      ? "bg-teal/10 border border-teal/20 text-paper rounded-br-md"
                      : "bg-elevated border border-border-subtle text-text rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-surface/50">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your team..."
              maxLength={2000}
              className="flex-1 bg-elevated border border-border rounded-xl py-2.5 px-4 text-[13px] text-text outline-none focus:border-teal/30 transition-colors placeholder:text-text-ghost"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-teal/10 text-teal hover:bg-teal hover:text-void transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </motion.aside>
  );
}
