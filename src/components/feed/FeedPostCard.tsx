import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Globe2, Users, MoreHorizontal, MessageSquare, HelpCircle, CheckCircle2, Lock, UserPlus, UserCheck, Heart, MessageCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { followUser, unfollowUser, createNotification } from "@/services/mainServices"
import type { FeedPost } from "@/data/feed"

interface FeedPostCardProps {
  post: FeedPost
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const DEFAULT_AVATAR = "/UniCircle_logo-removebg.png"
  const isFriendsOnly = post.privacy === "friends"
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)
  const isOwner = !!(user?.id && post.authorId === user.id)

  const authorDisplay =
    post.author.name && post.author.name.trim() && post.author.name !== post.author.studentCode
      ? `${post.author.name} - ${post.author.studentCode}`
      : post.author.studentCode || "Unknown"

  const handleOpenThread = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest("[role='button']") ||
      target.closest("a")
    ) {
      return
    }
    navigate(`/feed/${post.id}`)
  }

  const snippet =
    post.content.length > 200 ? `${post.content.slice(0, 200).trimEnd()}…` : post.content

  const goProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    const profileId = (post as any).authorId || (post as any).author_id
    if (profileId) {
      navigate(`/profile/${profileId}`)
    }
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!post.authorId || !user || !accessToken || post.authorId === user.id) return
    try {
      setFollowBusy(true)
      await followUser(post.authorId, accessToken, user.id)
      setIsFollowing(true)
      // Send follow notification
      await createNotification(accessToken, {
        recipient_id: post.authorId,
        sender_id: user.id,
        title: `${user.name || "Someone"} followed you`,
        type: "follow",
      })
      toast.success("Followed user")
    } catch (error) {
      toast.error("Failed to follow user", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setFollowBusy(false)
    }
  }

  const handleUnfollowClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowUnfollowDialog(true)
  }

  const handleConfirmUnfollow = async () => {
    if (!post.authorId || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(post.authorId, accessToken, user.id)
      setIsFollowing(false)
      setShowUnfollowDialog(false)
      toast.success("Unfollowed user")
    } catch (error) {
      toast.error("Failed to unfollow user", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <Card
      className="border border-gray-200 rounded-2xl shadow-sm cursor-pointer transition-all duration-200 hover:border-gray-300 hover:shadow-md group"
      onClick={handleOpenThread}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 cursor-pointer" onClick={goProfile}>
              <AvatarImage src={DEFAULT_AVATAR} alt="Avatar" className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-[#036aff] to-[#0052cc] text-white text-sm font-semibold">
                {post.author.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={goProfile}
                  className="text-[15px] font-semibold text-[#141414] hover:text-[#036aff]"
                >
                  {authorDisplay}
                </button>
                {post.author.isFriend && (
                  <Badge
                    variant="outline"
                    className="rounded-full bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium px-2 py-0.5 h-5"
                  >
                    Friend
                  </Badge>
                )}
                {!isOwner && accessToken && (
                  <>
                    <Button
                      variant={isFollowing ? "outline" : "ghost"}
                      size="sm"
                      onClick={isFollowing ? handleUnfollowClick : handleFollow}
                      disabled={followBusy}
                      className={cn(
                        "h-6 px-2 text-xs font-medium",
                        isFollowing
                          ? "border-gray-200 hover:bg-gray-50 text-gray-700"
                          : "text-[#036aff] hover:text-[#024eba] hover:bg-[#036aff]/10"
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Unfollow {authorDisplay}?</DialogTitle>
                          <DialogDescription>
                            You will no longer see posts from this user in your feed.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowUnfollowDialog(false)}
                            disabled={followBusy}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            onClick={handleConfirmUnfollow}
                            disabled={followBusy}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Unfollow
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{post.createdAt}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  {isFriendsOnly ? (
                    <>
                      <Users className="h-3 w-3" />
                      Friends only
                    </>
                  ) : (
                    <>
                      <Globe2 className="h-3 w-3" />
                      Public
                    </>
                  )}
                </span>
                {post.isEdited && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400 italic">Edited</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
          {post.eventTag && (
            <Badge
              variant="outline"
                className="border-[#036aff] text-[#036aff] text-[10px] font-semibold px-2.5 py-1 rounded-full"
            >
              {post.eventTag}
            </Badge>
          )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Prominent Status and Type Badges (neutral tones) */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm",
              post.threadType === "Q&A"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-gray-50 text-gray-700 border-gray-200",
            )}
          >
            {post.threadType === "Q&A" ? (
              <>
                <HelpCircle className="h-3.5 w-3.5" />
                Q&A Thread
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5" />
                Discussion
              </>
            )}
          </Badge>
          <Badge
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm",
              post.status === "OPEN"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-gray-100 text-gray-700 border-gray-200",
            )}
          >
            {post.status === "OPEN" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Open
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Closed
              </>
            )}
          </Badge>
        </div>

        {/* Title + Content */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[#141414] leading-snug line-clamp-2">
            {post.title}
          </h2>
          <p className="text-[15px] text-gray-700 leading-relaxed line-clamp-3">
            {snippet}
          </p>
        </div>

        {/* Media grid */}
        {post.media.length > 0 && (
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-gray-200 bg-gray-50",
              post.media.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-1",
            )}
          >
            {post.media.map((item, index) => {
              // Use a combination of item.id and index to ensure unique keys
              const uniqueKey = item.id ? `${item.id}-${index}` : `media-${index}`
              
              if (item.type === "image" && item.url) {
                return (
                  <div key={uniqueKey} className="relative overflow-hidden rounded-lg">
                    <img
                      src={item.url}
                      alt="Attachment"
                        className="w-full h-full object-cover"
                        style={{ transform: "scale(0.75)", transformOrigin: "center" }}
                    />
                  </div>
                )
              }

              return (
              <div
                key={uniqueKey}
                  className="relative flex aspect-video items-center justify-center text-sm font-semibold text-white overflow-hidden"
                style={{ backgroundColor: item.thumbColor }}
              >
                  <span className="z-10 relative">{item.label}</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              </div>
              )
            })}
          </div>
        )}

        {/* Likes and Comments Counter */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Heart className="h-4 w-4" />
            <span className="font-medium">{post.stats.likes}</span>
            <span className="text-gray-500">likes</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MessageCircle className="h-4 w-4" />
            <span className="font-medium">{post.stats.comments}</span>
            <span className="text-gray-500">comments</span>
          </div>
        </div>
        </CardContent>
      </Card>
  )
}


