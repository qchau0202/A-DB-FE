import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  apiLogin,
  apiRegister,
  getProfileByUserId,
  type AuthSession,
  type BackendUser,
} from "@/services/mainServices"

export interface User {
  id: string
  email: string
  name: string
  initials: string
  avatar?: string
  bio?: string
  departmentId?: number | null
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const navigate = useNavigate()

  const buildUserFromBackend = (backendUser: BackendUser): User => {
    const email = backendUser.email
    // Use display_name from user_metadata, fall back to username, then email prefix
    const nameFromBackend =
      (backendUser.user_metadata as any)?.display_name ||
      (backendUser.user_metadata as any)?.username ||
      backendUser.username ||
      email?.split("@")[0] ||
      "Student"

    const initials =
      nameFromBackend
        .split(" ")
        .filter(Boolean)
        .map((p: string) => p.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "U"

    const avatar = backendUser.user_metadata?.avatar_url

    return {
      id: backendUser.id,
      email,
      name: nameFromBackend,
      initials,
      avatar,
    }
  }

  // Load user & session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("unicircle_user")
    const storedSession = localStorage.getItem("unicircle_session")

    let parsedUser: User | null = null
    let parsedSession: AuthSession | null = null

    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
      } catch {
        localStorage.removeItem("unicircle_user")
      }
    }

    if (storedSession) {
      try {
        parsedSession = JSON.parse(storedSession)
        setSession(parsedSession)
      } catch {
        localStorage.removeItem("unicircle_session")
      }
    }

    // Validate token on load - if we have a session, verify it's still valid
    const validateSession = async () => {
      // If we have user but no session, clear the user (incomplete auth state)
      if (parsedUser?.id && !parsedSession?.access_token) {
        console.log("[Auth] User exists but no session, clearing auth state")
        localStorage.removeItem("unicircle_user")
        localStorage.removeItem("unicircle_session")
        setUser(null)
        setSession(null)
        return
      }
      
      if (parsedSession?.access_token && parsedUser?.id) {
        try {
          // Try to fetch profile - this will fail with 401 if token is expired
          await getProfileByUserId(parsedUser.id, parsedSession.access_token)
          console.log("[Auth] Session validated successfully")
        } catch (error: any) {
          // If we get 401, the session is expired
          if (error?.message?.includes("401") || error?.message?.includes("403")) {
            console.log("[Auth] Session expired, logging out")
            toast.error("Your session has expired. Please log in again.")
            // Clear stored data
            localStorage.removeItem("unicircle_user")
            localStorage.removeItem("unicircle_session")
            setUser(null)
            setSession(null)
            navigate("/auth")
          }
        }
      }
    }
    
    validateSession()

  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await apiLogin(email, password)
      const mappedUser = buildUserFromBackend(result.user)

      setUser(mappedUser)
      setSession(result.session)
      localStorage.setItem("unicircle_user", JSON.stringify(mappedUser))
      localStorage.setItem("unicircle_session", JSON.stringify(result.session))

    return true
    } catch (error) {
      console.error("Login failed:", error)
      return false
    }
  }

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      // Use real backend register; backend derives student code from email.
      await apiRegister(name, email, password)

      // After successful registration, log the user in to obtain tokens & user data.
      const loggedIn = await login(email, password)
      return loggedIn
    } catch (error) {
      console.error("Register failed:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    setSession(null)
    localStorage.removeItem("unicircle_user")
    localStorage.removeItem("unicircle_session")

    navigate("/auth")
  }

  // Listen for 401/403 unauthorized events from API calls
  useEffect(() => {
    // Small delay to allow initial session validation to complete first
    const timer = setTimeout(() => {
      const handleUnauthorized = (event: CustomEvent) => {
        // Only logout if we're actually authenticated (prevents race conditions)
        if (session?.access_token) {
          toast.error(event.detail?.message || "Session expired. Please log in again.")
          logout()
        }
      }
      
      window.addEventListener('api:unauthorized' as any, handleUnauthorized as any)
      
      // Cleanup function
      return () => {
        window.removeEventListener('api:unauthorized' as any, handleUnauthorized as any)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [logout, session])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: session?.access_token ?? null,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

