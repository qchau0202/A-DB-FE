import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Heart, MessageCircle, Send, Trash2, UserPlus, UserCheck, Lightbulb, PartyPopper, HelpCircle, MoreVertical, Pencil, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import {
  followUser,
  unfollowUser,
  checkFollowStatus,
  getPostById,
  getCommentsByPost,
  createComment,
  deleteComment,
  updateComment,
  getProfileByUserId,
  addPostReaction,
  updatePost,
  deletePost,
  type Post,
  type Comment,
  type BackendProfile,
} from "@/services/mainServices"

// Reaction types with icons
const REACTION_TYPES = [
  { type: 'like', icon: Heart, label: 'Like', color: 'text-red-500' },
  { type: 'insightful', icon: Lightbulb, label: 'Insightful', color: 'text-yellow-500' },
  { type: 'celebrate', icon: PartyPopper, label: 'Celebrate', color: 'text-purple-500' },
  { type: 'curious', icon: HelpCircle, label: 'Curious', color: 'text-blue-500' },
] as const

export default function ThreadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [author, setAuthor] = useState<BackendProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [commentAuthors, setCommentAuthors] = useState<Map<string, BackendProfile>>(new Map())
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState("")
  const [deletingComment, setDeletingComment] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Load post and comments
  const loadData = async () => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [postData, commentsData] = await Promise.all([
        getPostById(id),
        getCommentsByPost(id, 50, 0),
      ])
      setPost(postData)
      setComments(commentsData)
      
      // Load author profile
      if (postData.author_id && accessToken) {
        try {
          const profile = await getProfileByUserId(postData.author_id, accessToken)
          setAuthor(profile)
        } catch (err) {
          console.error("Failed to load author:", err)
        }
      }
      
      // Load comment authors
      const authorIds = [...new Set(commentsData.map(c => c.author_id).filter(Boolean))]
      const authorsMap = new Map<string, BackendProfile>()
      for (const authorId of authorIds) {
        if (!authorId) continue
        try {
          const profile = await getProfileByUserId(authorId, accessToken || undefined)
          authorsMap.set(authorId, profile)
        } catch (err) {
          console.error(`Failed to load comment author ${authorId}:`, err)
        }
      }
      setCommentAuthors(authorsMap)
    } catch (error) {
      console.error("Failed to load post:", error)
      toast.error("Failed to load post")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id, accessToken])

  // Check follow status
  useEffect(() => {
    const checkFollow = async () => {
      if (!post?.author_id || !user?.id || !accessToken || post.author_id === user.id) return
      try {
        const following = await checkFollowStatus(post.author_id, accessToken, user.id)
        setIsFollowing(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    checkFollow()
  }, [post?.author_id, user?.id, accessToken])

  const handleFollow = async () => {
    if (!post?.author_id || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await followUser(post.author_id, accessToken)
      setIsFollowing(true)
      toast.success("Followed user")
    } catch (error) {
      toast.error("Failed to follow user")
    } finally {
      setFollowBusy(false)
    }
  }

  const handleUnfollow = async () => {
    if (!post?.author_id || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(post.author_id, accessToken)
      setIsFollowing(false)
      setShowUnfollowDialog(false)
      toast.success("Unfollowed user")
    } catch (error) {
      toast.error("Failed to unfollow user")
    } finally {
      setFollowBusy(false)
    }
  }

  const handleAddComment = async () => {
    if (!id || !newComment.trim() || !accessToken) return
    
    try {
      setIsPosting(true)
      await createComment(
        {
          target_id: id,
          content: newComment.trim(),
        },
        accessToken
      )
      setNewComment("")
      // Reload comments
      const commentsData = await getCommentsByPost(id, 50, 0)
      setComments(commentsData)
      toast.success("Comment added")
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setIsPosting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken) return
    
    try {
      await deleteComment(commentId, accessToken)
      setComments(comments.filter(c => c._id !== commentId))
      toast.success("Comment deleted")
    } catch (error) {
      toast.error("Failed to delete comment")
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!accessToken || !editCommentContent.trim()) return
    
    try {
      await updateComment(commentId, editCommentContent.trim(), accessToken)
      setComments(comments.map(c => c._id === commentId ? { ...c, content: editCommentContent.trim() } : c))
      setEditingComment(null)
      setEditCommentContent("")
      toast.success("Comment updated")
    } catch (error) {
      toast.error("Failed to update comment")
    }
  }

  // Handle reaction click
  const handleReaction = async (reactionType: string) => {
    if (!accessToken) {
      toast.error("Please log in to react")
      return
    }
    if (!id) return
    
    try {
      await addPostReaction(id, reactionType as any)
      
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
      
      // Update post reactions count
      if (post) {
        const currentReactions = post.reactions || { like: 0, insightful: 0, celebrate: 0, curious: 0 }
        setPost({
          ...post,
          reactions: {
            ...currentReactions,
            [reactionType]: (currentReactions[reactionType as keyof typeof currentReactions] || 0) + (userReactions.has(reactionType) ? -1 : 1)
          }
        })
      }
      
    } catch (error) {
      toast.error("Failed to add reaction")
    }
  }

  // Extract text content from content_blocks
  const getContentText = () => {
    if (!post?.content_blocks?.length) return ""
    return post.content_blocks
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.data)
      .join("\n\n")
  }

  const isOwner = user?.id === post?.author_id
  const authorName = author?.display_name || author?.username || post?.author_id?.slice(0, 8) || "Unknown"
  const authorInitials = authorName.charAt(0).toUpperCase()
  const content = getContentText()
  const reactions = post?.reactions || { like: 0, insightful: 0, celebrate: 0, curious: 0 }
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0)
  const commentCount = comments.length

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 bg-[#0d0d0d] min-h-screen">
        <Button variant="ghost" onClick={() => navigate("/feed")} className="mb-4 text-white hover:bg-[#2a2a2a]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        <Card className="border border-[#2a2a2a] rounded-xl mb-6 bg-[#1a1a1a]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-[#2a2a2a]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-[#2a2a2a]" />
                  <Skeleton className="h-3 w-20 bg-[#2a2a2a]" />
                </div>
              </div>
            </div>
            <Skeleton className="h-6 w-3/4 bg-[#2a2a2a]" />
            <Skeleton className="h-20 w-full bg-[#2a2a2a]" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 bg-[#2a2a2a] rounded-full" />
              <Skeleton className="h-8 w-16 bg-[#2a2a2a] rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]">
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-5 w-32 bg-[#2a2a2a]" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full bg-[#2a2a2a]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 bg-[#2a2a2a]" />
                  <Skeleton className="h-3 w-full bg-[#2a2a2a]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-8 bg-[#0d0d0d] min-h-screen">
        <Button variant="ghost" onClick={() => navigate("/feed")} className="mb-4 text-white hover:bg-[#2a2a2a]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>
        <Card className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">Post not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 bg-[#0d0d0d] min-h-screen">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/feed")} className="mb-4 text-white hover:bg-[#2a2a2a]">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to feed
      </Button>

      {/* Post Card */}
      <Card className="border border-[#2a2a2a] rounded-xl mb-6 bg-[#1a1a1a]">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar 
                className="h-10 w-10 cursor-pointer" 
                onClick={() => post.author_id && navigate(`/profile/${post.author_id}`)}
              >
                <AvatarImage src={author?.avatar_url || "/dev_connect-logo.png"} alt={authorName} />
                <AvatarFallback className="bg-[#036aff] text-white">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <button
                  onClick={() => post.author_id && navigate(`/profile/${post.author_id}`)}
                  className="font-semibold text-white hover:text-[#036aff]"
                >
                  {authorName}
                </button>
                <p className="text-xs text-gray-400">
                  {new Date(post.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Follow/Unfollow button */}
            {!isOwner && accessToken && (
              <>
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={isFollowing ? () => setShowUnfollowDialog(true) : handleFollow}
                  disabled={followBusy}
                  className={isFollowing ? "" : "bg-[#036aff] text-white"}
                >
                  {isFollowing ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1" /> Following</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow</>
                  )}
                </Button>
                
                <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
                  <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Unfollow {authorName}?</DialogTitle>
                      <DialogDescription className="text-gray-400">You will no longer see their posts in your feed.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowUnfollowDialog(false)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">Cancel</Button>
                      <Button variant="destructive" onClick={handleUnfollow} disabled={followBusy}>
                        Unfollow
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {/* Owner actions: edit / delete */}
            {isOwner && accessToken && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-[#2a2a2a]">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/feed/${id}/edit`)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs bg-[#2a2a2a] border-[#3a3a3a] text-gray-300 hover:bg-[#3a3a3a]">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          {post.title && (
            <h1 className="text-xl font-bold text-white">{post.title}</h1>
          )}

          {/* Content */}
          {post.content_blocks?.length ? (
            <div className="space-y-3">
              {post.content_blocks.map((block: any, index) => {
                if (block.type === "code") {
                  return (
                    <pre key={`code-${index}`} className="overflow-x-auto rounded-xl border border-[#2a2a2a] bg-[#0b1220] p-4 font-mono text-sm leading-6 text-[#dbeafe] whitespace-pre-wrap">
                      <code>{String(block.data || "")}</code>
                    </pre>
                  )
                }

                if (block.type === "image") {
                  const urls = Array.isArray(block.data?.urls) ? block.data.urls : Array.isArray(block.data) ? block.data : []
                  return urls.length > 0 ? (
                    <div key={`image-${index}`} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {urls.map((url: string, imageIndex: number) => (
                        <img
                          key={`${url}-${imageIndex}`}
                          src={url}
                          alt="Post content"
                          className="rounded-xl w-full max-h-[420px] object-cover border border-[#2a2a2a]"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/800x600?text=Image+Not+Found"
                            e.currentTarget.onerror = null
                          }}
                        />
                      ))}
                    </div>
                  ) : null
                }

                return (
                  <p key={`text-${index}`} className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {String(block.data || "")}
                  </p>
                )
              })}
            </div>
          ) : content ? (
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : null}

          {/* Images */}
          {post.image_urls && post.image_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {post.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="rounded-lg w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/400?text=Image+Not+Found";
                    e.currentTarget.onerror = null;
                  }}
                />
              ))}
            </div>
          )}

          <Separator className="bg-[#2a2a2a]" />

          {/* Reactions display */}
          <div className="flex items-center gap-3 flex-wrap">
            {REACTION_TYPES.map(({ type, icon: Icon, color }) => {
              const count = reactions[type as keyof typeof reactions] || 0
              const isActive = userReactions.has(type)
              if (count === 0 && !isActive) return null
              return (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                    isActive ? `bg-[#2a2a2a] ${color}` : 'text-gray-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`} />
                  <span>{count}</span>
                </button>
              )
            })}
            {totalReactions === 0 && <span className="text-sm text-gray-500">No reactions yet</span>}
          </div>

          <Separator className="bg-[#2a2a2a]" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount} comments</span>
            </div>

            {/* Reaction buttons */}
            {accessToken && (
              <div className="flex items-center gap-1">
                {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => handleReaction(type)}
                    title={label}
                    className={`p-2 rounded-full transition-colors hover:bg-[#2a2a2a] ${
                      userReactions.has(type) ? color : 'text-gray-500'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${userReactions.has(type) ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Post?</DialogTitle>
            <DialogDescription className="text-gray-400">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!id || !accessToken) return
                try {
                  await deletePost(id, accessToken)
                  setShowDeleteDialog(false)
                  toast.success("Post deleted")
                  navigate("/feed")
                } catch (error) {
                  toast.error("Failed to delete post")
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription className="text-gray-400">Update the title and description for your post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              placeholder="Description"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">Cancel</Button>
            <Button
              onClick={async () => {
                if (!id || !accessToken) return
                try {
                  setSavingEdit(true)
                  const payload: any = { title: editTitle }
                  payload.content_blocks = [{ type: 'text', data: editContent }]
                  const updated = await updatePost(id, payload, accessToken)
                  setPost(updated)
                  setIsEditOpen(false)
                  toast.success("Post updated")
                } catch (err) {
                  console.error(err)
                  toast.error("Failed to update post")
                } finally {
                  setSavingEdit(false)
                }
              }}
              className="bg-[#036aff] text-white hover:bg-[#0258cc]"
              disabled={savingEdit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Section */}
      <Card className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-white">Comments ({commentCount})</h2>

          {/* Add Comment */}
          {accessToken && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || "/dev_connect-logo.png"} alt="You" />
                <AvatarFallback className="bg-[#2a2a2a] text-gray-300 text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#036aff]/20 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isPosting}
                    className="bg-[#036aff] text-white hover:bg-[#0258cc]"
                  >
                    {isPosting ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Posting...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1" /> Post</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-[#2a2a2a]" />

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => {
                const authorProfile = comment.author_id ? commentAuthors.get(comment.author_id) : null
                const authorName = authorProfile?.display_name || authorProfile?.username || "User"
                const authorInitials = authorName.charAt(0).toUpperCase()
                const isOwnComment = comment.author_id === user?.id
                const isEditing = editingComment === comment._id

                return (
                  <div key={comment._id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={authorProfile?.avatar_url || undefined} alt={authorName} />
                      <AvatarFallback className="bg-[#2a2a2a] text-gray-300 text-xs">
                        {authorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">
                          {authorName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                          {/* 3-dot menu for edit/delete */}
                          {isOwnComment && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingComment(comment._id); setEditCommentContent(comment.content) }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingComment(comment._id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#036aff]/20 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditComment(comment._id)} className="bg-[#036aff] text-white hover:bg-[#0258cc]">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingComment(null); setEditCommentContent("") }} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Delete Comment Confirmation Dialog */}
          <Dialog open={!!deletingComment} onOpenChange={() => setDeletingComment(null)}>
            <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Comment?</DialogTitle>
                <DialogDescription className="text-gray-400">This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingComment(null)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">Cancel</Button>
                <Button variant="destructive" onClick={() => { if (deletingComment) { handleDeleteComment(deletingComment); setDeletingComment(null) } }}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
