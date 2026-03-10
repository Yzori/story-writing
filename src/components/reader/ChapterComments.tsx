"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface ChapterCommentsProps {
  storyId: string;
  chapterId: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(dateStr).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export default function ChapterComments({ storyId, chapterId }: ChapterCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function fetchComments() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stories/${storyId}/chapters/${chapterId}/comments`
        );
        if (res.ok) {
          const json = await res.json();
          setComments(json.data || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [storyId, chapterId]);

  const handlePost = async () => {
    if (posting || !content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        setComments((prev) => [...prev, json.data]);
        setContent("");
      }
    } catch {
      // silently fail
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 border-t border-border">
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-6 block">
        Comments
      </span>

      {/* Post comment form */}
      {session?.user ? (
        <div className="mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Leave a comment..."
            rows={3}
            className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="px-4 py-2 bg-amber text-void font-semibold text-[12px] rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-surface/60 border border-border-subtle rounded-xl p-5 text-center">
          <p className="text-text-secondary text-[13px]">
            Sign in to leave a comment.
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-surface/60 border border-border-subtle rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber/20 to-amber/5 border border-amber/15 flex items-center justify-center text-amber text-[10px] font-display font-semibold flex-shrink-0 overflow-hidden">
                  {comment.author.avatarUrl ? (
                    <img
                      src={comment.author.avatarUrl}
                      alt={comment.author.displayName || ""}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (comment.author.displayName || "?").charAt(0)
                  )}
                </div>
                <p className="text-paper text-[13px] font-medium flex-1 min-w-0">
                  {comment.author.displayName}
                </p>
                <span className="text-[11px] text-text-ghost flex-shrink-0">
                  {relativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-text-secondary text-[13px] leading-relaxed font-reading whitespace-pre-wrap pl-10">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-text-ghost text-[13px]">
            No comments yet. Be the first to share your thoughts.
          </p>
        </div>
      )}
    </div>
  );
}
