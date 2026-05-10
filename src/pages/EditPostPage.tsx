import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PostEditor, type DraftImage } from "@/components/post/PostEditor"
import { useAuth } from "@/contexts/AuthContext"
import { buildContentBlocks, extractCodeSnippet, normalizeTag, type EditorMode } from "@/lib/postEditorUtils"
import { deletePost, getPostById, updatePost, type Post } from "@/services/mainServices"

function descriptionFromPost(post: Post): string {
  if (!post.content_blocks?.length) return ""

  return post.content_blocks
    .map((block) => {
      if (block.type === "code") {
        return `\`\`\`\n${String(block.data || "")}\n\`\`\``
      }
      if (block.type === "text") {
        return String(block.data || "")
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [editorMode, setEditorMode] = useState<EditorMode>("auto")
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const [images, setImages] = useState<DraftImage[]>([])
  const [tagDraft, setTagDraft] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      if (!id) return

      try {
        setLoading(true)
        const data = await getPostById(id)
        setPost(data)
        setTitle(data.title || "")
        setDescription(descriptionFromPost(data))
        setImages((data.image_urls || []).map((url, index) => ({ id: `img-${index}-${url}`, url })))
        setTags(data.tags || [])
      } catch (error) {
        console.error("Failed to load post:", error)
        toast.error("Failed to load post")
      } finally {
        setLoading(false)
      }
    }

    loadPost()
  }, [id])

  const normalizedTags = useMemo(() => Array.from(new Set(tags.map(normalizeTag).filter(Boolean))), [tags])

  const handleSave = async () => {
    if (!id || !accessToken) return

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle) {
      toast.error("Title is required")
      return
    }

    if (!trimmedDescription && images.length === 0) {
      toast.error("Post cannot be empty")
      return
    }

    try {
      setSaving(true)
      const contentBlocks = buildContentBlocks(trimmedDescription)
      const codeSnippet = extractCodeSnippet(trimmedDescription, editorMode)

      if (codeSnippet && !contentBlocks.some((block) => block.type === "code")) {
        contentBlocks.push({ type: "code", data: codeSnippet })
      }

      const postTags = Array.from(new Set([
        ...normalizedTags,
        ...(codeSnippet ? ["code-snippet", "snippet"] : []),
      ]))

      const updated = await updatePost(id, {
        title: trimmedTitle,
        content_blocks: contentBlocks,
        tags: postTags,
        image_urls: images.map((image) => image.url),
        visibility: post?.visibility,
        is_announcement: post?.is_announcement,
        department_id: post?.department_id,
      }, accessToken)

      setPost(updated)
      toast.success("Post updated")
      navigate(`/feed/${id}`)
    } catch (error) {
      console.error("Failed to update post:", error)
      toast.error("Failed to update post")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !accessToken) return
    try {
      await deletePost(id, accessToken)
      toast.success("Post deleted")
      navigate("/feed")
    } catch (error) {
      toast.error("Failed to delete post")
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0d0d0d] p-6 text-gray-400">Loading post...</div>
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6 text-gray-400">
        Post not found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigate(`/feed/${id}`)} className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a] hover:text-white">
            Back to post
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="border-red-900/50 bg-[#1a1a1a] text-red-300 hover:bg-red-900/20 hover:text-red-200">
            Delete post
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">Edit post</h1>
          <p className="mt-2 text-sm text-gray-400">Use the same editor flow as creation, then review before saving.</p>
        </div>

        <PostEditor
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          editorMode={editorMode}
          setEditorMode={setEditorMode}
          imageUrlDraft={imageUrlDraft}
          setImageUrlDraft={setImageUrlDraft}
          images={images}
          setImages={setImages}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          tags={tags}
          setTags={setTags}
          resetKey={resetKey}
          setResetKey={setResetKey}
          isSubmitting={saving}
          submitLabel="Save changes"
          onSubmit={handleSave}
          backLabel="Back to post"
          onBack={() => navigate(`/feed/${id}`)}
        />
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Post?</DialogTitle>
            <DialogDescription className="text-gray-400">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
