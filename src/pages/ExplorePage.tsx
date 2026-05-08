import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getPublishedDocuments,
  getDocumentsByAuthor,
  createDocument,
  type Document,
  type CreateDocumentPayload,
} from "@/services/documents/documentService"
import { FileText, Eye, ThumbsUp, Search, Plus, Compass, BookOpen } from "lucide-react"

type DocumentScope = "all" | "mine"

// Simple card component for documents
function DocumentCard({ 
  doc, 
  onClick 
}: { 
  doc: Document
  onClick: () => void 
}) {
  const snippet = doc.body?.slice(0, 150) || ""
  const displaySnippet = snippet.length > 150 ? `${snippet}...` : snippet

  return (
    <Card 
      className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl hover:border-[#036aff] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-[#036aff]/20 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-[#036aff]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white line-clamp-1">{doc.title}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">{displaySnippet || "No content"}</p>
            
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {doc.view_count || 0} views
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {doc.reactions?.like || 0} likes
              </span>
              <span>{doc.comment_count || 0} comments</span>
            </div>

            {doc.category_tags && doc.category_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {doc.category_tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-[#2a2a2a] text-gray-400">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ExplorePage = () => {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [scope, setScope] = useState<DocumentScope>("all")
  
  // Create form state
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setFetching(true)
      let docs: Document[] = []
      
      if (scope === "mine" && user) {
        if (accessToken) {
          docs = await getDocumentsByAuthor(user.id, true, 20, 0)
        }
      } else {
        docs = await getPublishedDocuments(20, 0)
      }
      
      // Client-side search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        docs = docs.filter(d => 
          d.title.toLowerCase().includes(term) || 
          d.body?.toLowerCase().includes(term) ||
          d.category_tags?.some(t => t.toLowerCase().includes(term))
        )
      }
      
      setDocuments(docs)
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Don't show toast for fetch errors - empty state is handled in UI
    } finally {
      setFetching(false)
    }
  }, [scope, user, accessToken, searchTerm])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleAddTag = () => {
    if (tagInput.trim() && !newTags.includes(tagInput.trim())) {
      setNewTags([...newTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag))
  }

  const handleCreateDocument = async () => {
    if (!user || !accessToken) {
      toast.error("Please log in to create documents")
      return
    }

    if (!newTitle.trim()) {
      toast.error("Title required")
      return
    }

    try {
      setLoading(true)
      const payload: CreateDocumentPayload = {
        title: newTitle.trim(),
        body: newBody.trim() || " ",
        category_tags: newTags.length > 0 ? newTags : undefined,
        is_published: true,
      }
      
      await createDocument(payload, accessToken)
      
      // Reset form
      setNewTitle("")
      setNewBody("")
      setNewTags([])
      setTagInput("")
      setIsCreateOpen(false)
      
      toast.success("Document created!")
      fetchDocuments()
    } catch (error) {
      console.error("Create error:", error)
      toast.error("Failed to create document")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] p-6">
      <div className="max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white gap-2 mb-2">
            Explore
          </h1>
          <p className="text-base text-gray-400 mt-1">
            Discover and share knowledge documents with the community
          </p>
        </div>
        {user && accessToken && (
          <Button
            className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(220px,0.3fr)]">
        <div className="space-y-6">
          <Tabs value={scope} onValueChange={(v) => setScope(v as DocumentScope)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] p-1 h-auto">
                <TabsTrigger
                  value="all"
                  className={cn(
                    "px-4 py-2 rounded-md font-bold text-sm",
                    scope === "all"
                      ? "bg-[#036aff] text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  All Documents
                </TabsTrigger>
                {user && (
                  <TabsTrigger
                    value="mine"
                    className={cn(
                      "px-4 py-2 rounded-md font-bold text-sm",
                      scope === "mine"
                        ? "bg-[#036aff] text-white"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    My Documents
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value={scope} className="space-y-6 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search documents by title, content, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-3">
                {fetching ? (
                  <p className="text-base text-gray-400 text-center py-12">Loading documents...</p>
                ) : documents.length === 0 ? (
                  <Card className="border border-[#2a2a2a] bg-[#1a1a1a]">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No documents found.</p>
                      {user && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setIsCreateOpen(true)}
                        >
                          Create your first document
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  documents.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      doc={doc}
                      onClick={() => navigate(`/document/${doc._id}`)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-[#1a1a1a]">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tracking-wide text-white">
                  About Explore
                </span>
                <Compass className="h-4 w-4 text-[#036aff]" />
              </div>
              <p className="text-sm text-white leading-relaxed">
                Explore is a collaborative knowledge base where you can discover, 
                create, and share documents with the developer community.
              </p>
            </CardContent>
          </Card>

          <Card className="border rounded-xl bg-[#1a1a1a]">
            <CardContent className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#2a2a2a] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#036aff]">{documents.length}</div>
                  <div className="text-xs text-white">Documents</div>
                </div>
                <div className="bg-[#2a2a2a] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#036aff]">
                    {documents.reduce((acc, d) => acc + (d.view_count || 0), 0)}
                  </div>
                  <div className="text-xs text-white">Total Views</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#1a1a1a]">
            <CardContent className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Search Tips</h3>
              <ul className="text-sm text-white space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#036aff]">•</span>
                  Use keywords to find specific topics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#036aff]">•</span>
                  Filter by tags for precise results
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#036aff]">•</span>
                  Check view counts for popular content
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Document Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a1a] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Create New Document</DialogTitle>
            <DialogDescription className="text-base text-gray-400">
              Share your knowledge with the community.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document title"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-base h-11"
            />

            <textarea
              rows={6}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write your document content here..."
              className="w-full rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-[#036aff]/20"
            />

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Tags</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-white text-base h-11"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="border-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
                >
                  Add
                </Button>
              </div>
              {newTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-[#2a2a2a] text-sm px-3 py-1 text-gray-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-gray-500 hover:text-gray-300"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => setIsCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90"
              onClick={handleCreateDocument}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

export default ExplorePage

