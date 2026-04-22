"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fetchComments, postComment, toggleUpvote, deleteComment, type Comment } from "../../lib/comments";

interface Props {
  topicId: number;
  currentUserId?: string;
  currentUserName?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TopicComments({ topicId, currentUserId, currentUserName }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvoting, setUpvoting] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());

  // Load comments whenever topic changes
  useEffect(() => {
    setLoading(true);
    seenIds.current.clear();
    fetchComments(topicId, currentUserId).then((data) => {
      data.forEach((c) => seenIds.current.add(c.id));
      setComments(data);
      setLoading(false);
    });
  }, [topicId, currentUserId]);

  // Realtime subscription — fires for every user viewing this topic
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`topic-comments-${topicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "topic_comments", filter: `topic_id=eq.${topicId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          if (seenIds.current.has(row.id as string)) return;
          seenIds.current.add(row.id as string);
          setComments((prev) => [
            {
              id: row.id as string,
              topicId: row.topic_id as number,
              userId: row.user_id as string,
              userName: row.user_name as string,
              content: row.content as string,
              upvotes: (row.upvotes as number) ?? 0,
              createdAt: row.created_at as string,
              userUpvoted: false,
            },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "topic_comments", filter: `topic_id=eq.${topicId}` },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          setComments((prev) =>
            prev.map((c) => (c.id === row.id ? { ...c, upvotes: row.upvotes as number } : c))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "topic_comments", filter: `topic_id=eq.${topicId}` },
        (payload: { old: Record<string, unknown> }) => {
          const id = payload.old.id as string;
          setComments((prev) => prev.filter((c) => c.id !== id));
          seenIds.current.delete(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId]);

  const handleSubmit = async () => {
    if (!text.trim() || !currentUserId || submitting) return;
    setSubmitting(true);
    const comment = await postComment(topicId, currentUserId, currentUserName || "Anonymous", text.trim());
    if (comment) {
      seenIds.current.add(comment.id);
      setComments((prev) => [comment, ...prev]);
      setText("");
    }
    setSubmitting(false);
  };

  const handleUpvote = async (comment: Comment) => {
    if (!currentUserId || upvoting.has(comment.id)) return;

    // Optimistic update — feels instant for the user clicking
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, upvotes: c.userUpvoted ? c.upvotes - 1 : c.upvotes + 1, userUpvoted: !c.userUpvoted }
          : c
      )
    );

    setUpvoting((prev) => new Set([...prev, comment.id]));
    const result = await toggleUpvote(comment.id, currentUserId);
    setUpvoting((prev) => { const n = new Set(prev); n.delete(comment.id); return n; });

    if (result) {
      // Sync with DB result (handles race conditions)
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, upvotes: result.newCount, userUpvoted: result.upvoted } : c
        )
      );
    } else {
      // Revert on failure
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, upvotes: comment.upvotes, userUpvoted: comment.userUpvoted } : c
        )
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    // Remove from UI immediately — don't wait for DB round-trip
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    seenIds.current.delete(commentId);
    await deleteComment(commentId);
  };

  return (
    <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 mb-5">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Comments
        {!loading && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            {comments.length}
          </span>
        )}
      </h3>

      {/* Comment input */}
      {currentUserId ? (
        <div className="flex gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#7a12fa,#b614ef)" }}
          >
            {(currentUserName || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
              placeholder="Add a comment… (Ctrl+Enter to post)"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
            />
            <div className="flex justify-end mt-1.5">
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(90deg,#7a12fa,#b614ef)" }}
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-5 italic">
          Log in to leave a comment.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg,#7a12fa,#b614ef)" }}
              >
                {comment.userName.charAt(0).toUpperCase()}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{comment.userName}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                  {/* Upvote button */}
                  <button
                    onClick={() => handleUpvote(comment)}
                    disabled={!currentUserId || upvoting.has(comment.id)}
                    title={comment.userUpvoted ? "Remove upvote" : "Upvote — mark as helpful"}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      comment.userUpvoted
                        ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                        : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400"
                    } disabled:cursor-default`}
                  >
                    <svg
                      width="12"
                      height="12"
                      fill={comment.userUpvoted ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>{comment.upvotes > 0 ? comment.upvotes : "Helpful"}</span>
                  </button>

                  {/* Delete (own comment only) */}
                  {currentUserId === comment.userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
