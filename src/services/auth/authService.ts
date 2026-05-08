const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const AUTH_BASE_URL = `${API_BASE_URL}/auth`

export interface AuthSession {
  access_token: string
  refresh_token: string
}

export interface BackendUser {
  id: string
  email: string
  username?: string
  user_metadata?: {
    full_name?: string
    display_name?: string
    avatar_url?: string
    [key: string]: any
  }
  [key: string]: any
}

export interface LoginResponse {
  message?: string
  session: AuthSession
  user: BackendUser
}

export interface RegisterResponse {
  message?: string
  user: BackendUser
  session?: AuthSession
  profile?: any
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type")
  const isJson = contentType && contentType.includes("application/json")
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      (data && (data.error?.message || data.message)) ||
      `HTTP ${response.status} – Authentication request failed`
    throw new Error(message)
  }

  return data as T
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_BASE_URL}/sign-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  return handleResponse<LoginResponse>(res)
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const res = await fetch(`${AUTH_BASE_URL}/sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      username: name,
      password,
    }),
  })

  return handleResponse<RegisterResponse>(res)
}

export async function apiRefreshToken(
  refreshToken: string,
): Promise<{ session: AuthSession }> {
  const res = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  return handleResponse<{ session: AuthSession }>(res)
}

// Logout endpoint removed on backend; client just clears local state now.