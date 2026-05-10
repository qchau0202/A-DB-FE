import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, MessageCircle, UserPlus, UserCheck, Lightbulb, PartyPopper, HelpCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { followUser, unfollowUser, sendFollowNotification, getProfileByUserId, addPostReaction, type Post, type BackendProfile } from "@/services/mainServices"

// Reaction types with icons
const REACTION_TYPES = [
  { type: 'like', icon: Heart, label: 'Like', color: 'text-red-500' },
  { type: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-yellow-500' },
  { type: 'celebrate', icon: PartyPopper, label: 'Celebrate', color: 'text-purple-500' },
  { type: 'curious', icon: HelpCircle, label: 'Curious', color: 'text-blue-500' },
] as const

interface FeedPostCardProps {
  post: Post
}

// Extract text from content blocks
function getPostText(post: Post): string {
  if (!post.content_blocks?.length) return ""
  return post.content_blocks
    .filter((b: any) => b.type === "text" || b.type === "code")
    .map((b: any) => b.type === "code" ? `\`${String(b.data).slice(0, 160)}\`` : b.data)
    .join(" ")
}

function renderContentBlocks(post: Post, compact = true) {
  if (!post.content_blocks?.length) return null

  return post.content_blocks.slice(0, compact ? 2 : post.content_blocks.length).map((block: any, index) => {
    if (block.type === "code") {
      const codeText = String(block.data || "")
      return (
        <pre
          key={`${block.type}-${index}`}
          className="mb-3 overflow-x-auto rounded-xl border border-[#2a2a2a] bg-[#0b1220] p-3 font-mono text-xs leading-6 text-[#dbeafe]"
        >
          <code>{compact && codeText.length > 180 ? `${codeText.slice(0, 180).trimEnd()}…` : codeText}</code>
        </pre>
      )
    }

    if (block.type === "image") return null

    return (
      <p key={`${block.type}-${index}`} className="mb-3 text-sm leading-relaxed text-white whitespace-pre-wrap">
        {compact && String(block.data || "").length > 220
          ? `${String(block.data || "").slice(0, 220).trimEnd()}…`
          : String(block.data || "")}
      </p>
    )
  })
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)
  const [author, setAuthor] = useState<BackendProfile | null>(null)
  const [loadingAuthor, setLoadingAuthor] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const authorId = post.author_id
  const postId = post._id
  const isOwner = !!(user?.id && authorId === user.id)

  const contentText = getPostText(post)
  const displayContent = contentText.length > 200 
    ? `${contentText.slice(0, 200).trimEnd()}…` 
    : contentText

  const reactions = post.reactions || { like: 0, insightful: 0, celebrate: 0, curious: 0 }
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)
  const comments = post.comment_count || 0
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [localReactions, setLocalReactions] = useState(reactions)

  const handleOpen = () => {
    navigate(`/feed/${postId}`)
  }

  const goProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/profile/${authorId}`)
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authorId || !user || !accessToken || isOwner) return
    try {
      setFollowBusy(true)
      await followUser(authorId, accessToken)
      setIsFollowing(true)
      await sendFollowNotification(accessToken, authorId, user?.name || "Someone")
      toast.success("Followed user")
    } catch (error) {
      toast.error("Failed to follow user")
    } finally {
      setFollowBusy(false)
    }
  }

  const handleUnfollowClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowUnfollowDialog(true)
  }

  const handleConfirmUnfollow = async () => {
    if (!authorId || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(authorId, accessToken)
      setIsFollowing(false)
      setShowUnfollowDialog(false)
      toast.success("Unfollowed user")
    } catch (error) {
      toast.error("Failed to unfollow user")
    } finally {
      setFollowBusy(false)
    }
  }

  // Handle reaction click
  const handleReaction = async (reactionType: string) => {
    if (!accessToken) {
      toast.error("Please log in to react")
      return
    }
    if (!postId) return
    
    try {
      await addPostReaction(postId, reactionType as any)
      
      // Update local state
      setUserReactions(prev => {
        const next = new Set(prev)
        if (next.has(reactionType)) {
          next.delete(reactionType)
        } else {
          next.add(reactionType)
        }
        return next
      })
      
      setLocalReactions(prev => ({
        ...prev,
        [reactionType]: (prev[reactionType as keyof typeof prev] || 0) + (userReactions.has(reactionType) ? -1 : 1)
      }))
    } catch (error) {
      toast.error("Failed to add reaction")
    }
  }

  // Fetch author info when component mounts
  useEffect(() => {
    const fetchAuthor = async () => {
      if (!authorId || !accessToken) return
      try {
        setLoadingAuthor(true)
        const profile = await getProfileByUserId(authorId, accessToken)
        setAuthor(profile)
      } catch (error) {
        console.error("Failed to fetch author:", error)
      } finally {
        setLoadingAuthor(false)
      }
    }
    fetchAuthor()
  }, [authorId, accessToken])

  // Check follow status when author loads
  useEffect(() => {
    const checkFollow = async () => {
      if (!authorId || !user?.id || !accessToken || isOwner) return
      try {
        const { checkFollowStatus } = await import("@/services/mainServices")
        const following = await checkFollowStatus(authorId, accessToken, user.id)
        setIsFollowing(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    checkFollow()
  }, [authorId, user?.id, accessToken, isOwner])

  // Try to get name from various sources, avoiding showing raw ID
  const authorName = author?.display_name || author?.username || "User"
  const authorAvatar = author?.avatar_url || "/dev_connect-logo.png"
  const authorInitials = author?.display_name?.charAt(0).toUpperCase() || author?.username?.charAt(0).toUpperCase() || "U"

  return (
    <Card className="rounded-xl cursor-pointer bg-[#1a1a1a]" onClick={handleOpen}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9" onClick={goProfile}>
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="bg-[#036aff] text-white text-xs">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <button onClick={goProfile} className="text-sm font-semibold text-white hover:text-[#036aff]">
                {loadingAuthor ? "Loading..." : authorName}
              </button>
              <p className="text-xs text-white">{new Date(post.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          {!isOwner && accessToken && (
            <>
              <Button
                variant={isFollowing ? "outline" : "ghost"}
                size="sm"
                onClick={isFollowing ? handleUnfollowClick : handleFollow}
                disabled={followBusy}
                className="h-7 px-2 text-xs bg-[#036aff] text-white hover:bg-[#036aff]/80"
              >
                {isFollowing ? (
                  <><UserCheck className="h-3 w-3 mr-1" /> Following</>
                ) : (
                  <><UserPlus className="h-3 w-3 mr-1" /> Follow</>
                )}
              </Button>
              <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Unfollow user?</DialogTitle>
                    <DialogDescription>You will no longer see their posts in your feed.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUnfollowDialog(false)} disabled={followBusy}>Cancel</Button>
                    <Button variant="default" onClick={handleConfirmUnfollow} disabled={followBusy} className="bg-red-600 hover:bg-red-700">Unfollow</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="text-base font-semibold text-white mb-2">{post.title}</h3>
        )}

        {/* Content */}
        {post.content_blocks?.length ? (
          renderContentBlocks(post, true)
        ) : displayContent ? (
          <p className="text-sm text-white mb-3 leading-relaxed">{displayContent}</p>
        ) : null}

        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {post.image_urls.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Post content"
                className="rounded-lg w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxImage(url)}
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/300?text=Image+Not+Found";
                  e.currentTarget.onerror = null;
                }}
              />
            ))}
          </div>
        )}

        {/* Image Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl bg-[#1a1a1a] border-[#2a2a2a] p-0 overflow-hidden">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <DialogDescription className="sr-only">Preview of the post image</DialogDescription>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Full size preview"
                className="w-full h-auto max-h-[80vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/800x600?text=Image+Not+Found";
                  e.currentTarget.onerror = null;
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Reactions display */}
        <div className="flex items-center gap-2 flex-wrap">
          {REACTION_TYPES.map(({ type, icon: Icon, color }) => {
            const count = localReactions[type as keyof typeof localReactions] || 0
            const isActive = userReactions.has(type)
            if (count === 0) return null
            return (
              <span key={type} className={`flex items-center gap-1 text-sm ${isActive ? color : 'text-gray-500'}`}>
                <Icon className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`} />
                {count}
              </span>
            )
          })}
          {totalReactions === 0 && <span className="text-sm text-gray-400">Be the first to react</span>}
        </div>

        {/* Stats and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MessageCircle className="h-4 w-4" />
            <span>{comments} comments</span>
          </div>
          
          {/* Reaction buttons */}
          {accessToken && (
            <div className="flex items-center gap-1">
              {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReaction(type)
                  }}
                  title={label}
                  className={`p-1.5 rounded-full transition-colors hover:bg-gray-100 ${
                    userReactions.has(type) ? color : 'text-gray-400'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${userReactions.has(type) ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


