import { useMemo, useState, useEffect, useCallback } from "react"
import { ResourceCard } from "@/components/resource/ResourceCard"
import { ResourceFilters } from "@/components/resource/ResourceFilters"
import { type ResourceItem, mapBackendResourceToItem } from "@/data/resources"
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
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  type Collection,
  getResources,
  createResource,
} from "@/services/mainServices"

type ResourceScope = "all" | "following" | "mine"

const ResourcePage = () => {
  const { user, accessToken } = useAuth()
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadCourse, setUploadCourse] = useState("")
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadLink, setUploadLink] = useState("")
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [savedResourceIds, setSavedResourceIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [scope, setScope] = useState<ResourceScope>("all")

  const fetchResources = useCallback(async () => {
    if (!user || !accessToken) return

    try {
      setFetching(true)
      const response = await getResources(
        {
          filter: scope === "mine" ? "my" : scope === "following" ? "following" : "all",
          course_code: selectedCourse || undefined,
          hashtag: selectedTag || undefined,
          search: searchTerm || undefined,
        },
        accessToken,
      )

      const mappedResources = response.resources.map(mapBackendResourceToItem)
      setResources(mappedResources)
    } catch (error) {
      console.error("Failed to fetch resources:", error)
      // Set empty array on error so UI still renders
      setResources([])
    } finally {
      setFetching(false)
    }
  }, [user, accessToken, scope, selectedCourse, selectedTag, searchTerm])

  // Fetch resources from API
  useEffect(() => {
    if (user && accessToken) {
      fetchResources()
    } else {
      // If not logged in, show empty state
      setResources([])
      setFetching(false)
    }
  }, [fetchResources, user, accessToken])

  // Load collections on mount
  useEffect(() => {
    if (!user) return
    loadCollections()
  }, [user])

  const loadCollections = async () => {
    if (!user) return
    try {
      if (!accessToken) return
      const data = await getAllCollections(accessToken)
      const mine = data.filter((c) => c.owner_id === user.id)
      setCollections(mine)
      // Check which resources are already saved
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

  // Get or create main repository collection
  const getOrCreateMainRepository = async (): Promise<Collection> => {
    if (!user) throw new Error("User not authenticated")
    
    // Check if main repository exists
    const mainRepo = collections.find((c) => c.name === "Main Repository")
    if (mainRepo) return mainRepo

    // Create main repository
    if (!accessToken) throw new Error("User not authenticated")
    const newCollection = await createCollection({
      name: "Main Repository",
      description: "Default collection for saved resources",
      visibility: "PRIVATE",
      tags: [],
    }, accessToken)
    setCollections([newCollection, ...collections])
    return newCollection
  }

  const handleSaveToCollection = (resourceId: string) => {
    if (!user) {
      toast.error("Please log in to save resources")
      return
    }
    setSelectedResourceId(resourceId)
    setIsSaveDialogOpen(true)
  }

  const handleSaveResource = async (collectionId: string | null) => {
    if (!user || !selectedResourceId) return

    try {
      setLoading(true)
      let targetCollectionId = collectionId

      // If no collection selected, use or create main repository
      if (!targetCollectionId) {
        const mainRepo = await getOrCreateMainRepository()
        targetCollectionId = mainRepo.id
      }

      // Add resource to collection
      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      // Add resource by updating refs on the target collection
      const targetCollection = await getCollectionById(targetCollectionId, accessToken)
      const currentRefs = targetCollection.collection_items
        ?.map((item) => item.reference_id)
        .filter(Boolean) as string[] || []
      const nextRefs = currentRefs.includes(selectedResourceId)
        ? currentRefs
        : [...currentRefs, selectedResourceId]
      await updateCollection(targetCollectionId, { refs: nextRefs }, accessToken)

      // Reload collections to get updated data
      const updatedCollections = (await getAllCollections(accessToken)).filter((c) => c.owner_id === user.id)
      setCollections(updatedCollections)
      
      // Check which resources are already saved
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
      setSelectedResourceId(null)
      
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

  const filteredResources = useMemo(() => {
    // Resources are already filtered by the API, but we can do client-side filtering if needed
    return resources.sort((a, b) => b.votes - a.votes)
  }, [resources])

  const handleVote = (resourceId: string) => {
    // TODO: Implement upvote API call when backend supports it
    const resource = resources.find((r) => r.id === resourceId)
    setResources((prev) =>
      prev.map((resource) =>
        resource.id === resourceId ? { ...resource, votes: resource.votes + 1 } : resource,
      ),
    )
    toast.success("Upvoted!", {
      description: `You upvoted "${resource?.title}"`,
    })
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !uploadTags.includes(tagInput.trim())) {
      setUploadTags([...uploadTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setUploadTags(uploadTags.filter((t) => t !== tag))
  }

  const handleUpload = async () => {
    if (!user || !accessToken) {
      toast.error("Please log in to upload resources")
      return
    }

    if (!uploadTitle.trim()) {
      toast.error("Title required", {
        description: "Please provide a title for your resource",
      })
      return
    }

    const link = uploadLink.trim()
    const hasFiles = uploadFiles.length > 0

    if (!hasFiles && !link) {
      toast.error("File or link required", {
        description: "Please upload at least one file or provide a link",
      })
      return
    }

    try {
      setLoading(true)
      const newResource = await createResource(
        {
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || undefined,
          course_code: uploadCourse.trim() || undefined,
          resource_type: hasFiles ? "DOCUMENT" : "URL",
          hashtags: uploadTags.length > 0 ? uploadTags : undefined,
          files: hasFiles ? uploadFiles : undefined,
          linkUrl: !hasFiles ? link : undefined,
        },
        accessToken,
      )

      const mappedResource = mapBackendResourceToItem(newResource)
      setResources((prev) => [mappedResource, ...prev])

      // Reset form
    setUploadTitle("")
    setUploadCourse("")
    setUploadDescription("")
      setUploadLink("")
      setUploadFiles([])
      setUploadTags([])
      setTagInput("")
    setIsUploadOpen(false)

    toast.success("Resource uploaded!", {
      description: `"${uploadTitle}" has been shared with your classmates`,
    })
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload resource", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  // Show login prompt if not authenticated
  if (!user || !accessToken) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-base text-gray-500 mb-4">Please log in to view resources</p>
          <Button
            onClick={() => window.location.href = "/auth"}
            className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90"
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(220px,0.35fr)]">
        <div className="space-y-6">
          <Tabs value={scope} onValueChange={(v) => setScope(v as ResourceScope)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="bg-white border border-gray-200 p-1 h-auto">
                <TabsTrigger
                  value="all"
                  className={cn(
                    "px-4 py-2 rounded-md font-bold text-sm",
                    scope === "all"
                      ? "bg-[#036aff] text-white"
                      : "text-gray-600 hover:text-[#141414]"
                  )}
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="following"
                  className={cn(
                    "px-4 py-2 rounded-md font-bold text-sm",
                    scope === "following"
                      ? "bg-[#036aff] text-white"
                      : "text-gray-600 hover:text-[#141414]"
                  )}
                >
                  Following
                </TabsTrigger>
                <TabsTrigger
                  value="mine"
                  className={cn(
                    "px-4 py-2 rounded-md font-bold text-sm",
                    scope === "mine"
                      ? "bg-[#036aff] text-white"
                      : "text-gray-600 hover:text-[#141414]"
                  )}
                >
                  My resources
                </TabsTrigger>
              </TabsList>
          <Button
                className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
            onClick={() => setIsUploadOpen(true)}
          >
            Upload resource
          </Button>
      </div>

            <TabsContent value={scope} className="space-y-6 mt-4">
          <ResourceFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCourse={selectedCourse}
            onCourseChange={setSelectedCourse}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
          />

              <div className="space-y-4">
            {fetching ? (
              <p className="text-base text-gray-500 text-center py-12">Loading resources...</p>
            ) : filteredResources.length === 0 ? (
              <p className="text-base text-gray-500 text-center py-12">
                No resources match your filters yet. Try another course, tag, or scope.
              </p>
            ) : (
              filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onVote={handleVote}
                  onSaveToCollection={handleSaveToCollection}
                  isSaved={savedResourceIds.has(resource.id)}
                />
              ))
            )}
          </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-5 space-y-4 text-base text-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Peer review
                </span>
                <span className="rounded-full bg-[#036aff]/10 px-3 py-1 text-sm font-semibold text-[#036aff]">
                  Live
                </span>
              </div>
              <p className="leading-relaxed">
                Students upvote helpful notes so quality content rises to the top. Upvotes reset
                every semester.
              </p>
              <div className="rounded-lg bg-[#f5f5f5] px-4 py-3 text-sm text-[#141414]">
                {resources[0]?.title} currently leads with {resources[0]?.votes ?? 0} peer reviews.
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-[#141414] mb-2">Search tips</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Combine course codes with tags such as &ldquo;past-paper&rdquo; or
                  &ldquo;diagram&rdquo; to narrow results quickly.
                </p>
              </div>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                <li>Use a TDTU course code (e.g. 503045) for exact matches.</li>
                <li>Filter by tags when you need specific resource types.</li>
                <li>Sort by peer review (votes) to see trusted material.</li>
              </ul>
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
                setSelectedResourceId(null)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Share a resource</DialogTitle>
            <DialogDescription className="text-base">
              Upload files for your classmates. Files are stored and converted to secure URLs automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Title (e.g. Software Engineering sprint tips)"
              className="border-gray-200 text-base h-11"
            />
            <Input
              value={uploadCourse}
              onChange={(e) => setUploadCourse(e.target.value)}
              placeholder="Course code (e.g. 503045)"
              className="border-gray-200 text-base h-11"
            />

            <Input
              value={uploadLink}
              onChange={(e) => setUploadLink(e.target.value)}
              placeholder="Link (optional) — add a URL if you want to share one"
              className="border-gray-200 text-base h-11"
            />

            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                multiple
                className="hidden"
                id="resource-file-input"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setUploadFiles(files)
                }}
              />
              <label htmlFor="resource-file-input" className="cursor-pointer font-semibold text-[#036aff] text-base">
                {uploadFiles.length > 0
                  ? `${uploadFiles.length} file${uploadFiles.length > 1 ? "s" : ""} selected`
                  : "Choose files to upload"}
              </label>
              {uploadFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {uploadFiles.map((file, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  ))}
                </div>
              )}
              <p className="mt-2">PDF, Office documents, images, or videos. Max 10MB per file.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tags (optional)</label>
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
              {uploadTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadTags.map((tag) => (
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

            <textarea
              rows={4}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Short description or summary"
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#036aff]/20"
            />
          </div>

          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
              onClick={() => setIsUploadOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
              onClick={handleUpload}
              disabled={loading || fetching}
            >
              {loading ? "Uploading..." : "Share resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResourcePage

