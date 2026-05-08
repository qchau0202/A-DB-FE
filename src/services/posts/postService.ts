// Posts service - matches /api/posts/* routes
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const POSTS_BASE_URL = `${API_BASE_URL}/posts`

export interface ContentBlock {
  type: 'text' | 'image' | 'code' | 'poll'
  data: unknown
}

export interface Post {
  _id: string
  author_id: string
  title?: string
  content_blocks: ContentBlock[]
  image_urls?: string[]
  tags?: string[]
  is_announcement?: boolean
  visibility?: 'public' | 'department' | 'private'
  department_id?: number
  view_count?: number
  reactions?: { like: number; insightful: number; celebrate: number; curious: number }
  comment_count?: number
  createdAt?: string
  updatedAt?: string
}

export interface CreatePostPayload {
  title?: string
  content_blocks: ContentBlock[]
  image_urls?: string[]
  tags?: string[]
  is_announcement?: boolean
  visibility?: 'public' | 'department' | 'private'
  department_id?: number
}

export interface UpdatePostPayload {
  title?: string
  content_blocks?: ContentBlock[]
  image_urls?: string[]
  tags?: string[]
  is_announcement?: boolean
  visibility?: 'public' | 'department' | 'private'
  department_id?: number
}

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
})

// Event name for unauthorized access
export const UNAUTHORIZED_EVENT = 'api:unauthorized'

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    // Check for 401/403 - emit event for auth context to handle logout
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { 
        detail: { message: data.message || 'Session expired. Please log in again.' }
      }))
    }
    throw new Error(data.message || `HTTP ${response.status} - Request failed`)
  }
  return data as T
}

// Create post
export async function createPost(payload: CreatePostPayload, accessToken: string): Promise<Post> {
  const res = await fetch(`${POSTS_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ post: Post }>(res)
  return data.post
}

// Get latest posts (public feed)
export async function getLatestPosts(limit = 20, skip = 0): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/feed/latest?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get popular posts (sorted by engagement)
export async function getPopularPosts(limit = 20, skip = 0): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/feed/popular?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get active posts (sorted by recent activity)
export async function getActivePosts(limit = 20, skip = 0): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/feed/active?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get announcements
export async function getAnnouncements(limit = 10): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/feed/announcements?limit=${limit}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get posts by author
export async function getPostsByAuthor(authorId: string, limit = 20, skip = 0): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/author/${authorId}?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get posts by tags
export async function getPostsByTags(tags: string[], limit = 20, skip = 0): Promise<Post[]> {
  const tagsParam = tags.join(',')
  const res = await fetch(`${POSTS_BASE_URL}/feed/tags?tags=${tagsParam}&limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Search posts
export async function searchPosts(query: string, limit = 20): Promise<Post[]> {
  const res = await fetch(`${POSTS_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  const data = await handleResponse<{ posts: Post[] }>(res)
  return data.posts
}

// Get post by ID
export async function getPostById(id: string): Promise<Post> {
  const res = await fetch(`${POSTS_BASE_URL}/${id}`)
  const data = await handleResponse<{ post: Post }>(res)
  return data.post
}

// Update post
export async function updatePost(id: string, payload: UpdatePostPayload, accessToken: string): Promise<Post> {
  const res = await fetch(`${POSTS_BASE_URL}/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ post: Post }>(res)
  return data.post
}

// Delete post
export async function deletePost(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${POSTS_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}

// Add reaction to post
export async function addPostReaction(id: string, reaction: 'like' | 'insightful' | 'celebrate' | 'curious'): Promise<Post> {
  const res = await fetch(`${POSTS_BASE_URL}/${id}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reaction }),
  })
  const data = await handleResponse<{ post: Post }>(res)
  return data.post
}
