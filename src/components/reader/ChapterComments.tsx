"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/shared/Toast";

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

const PAGE_SIZE = 20;

export default function ChapterComments({ storyId, chapterId }: ChapterCommentsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setFetchError(false);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/chapters/${chapterId}/comments?page=${pageNum}&limit=${PAGE_SIZE}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const json = await res.json();
        const newComments = json.data || [];
        setComments((prev) => append ? [...prev, ...newComments] : newComments);
        setHasMore(newComments.length === PAGE_SIZE);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFetchError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [storyId, chapterId]);

  useEffect(() => {
    setPage(1);
    fetchComments(1);
    return () => { abortRef.current?.abort(); };
  }, [fetchComments]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

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
        toast("Comment posted", "success");
      } else if (res.status === 429) {
        toast("Slow down \u2014 try again in a moment", "error");
      } else {
        const json = await res.json().catch(() => null);
        toast(json?.error?.message || "Couldn\u2019t post comment", "error");
      }
    } catch {
      toast("Network error. Check your connection.", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div id="chapter-comments" className="max-w-2xl mx-auto px-6 py-10 border-t border-border">
      <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost mb-6 block">
        Comments {comments.length > 0 && `(${comments.length})`}
      </span>

      {/* Post comment form */}
      {session?.user ? (
        <div className="mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Leave a comment..."
            rows={3}
            maxLength={2000}
            className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-text text-[13px] font-reading placeholder:text-text-ghost resize-none focus:outline-none focus:border-amber/30 transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-text-ghost">
              {content.length > 0 && `${content.length}/2,000`}
            </span>
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
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface/40 border border-border-subtle rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-elevated" />
                <div className="h-3 w-24 bg-elevated rounded" />
                <div className="h-3 w-12 bg-elevated rounded ml-auto" />
              </div>
              <div className="pl-10 space-y-2">
                <div className="h-3 w-full bg-elevated rounded" />
                <div className="h-3 w-3/4 bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-8">
          <p className="text-text-ghost text-[13px] mb-3">
            Couldn&apos;t load comments.
          </p>
          <button
            onClick={() => fetchComments(1)}
            className="text-amber text-[13px] font-medium hover:text-amber-light transition-colors"
          >
            Try again
          </button>
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

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-amber text-[13px] font-medium hover:text-amber-light transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-3.5 h-3.5 border-2 border-amber/30 border-t-amber rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Load more comments"
                )}
              </button>
            </div>
          )}
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
