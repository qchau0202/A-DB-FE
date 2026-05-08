// Quickies service - matches /api/quickies/* routes
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const QUICKIES_BASE_URL = `${API_BASE_URL}/quickies`

export interface Quickie {
  _id: string
  author_id: string
  media_url?: string
  media_type?: 'image' | 'video'
  caption?: string
  viewers?: string[]
  reactions?: { like?: number } | number
  notify?: boolean
  createdAt?: string
  expiresAt?: string
}

// Helper to get reaction count
export function getReactionCount(reactions?: { like?: number } | number): number {
  if (typeof reactions === 'number') return reactions
  return reactions?.like || 0
}

export interface CreateQuickiePayload {
  media_url?: string
  media_type?: 'image' | 'video'
  caption?: string
  notify?: boolean
}

export interface UpdateQuickiePayload {
  media_url?: string
  media_type?: 'image' | 'video'
  caption?: string
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

// Create quickie
export async function createQuickie(payload: CreateQuickiePayload, accessToken: string): Promise<Quickie> {
  const res = await fetch(`${QUICKIES_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ quickie: Quickie }>(res)
  return data.quickie
}

// Get quickie by ID (auto-tracks viewer)
export async function getQuickieById(id: string, accessToken?: string): Promise<Quickie> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}`, { headers })
  const data = await handleResponse<{ quickie: Quickie }>(res)
  return data.quickie
}

// Get quickies by author
export async function getQuickiesByAuthor(authorId: string, limit = 20, skip = 0): Promise<Quickie[]> {
  const res = await fetch(`${QUICKIES_BASE_URL}/author/${authorId}?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ quickies: Quickie[] }>(res)
  return data.quickies
}

// Get feed quickies (from users you follow)
export async function getFeedQuickies(accessToken: string, limit = 20, skip = 0): Promise<Quickie[]> {
  const res = await fetch(`${QUICKIES_BASE_URL}/feed/following?limit=${limit}&skip=${skip}`, {
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ quickies: Quickie[] }>(res)
  return data.quickies
}

// Get latest quickies (public feed - all recent)
export async function getLatestQuickies(limit = 20, skip = 0): Promise<Quickie[]> {
  const res = await fetch(`${QUICKIES_BASE_URL}/feed/latest?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ quickies: Quickie[] }>(res)
  return data.quickies
}

// Mark quickie as viewed
export async function viewQuickie(id: string, accessToken: string): Promise<Quickie> {
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}/view`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ quickie: Quickie }>(res)
  return data.quickie
}

// React to quickie
export async function reactToQuickie(id: string, accessToken: string): Promise<Quickie> {
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}/react`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ quickie: Quickie }>(res)
  return data.quickie
}

// Update quickie
export async function updateQuickie(id: string, payload: UpdateQuickiePayload, accessToken: string): Promise<Quickie> {
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ quickie: Quickie }>(res)
  return data.quickie
}

// Delete quickie
export async function deleteQuickie(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}

// Mark quickie as viewed
export async function markQuickieViewed(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${QUICKIES_BASE_URL}/${id}/view`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}
