import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { ImagePlus, Tag, X, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buildContentBlocks, extractCodeSnippet, normalizeTag, suggestedTags, type ContentBlock, type EditorMode } from "@/lib/postEditorUtils"

export type DraftImage = {
  id: string
  url: string
}

export type PostEditorValues = {
  title: string
  description: string
  editorMode: EditorMode
  imageUrlDraft: string
  images: DraftImage[]
  tagDraft: string
  tags: string[]
}

export type PostEditorProps = {
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  editorMode: EditorMode
  setEditorMode: (value: EditorMode) => void
  imageUrlDraft: string
  setImageUrlDraft: (value: string) => void
  images: DraftImage[]
  setImages: Dispatch<SetStateAction<DraftImage[]>>
  tagDraft: string
  setTagDraft: (value: string) => void
  tags: string[]
  setTags: Dispatch<SetStateAction<string[]>>
  resetKey: number
  setResetKey: Dispatch<SetStateAction<number>>
  isSubmitting: boolean
  submitLabel: string
  onSubmit: () => Promise<void>
  backLabel?: string
  onBack: () => void
}

export function PostEditor({
  title,
  setTitle,
  description,
  setDescription,
  editorMode,
  setEditorMode,
  imageUrlDraft,
  setImageUrlDraft,
  images,
  setImages,
  tagDraft,
  setTagDraft,
  tags,
  setTags,
  resetKey,
  setResetKey,
  isSubmitting,
  submitLabel,
  onSubmit,
  backLabel = "Back to feed",
  onBack,
}: PostEditorProps) {
  const descriptionRef = useRef<HTMLDivElement>(null)
  const [showPreview, setShowPreview] = useState(false)

  const normalizedTags = useMemo(() => Array.from(new Set(tags.map(normalizeTag).filter(Boolean))), [tags])
  const codeSnippet = useMemo(() => extractCodeSnippet(description, editorMode), [description, editorMode])

  useEffect(() => {
    if (!descriptionRef.current) return
    if (descriptionRef.current.innerText !== description) {
      descriptionRef.current.innerText = description
    }
  }, [resetKey, description])

  const handleDescriptionInput = () => {
    const next = descriptionRef.current?.innerText ?? ""
    setDescription(next)
  }

  const addTag = (value: string) => {
    const nextTag = normalizeTag(value)
    if (!nextTag) return
    setTags((current) => (current.includes(nextTag) ? current : [...current, nextTag]))
  }

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((item) => item !== tag))
  }

  const addImageUrl = () => {
    const nextUrl = imageUrlDraft.trim()
    if (!nextUrl) return
    try {
      new URL(nextUrl)
    } catch {
      return
    }

    setImages((current) => {
      if (current.some((item) => item.url === nextUrl)) return current
      return [...current, { id: `img-${Date.now()}-${Math.random()}`, url: nextUrl }]
    })
    setImageUrlDraft("")
  }

  const removeImage = (id: string) => {
    setImages((current) => current.filter((item) => item.id !== id))
  }

  const canSubmit = title.trim().length > 0 && (description.trim().length > 0 || images.length > 0)

  const previewBlocks = useMemo<ContentBlock[]>(() => {
    const blocks = buildContentBlocks(description)
    if (codeSnippet && !blocks.some((block) => block.type === "code")) {
      blocks.push({ type: "code", data: codeSnippet })
    }
    return blocks
  }, [description, codeSnippet])

  return (
    <>
      <Card className="border border-[#1f1f1f] bg-[#121212] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Write a clear post title"
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#036aff] focus:ring-2 focus:ring-[#036aff]/15"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-200">Description</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditorMode("auto")} className={`rounded-full px-3 py-1 text-xs transition-colors ${editorMode === "auto" ? "bg-[#036aff] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>Auto</button>
                  <button type="button" onClick={() => setEditorMode("text")} className={`rounded-full px-3 py-1 text-xs transition-colors ${editorMode === "text" ? "bg-[#036aff] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>Text</button>
                  <button type="button" onClick={() => setEditorMode("code")} className={`rounded-full px-3 py-1 text-xs transition-colors ${editorMode === "code" ? "bg-[#036aff] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white"}`}>Code</button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>Write the body of your post</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                    <Wand2 className="h-3 w-3" /> Inline editor
                  </span>
                </div>
                <div
                  key={resetKey}
                  ref={descriptionRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleDescriptionInput}
                  onPaste={(e) => {
                    e.preventDefault()
                    const text = e.clipboardData.getData("text/plain")
                    document.execCommand("insertText", false, text)
                  }}
                  className="min-h-[220px] rounded-xl outline-none whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-100"
                  data-placeholder="Write the body of your post here. Paste code or wrap snippets in triple backticks."
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                <ImagePlus className="h-4 w-4 text-[#036aff]" /> Image URLs
              </div>
              <div className="flex gap-2">
                <input
                  value={imageUrlDraft}
                  onChange={(e) => setImageUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addImageUrl()
                    }
                  }}
                  placeholder="https://example.com/image.png"
                  className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#036aff] focus:ring-2 focus:ring-[#036aff]/15"
                />
                <Button type="button" onClick={addImageUrl} className="bg-[#036aff] text-white hover:bg-[#0256cc]">Add</Button>
              </div>

              {images.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {images.map((image) => (
                    <div key={image.id} className="relative overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0f0f0f]">
                      <img src={image.url} alt="Preview" className="h-40 w-full object-cover" />
                      <button type="button" onClick={() => removeImage(image.id)} className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white transition-colors hover:bg-black/75">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Card className="border border-[#2a2a2a] bg-[#0f0f0f]">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                  <Tag className="h-4 w-4 text-[#036aff]" /> Tags
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        addTag(tagDraft)
                        setTagDraft("")
                      }
                    }}
                    placeholder="Add tags and press Enter"
                    className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#121212] px-4 py-3 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#036aff] focus:ring-2 focus:ring-[#036aff]/15"
                  />
                  <Button type="button" variant="outline" onClick={() => { addTag(tagDraft); setTagDraft("") }} className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a] hover:text-white">Add</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {normalizedTags.length > 0 ? normalizedTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-sm text-gray-200">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-white"><X className="h-3 w-3" /></button>
                    </span>
                  )) : <p className="text-sm text-gray-500">No tags added yet.</p>}
                </div>

                <div className="pt-2">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Suggested tags</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => (
                      <button key={tag} type="button" onClick={() => addTag(tag)} className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1 text-xs text-gray-300 transition-colors hover:border-[#036aff]/50 hover:text-white">#{tag}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#111111] p-3 text-xs text-gray-400">
                  Posts with detected code automatically receive code-snippet tags.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a] hover:text-white">{backLabel}</Button>
            <Button type="button" onClick={() => setShowPreview(true)} disabled={isSubmitting || !canSubmit} className="w-full bg-[#036aff] text-white hover:bg-[#0256cc]">{submitLabel}</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl bg-[#121212] border-[#2a2a2a] text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm publish</DialogTitle>
            <DialogDescription className="text-gray-400">Review once more before posting to the feed.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-4"><p className="text-lg font-bold text-white leading-relaxed">{title.trim() || "Untitled post"}</p></div>
            <div className="space-y-2"><p className="text-xs uppercase tracking-widest font-semibold text-gray-400">Description</p><div className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-4"><p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{description.trim() || "No description"}</p></div></div>
            {codeSnippet && (<div className="space-y-2"><p className="text-xs uppercase tracking-widest font-semibold text-[#93c5fd]">Code Snippet</p><div className="rounded-lg border-2 border-[#0f3a8f] bg-[#081224] p-4"><pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-[#dbeafe] leading-relaxed"><code>{codeSnippet}</code></pre></div></div>)}
            {images.length > 0 && (<div className="space-y-2"><p className="text-xs uppercase tracking-widest font-semibold text-gray-400">Images ({images.length})</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{images.map((image) => (<div key={image.id} className="rounded-lg overflow-hidden border border-[#2a2a2a]"><img src={image.url} alt="Preview" className="h-32 w-full object-cover" /></div>))}</div></div>)}
            {normalizedTags.length > 0 && (<div className="space-y-2"><p className="text-xs uppercase tracking-widest font-semibold text-gray-400">Tags</p><div className="flex flex-wrap gap-2">{normalizedTags.map((tag) => (<span key={tag} className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs text-gray-300 font-medium">#{tag}</span>))}</div></div>)}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)} className="border-[#2a2a2a] bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a] hover:text-white">Continue editing</Button>
            <Button type="button" onClick={onSubmit} disabled={isSubmitting} className="bg-[#036aff] text-white hover:bg-[#0256cc]">{isSubmitting ? "Publishing..." : "Confirm publish"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
