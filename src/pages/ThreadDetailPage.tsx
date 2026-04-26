import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Globe2, Heart, MessageCircle, Reply, Users, MoreHorizontal, Pencil, Trash2, UserPlus, UserCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import {
  getThreadById,
  getCommentsByThreadId,
  createComment,
  updateComment,
  deleteComment,
  updateThread,
  deleteThread,
  mapBackendThreadToFeedPost,
  mapBackendCommentToFeedComment,
  type FeedPost,
  type FeedComment,
  followUser,
  unfollowUser,
  checkFollowStatus,
  createNotification,
} from "@/services/mainServices"

export default function ThreadDetailPage() {
  const DEFAULT_AVATAR = "/UniCircle_logo-removebg.png"
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()

  const [thread, setThread] = useState<FeedPost | null>(null)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [isThreadLiked, setIsThreadLiked] = useState(false)
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set())
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [isPostingComment, setIsPostingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState("")
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isPostingReply, setIsPostingReply] = useState(false)
  const [editThreadTitle, setEditThreadTitle] = useState("")
  const [editThreadText, setEditThreadText] = useState("")
  const [showEditForm, setShowEditForm] = useState(false)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)

  const loadThread = async () => {
    if (!id || !accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const backendThread = await getThreadById(id, accessToken)
      const mappedThread = mapBackendThreadToFeedPost(backendThread, user?.id)
      setThread(mappedThread)
      setEditThreadTitle(mappedThread.title)
      setEditThreadText(mappedThread.content)
      const backendComments = await getCommentsByThreadId(id, accessToken)
      const mappedComments = backendComments.map(mapBackendCommentToFeedComment)
      mappedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setComments(mappedComments)
    } catch (error) {
      console.error("Failed to load thread:", error)
      setThread(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!thread || !thread.authorId || !user || !accessToken || thread.authorId === user.id) return
    try {
      setFollowBusy(true)
      await followUser(thread.authorId, accessToken, user.id)
      setIsFollowingAuthor(true)
      // fire follow notification to recipient
      await createNotification(accessToken, {
        recipient_id: thread.authorId,
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

  const handleUnfollowClick = () => {
    setShowUnfollowDialog(true)
  }

  const handleConfirmUnfollow = async () => {
    if (!thread || !thread.authorId || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(thread.authorId, accessToken, user.id)
      setIsFollowingAuthor(false)
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

  useEffect(() => {
    loadThread()
  }, [id, accessToken])

  // Check follow status when thread loads
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!thread?.authorId || !user?.id || !accessToken || thread.authorId === user.id) return
      try {
        const following = await checkFollowStatus(thread.authorId, accessToken, user.id)
        setIsFollowingAuthor(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    if (thread) {
      loadFollowStatus()
    }
  }, [thread?.authorId, user?.id, accessToken])

  const isFriendsOnly = thread?.privacy === "friends"
  const isClosed = thread?.status === "CLOSED"
  const isOwner = !!(user?.id && thread?.authorId === user.id)

  const toggleThreadLike = () => {
    // TODO: Implement like functionality via backend API
    if (!thread) return
    setIsThreadLiked(!isThreadLiked)
    setThread({
      ...thread,
      stats: {
        ...thread.stats,
        likes: isThreadLiked ? thread.stats.likes - 1 : thread.stats.likes + 1,
      },
    })
  }

  const toggleCommentLike = (commentId: string) => {
    // TODO: Implement comment like functionality via backend API
    const nextSet = new Set(likedCommentIds)
    const isLiked = nextSet.has(commentId)
    if (isLiked) {
      nextSet.delete(commentId)
    } else {
      nextSet.add(commentId)
    }
    setLikedCommentIds(nextSet)
  }

  const handleAddComment = async () => {
    if (!thread || !id || isClosed || !accessToken) return
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty")
      return
    }

    try {
      setIsPostingComment(true)
      await createComment(
        id,
        { content: newComment.trim() },
        accessToken
      )
      // Reload comments and thread to get accurate counts
      await loadThread()
      setNewComment("")
    } catch (error) {
      console.error("Failed to create comment:", error)
      toast.error("Failed to create comment", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsPostingComment(false)
    }
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!id || !accessToken || !editingCommentText.trim()) return

    try {
      await updateComment(commentId, { content: editingCommentText.trim() }, accessToken)
      // Reload comments to get updated data
      const backendComments = await getCommentsByThreadId(id, accessToken)
      const mappedComments = backendComments.map(mapBackendCommentToFeedComment)
      mappedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setComments(mappedComments)
      setEditingCommentId(null)
      setEditingCommentText("")
    } catch (error) {
      console.error("Failed to update comment:", error)
      toast.error("Failed to update comment", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !accessToken) return
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      await deleteComment(commentId, accessToken)
      // Reload comments and thread to get accurate counts
      await loadThread()
    } catch (error) {
      console.error("Failed to delete comment:", error)
      toast.error("Failed to delete comment", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const startEditingComment = (comment: FeedComment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const handleEditThread = async () => {
    if (!thread || !id || !accessToken) return
    if (!editThreadTitle.trim() || !editThreadText.trim()) {
      return
    }

    try {
      await updateThread(id, { title: editThreadTitle.trim(), content: editThreadText.trim() }, accessToken)
      await loadThread()
      toast.success("Thread updated")
      setShowEditForm(false)
    } catch (error) {
      console.error("Failed to update thread:", error)
      toast.error("Failed to update thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const handleDeleteThread = async () => {
    if (!thread || !id || !accessToken) return
    if (!window.confirm("Delete this thread? This cannot be undone.")) return
    try {
      await deleteThread(id, accessToken)
      toast.success("Thread deleted")
      navigate("/feed")
    } catch (error) {
      console.error("Failed to delete thread:", error)
      toast.error("Failed to delete thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const handleReplyToComment = async (parentCommentId: string) => {
    if (!thread || !id || isClosed || !accessToken) return
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty")
      return
    }

    try {
      setIsPostingReply(true)
      await createComment(
        id,
        { 
          content: replyText.trim(),
          parent_comment_id: parentCommentId
        },
        accessToken
      )
      // Reload comments and thread to get accurate counts
      await loadThread()
      setReplyText("")
      setReplyingToCommentId(null)
    } catch (error) {
      console.error("Failed to create reply:", error)
      toast.error("Failed to create reply", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsPostingReply(false)
    }
  }

  // Organize comments into a tree structure
  const organizeComments = (comments: FeedComment[]): { topLevel: FeedComment[], replies: Map<string, FeedComment[]> } => {
    const topLevel: FeedComment[] = []
    const replies = new Map<string, FeedComment[]>()
    
    comments.forEach(comment => {
      if (comment.parentCommentId) {
        if (!replies.has(comment.parentCommentId)) {
          replies.set(comment.parentCommentId, [])
        }
        replies.get(comment.parentCommentId)!.push(comment)
      } else {
        topLevel.push(comment)
      }
    })
    
    return { topLevel, replies }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-sm text-[#036aff]"
          onClick={() => navigate("/feed")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Student Feed
        </Button>
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Loading thread...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!id || !thread) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-sm text-[#036aff]"
          onClick={() => navigate("/feed")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to feed
        </Button>
        <Card className="border border-red-100 bg-red-50/70 rounded-2xl">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-base font-semibold text-red-700">Thread not found</p>
            <p className="text-sm text-red-600">
              The thread may have been removed or you don't have permission to view it.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-3 px-2 md:px-4">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/feed")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#036aff] hover:text-[#024eba] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Student Feed
      </button>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {/* Thread content */}
          <Card className="border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-5 md:p-6 space-y-4">
          {/* Header meta */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11 cursor-pointer" onClick={() => thread.authorId && navigate(`/profile/${thread.authorId}`)}>
                <AvatarImage src={DEFAULT_AVATAR} alt="Avatar" className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-[#036aff] to-[#0052cc] text-white text-base font-semibold">
                  {thread.author.initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => thread.authorId && navigate(`/profile/${thread.authorId}`)}
                    className="text-base font-semibold text-[#141414] hover:text-[#036aff]"
                  >
                    {thread.author.name && thread.author.name.trim() && thread.author.name !== thread.author.studentCode
                      ? `${thread.author.name} - ${thread.author.studentCode}`
                      : thread.author.studentCode || "Unknown"}
                  </button>
                  {thread.author.isFriend && (
                    <span className="rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                      Friend
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{thread.createdAt}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    {isFriendsOnly ? (
                      <>
                        <Users className="h-3.5 w-3.5" />
                        Friends only
                      </>
                    ) : (
                      <>
                        <Globe2 className="h-3.5 w-3.5" />
                        Public
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {!isOwner && thread.authorId && (
                  <>
                    <Button
                      variant={isFollowingAuthor ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "h-8 px-3",
                        isFollowingAuthor
                          ? "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                          : "bg-[#036aff] hover:bg-[#0257d1]"
                      )}
                      disabled={followBusy}
                      onClick={isFollowingAuthor ? handleUnfollowClick : handleFollow}
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Unfollow {thread.author.name && thread.author.name.trim() && thread.author.name !== thread.author.studentCode ? `${thread.author.name} - ${thread.author.studentCode}` : thread.author.studentCode || "Unknown"}?</DialogTitle>
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
                <Badge className="bg-[#036aff0f] text-[#036aff] border-[#036aff26] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {thread.threadType === "Q&A" ? "Q&A thread" : "Discussion"}
                </Badge>
                <Badge
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    thread.status === "OPEN"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-gray-100 text-gray-600 border-gray-200",
                  )}
                  variant="outline"
                >
                  {thread.status === "OPEN" ? "Open" : "Closed"}
                </Badge>
              </div>
              {thread.eventTag && (
                <Badge
                  variant="outline"
                  className="border-[#036aff] text-[#036aff] text-[11px] font-semibold px-2 py-0.5 rounded-full"
                >
                  {thread.eventTag}
                </Badge>
              )}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                    className="h-9 w-9 text-gray-500 hover:text-[#141414]"
                    onClick={() => {
                      setEditThreadTitle(thread.title)
                      setEditThreadText(thread.content)
                      setShowEditForm((prev) => !prev)
                    }}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg z-50"
                  >
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => {
                      setEditThreadTitle(thread.title)
                      setEditThreadText(thread.content)
                      setShowEditForm((prev) => !prev)
                    }}
                  >
                      <Pencil className="h-4 w-4" />
                      Edit thread
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 text-sm font-medium text-red-600 focus:text-red-700"
                      onClick={handleDeleteThread}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete thread
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {showEditForm ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Title</label>
                <input
                  value={editThreadTitle}
                  onChange={(e) => setEditThreadTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Content</label>
                <textarea
                  value={editThreadText}
                  onChange={(e) => setEditThreadText(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
                />
              </div>
              {thread.media.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Current attachments</div>
                  <div
                    className={cn(
                      "overflow-hidden rounded-xl border border-gray-200 bg-white",
                      thread.media.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-0.5",
                    )}
                  >
                    {thread.media.map((item) => {
                      if (item.type === "image" && item.url) {
                        return (
                          <div key={item.id} className="relative">
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
                          key={item.id}
                          className="relative flex aspect-video items-center justify-center text-sm font-semibold text-white"
                          style={{ backgroundColor: item.thumbColor }}
                        >
                          <span className="z-10">{item.label}</span>
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowEditForm(false)} className="text-gray-600">
                  Cancel
                </Button>
                <Button onClick={handleEditThread}>
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Separator />

              {/* Title + body */}
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-[#141414] leading-snug">
                  {thread.title}
                  {thread.isEdited && (
                    <span className="ml-2 text-sm font-normal text-gray-400">(Edited)</span>
                  )}
                </h1>
                <p className="text-base text-gray-800 leading-relaxed whitespace-pre-line">
                  {thread.content}
                </p>
              </div>

              {/* Media */}
              {thread.media.length > 0 && (
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border border-gray-200 bg-white",
                    thread.media.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 gap-0.5",
                  )}
                >
                  {thread.media.map((item) => {
                    if (item.type === "image" && item.url) {
                      return (
                        <div key={item.id} className="relative">
                          <img
                            src={item.url}
                            alt="Attachment"
                            className="w-full h-full object-cover"
                            style={{ transform: "scale(0.75)", transformOrigin: "center" }}
                          />
                        </div>
                      )
                    }

                    // Fallback for videos or missing URLs
                    return (
                      <div
                        key={item.id}
                        className="relative flex aspect-video items-center justify-center text-sm font-semibold text-white"
                        style={{ backgroundColor: item.thumbColor }}
                      >
                        <span className="z-10">{item.label}</span>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Actions summary */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{thread.stats.likes} likes</span>
                  <span>{thread.stats.comments} comments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-3 text-sm font-semibold",
                      isThreadLiked ? "text-red-500" : "text-[#141414]"
                    )}
                    onClick={toggleThreadLike}
                  >
                    <Heart
                      className={cn("mr-1.5 h-4 w-4", isThreadLiked ? "fill-red-500" : "")}
                    />
                    {isThreadLiked ? "Liked" : "Like"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Comments sidebar */}
        <div className="space-y-3">
          <Card className="border border-gray-200 rounded-2xl shadow-sm sticky top-16">
            <CardContent className="p-5 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-[#141414]">
              {comments.length} Comments
            </p>
            {isClosed && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                <MessageCircle className="h-3.5 w-3.5" />
                Thread is closed. New comments are disabled.
              </span>
            )}
          </div>

          {!isClosed && (
            <div
              id="thread-comment-box"
              className="rounded-lg border border-gray-200 bg-[#f9fafb] px-4 py-3 space-y-3"
            >
              <p className="text-xs text-gray-500">
                Add your comment
              </p>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Write a comment..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold"
                  onClick={handleAddComment}
                  disabled={isPostingComment}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  {isPostingComment ? "Posting..." : "Post comment"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            {(() => {
              const { topLevel, replies } = organizeComments(comments)
              
              const renderComment = (comment: FeedComment, isReply = false) => {
                const isEditing = editingCommentId === comment.id
                const isOwner = comment.author_id === user?.id
                const isReplying = replyingToCommentId === comment.id
                const commentReplies = replies.get(comment.id) || []
                
                return (
                  <div key={comment.id} className={cn("space-y-2", isReply && "ml-8 border-l-2 border-gray-200 pl-4")}>
                    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-[#f5f5f5] px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={DEFAULT_AVATAR} alt="Avatar" className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-[#036aff] to-[#0052cc] text-white text-sm font-semibold">
                          {comment.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#141414]">
                            {comment.author}
                          </span>
                          <span className="text-xs text-gray-400">{comment.createdAt}</span>
                          {comment.isEdited && (
                            <span className="text-[11px] text-gray-400">(Edited)</span>
                          )}
                          {comment.parentAuthor && (
                            <span className="text-[11px] text-gray-500">
                              Replying to <span className="font-medium">@{comment.parentAuthor}</span>
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={3}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => handleUpdateComment(comment.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-xs"
                                onClick={() => {
                                  setEditingCommentId(null)
                                  setEditingCommentText("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => toggleCommentLike(comment.id)}
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs font-semibold",
                                  likedCommentIds.has(comment.id) ? "text-red-500" : "text-gray-500 hover:text-[#036aff]"
                                )}
                              >
                                <Heart
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    likedCommentIds.has(comment.id) ? "fill-red-500" : ""
                                  )}
                                />
                                {likedCommentIds.has(comment.id) ? "Liked" : "Like"}
                              </button>
                              {!isClosed && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingToCommentId(isReplying ? null : comment.id)
                                    setReplyText("")
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#036aff]"
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                  {isReplying ? "Cancel" : "Reply"}
                                </button>
                              )}
                              {isOwner && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingComment(comment)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#036aff]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-500"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Reply input */}
                    {isReplying && !isClosed && (
                      <div className="ml-12 rounded-lg border border-gray-200 bg-[#f9fafb] px-4 py-3 space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder={`Reply to ${comment.author}...`}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              setReplyingToCommentId(null)
                              setReplyText("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => handleReplyToComment(comment.id)}
                            disabled={isPostingReply || !replyText.trim()}
                          >
                            {isPostingReply ? "Posting..." : "Post reply"}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Render replies */}
                    {commentReplies.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {commentReplies.map((reply) => renderComment(reply, true))}
                      </div>
                    )}
                  </div>
                )
              }
              
              if (topLevel.length === 0) {
                return (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No comments yet. Be the first to start the discussion.
                  </p>
                )
              }
              
              return (
                <>
                  {topLevel.map((comment) => renderComment(comment))}
                </>
              )
            })()}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
    </>
  )
}

