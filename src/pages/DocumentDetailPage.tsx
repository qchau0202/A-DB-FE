import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Heart, Eye, ThumbsUp, Calendar, Edit, Trash2, Download, ExternalLink, Share2, Bookmark, Clock, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  getDocumentById,
  addDocumentReaction,
  deleteDocument,
  updateDocument,
  type Document,
} from "@/services/documents/documentService"
import {
  getProfileByUserId,
  type BackendProfile,
} from "@/services/mainServices"


const normalizeTag = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-")


export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()

  const [document, setDocument] = useState<Document | null>(null)
  const [author, setAuthor] = useState<BackendProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [reacting, setReacting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editTagDraft, setEditTagDraft] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) return

      try {
        setLoading(true)
        const doc = await getDocumentById(id)
        setDocument(doc)
        setEditTitle(doc.title || "")
        setEditBody(doc.body || "")
        setEditTags(doc.category_tags || [])
      } catch (error) {
        console.error("Failed to fetch document:", error)
        toast.error("Failed to load document")
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [id])

  useEffect(() => {
    const fetchAuthor = async () => {
      if (!document?.author_id) {
        setAuthor(null)
        return
      }

      try {
        const profile = await getProfileByUserId(document.author_id, accessToken || undefined)
        setAuthor(profile)
      } catch (error) {
        console.error("Failed to fetch author profile:", error)
        setAuthor(null)
      }
    }

    fetchAuthor()
  }, [document, accessToken])


  const handleReaction = async (reaction: 'like' | 'insightful') => {
    if (!document || reacting) return

    try {
      setReacting(true)
      const updatedDoc = await addDocumentReaction(document._id, reaction)
      setDocument(updatedDoc)
      toast.success(`Added ${reaction} reaction`)
    } catch (error) {
      toast.error("Failed to add reaction")
    } finally {
      setReacting(false)
    }
  }

  const handleDelete = async () => {
    if (!document || !accessToken) return

    try {
      await deleteDocument(document._id, accessToken)
      toast.success("Document deleted")
      navigate("/feed")
    } catch (error) {
      toast.error("Failed to delete document")
    }
  }

  const addEditTag = () => {
    const nextTag = normalizeTag(editTagDraft)
    if (!nextTag) return
    setEditTags((current) => (current.includes(nextTag) ? current : [...current, nextTag]))
    setEditTagDraft("")
  }

  const removeEditTag = (tag: string) => {
    setEditTags((current) => current.filter((item) => item !== tag))
  }

  const handleSaveEdit = async () => {
    if (!document || !accessToken) return
    if (!editTitle.trim()) {
      toast.error("Title is required")
      return
    }

    try {
      setSavingEdit(true)
      const updated = await updateDocument(document._id, {
        title: editTitle.trim(),
        body: editBody.trim() || " ",
        category_tags: editTags.length > 0 ? editTags : undefined,
        is_published: document.is_published,
        expected_version: document.version ?? 0,
      }, accessToken)
      setDocument(updated)
      setIsEditOpen(false)
      toast.success("Document updated")
    } catch (error) {
      console.error("Failed to update document:", error)
      toast.error("Failed to update document")
    } finally {
      setSavingEdit(false)
    }
  }

  const isAuthor = user?.id === document?.author_id


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-400">Loading document...</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400">Document not found</p>
          <Button onClick={() => navigate("/feed")} className="mt-4">
            Back to feed
          </Button>
        </div>
      </div>
    )
  }

  const authorName = author?.display_name || author?.username || "Unknown"
  const authorInitials = authorName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Hero Section with Document Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        {document.image_url ? (
          <img
            src={document.image_url}
            alt={document.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#036aff]/20 via-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
            <FileText className="h-24 w-24 text-[#036aff]/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/50 to-transparent" />

        {/* Back Button - Floating */}
        <Button
          variant="ghost"
          onClick={() => navigate("/feed")}
          className="absolute top-4 left-4 z-10 text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to feed
        </Button>

        {/* External Link Badge */}
        {document.external_url && (
          <a
            href={document.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 z-10"
          >
            <Badge className="bg-[#ff6154]/90 hover:bg-[#ff6154] text-white cursor-pointer backdrop-blur-sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              View Source
            </Badge>
          </a>
        )}

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Tags */}
            {document.category_tags && document.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {document.category_tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-white/30 text-white bg-black/30 backdrop-blur-sm hover:bg-white/20 cursor-pointer"
                    onClick={() => navigate(`/categories?tag=${tag}`)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
              {document.title}
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              {document.description || "A comprehensive document for developers"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Author Card */}
        <Card className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-[#036aff]/20">
                  <AvatarImage src={author?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-[#036aff] to-[#0256cc] text-white text-lg">
                    {authorInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">{authorName}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(document.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {document.version && document.version > 1 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Version {document.version}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAuthor && accessToken ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditOpen(true)}
                      className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteOpen(true)}
                      className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                    >
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Body */}
        <Card className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl overflow-hidden mb-6">
          <CardContent className="p-6 sm:p-8">
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-6 mb-8 pb-6 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-[#036aff]" />
                <span className="text-white font-medium">{document.view_count || 0}</span>
                <span className="text-gray-400">views</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-[#036aff]" />
                <span className="text-white font-medium">{document.downloads || 0}</span>
                <span className="text-gray-400">downloads</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-red-400" />
                <span className="text-white font-medium">{document.reactions?.like || 0}</span>
                <span className="text-gray-400">likes</span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {document.body ? (
                document.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-300 leading-relaxed mb-6 text-base sm:text-lg">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-gray-400 italic">No content available for this document.</p>
              )}
            </div>

            {/* All Tags */}
            {document.category_tags && document.category_tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                <p className="text-sm text-gray-400 mb-3">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {document.category_tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a] cursor-pointer px-3 py-1"
                      onClick={() => navigate(`/categories?tag=${tag}`)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#2a2a2a] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Document</DialogTitle>
              <DialogDescription className="text-gray-400">Update the title, body, and tags using the same editing style as creation.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Document title"
                className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-base h-11"
              />

              <textarea
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Write your document content here..."
                className="w-full rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Tags</label>
                <div className="flex gap-2">
                  <Input
                    value={editTagDraft}
                    onChange={(e) => setEditTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addEditTag()
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-base h-11"
                  />
                  <Button type="button" onClick={addEditTag} variant="outline" className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]">
                    Add
                  </Button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-[#2a2a2a] text-sm px-3 py-1 text-gray-300">
                        {tag}
                        <button type="button" onClick={() => removeEditTag(tag)} className="ml-2 text-gray-500 hover:text-gray-300">×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between gap-3 sm:justify-between">
              <Button variant="ghost" className="text-sm font-bold text-gray-400 hover:text-white hover:bg-[#2a2a2a]" onClick={() => setIsEditOpen(false)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Document?</DialogTitle>
              <DialogDescription className="text-gray-400">This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-[#2a2a2a] text-white hover:bg-[#2a2a2a]">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Action Footer */}
        <Card className="border border-[#2a2a2a] bg-gradient-to-r from-[#1a1a1a] to-[#252525] rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-sm">
                Found this helpful? Show your support!
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('like')}
                  disabled={reacting}
                  className="border-[#036aff]/50 text-[#036aff] hover:bg-[#ff6154]/10 hover:border-[#ff6154]"
                >
                  <ThumbsUp className="h-5 w-5 mr-2" />
                  Like
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleReaction('insightful')}
                  disabled={reacting}
                  className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500"
                >
                  <Heart className="h-5 w-5 mr-2" />
                  Insightful
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
