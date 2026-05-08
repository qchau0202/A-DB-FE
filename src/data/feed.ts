export type FeedPrivacy = "public" | "friends"
export type ThreadType = "Q&A" | "Normal"
export type ThreadStatus = "OPEN" | "CLOSED"

export interface FeedMediaItem {
  id: string
  type: "image" | "video"
  url?: string
  thumbColor: string
  label: string
}

export interface FeedComment {
  id: string
  author: string
  initials: string
  text: string
  createdAt: string
  isEdited?: boolean
  parentCommentId?: string | null
  parentAuthor?: string | null
}

export interface FeedPost {
  authorId: string
  id: string
  author: {
    name: string
    studentCode?: string
    initials: string
    isFriend: boolean
  }
  createdAt: string
  privacy: FeedPrivacy
  threadType: ThreadType
  status: ThreadStatus
  isEdited?: boolean
  title: string
  content: string
  eventTag?: string
  media: FeedMediaItem[]
  stats: {
    likes: number
    comments: number
  }
  comments: FeedComment[]
}

// Load from localStorage or use empty array
function loadFeedPostsFromStorage(): FeedPost[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("unicircle_feed_posts")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load feed posts from localStorage:", error)
  }
  return []
}

export const feedPosts: FeedPost[] = loadFeedPostsFromStorage()

export interface FeedFriend {
  id: string
  name: string
  initials: string
  studyFocus: string
  lastActive: string
}

// Load from localStorage or use empty array
function loadFeedFriendsFromStorage(): FeedFriend[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("unicircle_feed_friends")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load feed friends from localStorage:", error)
  }
  return []
}

export const feedFriends: FeedFriend[] = loadFeedFriendsFromStorage()
