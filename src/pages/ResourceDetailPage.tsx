import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import type { MediaFile } from "@/services/mainServices"
import {
  ArrowBigUp,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Link as LinkIcon,
  FileText,
  User,
  CalendarClock,
  GraduationCap,
  Tag as TagIcon,
  Image as ImageIcon,
  Video,
  Download,
  Edit,
  Trash2,
  Eye,
  X,
  LayoutGrid,
  List,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import type { ResourceItem } from "@/data/resources"
import { mapBackendResourceToItem } from "@/data/resources"
import {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  type Collection,
  getResourceById,
  updateResource,
  deleteResource,
  type BackendResource,
} from "@/services/mainServices"

const ResourceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const [resource, setResource] = useState<ResourceItem | null>(null)
  const [backendResource, setBackendResource] = useState<BackendResource | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [savedResourceIds, setSavedResourceIds] = useState<Set<string>>(new Set())
  const [votedResourceIds, setVotedResourceIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [previewedPdfUrls, setPreviewedPdfUrls] = useState<Set<string>>(new Set())
  const [filesViewMode, setFilesViewMode] = useState<"grid" | "list">("list")
  
  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCourseCode, setEditCourseCode] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [editMedia, setEditMedia] = useState<BackendResource["media"] | null>(null)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [editingCaptions, setEditingCaptions] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id || !user || !accessToken) return
    fetchResource()
  }, [id, user, accessToken])

  const fetchResource = async () => {
    if (!id || !user || !accessToken) return

    try {
      setFetching(true)
      const backendRes = await getResourceById(id, accessToken)
      setBackendResource(backendRes)
      const mappedResource = mapBackendResourceToItem(backendRes)
      setResource(mappedResource)
      
      // Initialize edit form
      setEditTitle(backendRes.title || "")
      setEditDescription(backendRes.description || "")
      setEditCourseCode(backendRes.course_code || "")
      setEditTags(backendRes.hashtags || [])
      setEditMedia(backendRes.media || { files: [], images: [], videos: [], urls: [] })
      setNewFiles([])
      setEditingCaptions({})
    } catch (error) {
      console.error("Failed to load resource detail:", error)
      setResource(null)
      setBackendResource(null)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadCollections()
  }, [user])

  const loadCollections = async () => {
    if (!user || !accessToken) return
    try {
      const data = await getAllCollections(accessToken)
      const mine = data.filter((c) => c.owner_id === user.id)
      setCollections(mine)
      const savedIds = new Set<string>()
      mine.forEach((collection) => {
        collection.collection_items?.forEach((item) => {
          if (item.type === "RESOURCE" && item.reference_id) {
            savedIds.add(item.reference_id)
          }
        })
      })
      setSavedResourceIds(savedIds)
    } catch (error) {
      console.error("Failed to load collections:", error)
    }
  }

  const getOrCreateMainRepository = async (): Promise<Collection> => {
    if (!user || !accessToken) throw new Error("User not authenticated")
    const mainRepo = collections.find((c) => c.name === "Main Repository")
    if (mainRepo) return mainRepo

    const newCollection = await createCollection({
      name: "Main Repository",
      description: "Default collection for saved resources",
      visibility: "PRIVATE",
      tags: [],
    }, accessToken)
    setCollections([newCollection, ...collections])
    return newCollection
  }

  const handleSaveToCollection = () => {
    if (!user) {
      toast.error("Please log in to save resources")
      return
    }
    setIsSaveDialogOpen(true)
  }

  const handleSaveResource = async (collectionId: string | null) => {
    if (!user || !resource || !accessToken) return

    try {
      setLoading(true)
      let targetCollectionId = collectionId

      if (!targetCollectionId) {
        const mainRepo = await getOrCreateMainRepository()
        targetCollectionId = mainRepo.id
      }

      // Add resource by updating refs via updateCollection
      const targetCollection = await getCollectionById(targetCollectionId, accessToken)
      const currentRefs = targetCollection.collection_items
        ?.map((item) => item.reference_id)
        .filter(Boolean) as string[] || []
      const nextRefs = currentRefs.includes(resource.id)
        ? currentRefs
        : [...currentRefs, resource.id]
      await updateCollection(targetCollectionId, { refs: nextRefs }, accessToken)

      const updatedCollections = (await getAllCollections(accessToken)).filter((c) => c.owner_id === user.id)
      setCollections(updatedCollections)

      const savedIds = new Set<string>()
      updatedCollections.forEach((collection) => {
        collection.collection_items?.forEach((item) => {
          if (item.type === "RESOURCE" && item.reference_id) {
            savedIds.add(item.reference_id)
          }
        })
      })
      setSavedResourceIds(savedIds)

      setIsSaveDialogOpen(false)
      const collectionName = updatedCollections.find((c) => c.id === targetCollectionId)?.name || "Main Repository"

      toast.success("Resource saved!", {
        description: `Saved to "${collectionName}"`,
      })
    } catch (error) {
      console.error("Save resource error:", error)
      toast.error("Failed to save resource", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVote = () => {
    if (!resource) return
    const newVotedIds = new Set(votedResourceIds)
    if (isVoted) {
      newVotedIds.delete(resource.id)
      setVotedResourceIds(newVotedIds)
      toast.success("Vote removed", {
        description: `You removed your vote from "${resource.title}"`,
      })
    } else {
      newVotedIds.add(resource.id)
      setVotedResourceIds(newVotedIds)
      toast.success("Upvoted!", {
        description: `You upvoted "${resource.title}"`,
      })
    }
  }

  const isOwner = user && backendResource && backendResource.owner_id === user.id

  const handleAddTag = () => {
    if (tagInput.trim() && !editTags.includes(tagInput.trim())) {
      setEditTags([...editTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag))
  }

  const handleEdit = async () => {
    if (!id || !user || !accessToken || !backendResource || !editMedia) return

    try {
      setLoading(true)
      
      // Apply caption edits to media
      const updatedMedia = { ...editMedia }
      Object.keys(editingCaptions).forEach((key) => {
        const [type, indexStr] = key.split("-")
        const index = parseInt(indexStr, 10)
        if (type === "images" && updatedMedia.images && updatedMedia.images[index]) {
          updatedMedia.images[index] = { ...updatedMedia.images[index], caption: editingCaptions[key] || null }
        } else if (type === "videos" && updatedMedia.videos && updatedMedia.videos[index]) {
          updatedMedia.videos[index] = { ...updatedMedia.videos[index], caption: editingCaptions[key] || null }
        } else if (type === "files" && updatedMedia.files && updatedMedia.files[index]) {
          updatedMedia.files[index] = { ...updatedMedia.files[index], caption: editingCaptions[key] || null }
        } else if (type === "urls" && updatedMedia.urls && updatedMedia.urls[index]) {
          updatedMedia.urls[index] = { ...updatedMedia.urls[index], caption: editingCaptions[key] || null }
        }
      })

      // Validate title is not empty (backend requires truthy title)
      if (!editTitle.trim()) {
        toast.error("Title is required", {
          description: "Please provide a title for the resource",
        })
        setLoading(false)
        return
      }

      // Check if we need to send media
      const originalMedia = backendResource.media || { files: [], images: [], videos: [], urls: [] }
      const hasRemovedFiles = 
        (editMedia.files?.length || 0) < (originalMedia.files?.length || 0) ||
        (editMedia.images?.length || 0) < (originalMedia.images?.length || 0) ||
        (editMedia.videos?.length || 0) < (originalMedia.videos?.length || 0) ||
        (editMedia.urls?.length || 0) < (originalMedia.urls?.length || 0)
      
      const hasCaptionChanges = Object.keys(editingCaptions).length > 0
      const hasNewFiles = newFiles.length > 0
      
      // Build payload - backend requires:
      const payload: any = {
        title: editTitle.trim(), // Always non-empty (validated above)
        description: editDescription.trim() || "", // Always defined (empty string is fine)
      }
      
      // Always send media when:
      // 1. Files were removed
      // 2. Captions were changed
      // 3. New files are being added (to preserve existing files)
      if (hasRemovedFiles || hasCaptionChanges || hasNewFiles) {
        const finalMedia: BackendResource["media"] = {
          files: (updatedMedia.files || []).map(file => ({ ...file })),
          images: (updatedMedia.images || []).map(img => ({ ...img })),
          videos: (updatedMedia.videos || []).map(vid => ({ ...vid })),
          urls: (updatedMedia.urls || []).map(url => ({ ...url })),
        }
        payload.media = finalMedia
      }
      
      // Add optional fields if they have values
      if (editCourseCode.trim()) {
        payload.course_code = editCourseCode.trim()
      }
      if (editTags.length > 0) {
        payload.hashtags = editTags
      }
      if (newFiles.length > 0) {
        payload.files = newFiles
      }


      const updated = await updateResource(
        id,
        payload,
        accessToken,
      )

      setBackendResource(updated)
      const mappedResource = mapBackendResourceToItem(updated)
      setResource(mappedResource)
      setIsEditDialogOpen(false)
      setNewFiles([])
      setEditingCaptions({})
      toast.success("Resource updated successfully!")
    } catch (error) {
      console.error("Update error:", error)
      toast.error("Failed to update resource", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFile = (type: "files" | "images" | "videos" | "urls", index: number) => {
    if (!editMedia) return
    
    const updatedMedia = { ...editMedia }
    updatedMedia[type] = [...updatedMedia[type]]
    updatedMedia[type].splice(index, 1)
    setEditMedia(updatedMedia)
    
    // Remove caption edit if exists
    const key = `${type}-${index}`
    const newCaptions = { ...editingCaptions }
    delete newCaptions[key]
    // Update keys for items after the removed one
    Object.keys(newCaptions).forEach((k) => {
      const [t, idxStr] = k.split("-")
      const idx = parseInt(idxStr, 10)
      if (t === type && idx > index) {
        newCaptions[`${type}-${idx - 1}`] = newCaptions[k]
        delete newCaptions[k]
      }
    })
    setEditingCaptions(newCaptions)
  }

  const handleUpdateCaption = (type: "files" | "images" | "videos" | "urls", index: number, caption: string) => {
    setEditingCaptions({
      ...editingCaptions,
      [`${type}-${index}`]: caption,
    })
  }

  const handleDelete = async () => {
    if (!id || !user || !accessToken) return

    try {
      setLoading(true)
      await deleteResource(id, accessToken)
      toast.success("Resource deleted successfully!")
      navigate("/resource")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete resource", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleDeleteFile = async () => {
    toast.info("Deleting individual files is not supported right now.")
  }

  if (fetching) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-base text-gray-500">Loading resource...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#141414] mb-2">Resource not found</h2>
          <p className="text-base text-gray-500 mb-4">The resource you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/resource")} className="bg-[#036aff] text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>
        </div>
      </div>
    )
  }

  const isSaved = resource ? savedResourceIds.has(resource.id) : false
  const isVoted = resource ? votedResourceIds.has(resource.id) : false

  return (
    <div className="space-y-4">
      {/* Breadcrumb + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/resource")}
          className="text-[#141414] hover:bg-[#f5f5f5] px-0"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Resources
        </Button>
      </div>

      {/* Main content grid - 30/70 split on large screens */}
      <div className="grid gap-6 lg:grid-cols-10">
        {/* Left column - Main resource info (30% width on large screens) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main resource card with title, summary, metadata, and tags */}
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="px-6 py-6 space-y-6">
              {/* Title and type badge */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold text-[#141414] leading-tight">{resource.title}</h1>
                  <Badge className="bg-[#036aff]/10 text-[#036aff] text-sm font-semibold capitalize px-3 py-1.5 flex-shrink-0">
                    {resource.type === "url" ? "Document link" : "Uploaded document"}
                  </Badge>
                </div>
                
                {/* Summary */}
                {resource.summary && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {resource.summary}
                  </p>
                )}
              </div>

              {/* Resource metadata - Vertical cards */}
              <div className="space-y-3">
                {[
                  {
                    label: "Course",
                    value: `${resource.courseCode}${resource.courseName ? ` · ${resource.courseName}` : ""}`,
                    icon: GraduationCap,
                  },
                  {
                    label: "Contributor",
                    value: resource.contributor,
                    icon: User,
                  },
                  {
                    label: "Uploaded",
                    value: resource.uploadedAt,
                    icon: CalendarClock,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gradient-to-br from-[#f8f9fb] to-white p-3 hover:shadow-sm transition-shadow">
                    <div className="p-2 rounded-lg bg-[#036aff]/10 flex-shrink-0">
                      <item.icon className="h-4 w-4 text-[#036aff]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">{item.label}</p>
                      <p className="text-sm text-[#141414] font-semibold break-words">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags & topics */}
              {(resource.tags && resource.tags.length > 0) && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="h-4 w-4 text-[#036aff]" />
                    <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Tags & Topics
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(resource.tags || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="border-gray-300 text-xs capitalize px-2.5 py-1 hover:bg-gray-50 transition-colors">
                        {tag.replace("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right column - Files & Attachments (70% width on large screens) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Files & attachments - Main content area */}
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#141414] mb-2">
                    Files & Attachments
                  </h2>
                  <p className="text-sm text-gray-500">
                    View, download, or preview files shared with this resource
                  </p>
                </div>
                
                {/* Quick Actions - Icon buttons with tooltips */}
                <TooltipProvider>
                  <div className="flex items-center gap-2">
                    {user && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleSaveToCollection}
                            size="icon"
                            className={cn(
                              "h-10 w-10 transition-all",
                              isSaved 
                                ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300" 
                                : "bg-[#036aff] text-white hover:bg-[#036aff]/90 shadow-sm hover:shadow-md"
                            )}
                            variant={isSaved ? "outline" : "default"}
                          >
                            {isSaved ? (
                              <BookmarkCheck className="h-5 w-5" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isSaved ? "Saved to Collection" : "Save to Collection"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleVote}
                          size="icon"
                          className={cn(
                            "h-10 w-10 border transition-all",
                            isVoted
                              ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          )}
                          variant="outline"
                        >
                          <ArrowBigUp className={cn(
                            "h-5 w-5",
                            isVoted && "fill-orange-600"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upvote ({resource.votes || 0} {resource.votes === 1 ? 'vote' : 'votes'})</p>
                      </TooltipContent>
                    </Tooltip>

                    {isOwner && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setIsEditDialogOpen(true)}
                              size="icon"
                              className="h-10 w-10 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700"
                              variant="outline"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Resource</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setIsDeleteDialogOpen(true)}
                              size="icon"
                              className="h-10 w-10 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-700"
                              variant="outline"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Resource</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </TooltipProvider>
              </div>
              <div className="space-y-6">
                {/* Images */}
                {resource.media?.images && resource.media.images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200">
                      <div className="p-1.5 rounded-lg bg-blue-50">
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#141414]">Images</h3>
                        <p className="text-xs text-gray-500">{resource.media.images.length} {resource.media.images.length === 1 ? 'image' : 'images'} - Click to view full size</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {resource.media.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg border-2 border-gray-200 overflow-hidden bg-white hover:border-[#036aff] transition-all hover:shadow-lg">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={img.url}
                              alt={img.caption || img.originalName}
                              className="w-full h-40 object-cover"
                            />
                          </a>
                          {img.caption && (
                            <div className="p-2 bg-white border-t border-gray-100">
                              <p className="text-xs text-gray-600 line-clamp-2">{img.caption}</p>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full hover:bg-white shadow-md"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4 text-[#036aff]" />
                            </a>
                            {isOwner && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFile()
                                }}
                                className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-md"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {resource.media?.videos && resource.media.videos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200">
                      <div className="p-1.5 rounded-lg bg-purple-50">
                        <Video className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#141414]">Videos</h3>
                        <p className="text-xs text-gray-500">{resource.media.videos.length} {resource.media.videos.length === 1 ? 'video' : 'videos'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {resource.media.videos.map((video, idx) => {
                        const videoSize = video.size ? (video.size / 1024 / 1024).toFixed(2) : "0"
                        return (
                          <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                  <p className="text-sm font-semibold text-[#141414] truncate">{video.originalName || "Untitled"}</p>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                  {videoSize} MB
                                </p>
                                {video.caption && (
                                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">{video.caption}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                >
                                  <a
                                    href={video.url || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Download
                                  </a>
                                </Button>
                                {isOwner && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={() => handleDeleteFile()}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Files (PDFs, DOCX, etc.) - Display non-image, non-video files from files array */}
                {resource.media?.files && resource.media.files.length > 0 && (() => {
                  // Filter out files that are already in images or videos arrays
                  const imageUrls = new Set((resource.media?.images || []).map((img: MediaFile) => img.url))
                  const videoUrls = new Set((resource.media?.videos || []).map((vid: MediaFile) => vid.url))
                  const documentFiles = resource.media.files.filter((file: MediaFile) => 
                    !imageUrls.has(file.url) && !videoUrls.has(file.url)
                  )
                  
                  if (documentFiles.length === 0) return null
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-green-50">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-[#141414]">Documents & Files</h3>
                            <p className="text-xs text-gray-500">{documentFiles.length} {documentFiles.length === 1 ? 'file' : 'files'} (PDFs, Office docs, etc.)</p>
                          </div>
                        </div>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setFilesViewMode("list")}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                              filesViewMode === "list"
                                ? "bg-[#036aff] text-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <List className="h-3.5 w-3.5" />
                            List
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilesViewMode("grid")}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                              filesViewMode === "grid"
                                ? "bg-[#036aff] text-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Grid
                          </button>
                        </div>
                      </div>
                      {filesViewMode === "grid" ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {documentFiles.map((doc: MediaFile, idx: number) => {
                            const isPdf = (doc.format || "").toLowerCase() === "pdf"
                            const fileSize = doc.size ? (doc.size / 1024 / 1024).toFixed(2) : "0"
                            const fileFormat = (doc.format || "unknown").toUpperCase()
                            return (
                              <div key={idx} className="group relative rounded-lg border-2 border-gray-200 overflow-hidden bg-white hover:border-[#036aff] transition-all hover:shadow-lg">
                                <div className="p-4 space-y-3">
                                  <div className="flex items-center justify-center h-24 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                    <FileText className="h-12 w-12 text-green-600" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-[#141414] line-clamp-2 min-h-[2.5rem]">{doc.originalName || "Untitled"}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span>{fileSize} MB</span>
                                      <span>•</span>
                                      <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">{fileFormat}</span>
                                    </div>
                                  </div>
                                  {doc.caption && (
                                    <p className="text-xs text-gray-600 line-clamp-2">{doc.caption}</p>
                                  )}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full hover:bg-white shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-4 w-4 text-[#036aff]" />
                                  </a>
                                  {isOwner && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteFile()
                                      }}
                                      className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-md"
                                      disabled={loading}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {isPdf && (
                                  <div className="p-3 border-t border-gray-100 bg-gray-50">
                                    {!previewedPdfUrls.has(doc.url) ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setPreviewedPdfUrls(prev => new Set(prev).add(doc.url))
                                        }}
                                        className="w-full justify-center gap-2 border-[#036aff]/30 text-[#036aff] hover:bg-[#036aff]/5 text-xs"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        Preview
                                      </Button>
                                    ) : (
                                      <div className="space-y-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setPreviewedPdfUrls(prev => {
                                              const newSet = new Set(prev)
                                              newSet.delete(doc.url)
                                              return newSet
                                            })
                                          }}
                                          className="w-full justify-center gap-2 h-7 text-xs text-gray-500 hover:text-gray-700"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                          Close Preview
                                        </Button>
                                        <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-[#f5f5f5] shadow-inner">
                                          <embed
                                            src={`${doc.url}#toolbar=1`}
                                            type="application/pdf"
                                            className="w-full h-[400px]"
                                            title={doc.originalName || "PDF Preview"}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documentFiles.map((doc: MediaFile, idx: number) => {
                          const isPdf = (doc.format || "").toLowerCase() === "pdf"
                          const fileSize = doc.size ? (doc.size / 1024 / 1024).toFixed(2) : "0"
                          const fileFormat = (doc.format || "unknown").toUpperCase()
                          return (
                            <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <p className="text-sm font-semibold text-[#141414] truncate">{doc.originalName || "Untitled"}</p>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{fileSize} MB</span>
                                    <span>•</span>
                                    <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">{fileFormat}</span>
                                  </div>
                                  {doc.caption && (
                                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">{doc.caption}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                  >
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Download className="h-3.5 w-3.5 mr-1.5" />
                                      Download
                                    </a>
                                  </Button>
                                  {isOwner && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                      onClick={() => {
                                        handleDeleteFile()
                                      }}
                                      disabled={loading}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {isPdf && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  {!previewedPdfUrls.has(doc.url) ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewedPdfUrls(prev => new Set(prev).add(doc.url))
                                      }}
                                      className="w-full justify-center gap-2 border-[#036aff]/30 text-[#036aff] hover:bg-[#036aff]/5"
                                    >
                                      <Eye className="h-4 w-4" />
                                      Preview PDF
                                    </Button>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-700">PDF Preview</p>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setPreviewedPdfUrls(prev => {
                                              const newSet = new Set(prev)
                                              newSet.delete(doc.url)
                                              return newSet
                                            })
                                          }}
                                          className="h-8 text-gray-500 hover:text-gray-700"
                                        >
                                          <X className="h-4 w-4 mr-1.5" />
                                          Close Preview
                                        </Button>
                                      </div>
                                      <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-[#f5f5f5] shadow-inner">
                                        <embed
                                          src={`${doc.url}#toolbar=1`}
                                          type="application/pdf"
                                          className="w-full h-[600px]"
                                          title={doc.originalName || "PDF Preview"}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      )}
                    </div>
                  )
                })()}

                {/* URLs */}
                {resource.media?.urls && resource.media.urls.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-gray-200">
                      <div className="p-1.5 rounded-lg bg-orange-50">
                        <LinkIcon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#141414]">External Links</h3>
                        <p className="text-xs text-gray-500">{resource.media.urls.length} {resource.media.urls.length === 1 ? 'link' : 'links'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {resource.media.urls.map((urlItem, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <LinkIcon className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                <a
                                  href={urlItem.url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-[#036aff] hover:underline break-all"
                                >
                                  {urlItem.url || "No URL"}
                                </a>
                              </div>
                              {urlItem.caption && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">{urlItem.caption}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8"
                              >
                                <a
                                  href={urlItem.url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Open
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  if (urlItem.url) {
                                    navigator.clipboard.writeText(urlItem.url)
                                    toast.success("Link copied to clipboard")
                                  }
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!resource.media || 
                  ((resource.media.files?.length || 0) === 0 && 
                   (resource.media.images?.length || 0) === 0 && 
                   (resource.media.videos?.length || 0) === 0 && 
                   (resource.media.urls?.length || 0) === 0)) && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600 mb-1">No files or attachments</p>
                    <p className="text-xs text-gray-500">This resource doesn't have any files attached yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save to Collection Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Save to Collection</DialogTitle>
            <DialogDescription className="text-base">
              Choose a collection to save this resource to, or save to your Main Repository.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left h-auto py-4 px-4 border-2",
                  "hover:bg-[#f5f5f5]"
                )}
                onClick={() => handleSaveResource(null)}
                disabled={loading}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-base font-semibold text-[#141414]">Main Repository</span>
                  <span className="text-sm text-gray-500">
                    {collections.find((c) => c.name === "Main Repository")
                      ? "Default collection for saved resources"
                      : "Will be created automatically"}
                  </span>
                </div>
              </Button>
            </div>

            {collections.filter((c) => c.name !== "Main Repository").length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Your Collections</p>
                {collections
                  .filter((c) => c.name !== "Main Repository")
                  .map((collection) => (
                    <Button
                      key={collection.id}
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left h-auto py-4 px-4",
                        "hover:bg-[#f5f5f5]"
                      )}
                      onClick={() => handleSaveResource(collection.id)}
                      disabled={loading}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-base font-semibold text-[#141414]">
                          {collection.name}
                        </span>
                        {collection.description && (
                          <span className="text-sm text-gray-500">{collection.description}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {collection.collection_items?.length || 0} items
                        </span>
                      </div>
                    </Button>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
              onClick={() => {
                setIsSaveDialogOpen(false)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Resource</DialogTitle>
            <DialogDescription className="text-base">
              Update resource information, manage files, and edit captions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="border-gray-200 text-base h-11"
              />
              <Input
                value={editCourseCode}
                onChange={(e) => setEditCourseCode(e.target.value)}
                placeholder="Course code (e.g. 503045)"
                className="border-gray-200 text-base h-11"
              />
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tags</label>
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
                  className="border-gray-200 text-base h-11"
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-gray-200 text-sm px-3 py-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Files */}
            {editMedia && (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700">Manage Files</h3>
                
                {/* Images */}
                {editMedia.images && editMedia.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Images</p>
                    {editMedia.images.map((img, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg">
                        <img src={img.url} alt={img.caption || img.originalName} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-gray-600">{img.originalName}</p>
                          <Input
                            value={editingCaptions[`images-${idx}`] ?? img.caption ?? ""}
                            onChange={(e) => handleUpdateCaption("images", idx, e.target.value)}
                            placeholder="Caption (optional)"
                            className="text-xs h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFile("images", idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files (PDFs, DOCX, etc.) - Display non-image, non-video files from files array */}
                {editMedia.files && editMedia.files.length > 0 && (() => {
                  // Filter out files that are already in images or videos arrays
                  const imageUrls = new Set((editMedia.images || []).map((img: MediaFile) => img.url))
                  const videoUrls = new Set((editMedia.videos || []).map((vid: MediaFile) => vid.url))
                  const documentFiles = editMedia.files.filter((file: MediaFile) => 
                    !imageUrls.has(file.url) && !videoUrls.has(file.url)
                  )
                  
                  if (documentFiles.length === 0) return null
                  
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Files</p>
                      {documentFiles.map((doc: MediaFile, idx: number) => {
                        // Find the index in the files array
                        const fileIndex = editMedia.files?.findIndex((f: MediaFile) => f.url === doc.url) ?? idx
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                            <FileText className="h-8 w-8 text-[#036aff]" />
                            <div className="flex-1 space-y-1">
                              <p className="text-xs text-gray-600">{doc.originalName}</p>
                              <Input
                                value={editingCaptions[`files-${fileIndex}`] ?? doc.caption ?? ""}
                                onChange={(e) => handleUpdateCaption("files", fileIndex, e.target.value)}
                                placeholder="Caption (optional)"
                                className="text-xs h-8"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveFile("files", fileIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Videos */}
                {editMedia.videos && editMedia.videos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Videos</p>
                    {editMedia.videos.map((video, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                        <Video className="h-8 w-8 text-[#036aff]" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-gray-600">{video.originalName}</p>
                          <Input
                            value={editingCaptions[`videos-${idx}`] ?? video.caption ?? ""}
                            onChange={(e) => handleUpdateCaption("videos", idx, e.target.value)}
                            placeholder="Caption (optional)"
                            className="text-xs h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFile("videos", idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* URLs */}
                {editMedia.urls && editMedia.urls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Links</p>
                    {editMedia.urls.map((urlItem, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                        <LinkIcon className="h-8 w-8 text-[#036aff]" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-gray-600 break-all">{urlItem.url}</p>
                          <Input
                            value={editingCaptions[`urls-${idx}`] ?? urlItem.caption ?? ""}
                            onChange={(e) => handleUpdateCaption("urls", idx, e.target.value)}
                            placeholder="Caption (optional)"
                            className="text-xs h-8"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFile("urls", idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add New Files */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700">Add New Files</h3>
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                  multiple
                  className="hidden"
                  id="edit-file-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setNewFiles([...newFiles, ...files])
                  }}
                />
                <label htmlFor="edit-file-input" className="cursor-pointer font-semibold text-[#036aff] text-base">
                  {newFiles.length > 0
                    ? `${newFiles.length} file${newFiles.length > 1 ? "s" : ""} selected`
                    : "Choose files to add"}
                </label>
                {newFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <button
                          type="button"
                          onClick={() => setNewFiles(newFiles.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs">PDF, Office documents, images, or videos. Max 10MB per file.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
              onClick={() => {
                setIsEditDialogOpen(false)
                setNewFiles([])
                setEditingCaptions({})
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
              onClick={handleEdit}
              disabled={loading || !editTitle.trim()}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Resource</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete "{resource?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 text-white font-bold hover:bg-red-700 text-sm px-5 py-2.5"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResourceDetailPage

