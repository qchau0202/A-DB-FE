const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

export interface TagCategory {
  name: string
  count: number
  type: "post" | "quickie" | "user" | "document" | "snippet"
  trending?: boolean
  departmentId?: number
}

export interface CategoriesResponse {
  tags: TagCategory[]
  trending: TagCategory[]
  popular: TagCategory[]
  posts: TagCategory[]
  quickies: TagCategory[]
  users: TagCategory[]
  documents: TagCategory[]
  snippets: TagCategory[]
  counts?: {
    posts: number
    quickies: number
    documents: number
    snippets: number
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status} - Request failed`)
  }
  return data as T
}

// Fetch all categories with counts
export async function getCategories(): Promise<CategoriesResponse> {
  const res = await fetch(`${API_BASE_URL}/categories`)
  return handleResponse<CategoriesResponse>(res)
}

// Fetch posts by tag
export async function getPostsByTag(tag: string, limit = 20, skip = 0) {
  const res = await fetch(
    `${API_BASE_URL}/posts/feed/tags?tags=${encodeURIComponent(tag)}&limit=${limit}&skip=${skip}`
  )
  return handleResponse<{ posts: any[]; count: number }>(res)
}

// Fetch documents by tag
export async function getDocumentsByTag(tag: string, limit = 20, skip = 0) {
  const res = await fetch(
    `${API_BASE_URL}/documents/tags?tags=${encodeURIComponent(tag)}&limit=${limit}&skip=${skip}`
  )
  return handleResponse<{ documents: any[]; count: number }>(res)
}

// Fetch snippets by tag
export async function getSnippetsByTag(tag: string, limit = 20, skip = 0) {
  const res = await fetch(
    `${API_BASE_URL}/snippets/by-tags?tags=${encodeURIComponent(tag)}&limit=${limit}&skip=${skip}`
  )
  return handleResponse<{ snippets: any[]; total: number }>(res)
}

// Search tags
export async function searchTags(query: string): Promise<TagCategory[]> {
  const res = await fetch(
    `${API_BASE_URL}/categories/search?q=${encodeURIComponent(query)}`
  )
  return handleResponse<{ tags: TagCategory[] }>(res).then((r) => r.tags)
}
