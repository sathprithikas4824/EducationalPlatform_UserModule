import { supabase } from "./supabase";

export interface Comment {
  id: string;
  topicId: number;
  userId: string;
  userName: string;
  content: string;
  upvotes: number;
  createdAt: string;
  userUpvoted: boolean;
}

export async function fetchComments(topicId: number, currentUserId?: string): Promise<Comment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("topic_comments")
    .select("*, comment_upvotes!left(user_id)")
    .eq("topic_id", topicId)
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    upvotes: row.upvotes ?? 0,
    createdAt: row.created_at,
    userUpvoted: currentUserId
      ? (row.comment_upvotes ?? []).some((u: { user_id: string }) => u.user_id === currentUserId)
      : false,
  }));
}

export async function postComment(
  topicId: number,
  userId: string,
  userName: string,
  content: string
): Promise<Comment | null> {
  if (!supabase) return null;
  if (!content.trim() || content.length > 2000) return null;
  const { data, error } = await supabase
    .from("topic_comments")
    .insert({ topic_id: topicId, user_id: userId, user_name: userName, content })
    .select()
    .single();

  if (error || !data) {
    console.error("postComment error:", error);
    return null;
  }
  return {
    id: data.id,
    topicId: data.topic_id,
    userId: data.user_id,
    userName: data.user_name,
    content: data.content,
    upvotes: data.upvotes ?? 0,
    createdAt: data.created_at,
    userUpvoted: false,
  };
}

export async function toggleUpvote(
  commentId: string,
  userId: string
): Promise<{ upvoted: boolean; newCount: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("toggle_comment_upvote", {
    p_comment_id: commentId,
    p_user_id: userId,
  });
  if (error) {
    console.error("toggleUpvote error:", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { upvoted: row.upvoted, newCount: row.new_count };
}

export async function deleteComment(commentId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("topic_comments").delete().eq("id", commentId);
  return !error;
}
