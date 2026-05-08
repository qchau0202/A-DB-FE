import { useEffect, useState, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { getFeedQuickies, getLatestQuickies, type Quickie, type CreateQuickiePayload, createQuickie } from "@/services/quickies/quickieService"
import { QuickieDetail } from "./QuickieDetail"
import { toast } from "sonner"

interface QuickieStoriesProps {
  onQuickieCreated?: () => void
}

export function QuickieStories({ onQuickieCreated }: QuickieStoriesProps) {
  const { accessToken, user } = useAuth()
  const [quickies, setQuickies] = useState<Quickie[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newCaption, setNewCaption] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewedQuickieIds, setViewedQuickieIds] = useState<Set<string>>(new Set())

  const loadQuickies = useCallback(async () => {
    try {
      setLoading(true)
      let data: Quickie[] = []
      
      if (accessToken) {
        // Try to get feed from followed users
        try {
          data = await getFeedQuickies(accessToken, 20, 0)
          // If user has no follows, fall back to public feed
          if (data.length === 0) {
            console.log("No follows found, showing public quickies")
            data = await getLatestQuickies(20, 0)
          }
        } catch (err) {
          // If feed fails, fall back to public feed
          console.log("Feed failed, using public quickies")
          data = await getLatestQuickies(20, 0)
        }
      } else {
        // Not logged in - use public feed
        data = await getLatestQuickies(20, 0)
      }
      
      setQuickies(data)
      // Track which quickies have been viewed
      const viewed = new Set<string>()
      data.forEach((q) => {
        if (q.viewers?.includes(user?.id || "")) {
          viewed.add(q._id)
        }
      })
      setViewedQuickieIds(viewed)
    } catch (error) {
      console.error("Failed to load quickies:", error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, user?.id])

  useEffect(() => {
    loadQuickies()
  }, [loadQuickies])

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < quickies.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    } else {
      setSelectedIndex(null)
    }
  }

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  // Sample placeholder images for demo (in production, these would be uploaded to storage)
  const SAMPLE_IMAGES = [
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=600&fit=crop",
  ]

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    
    // Use a random sample image as placeholder
    const randomImage = SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)]
    setPreviewUrl(randomImage)
    toast.info("Using sample image")
  }

  const handleCreateQuickie = async () => {
    if (!accessToken) {
      toast.error("Please log in to create quickies")
      return
    }
    
    // Allow creating without image - only include media if selected
    const payload: CreateQuickiePayload = {
      caption: newCaption.trim() || undefined,
      notify: true,
    }
    
    if (previewUrl) {
      payload.media_url = previewUrl
      payload.media_type = "image"
    }
    
    try {
      setCreating(true)
      await createQuickie(payload, accessToken)
      
      toast.success("Quickie created!")
      setIsCreateOpen(false)
      setNewCaption("")
      setPreviewUrl(null)
      loadQuickies()
      onQuickieCreated?.()
    } catch (error) {
      console.error("Create quickie error:", error)
      toast.error("Failed to create quickie")
    } finally {
      setCreating(false)
    }
  }

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <>
      {/* Stories Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {/* Create Story Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex flex-col items-center gap-2 flex-shrink-0 group"
        >
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-[#036aff] p-0.5 group-hover:border-solid transition-all">
            <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center group-hover:bg-[#252525] transition-colors">
              <Plus className="h-6 w-6 text-[#036aff]" />
            </div>
          </div>
          <span className="text-xs text-gray-600 font-medium">Add</span>
        </button>

        {/* Story Items */}
        {loading ? (
          <div className="flex items-center justify-center w-16 h-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#036aff] rounded-full animate-spin" />
          </div>
        ) : (
          quickies.map((quickie, index) => {
            const isViewed = viewedQuickieIds.has(quickie._id)
            const isOwn = quickie.author_id === user?.id
            const isFollowing = quickie.viewers?.includes(user?.id || "") || isOwn
            const isRandom = !isFollowing && !isOwn

            // Ring color based on status
            const ringClass = isViewed
              ? "bg-gray-500" // Gray for viewed
              : isRandom
              ? "bg-yellow-500" // Yellow for random people
              : "bg-gradient-to-tr from-[#036aff] to-[#00d4ff]" // Blue for following/unviewed

            return (
              <button
                key={quickie._id}
                onClick={() => setSelectedIndex(index)}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className={`relative w-16 h-16 rounded-full p-0.5 ${ringClass}`}>
                  <div className="w-full h-full rounded-full border-2 border-white bg-white">
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={quickie.media_url}
                        alt="Quickie"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-400">
                        {quickie.author_id?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isRandom && !isViewed && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-[10px] text-black font-bold flex items-center justify-center">
                      !
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600 font-medium max-w-[64px] truncate">
                  {formatTimeAgo(quickie.createdAt)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Story Viewer - QuickieDetail Component */}
      <QuickieDetail
        quickies={quickies}
        initialIndex={selectedIndex || 0}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        viewedQuickieIds={viewedQuickieIds}
      />

      {/* Create Quickie Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1a1a]">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Create Quickie</h3>
            
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#3a3a3a] rounded-lg p-8 text-center bg-[#252525]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="quickie-image"
                />
                <label
                  htmlFor="quickie-image"
                  className="cursor-pointer text-[#036aff] font-medium hover:underline"
                >
                  Select an image
                </label>
                <p className="text-sm text-gray-400 mt-2">Share a moment with your followers</p>
              </div>
            )}

            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              className="w-full px-3 py-2 border border-[#3a3a3a] rounded-lg text-sm bg-[#252525] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#036aff]/20"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateQuickie}
                disabled={!previewUrl || creating}
                className="bg-[#036aff] hover:bg-[#036aff]/90"
              >
                {creating ? "Creating..." : "Share"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
