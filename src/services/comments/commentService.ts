// Comments service - matches /api/comments/* routes
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const COMMENTS_BASE_URL = `${API_BASE_URL}/comments`

export interface Comment {
  _id: string
  target_id: string
  author_id: string
  parent_comment_id?: string | null
  content: string
  likes_count?: number
  is_edited?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateCommentPayload {
  target_id: string
  parent_comment_id?: string
  content: string
}

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
})

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent('api:unauthorized', { 
        detail: { message: data.message || 'Session expired. Please log in again.' }
      }))
    }
    throw new Error(data.message || `HTTP ${response.status} - Request failed`)
  }
  return data as T
}

// Create comment
export async function createComment(payload: CreateCommentPayload, accessToken: string): Promise<Comment> {
  const res = await fetch(`${COMMENTS_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ comment: Comment }>(res)
  return data.comment
}

// Get comments for a post (top-level only)
export async function getCommentsByPost(postId: string, limit = 20, skip = 0): Promise<Comment[]> {
  const res = await fetch(`${COMMENTS_BASE_URL}/post/${postId}?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ comments: Comment[] }>(res)
  return data.comments
}

// Get all comments for a target (including replies, or filter by parent)
export async function getCommentsByTarget(targetId: string, parentId?: string, limit = 20, skip = 0): Promise<Comment[]> {
  const url = parentId
    ? `${COMMENTS_BASE_URL}/target/${targetId}?parent_id=${parentId}&limit=${limit}&skip=${skip}`
    : `${COMMENTS_BASE_URL}/target/${targetId}?limit=${limit}&skip=${skip}`
  const res = await fetch(url)
  const data = await handleResponse<{ comments: Comment[] }>(res)
  return data.comments
}

// Get replies to a comment
export async function getCommentReplies(commentId: string, limit = 20, skip = 0): Promise<Comment[]> {
  const res = await fetch(`${COMMENTS_BASE_URL}/${commentId}/replies?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ replies: Comment[] }>(res)
  return data.replies
}

// Get comment by ID
export async function getCommentById(id: string): Promise<Comment> {
  const res = await fetch(`${COMMENTS_BASE_URL}/${id}`)
  const data = await handleResponse<{ comment: Comment }>(res)
  return data.comment
}

// Update comment
export async function updateComment(id: string, content: string, accessToken: string): Promise<Comment> {
  const res = await fetch(`${COMMENTS_BASE_URL}/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content }),
  })
  const data = await handleResponse<{ comment: Comment }>(res)
  return data.comment
}

// Delete comment (soft delete)
export async function deleteComment(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${COMMENTS_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}
