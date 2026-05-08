export interface ProfileStat {
  id: string
  label: string
  value: string
  helper: string
}

export interface ProfileActivity {
  id: string
  type: "collection" | "resource" | "feed"
  title: string
  meta: string
  date: string
}

export interface SocialLink {
  platform: string
  url: string
  label?: string
}

// Shape of profile data used in the UI (mapped from backend profile & auth user)
export interface ProfileInfo {
  id: string
  userId: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  departmentId: number | null
  followerCount: number
  following: string[]
  createdAt: string
  updatedAt: string | null
  email: string
}

export const emptyProfileInfo: ProfileInfo = {
  id: "",
  userId: "",
  username: "",
  displayName: "",
  bio: "",
  avatarUrl: "",
  departmentId: null,
  followerCount: 0,
  following: [],
  createdAt: "",
  updatedAt: "",
  email: "",
}

// Stats and activity will later be wired to real services.
// For now they default to empty (no fake test data).
export const profileStats: ProfileStat[] = []
export const profileActivities: ProfileActivity[] = []
