import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createPost } from "@/services/mainServices"
import { useAuth } from "@/contexts/AuthContext"
import { PostEditor, type DraftImage } from "@/components/post/PostEditor"
import { buildContentBlocks, extractCodeSnippet, normalizeTag, type EditorMode } from "@/lib/postEditorUtils"

export function CreatePostPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [editorMode, setEditorMode] = useState<EditorMode>("auto")
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const [images, setImages] = useState<DraftImage[]>([])
  const [tagDraft, setTagDraft] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const handlePublishConfirm = async () => {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const codeSnippet = extractCodeSnippet(trimmedDescription, editorMode)
    const normalizedTags = Array.from(new Set(tags.map(normalizeTag).filter(Boolean)))

    if (!trimmedTitle) {
      toast.error("Title is required")
      return
    }

    if (!trimmedDescription && images.length === 0) {
      toast.error("Post cannot be empty")
      return
    }

    if (!accessToken) {
      toast.error("Authentication required", {
        description: "Please log in to create a post",
      })
      return
    }

    try {
      setIsPosting(true)

      const contentBlocks = buildContentBlocks(trimmedDescription)

      if (codeSnippet && !contentBlocks.some((block) => block.type === "code")) {
        contentBlocks.push({ type: "code", data: codeSnippet })
      }

      const postTags = Array.from(new Set([
        ...normalizedTags,
        ...(codeSnippet ? ["code-snippet", "snippet"] : []),
      ]))

      await createPost(
        {
          title: trimmedTitle,
          content_blocks: contentBlocks,
          tags: postTags,
          visibility: "public",
          image_urls: images.map((image) => image.url),
        },
        accessToken,
      )

      toast.success("Post published!")
      setTitle("")
      setDescription("")
      setEditorMode("auto")
      setImageUrlDraft("")
      setImages([])
      setTags([])
      setResetKey((value) => value + 1)
      navigate("/feed")
    } catch (error) {
      console.error("Failed to create post:", error)
      toast.error("Failed to create post", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] px-3 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => navigate("/feed")} className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a] hover:text-white">Back to feed</Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">Start a discussion</h1>
          <p className="mt-2 text-sm text-gray-400">
            Write a clear post title and description to start a discussion
          </p>
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
          isSubmitting={isPosting}
          submitLabel="Publish post"
          onSubmit={handlePublishConfirm}
          onBack={() => navigate("/feed")}
        />
      </div>
    </div>
  )
}

export default CreatePostPage