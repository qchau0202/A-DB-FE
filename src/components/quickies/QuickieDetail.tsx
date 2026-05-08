import { useEffect, useState, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Heart, Eye, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { markQuickieViewed, getReactionCount, type Quickie } from "@/services/quickies/quickieService"
import { getProfileByUserId } from "@/services/mainServices"

interface QuickieDetailProps {
  quickies: Quickie[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  viewedQuickieIds: Set<string>
}

interface AuthorProfile {
  display_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

export function QuickieDetail({
  quickies,
  initialIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
  viewedQuickieIds,
}: QuickieDetailProps) {
  const { accessToken, user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null)
  const [localViewed, setLocalViewed] = useState<Set<string>>(new Set())

  const currentQuickie = quickies[currentIndex]
  const isViewed = viewedQuickieIds.has(currentQuickie?._id) || localViewed.has(currentQuickie?._id)
  const isFollowing = true // TODO: Check actual follow status
  const isRandomPerson = !isFollowing && currentQuickie?.author_id !== user?.id

  // Auto-progress
  useEffect(() => {
    if (!isOpen || isPaused || !currentQuickie) return

    setProgress(0)
    const duration = currentQuickie.media_url ? 5000 : 3000 // 5s for media, 3s for text
    const interval = 50
    const step = 100 / (duration / interval)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [currentIndex, isOpen, isPaused, currentQuickie])

  // Load author profile
  useEffect(() => {
    if (!currentQuickie?.author_id) return

    const loadAuthor = async () => {
      try {
        const profile = await getProfileByUserId(currentQuickie.author_id, accessToken || undefined)
        setAuthorProfile(profile)
      } catch (error) {
        console.error("Failed to load author:", error)
      }
    }

    loadAuthor()
  }, [currentQuickie?.author_id, accessToken])

  // Track view
  useEffect(() => {
    if (!isOpen || !currentQuickie || !accessToken) return

    const trackView = async () => {
      try {
        await markQuickieViewed(currentQuickie._id, accessToken)
        setLocalViewed((prev) => new Set(prev).add(currentQuickie._id))
      } catch (error) {
        console.error("Failed to track view:", error)
      }
    }

    trackView()
  }, [currentQuickie?._id, isOpen, accessToken])

  const handleNext = useCallback(() => {
    if (currentIndex < quickies.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      onNext()
    } else {
      onClose()
    }
  }, [currentIndex, quickies.length, onNext, onClose])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      onPrev()
    }
  }, [currentIndex, onPrev])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    },
    [onClose, handleNext, handlePrev]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, handleKeyDown])

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setProgress(0)
    }
  }, [isOpen, initialIndex])

  if (!isOpen || !currentQuickie) return null

  const authorName = authorProfile?.display_name || authorProfile?.username || "User"
  const authorInitials = authorName.charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
        {quickies.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-50 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Ring indicator for viewed status */}
            <div
              className={`rounded-full p-0.5 ${
                isViewed ? "bg-gray-500" : isRandomPerson ? "bg-yellow-500" : "bg-gradient-to-tr from-blue-500 to-cyan-400"
              }`}
            >
              <Avatar className="h-10 w-10 border-2 border-black">
                <AvatarImage src={authorProfile?.avatar_url || undefined} alt={authorName} />
                <AvatarFallback className="bg-gray-800 text-white text-sm">{authorInitials}</AvatarFallback>
              </Avatar>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{authorName}</span>
                {isRandomPerson && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                    Random
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{formatTimeAgo(currentQuickie.createdAt)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {currentQuickie.viewers?.length || 0} views
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-10 w-10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className="h-full w-full flex items-center justify-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Left Tap Zone */}
        <div className="absolute left-0 top-0 bottom-0 w-1/4 z-40" onClick={handlePrev} />

        {/* Center Content */}
        <div className="relative max-w-md w-full px-4">
          {currentQuickie.media_url ? (
            currentQuickie.media_type === "video" ? (
              <video
                src={currentQuickie.media_url}
                className="max-h-[70vh] w-full object-contain rounded-lg"
                controls
                autoPlay
                muted
                playsInline
                onPlay={() => setIsPaused(true)}
                onPause={() => setIsPaused(false)}
              />
            ) : (
              <img
                src={currentQuickie.media_url}
                alt="Quickie"
                className="max-h-[70vh] w-full object-contain rounded-lg"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-white/60" />
              </div>
              <p className="text-white/60 text-lg">Text Quickie</p>
            </div>
          )}

          {/* Caption */}
          {currentQuickie.caption && (
            <div className="absolute bottom-20 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white text-sm">{currentQuickie.caption}</p>
            </div>
          )}
        </div>

        {/* Right Tap Zone */}
        <div className="absolute right-0 top-0 bottom-0 w-1/4 z-40" onClick={handleNext} />
      </div>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 z-50"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {currentIndex < quickies.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 z-50"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 flex items-center gap-2"
            >
              <Heart className="h-5 w-5" />
              <span>{getReactionCount(currentQuickie.reactions)}</span>
            </Button>
          </div>

          <div className="text-xs text-gray-400">
            {currentIndex + 1} / {quickies.length}
          </div>
        </div>
      </div>

      {/* Viewed Indicator */}
      {isViewed && (
        <div className="absolute top-20 right-4 px-2 py-1 bg-gray-500/50 rounded-full text-xs text-white flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Viewed
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}
