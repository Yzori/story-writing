export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface CommentThread {
  id: string;
  comments: Comment[];
  resolved: boolean;
  /** The highlighted text this thread is anchored to */
  quotedText: string;
  createdAt: number;
}

export function createCommentThread(
  quotedText: string,
  initialComment: string,
  author: string = "You"
): CommentThread {
  const threadId = crypto.randomUUID();
  return {
    id: threadId,
    quotedText,
    resolved: false,
    createdAt: Date.now(),
    comments: [
      {
        id: crypto.randomUUID(),
        text: initialComment,
        author,
        createdAt: Date.now(),
      },
    ],
  };
}

export function addReply(
  thread: CommentThread,
  text: string,
  author: string = "You"
): CommentThread {
  return {
    ...thread,
    comments: [
      ...thread.comments,
      {
        id: crypto.randomUUID(),
        text,
        author,
        createdAt: Date.now(),
      },
    ],
  };
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
