import { useState, useRef } from "react"
import { Image, Globe2, Users, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { createPost } from "@/services/mainServices"

type ComposerPrivacy = "public" | "private"

interface FeedComposerProps {
  onPostCreated?: () => void
}

export function FeedComposer({ onPostCreated }: FeedComposerProps) {
  const { user, accessToken } = useAuth()
  const DEFAULT_AVATAR = "/UniCircle_logo-removebg.png"
  const [privacy, setPrivacy] = useState<ComposerPrivacy>("public")
  const [content, setContent] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [attachedImages, setAttachedImages] = useState<Array<{ id: string; url: string; file: File }>>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      toast.error("Please select image files only")
      return
    }

    if (attachedImages.length + imageFiles.length > 4) {
      toast.error("Maximum 4 images allowed")
      return
    }

    const newImages = imageFiles.map(file => {
      const id = `img-${Date.now()}-${Math.random()}`
      const url = URL.createObjectURL(file)
      return { id, url, file }
    })

    setAttachedImages([...attachedImages, ...newImages])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (id: string) => {
    const imageToRemove = attachedImages.find(img => img.id === id)
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url)
    }
    setAttachedImages(attachedImages.filter(img => img.id !== id))
  }

  const handlePost = async () => {
    if (!content.trim() && attachedImages.length === 0) {
      toast.error("Post cannot be empty", {
        description: "Please write a question or discussion before posting",
      })
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

      // Tags - can be extracted from content hashtags if needed
      const tags: string[] = []

      // Build content blocks from text and images
      const contentBlocks = []
      
      // Add text block if there's content
      if (content.trim()) {
        contentBlocks.push({
          type: 'text' as const,
          data: content.trim()
        })
      }
      
      // Add image blocks
      if (attachedImages.length > 0) {
        const imageUrls = attachedImages.map(img => img.url)
        contentBlocks.push({
          type: 'image' as const,
          data: { urls: imageUrls }
        })
      }

      await createPost(
        {
          title: content.trim().slice(0, 100),
          content_blocks: contentBlocks,
          tags,
          visibility: "public",
          image_urls: attachedImages.map(img => img.url),
        },
        accessToken
      )

      toast.success("Post published!")

      // Clean up
      attachedImages.forEach(img => URL.revokeObjectURL(img.url))
      setContent("")
      setAttachedImages([])
      setIsFocused(false)

      // Notify parent to reload posts
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error) {
      console.error("Failed to create post:", error)
      toast.error("Failed to create post", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsPosting(false)
    }
  }

  const handleBlur = () => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }

    // Use setTimeout to check if focus moved to an element within the container
    blurTimeoutRef.current = setTimeout(() => {
      const activeElement = document.activeElement
      if (containerRef.current && !containerRef.current.contains(activeElement)) {
        // Focus moved outside the container, collapse if no content
        if (!content.trim()) {
          setIsFocused(false)
        }
      }
    }, 100)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const charCount = content.length
  const hasContent = content.trim().length > 0

  return (
    <Card className="border-none bg-transparent rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 bg">
        <div ref={containerRef} className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={DEFAULT_AVATAR} alt="Avatar" className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-[#036aff] to-[#0052cc] text-white text-sm font-semibold">
              {user?.initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 ">
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={isFocused ? 8 : 2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={handleBlur}
                  className={cn(
                    "w-full resize-none rounded-xl border px-4 py-3 text-[15px] leading-relaxed outline-none transition-all duration-200",
                    isFocused
                      ? "border-[#036aff] ring-2 ring-[#036aff]/10 bg-white"
                      : "bg-gray-200 hover:border-gray-300 hover:bg-white",
                  )}
                  placeholder="What's on your mind? Share your thoughts, ideas, or questions..."
                />
                {isFocused && (
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {charCount > 0 && `${charCount} characters`}
                  </div>
                )}
              </div>

              {/* Image previews */}
              {attachedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {attachedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.url}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        onMouseDown={handleMouseDown}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isFocused && (
                <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onMouseDown={handleMouseDown}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachedImages.length >= 4}
                      className="inline-flex items-center gap-2 h-9 px-3 text-sm"
                    >
                      <Image className="h-4 w-4" />
                      Add image
                    </Button>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
                        <button
                          type="button"
                          onMouseDown={handleMouseDown}
                          onClick={() => setPrivacy("public")}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                            privacy === "public"
                              ? "bg-white text-[#141414] shadow-sm"
                              : "text-gray-600 hover:text-[#141414]",
                          )}
                        >
                          <Globe2 className="h-3.5 w-3.5" />
                          Public
                        </button>
                        <button
                          type="button"
                          onMouseDown={handleMouseDown}
                          onClick={() => setPrivacy("private")}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                            privacy === "private"
                              ? "bg-white text-[#141414] shadow-sm"
                              : "text-gray-600 hover:text-[#141414]",
                          )}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Private
                        </button>
                      </div>
                    </div>

                    <Button
                      onMouseDown={handleMouseDown}
                      onClick={handlePost}
                      disabled={(!hasContent && attachedImages.length === 0) || isPosting}
                      className={cn(
                        "font-semibold text-sm px-5 h-9 rounded-lg transition-all",
                        (hasContent || attachedImages.length > 0) && !isPosting
                          ? "bg-[#036aff] text-white hover:bg-[#0052cc] shadow-sm hover:shadow-md"
                          : "bg-[#036aff] text-gray-400 cursor-not-allowed",
                      )}
                    >
                      {isPosting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}