const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"

const PROFILE_BASE_URL = `${API_BASE_URL}/profile`

export interface BackendProfile {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  department_id: number | null
  follower_count: number
  following: string[]
  created_at: string
  updated_at: string | null
}

export interface UpdateProfilePayload {
  username?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  department_id?: number
}

export interface CommunityProfile extends BackendProfile {}

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
})

async function handleProfileResponse(response: Response): Promise<BackendProfile> {
  const raw = await response.text()

  let data: any
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    const snippet = raw?.slice(0, 120) || "No response body"
    throw new Error(
      `Profile service returned a non-JSON response (HTTP ${response.status}). First bytes: ${snippet}`,
    )
  }

  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || `HTTP ${response.status} – Failed to load profile`
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent('api:unauthorized', { 
        detail: { message: message || 'Session expired. Please log in again.' }
      }))
    }
    throw new Error(message)
  }

  // Backend returns { profile } or direct profile object
  return (data.profile || data) as BackendProfile
}

export async function getProfileById(
  id: string,
  accessToken: string,
): Promise<BackendProfile> {
  const res = await fetch(`${PROFILE_BASE_URL}/${id}`, {
    headers: authHeaders(accessToken),
  })
  return handleProfileResponse(res)
}

export async function getProfileByUserId(
  userId: string,
  accessToken?: string,
): Promise<BackendProfile> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${PROFILE_BASE_URL}/by-user/${userId}`, { headers })
  return handleProfileResponse(res)
}

export async function getProfilesByDepartment(departmentId: number): Promise<CommunityProfile[]> {
  const res = await fetch(`${PROFILE_BASE_URL}/department/${departmentId}`)
  const raw = await res.text()

  let data: any
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error(`Profile service returned a non-JSON response (HTTP ${res.status})`)
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status} – Failed to load department profiles`)
  }

  return (data.profiles || []) as CommunityProfile[]
}

export async function updateProfile(
  payload: UpdateProfilePayload,
  accessToken: string,
): Promise<BackendProfile> {
  const res = await fetch(`${PROFILE_BASE_URL}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  return handleProfileResponse(res)
}

export async function createProfile(
  payload: UpdateProfilePayload,
  accessToken: string,
): Promise<BackendProfile> {
  const res = await fetch(`${PROFILE_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })

  return handleProfileResponse(res)
}

export async function followUser(
  userId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${PROFILE_BASE_URL}/follow/${userId}`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
  if (!res.ok) {
    const text = await res.text()
    let errorMessage = text || "Failed to follow user"
    try {
      const errorData = JSON.parse(text)
      errorMessage = errorData.message || errorMessage
    } catch {
      // Not JSON, use text as is
    }
    throw new Error(errorMessage)
  }
}

export async function unfollowUser(
  userId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${PROFILE_BASE_URL}/unfollow/${userId}`, {
    method: "POST",
    headers: authHeaders(accessToken),
  })
  if (!res.ok) {
    const text = await res.text()
    let errorMessage = text || "Failed to unfollow user"
    try {
      const errorData = JSON.parse(text)
      errorMessage = errorData.message || errorMessage
    } catch {
      // Not JSON, use text as is
    }
    throw new Error(errorMessage)
  }
}

export async function checkFollowStatus(
  targetUserId: string,
  accessToken: string,
  currentUserId: string,
): Promise<boolean> {
  const res = await fetch(`${PROFILE_BASE_URL}/${currentUserId}/is-following/${targetUserId}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) {
    return false
  }
  const data = await res.json()
  return data.isFollowing || false
}


