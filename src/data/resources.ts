import type { BackendResource, MediaFile } from "@/services/mainServices"

export interface ResourceItem {
  id: string
  title: string
  summary: string
  courseCode: string
  courseName: string
  tags: string[]
  type: "url" | "document"
  url: string
  fileName?: string
  contributor: string
  uploadedAt: string
  votes: number
  media?: {
    files: MediaFile[]
    images: MediaFile[]
    videos: MediaFile[]
    urls: MediaFile[]
  }
}

// Map backend resource to frontend ResourceItem
export function mapBackendResourceToItem(backend: BackendResource): ResourceItem {
  try {
    // Get primary file URL from media
    let primaryUrl = ""
    let fileName: string | undefined

    // Check files array first (contains all files including PDFs, DOCX, etc.)
    if (backend.media?.files && backend.media.files.length > 0) {
      primaryUrl = backend.media.files[0].url || ""
      fileName = backend.media.files[0].originalName
    } else if (backend.media?.images && backend.media.images.length > 0) {
      primaryUrl = backend.media.images[0].url || ""
      fileName = backend.media.images[0].originalName
    } else if (backend.media?.videos && backend.media.videos.length > 0) {
      primaryUrl = backend.media.videos[0].url || ""
      fileName = backend.media.videos[0].originalName
    } else if (backend.media?.urls && backend.media.urls.length > 0) {
      primaryUrl = backend.media.urls[0].url || ""
    }

    // Format date
    let uploadedAt = "Recently"
    try {
      const uploadedDate = new Date(backend.created_at)
      const now = new Date()
      const diffMs = now.getTime() - uploadedDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      uploadedAt =
        diffDays === 0
          ? "Today"
          : diffDays === 1
          ? "1 day ago"
          : diffDays < 7
          ? `${diffDays} days ago`
          : diffDays < 30
          ? `${Math.floor(diffDays / 7)} weeks ago`
          : `${Math.floor(diffDays / 30)} months ago`
    } catch (dateError) {
      console.warn("Failed to parse date:", backend.created_at, dateError)
    }

    return {
      id: backend.id || "",
      title: backend.title || "Untitled",
      summary: backend.description || "",
      courseCode: backend.course_code || "",
      courseName: "", // Will need to be fetched separately or added to backend
      tags: Array.isArray(backend.hashtags) ? backend.hashtags : [],
      type: backend.resource_type === "URL" ? "url" : "document",
      url: primaryUrl,
      fileName,
      contributor: backend.owner?.display_name || backend.owner?.student_code || "Unknown",
      uploadedAt,
      votes: backend.upvote_count || 0,
      media: backend.media || {
        files: [],
        images: [],
        videos: [],
        urls: [],
      },
    }
  } catch (error) {
    console.error("Error mapping backend resource:", error, backend)
    // Return a safe fallback
    return {
      id: backend.id || "unknown",
      title: backend.title || "Untitled",
      summary: backend.description || "",
      courseCode: backend.course_code || "",
      courseName: "",
      tags: [],
      type: "document",
      url: "",
      fileName: undefined,
      contributor: "Unknown",
      uploadedAt: "Recently",
      votes: 0,
      media: {
        files: [],
        images: [],
        videos: [],
        urls: [],
      },
    }
  }
}

export const resourceCourses = [
  { code: "503045", name: "Software Engineering" },
  { code: "503012", name: "Introduction to Artificial Intelligence" },
  { code: "502201", name: "Microeconomics" },
  { code: "504070", name: "Data Structures" },
  { code: "503001", name: "Database Systems" },
  { code: "502301", name: "Corporate Finance" },
  { code: "501001", name: "Statistics" },
  { code: "503020", name: "Web Development" },
  { code: "503030", name: "Mobile Application Development" },
  { code: "502101", name: "Business Management" },
]

export const resourceTags = [
  "lecture-notes",
  "cheat-sheet",
  "past-paper",
  "diagram",
  "video",
  "summary",
  "assignment",
  "lab-guide",
]

// Load from localStorage or use empty array
function loadResourcesFromStorage(): ResourceItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("unicircle_resources")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load resources from localStorage:", error)
  }
  return []
}

export const resourceItems: ResourceItem[] = loadResourcesFromStorage()
