// Documents service - matches /api/documents/* routes
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const DOCUMENTS_BASE_URL = `${API_BASE_URL}/documents`

export interface Document {
  _id: string
  author_id: string
  editors?: string[]
  title: string
  body: string
  description?: string
  parent_doc_id?: string | null
  category_tags?: string[]
  version?: number
  is_published?: boolean
  view_count?: number
  downloads?: number
  reactions?: { like: number; insightful: number }
  comment_count?: number
  image_url?: string
  external_url?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateDocumentPayload {
  title: string
  body: string
  parent_doc_id?: string
  category_tags?: string[]
  is_published?: boolean
}

export interface UpdateDocumentPayload {
  title?: string
  body?: string
  parent_doc_id?: string | null
  category_tags?: string[]
  is_published?: boolean
  expected_version: number
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

// Create document
export async function createDocument(payload: CreateDocumentPayload, accessToken: string): Promise<Document> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ document: Document }>(res)
  return data.document
}

// Get published documents feed
export async function getPublishedDocuments(limit = 20, skip = 0): Promise<Document[]> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/feed?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ documents: Document[] }>(res)
  return data.documents
}

// Get documents by author
export async function getDocumentsByAuthor(authorId: string, includeDrafts = false, limit = 20, skip = 0): Promise<Document[]> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/author/${authorId}?includeDrafts=${includeDrafts}&limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ documents: Document[] }>(res)
  return data.documents
}

// Get documents by category tags
export async function getDocumentsByTags(tags: string[], limit = 20, skip = 0): Promise<Document[]> {
  const tagsParam = tags.join(',')
  const res = await fetch(`${DOCUMENTS_BASE_URL}/tags?tags=${tagsParam}&limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ documents: Document[] }>(res)
  return data.documents
}

// Get child documents (hierarchical)
export async function getChildDocuments(parentId: string, limit = 20, skip = 0): Promise<Document[]> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/${parentId}/children?limit=${limit}&skip=${skip}`)
  const data = await handleResponse<{ documents: Document[] }>(res)
  return data.documents
}

// Search documents
export async function searchDocuments(query: string, limit = 20): Promise<Document[]> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  const data = await handleResponse<{ documents: Document[] }>(res)
  return data.documents
}

// Get document by ID
export async function getDocumentById(id: string): Promise<Document> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/${id}`)
  const data = await handleResponse<{ document: Document }>(res)
  return data.document
}

// Update document with optimistic locking
export async function updateDocument(id: string, payload: UpdateDocumentPayload, accessToken: string): Promise<Document> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ document: Document }>(res)
  return data.document
}

// Delete document
export async function deleteDocument(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}

// Add reaction to document
export async function addDocumentReaction(id: string, reaction: 'like' | 'insightful'): Promise<Document> {
  const res = await fetch(`${DOCUMENTS_BASE_URL}/${id}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reaction }),
  })
  const data = await handleResponse<{ document: Document }>(res)
  return data.document
}
