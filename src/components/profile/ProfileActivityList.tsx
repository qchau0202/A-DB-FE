import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPostsByAuthor, getQuickiesByAuthor, getDocumentsByAuthor, type Post, type Quickie, type Document } from "@/services/mainServices"
import { FileText, Image, BookOpen, MessageSquare } from "lucide-react"

interface ProfileActivityListProps {
  userId: string
}

interface ActivityItem {
  id: string
  type: "post" | "quickie" | "document"
  title: string
  date: string
  meta: string
}

export function ProfileActivityList({ userId }: ProfileActivityListProps) {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      if (!userId) return
      
      try {
        setLoading(true)
        const [posts, quickies, docs] = await Promise.all([
          getPostsByAuthor(userId, 5, 0).catch(() => [] as Post[]),
          getQuickiesByAuthor(userId, 5, 0).catch(() => [] as Quickie[]),
          getDocumentsByAuthor(userId, true, 5, 0).catch(() => [] as Document[]),
        ])

        const items: ActivityItem[] = [
          ...posts.map((p: Post) => ({
            id: p._id,
            type: "post" as const,
            title: p.title || "Untitled Post",
            date: new Date(p.createdAt || Date.now()).toLocaleDateString(),
            meta: `${p.reactions?.like || 0} likes · ${p.comment_count || 0} comments`,
          })),
          ...quickies.map((q: Quickie) => ({
            id: q._id,
            type: "quickie" as const,
            title: q.caption || "Quickie",
            date: new Date(q.createdAt || Date.now()).toLocaleDateString(),
            meta: `${(q.reactions as { like?: number })?.like || 0} reactions`,
          })),
          ...docs.map((d: Document) => ({
            id: d._id,
            type: "document" as const,
            title: d.title,
            date: new Date(d.createdAt || Date.now()).toLocaleDateString(),
            meta: `${d.view_count || 0} views · ${d.reactions?.like || 0} likes`,
          })),
        ]

        // Sort by date (newest first)
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        setActivities(items.slice(0, 10))
      } catch (error) {
        console.error("Failed to fetch activities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [userId])

  const getIcon = (type: string) => {
    switch (type) {
      case "post":
        return <MessageSquare className="h-3 w-3" />
      case "quickie":
        return <Image className="h-3 w-3" />
      case "document":
        return <BookOpen className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const handleClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case "post":
        navigate(`/feed/${activity.id}`)
        break
      case "document":
        navigate(`/document/${activity.id}`)
        break
      // Quickies don't have a detail page yet
    }
  }

  return (
    <Card className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
            <p className="text-xs text-gray-400">
              Posts, quickies, and documents from this user.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading activity...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleClick(activity)}
                className="flex flex-col gap-1 rounded-lg border border-[#2a2a2a] bg-[#252525] px-3 py-2 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#036aff]/20 text-[#036aff] border-none text-[10px] font-semibold capitalize flex items-center gap-1">
                    {getIcon(activity.type)}
                    {activity.type}
                  </Badge>
                  <span className="text-xs text-gray-500">{activity.date}</span>
                </div>
                <div className="text-sm font-semibold text-white line-clamp-1">{activity.title}</div>
                <div className="text-xs text-gray-400">{activity.meta}</div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}


