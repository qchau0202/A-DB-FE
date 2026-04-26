import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Search,
  Lock,
  Globe2,
  FileText,
  MessageSquare,
  MessageCircle,
  Link as LinkIcon,
  Edit,
  Trash2,
  Copy,
  X,
  Tag,
  Bookmark,
  Check,
  LayoutGrid,
  List,
  Info,
  Sparkles,
  Folder,
  MoreVertical,
  Upload,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { resourceItems } from "@/data/resources"
import { feedPosts, type FeedPost, type FeedComment } from "@/data/feed"
import {
  getAllCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  type Collection,
  type CollectionItem,
  type CollectionItemType,
  type CollectionVisibility,
  createResource,
} from "@/services/mainServices"

const CollectionPage = () => {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const [collections, setCollections] = useState<Collection[]>([])
  const [publicCollections, setPublicCollections] = useState<Collection[]>([])
  const [searchResults, setSearchResults] = useState<Collection[]>([])
  const [activeTab, setActiveTab] = useState<"my-collections" | "discover" | "bookmarks">("my-collections")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [resourceIndex, setResourceIndex] = useState<Record<string, (typeof resourceItems)[number]>>({})
  const [bookmarkedResources, setBookmarkedResources] = useState<(typeof resourceItems)[number][]>([])
  const [bookmarkedCollections, setBookmarkedCollections] = useState<Collection[]>([])
  const [likedThreads, setLikedThreads] = useState<FeedPost[]>([])
  const [likedComments, setLikedComments] = useState<{ comment: FeedComment; thread: FeedPost }[]>([])
  const [bookmarkSearch, setBookmarkSearch] = useState("")
  const [bookmarkFilters, setBookmarkFilters] = useState<{
    resources: boolean
    threads: boolean
    comments: boolean
    collections: boolean
  }>({ resources: true, threads: true, comments: true, collections: true })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form states
  const [collectionName, setCollectionName] = useState("")
  const [collectionDescription, setCollectionDescription] = useState("")
  const [collectionVisibility, setCollectionVisibility] = useState<CollectionVisibility>("PRIVATE")
  const [collectionTags, setCollectionTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  // Item form states
  const [itemType, setItemType] = useState<CollectionItemType>("RESOURCE")
  const [itemReferenceId, setItemReferenceId] = useState("")
  const [itemUrl, setItemUrl] = useState("")
  const [itemPrivateNote, setItemPrivateNote] = useState("")
  const [resourceSearchQuery, setResourceSearchQuery] = useState("")
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemNote, setEditingItemNote] = useState("")

  // Upload form states
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadUrls, setUploadUrls] = useState<string[]>([])
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadTitle, setUploadTitle] = useState("")
  const [newUrlInput, setNewUrlInput] = useState("")
  const quickTagPresets = ["midterm", "final", "labs", "project", "reference", "notes"]
  const quickTemplates = [
    {
      name: "Midterm study pack",
      description: "Key lectures, problem sets, and solutions for the exam.",
      visibility: "PRIVATE" as CollectionVisibility,
      tags: ["midterm", "notes", "practice"],
    },
    {
      name: "Course reference hub",
      description: "All official docs, slides, and helpful external links.",
      visibility: "PUBLIC" as CollectionVisibility,
      tags: ["reference", "slides", "links"],
    },
  ]

  useEffect(() => {
    if (user) {
      loadMyCollections()
      loadBookmarkData()
      loadBookmarkedCollections()
    }
  }, [user])

  // Load public collections when discover tab is active
  useEffect(() => {
    if (activeTab === "discover") {
      loadPublicCollections()
    }
  }, [activeTab, accessToken])

  // Reset selections when item type changes
  useEffect(() => {
    setSelectedResourceId(null)
    setSelectedThreadId(null)
    setSelectedCommentId(null)
    setResourceSearchQuery("")
  }, [itemType])

  // Build quick lookup for resources used in collection detail view
  useEffect(() => {
    try {
      const stored = localStorage.getItem("unicircle_resources")
      const storedList: (typeof resourceItems)[number][] = stored ? JSON.parse(stored) : []
      const index: Record<string, (typeof resourceItems)[number]> = {}
      ;[...resourceItems, ...storedList].forEach((r) => {
        index[r.id] = r
      })
      setResourceIndex(index)
      // Refresh bookmarks when resource index updates
      if (user) {
        loadBookmarkData(index)
      }
    } catch (error) {
      console.error("Failed to build resource index for collections:", error)
    }
  }, [])

  const getExternalHost = (url: string | undefined | null) => {
    if (!url) return ""
    try {
      const host = new URL(url).hostname
      return host.replace(/^www\./, "")
    } catch {
      return ""
    }
  }

  const parseIdList = (key: string): string[] => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []
    } catch {
      return []
    }
  }

  const saveBookmarkedCollectionIds = (ids: string[]) => {
    try {
      localStorage.setItem("unicircle_bookmarked_collections", JSON.stringify(ids))
    } catch (error) {
      console.error("Failed to save bookmarked collections:", error)
    }
  }

  const getBookmarkedCollectionIds = (): string[] => {
    return parseIdList("unicircle_bookmarked_collections")
  }

  const loadBookmarkedCollections = async () => {
    if (!accessToken) return
    try {
      const bookmarkedIds = getBookmarkedCollectionIds()
      if (bookmarkedIds.length === 0) {
        setBookmarkedCollections([])
        return
      }
      
      // Fetch all public collections and filter by bookmarked IDs
      const allPublic = await getAllCollections(accessToken, { filter: 'public' })
      const bookmarked = allPublic.filter(c => bookmarkedIds.includes(c.id))
      setBookmarkedCollections(bookmarked)
    } catch (error) {
      console.error("Failed to load bookmarked collections:", error)
      setBookmarkedCollections([])
    }
  }

  const loadBookmarkData = (customResourceIndex?: Record<string, (typeof resourceItems)[number]>) => {
    if (!user) return
    const currentIndex = customResourceIndex || resourceIndex

    const resourceIds = parseIdList("unicircle_bookmarked_resources")
    const likedThreadIds = parseIdList("unicircle_liked_threads")
    const likedCommentIds = new Set(parseIdList("unicircle_liked_comments"))

    const mappedResources = resourceIds
      .map((id) => currentIndex[id])
      .filter((r): r is (typeof resourceItems)[number] => Boolean(r))
    const mappedThreads = feedPosts.filter((p) => likedThreadIds.includes(p.id))

    const mappedComments: { comment: FeedComment; thread: FeedPost }[] = []
    feedPosts.forEach((thread) => {
      thread.comments.forEach((comment) => {
        if (likedCommentIds.has(comment.id)) {
          mappedComments.push({ comment, thread })
        }
      })
    })

    setBookmarkedResources(mappedResources)
    setLikedThreads(mappedThreads)
    setLikedComments(mappedComments)
  }

  const toggleBookmarkFilter = (key: "resources" | "threads" | "comments" | "collections") => {
    setBookmarkFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const matchesSearch = (text: string) => {
    if (!bookmarkSearch.trim()) return true
    return text.toLowerCase().includes(bookmarkSearch.trim().toLowerCase())
  }

  const filteredBookmarkedResources = bookmarkedResources.filter(
    (res) =>
      bookmarkFilters.resources &&
      (matchesSearch(res.title) ||
        matchesSearch(res.summary) ||
        matchesSearch(res.courseCode) ||
        res.tags.some((t) => matchesSearch(t)))
  )

  const filteredLikedThreads = likedThreads.filter(
    (thread) =>
      bookmarkFilters.threads &&
      (matchesSearch(thread.title) ||
        matchesSearch(thread.content) ||
        matchesSearch(thread.author.name))
  )

  const filteredLikedComments = likedComments.filter(
    ({ comment, thread }) =>
      bookmarkFilters.comments &&
      (matchesSearch(comment.text) ||
        matchesSearch(comment.author) ||
        matchesSearch(thread.title))
  )

  const filteredBookmarkedCollections = bookmarkedCollections.filter(
    (collection) =>
      bookmarkFilters.collections &&
      (matchesSearch(collection.name) ||
        matchesSearch(collection.description || "") ||
        collection.tags.some((t) => matchesSearch(t)))
  )

  const loadMyCollections = async () => {
    if (!user || !accessToken) return
    try {
      setLoading(true)
      const data = await getAllCollections(accessToken, { filter: 'my' })
      setCollections(data)
    } catch (error) {
      console.error("Failed to load collections:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPublicCollections = async () => {
    try {
      setLoading(true)
      const data = await getAllCollections(accessToken || undefined, { filter: 'public' })
      setPublicCollections(data)
      // If there's no search query, show all public collections
      if (!searchQuery.trim()) {
        setSearchResults(data)
      }
    } catch (error) {
      console.error("Failed to load public collections:", error)
      setPublicCollections([])
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is cleared, show all public collections
      setSearchResults(publicCollections)
      return
    }
    try {
      setLoading(true)
      // Search only in public collections
      const data = await getAllCollections(accessToken || undefined, { 
        filter: 'public',
        search: searchQuery.trim()
      })
      setSearchResults(data)
    } catch (error) {
      console.error("Failed to search collections:", error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!user || !accessToken || !collectionName.trim()) {
      toast.error("Collection name is required")
      return
    }

    try {
      setLoading(true)
      const newCollection = await createCollection({
        name: collectionName,
        description: collectionDescription || undefined,
        visibility: collectionVisibility,
        tags: collectionTags,
      }, accessToken)
      setCollections([newCollection, ...collections])
      setIsCreateDialogOpen(false)
      resetForm()
      toast.success("Collection created successfully")
    } catch (error) {
      toast.error("Failed to create collection", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCollection = async () => {
    if (!user || !selectedCollection || !collectionName.trim()) {
      return
    }

    try {
      setLoading(true)
      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      const updated = await updateCollection(selectedCollection.id, {
        name: collectionName,
        description: collectionDescription || undefined,
        visibility: collectionVisibility,
        tags: collectionTags,
      }, accessToken)
      setCollections(collections.map(c => c.id === updated.id ? updated : c))
      setIsEditDialogOpen(false)
      resetForm()
      toast.success("Collection updated successfully")
    } catch (error) {
      toast.error("Failed to update collection", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async (collection: Collection) => {
    if (!user) return
    if (!confirm(`Are you sure you want to delete "${collection.name}"?`)) return

    try {
      setLoading(true)
      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      await deleteCollection(collection.id, accessToken)
      setCollections(collections.filter(c => c.id !== collection.id))
      toast.success("Collection deleted successfully")
    } catch (error) {
      toast.error("Failed to delete collection", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!user || !selectedCollection) return

    if (itemType === "EXTERNAL" && !itemUrl.trim()) {
      toast.error("URL is required for external items")
      return
    }

    if (itemType === "RESOURCE" && !selectedResourceId) {
      toast.error("Please select a resource")
      return
    }

    if (itemType === "THREAD" && !selectedThreadId) {
      toast.error("Please select a thread")
      return
    }

    if (itemType === "COMMENT" && !selectedCommentId) {
      toast.error("Please select a comment")
      return
    }

    if (itemType !== "EXTERNAL" && itemType !== "RESOURCE" && itemType !== "THREAD" && itemType !== "COMMENT" && !itemReferenceId.trim()) {
      toast.error("Reference ID is required")
      return
    }

    try {
      setLoading(true)
      let referenceId: string | undefined
      
      if (itemType === "RESOURCE") {
        referenceId = selectedResourceId || undefined
      } else if (itemType === "THREAD") {
        referenceId = selectedThreadId || undefined
      } else if (itemType === "COMMENT") {
        referenceId = selectedCommentId || undefined
      } else if (itemType !== "EXTERNAL") {
        referenceId = itemReferenceId || undefined
      }

      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      // addItemToCollection was removed; update via updateCollection refs
      const currentRefs = selectedCollection.collection_items
        ?.map((item) => item.reference_id)
        .filter(Boolean) as string[] || []

      const newRef = itemType === "EXTERNAL" ? itemUrl : referenceId
      if (!newRef) {
        toast.error("Reference or URL is required")
        return
      }

      const nextRefs = currentRefs.includes(newRef) ? currentRefs : [...currentRefs, newRef]
      const updated = await updateCollection(selectedCollection.id, { refs: nextRefs }, accessToken)
      setSelectedCollection(updated)
      loadMyCollections()
      setIsAddItemDialogOpen(false)
      resetItemForm()
      toast.success("Item added to collection")
    } catch (error) {
      toast.error("Failed to add item", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveItem = async (item: CollectionItem) => {
    if (!user) return
    if (!confirm("Remove this item from the collection?")) return

    try {
      setLoading(true)
      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      if (!item.reference_id) {
        toast.error("Cannot remove item: missing reference ID")
        return
      }
      // Find the collection this item belongs to
      const itemCollection = collections.find(c => 
        c.collection_items?.some(ci => ci.id === item.id)
      )
      if (!itemCollection) {
        toast.error("Collection not found")
        return
      }
      // Backend only supports full collection update; remove ref and save
      const currentRefs = itemCollection.collection_items
        ?.map((ci) => ci.reference_id)
        .filter(Boolean) as string[] || []
      const updatedRefs = currentRefs.filter((ref) => ref !== item.reference_id)
      const updated = await updateCollection(itemCollection.id, { refs: updatedRefs }, accessToken)
      loadMyCollections()
      if (selectedCollection && selectedCollection.id === itemCollection.id) {
        setSelectedCollection(updated)
      }
      toast.success("Item removed")
    } catch (error) {
      toast.error("Failed to remove item", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditItem = (item: CollectionItem) => {
    setEditingItemId(item.id)
    setEditingItemNote(item.private_note || "")
  }

  const handleSaveItemEdit = async () => {
    if (!user || !editingItemId) return

    try {
      setLoading(true)
      if (!accessToken) {
        toast.error("Authentication required")
        return
      }
      // Find the collection and item
      const itemCollection = collections.find(c => 
        c.collection_items?.some(ci => ci.id === editingItemId)
      )
      if (!itemCollection || !editingItemId) {
        toast.error("Item not found")
        return
      }
      // Note: Backend doesn't support item-level updates, so we'll skip this for now
      // or implement a workaround if needed
      toast.info("Item note updates are not yet supported by the backend")
      // await updateCollectionItem(editingItemId, itemCollection.id, editingItemNote, accessToken)
      loadMyCollections()
      if (selectedCollection && accessToken) {
        const fullCollection = await getCollectionById(selectedCollection.id, accessToken)
        setSelectedCollection(fullCollection)
      }
      setEditingItemId(null)
      setEditingItemNote("")
      toast.success("Item updated successfully")
    } catch (error) {
      toast.error("Failed to update item", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelItemEdit = () => {
    setEditingItemId(null)
    setEditingItemNote("")
  }

  const resetUploadForm = () => {
    setUploadFiles([])
    setUploadUrls([])
    setUploadDescription("")
    setUploadTitle("")
    setNewUrlInput("")
  }

  const handleUploadToCollection = async () => {
    if (!user || !selectedCollection || !accessToken) {
      toast.error("Authentication required")
      return
    }

    if (!uploadTitle.trim()) {
      toast.error("Title is required")
      return
    }

    if (uploadFiles.length === 0 && uploadUrls.length === 0) {
      toast.error("Please upload at least one file or add a URL")
      return
    }

    try {
      setLoading(true)
      const resourceIds: string[] = []

      // Create resources for files
      if (uploadFiles.length > 0) {
        const resource = await createResource(
          {
            title: uploadTitle.trim(),
            description: uploadDescription.trim() || undefined,
            resource_type: "DOCUMENT",
            files: uploadFiles,
          },
          accessToken
        )
        resourceIds.push(resource.id)
      }

      // Create resources for URLs
      for (const url of uploadUrls) {
        const resource = await createResource(
          {
            title: uploadTitle.trim() + (uploadUrls.length > 1 ? ` - ${url}` : ""),
            description: uploadDescription.trim() || undefined,
            resource_type: "URL",
            linkUrl: url,
          },
          accessToken
        )
        resourceIds.push(resource.id)
      }

      // Add all resource IDs to collection's refs
      const currentRefs = selectedCollection.collection_items
        ?.map((item) => item.reference_id)
        .filter(Boolean) as string[] || []
      const updatedRefs = [...currentRefs, ...resourceIds]
      const updated = await updateCollection(selectedCollection.id, { refs: updatedRefs }, accessToken)
      
      setSelectedCollection(updated)
      loadMyCollections()
      setIsUploadDialogOpen(false)
      resetUploadForm()
      toast.success("Items uploaded and added to collection")
    } catch (error) {
      console.error("Failed to upload to collection:", error)
      toast.error("Failed to upload items", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloneCollection = async (collection: Collection) => {
    if (!user || !accessToken) {
      toast.error("Please log in to bookmark collections")
      return
    }

    try {
      setLoading(true)
      
      // Check if already bookmarked
      const bookmarkedIds = getBookmarkedCollectionIds()
      if (bookmarkedIds.includes(collection.id)) {
        toast.info("This collection is already bookmarked")
        return
      }

      // Add to bookmarked collections
      const newBookmarkedIds = [...bookmarkedIds, collection.id]
      saveBookmarkedCollectionIds(newBookmarkedIds)
      
      // Reload bookmarked collections
      await loadBookmarkedCollections()
      
      toast.success("Collection bookmarked successfully", {
        description: "You can view it in the Bookmarks tab"
      })
    } catch (error) {
      console.error("Failed to bookmark collection:", error)
      toast.error("Failed to bookmark collection", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnbookmarkCollection = async (collectionId: string) => {
    try {
      const bookmarkedIds = getBookmarkedCollectionIds()
      const newBookmarkedIds = bookmarkedIds.filter(id => id !== collectionId)
      saveBookmarkedCollectionIds(newBookmarkedIds)
      await loadBookmarkedCollections()
      toast.success("Collection removed from bookmarks")
    } catch (error) {
      console.error("Failed to unbookmark collection:", error)
      toast.error("Failed to remove bookmark")
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (collection: Collection) => {
    setSelectedCollection(collection)
    setCollectionName(collection.name)
    setCollectionDescription(collection.description || "")
    setCollectionVisibility(collection.visibility)
    setCollectionTags(collection.tags || [])
    setIsEditDialogOpen(true)
  }

  const openAddItemDialog = (collection: Collection) => {
    setSelectedCollection(collection)
    resetItemForm()
    setIsAddItemDialogOpen(true)
  }

  const openViewDialog = async (collection: Collection) => {
    if (!user) return
    try {
      if (!accessToken) {
        setSelectedCollection(collection)
        setIsViewDialogOpen(true)
        return
      }
      const fullCollection = await getCollectionById(collection.id, accessToken)
      setSelectedCollection(fullCollection)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error("Failed to load collection details:", error)
      setSelectedCollection(collection)
      setIsViewDialogOpen(true)
    }
  }

  const resetForm = () => {
    setCollectionName("")
    setCollectionDescription("")
    setCollectionVisibility("PRIVATE")
    setCollectionTags([])
    setNewTag("")
    setSelectedCollection(null)
  }

  const resetItemForm = () => {
    setItemType("RESOURCE")
    setItemReferenceId("")
    setItemUrl("")
    setItemPrivateNote("")
    setResourceSearchQuery("")
    setSelectedResourceId(null)
    setSelectedThreadId(null)
    setSelectedCommentId(null)
    setEditingItemId(null)
    setEditingItemNote("")
  }

  const filteredBookmarkedResourcesForAdd = bookmarkedResources.filter((resource) => {
    if (!resourceSearchQuery) return true
    const query = resourceSearchQuery.toLowerCase()
    return (
      resource.title.toLowerCase().includes(query) ||
      resource.courseCode.includes(query) ||
      resource.summary.toLowerCase().includes(query)
    )
  })

  const filteredLikedThreadsForAdd = likedThreads.filter((thread) => {
    if (!resourceSearchQuery) return true
    const query = resourceSearchQuery.toLowerCase()
    return (
      thread.title.toLowerCase().includes(query) ||
      thread.content.toLowerCase().includes(query) ||
      thread.author.name.toLowerCase().includes(query)
    )
  })

  const filteredLikedCommentsForAdd = likedComments.filter(({ comment, thread }) => {
    if (!resourceSearchQuery) return true
    const query = resourceSearchQuery.toLowerCase()
    return (
      comment.text.toLowerCase().includes(query) ||
      comment.author.toLowerCase().includes(query) ||
      thread.title.toLowerCase().includes(query)
    )
  })

  const alreadySavedResourceIds = new Set<string>()
  collections.forEach((collection) => {
    collection.collection_items?.forEach((item) => {
      if (item.type === "RESOURCE" && item.reference_id) {
        alreadySavedResourceIds.add(item.reference_id)
      }
    })
  })

  const addTag = () => {
    if (!newTag.trim()) return
    if (collectionTags.length >= 6) {
      toast.error("You can add up to 6 tags")
      return
    }
    if (!collectionTags.includes(newTag.trim())) {
      setCollectionTags([...collectionTags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setCollectionTags(collectionTags.filter(t => t !== tag))
  }

  const getItemTypeIcon = (type: CollectionItemType) => {
    switch (type) {
      case "RESOURCE":
        return <FileText className="h-4 w-4" />
      case "THREAD":
        return <MessageSquare className="h-4 w-4" />
      case "COMMENT":
        return <MessageCircle className="h-4 w-4" />
      case "EXTERNAL":
        return <LinkIcon className="h-4 w-4" />
    }
  }

  const getItemTypeLabel = (type: CollectionItemType) => {
    switch (type) {
      case "RESOURCE":
        return "Resource"
      case "THREAD":
        return "Thread"
      case "COMMENT":
        return "Comment"
      case "EXTERNAL":
        return "External Link"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-[#141414]">My Collections</h1>
          <Button
            className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
            onClick={openCreateDialog}
          >
            <Plus className="h-5 w-5 mr-2" />
            New Collection
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-white border border-gray-200 p-1 h-auto">
          <TabsTrigger
            value="my-collections"
            className={cn(
              "px-5 py-2.5 rounded-md font-bold text-base",
              activeTab === "my-collections"
                ? "bg-[#036aff] text-white"
                : "text-gray-600 hover:text-[#141414]"
            )}
          >
            My Collections
          </TabsTrigger>
          <TabsTrigger
            value="discover"
            className={cn(
              "px-5 py-2.5 rounded-md font-bold text-base",
              activeTab === "discover"
                ? "bg-[#036aff] text-white"
                : "text-gray-600 hover:text-[#141414]"
            )}
          >
            Discover
          </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className={cn(
                "px-5 py-2.5 rounded-md font-bold text-base",
                activeTab === "bookmarks"
                  ? "bg-[#036aff] text-white"
                  : "text-gray-600 hover:text-[#141414]"
              )}
            >
              Bookmarks
            </TabsTrigger>
        </TabsList>

        {/* My Collections Tab */}
        <TabsContent value="my-collections" className="mt-6">
          <div className="space-y-6">
            {/* Toolbar */}
            {collections.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {collections.length} {collections.length === 1 ? "collection" : "collections"}
                </p>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      viewMode === "grid"
                        ? "bg-[#036aff] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      viewMode === "list"
                        ? "bg-[#036aff] text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            {loading && collections.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#036aff] mb-4"></div>
                <p className="text-base text-gray-500">Loading collections...</p>
              </div>
            ) : collections.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 rounded-xl">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#036aff]/10 to-[#036aff]/5 flex items-center justify-center mx-auto mb-6">
                    <Folder className="h-10 w-10 text-[#036aff]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#141414] mb-2">No collections yet</h3>
                  <p className="text-base text-gray-500 mb-6 max-w-md mx-auto">
                    Create your first collection to organize resources, threads, and links in one place.
                  </p>
                  <Button
                    onClick={openCreateDialog}
                    className="bg-[#036aff] text-white font-semibold hover:bg-[#036aff]/90 px-6 py-2.5"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Collection
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {collections.map((collection) => {
                  const itemCount = collection.collection_items?.length || 0
                  const getCollectionColor = () => {
                    const colors = [
                      "bg-purple-50 text-purple-600",
                      "bg-blue-50 text-blue-600",
                      "bg-green-50 text-green-600",
                      "bg-orange-50 text-orange-600",
                      "bg-pink-50 text-pink-600",
                      "bg-indigo-50 text-indigo-600",
                    ]
                    return colors[collection.name.length % colors.length]
                  }
                  
                  return (
                    <Card
                      key={collection.id}
                      className="group border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                      onClick={() => openViewDialog(collection)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className={cn("p-3 rounded-xl", getCollectionColor())}>
                            <Folder className="h-8 w-8" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2.5 py-1 border",
                                collection.visibility === "PUBLIC"
                                  ? "border-green-200 text-green-700 bg-green-50"
                                  : "border-gray-200 text-gray-600 bg-gray-50"
                              )}
                            >
                              {collection.visibility === "PUBLIC" ? (
                                <Globe2 className="h-3 w-3 mr-1" />
                              ) : (
                                <Lock className="h-3 w-3 mr-1" />
                              )}
                              {collection.visibility}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(collection)
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold text-[#141414] mb-2 line-clamp-1">
                          {collection.name}
                        </h3>
                        
                        {collection.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                            {collection.description}
                          </p>
                        )}

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Items</span>
                            <span className="font-semibold text-[#141414]">{itemCount}</span>
                          </div>
                          
                          {collection.tags && collection.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {collection.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-gray-200 text-xs px-2 py-0.5 capitalize bg-white"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {collection.tags.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="border-gray-200 text-xs px-2 py-0.5 bg-white"
                                >
                                  +{collection.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {collections.map((collection) => {
                  const itemCount = collection.collection_items?.length || 0
                  return (
                    <Card
                      key={collection.id}
                      className="group border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openViewDialog(collection)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-lg bg-purple-50">
                            <Folder className="h-6 w-6 text-purple-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-semibold text-[#141414] truncate">
                                {collection.name}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2 py-0.5 border shrink-0",
                                  collection.visibility === "PUBLIC"
                                    ? "border-green-200 text-green-700 bg-green-50"
                                    : "border-gray-200 text-gray-600 bg-gray-50"
                                )}
                              >
                                {collection.visibility === "PUBLIC" ? (
                                  <Globe2 className="h-3 w-3 mr-1" />
                                ) : (
                                  <Lock className="h-3 w-3 mr-1" />
                                )}
                                {collection.visibility}
                              </Badge>
                            </div>
                            
                            {collection.description && (
                              <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                                {collection.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="font-medium text-[#141414]">{itemCount} items</span>
                              {collection.tags && collection.tags.length > 0 && (
                                <>
                                  <span>·</span>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {collection.tags.slice(0, 3).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="border-gray-200 text-xs px-1.5 py-0 capitalize"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(collection)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCollection(collection)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="mt-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search collections by name or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-11 pr-4 border-gray-200 text-base h-12 rounded-lg"
              />
            </div>

            {loading && searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#036aff] mb-4"></div>
                <p className="text-base text-gray-500">Searching collections...</p>
              </div>
            ) : loading && !searchQuery ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#036aff] mb-4"></div>
                <p className="text-base text-gray-500">Loading public collections...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <Card className="border-2 border-dashed border-gray-200 rounded-xl">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#141414] mb-2">No collections found</h3>
                  <p className="text-base text-gray-500 max-w-md mx-auto">
                    Try different keywords or tags to find public collections shared by other students.
                  </p>
                </CardContent>
              </Card>
            ) : searchResults.length === 0 && !searchQuery ? (
              <Card className="border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <Info className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-[#141414] mb-2">No Public Collections Yet</h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        There are no public collections available at the moment. Be the first to share your collection!
                      </p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1.5">
                        <li>Create a public collection to share with other students</li>
                        <li>Search by collection name or tags to find specific topics</li>
                        <li>Clone public collections to customize them for your needs</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {searchResults.map((collection) => {
                  const itemCount = collection.collection_items?.length || 0
                  return (
                    <Card
                      key={collection.id}
                      className="group border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="p-3 rounded-xl bg-blue-50 shrink-0">
                              <Folder className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-[#141414] mb-1 line-clamp-1">
                                {collection.name}
                              </h3>
                              {collection.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                  {collection.description}
                                </p>
                              )}
                              {/* Owner Information */}
                              {collection.owner && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                  <span>Created by</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/profile/${collection.owner!.id}`)
                                    }}
                                    className="font-semibold text-[#141414] hover:text-[#036aff] transition-colors"
                                  >
                                    {collection.owner.student_code || collection.owner.display_name || "Unknown"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs px-2.5 py-1 shrink-0">
                            <Globe2 className="h-3 w-3 mr-1" />
                            PUBLIC
                          </Badge>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Items</span>
                            <span className="font-semibold text-[#141414]">{itemCount}</span>
                          </div>
                          
                          {collection.tags && collection.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {collection.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="border-gray-200 text-xs px-2 py-0.5 capitalize bg-white"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-gray-200 text-sm font-semibold text-[#141414] hover:bg-gray-50"
                              onClick={() => openViewDialog(collection)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#036aff] text-[#036aff] hover:bg-[#036aff]/10 text-sm font-semibold"
                              onClick={() => handleCloneCollection(collection)}
                              disabled={loading || getBookmarkedCollectionIds().includes(collection.id)}
                            >
                              {getBookmarkedCollectionIds().includes(collection.id) ? (
                                <>
                                  <Bookmark className="h-4 w-4 mr-1" />
                                  Bookmarked
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Bookmark
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <Info className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-[#141414] mb-2">Discover Public Collections</h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Search by collection name or tags to find public collections shared by other students.
                      </p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1.5">
                        <li>Use tags like "Java" or "Web Dev" to find specific topics</li>
                        <li>Bookmark public collections to save them for later viewing</li>
                        <li>Bookmarked collections are read-only - you can view but not edit them</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks" className="mt-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#141414] mb-1">Your Bookmarks</h2>
                <p className="text-sm text-gray-600">
                  Resources, collections, threads and comments you bookmarked or liked
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <Bookmark className="h-4 w-4 text-[#036aff]" />
                <span className="text-sm font-semibold text-[#141414]">
                  {bookmarkedResources.length + likedThreads.length + likedComments.length + bookmarkedCollections.length} total
                </span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={bookmarkSearch}
                  onChange={(e) => setBookmarkSearch(e.target.value)}
                  placeholder="Search saved items..."
                  className="pl-11 pr-4 border-gray-200 text-base h-12 rounded-lg"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleBookmarkFilter("resources")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold border transition-colors",
                    bookmarkFilters.resources
                      ? "border-[#036aff] bg-[#036aff]/10 text-[#036aff]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Resources ({bookmarkedResources.length})
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmarkFilter("threads")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold border transition-colors",
                    bookmarkFilters.threads
                      ? "border-[#036aff] bg-[#036aff]/10 text-[#036aff]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <MessageSquare className="h-4 w-4 inline mr-2" />
                  Threads ({likedThreads.length})
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmarkFilter("comments")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold border transition-colors",
                    bookmarkFilters.comments
                      ? "border-[#036aff] bg-[#036aff]/10 text-[#036aff]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <MessageCircle className="h-4 w-4 inline mr-2" />
                  Comments ({likedComments.length})
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmarkFilter("collections")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold border transition-colors",
                    bookmarkFilters.collections
                      ? "border-[#036aff] bg-[#036aff]/10 text-[#036aff]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Folder className="h-4 w-4 inline mr-2" />
                  Collections ({bookmarkedCollections.length})
                </button>
              </div>
            </div>

            {filteredBookmarkedResources.length === 0 && filteredLikedThreads.length === 0 && filteredLikedComments.length === 0 && filteredBookmarkedCollections.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 rounded-xl">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#036aff]/10 to-[#036aff]/5 flex items-center justify-center mx-auto mb-6">
                    <Bookmark className="h-10 w-10 text-[#036aff]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#141414] mb-2">No items found</h3>
                  <p className="text-base text-gray-500 max-w-md mx-auto">
                    {bookmarkSearch ? "Try adjusting your search or filters to see more results." : "Start bookmarking resources, collections, and liking threads to see them here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {bookmarkFilters.resources && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#141414]">Bookmarked Resources</h3>
                        <p className="text-sm text-gray-500">{filteredBookmarkedResources.length} {filteredBookmarkedResources.length === 1 ? "item" : "items"}</p>
                      </div>
                    </div>
                    {filteredBookmarkedResources.length === 0 ? (
                      <Card className="border border-gray-200 rounded-lg">
                        <CardContent className="py-8 text-center text-sm text-gray-500">
                          No resources match your current filters.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredBookmarkedResources.map((res) => (
                          <Card 
                            key={res.id} 
                            className="group border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => navigate(`/resource/${res.id}`)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-orange-50">
                                  <FileText className="h-5 w-5 text-orange-600" />
                                </div>
                                <Badge variant="outline" className="border-gray-200 text-xs px-2 py-0.5 ml-auto">
                                  {res.type === "document" ? "Document" : "Link"}
                                </Badge>
                              </div>
                              <h4 className="text-sm font-semibold text-[#141414] mb-2 line-clamp-2">{res.title}</h4>
                              <p className="text-xs text-gray-600 line-clamp-2 mb-3">{res.summary}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <span>{res.courseCode}</span>
                                <span>·</span>
                                <span>{res.contributor}</span>
                              </div>
                              {res.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {res.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="border-gray-200 text-xs px-1.5 py-0.5">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {res.tags.length > 2 && (
                                    <Badge variant="outline" className="border-gray-200 text-xs px-1.5 py-0.5">
                                      +{res.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bookmarkFilters.threads && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-50">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#141414]">Liked Threads</h3>
                        <p className="text-sm text-gray-500">{filteredLikedThreads.length} {filteredLikedThreads.length === 1 ? "item" : "items"}</p>
                      </div>
                    </div>
                    {filteredLikedThreads.length === 0 ? (
                      <Card className="border border-gray-200 rounded-lg">
                        <CardContent className="py-8 text-center text-sm text-gray-500">
                          No threads match your current filters.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredLikedThreads.map((thread) => (
                          <Card 
                            key={thread.id} 
                            className="group border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => navigate(`/feed/${thread.id}`)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-green-50">
                                  <MessageSquare className="h-5 w-5 text-green-600" />
                                </div>
                                <Badge variant="outline" className="border-gray-200 text-xs px-2 py-0.5 ml-auto">
                                  {thread.threadType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <span>{thread.author.name}</span>
                                <span>·</span>
                                <span>{thread.createdAt}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-[#141414] mb-2 line-clamp-2">{thread.title}</h4>
                              <p className="text-xs text-gray-600 line-clamp-2 mb-3">{thread.content}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="h-3.5 w-3.5" /> {thread.stats.comments}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bookmark className="h-3.5 w-3.5" /> {thread.stats.likes}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bookmarkFilters.comments && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50">
                        <MessageCircle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#141414]">Liked Comments</h3>
                        <p className="text-sm text-gray-500">{filteredLikedComments.length} {filteredLikedComments.length === 1 ? "item" : "items"}</p>
                      </div>
                    </div>
                    {filteredLikedComments.length === 0 ? (
                      <Card className="border border-gray-200 rounded-lg">
                        <CardContent className="py-8 text-center text-sm text-gray-500">
                          No comments match your current filters.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredLikedComments.map(({ comment, thread }) => (
                          <Card 
                            key={comment.id} 
                            className="group border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => navigate(`/feed/${thread.id}`)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-purple-50">
                                  <MessageCircle className="h-5 w-5 text-purple-600" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <span>{comment.author}</span>
                                <span>·</span>
                                <span>{comment.createdAt}</span>
                              </div>
                              <p className="text-sm text-[#141414] line-clamp-3 mb-3">{comment.text}</p>
                              <div className="pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500">
                                  In thread: <span className="font-semibold text-[#036aff]">{thread.title}</span>
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bookmarkFilters.collections && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50">
                        <Folder className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#141414]">Bookmarked Collections</h3>
                        <p className="text-sm text-gray-500">{filteredBookmarkedCollections.length} {filteredBookmarkedCollections.length === 1 ? "collection" : "collections"}</p>
                      </div>
                    </div>
                    {filteredBookmarkedCollections.length === 0 ? (
                      <Card className="border border-gray-200 rounded-lg">
                        <CardContent className="py-8 text-center text-sm text-gray-500">
                          No bookmarked collections match your current filters.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredBookmarkedCollections.map((collection) => {
                          const itemCount = collection.collection_items?.length || 0
                          return (
                            <Card
                              key={collection.id}
                              className="group border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="p-2 rounded-lg bg-indigo-50 shrink-0">
                                      <Folder className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-semibold text-[#141414] mb-1 line-clamp-1">
                                        {collection.name}
                                      </h4>
                                      {collection.description && (
                                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                          {collection.description}
                                        </p>
                                      )}
                                {/* Owner Information */}
                                {collection.owner && (
                                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                                    <span>Created by</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/profile/${collection.owner!.id}`)
                                      }}
                                      className="font-semibold text-[#141414] hover:text-[#036aff] transition-colors"
                                    >
                                      {collection.owner.student_code || collection.owner.display_name || "Unknown"}
                                    </button>
                                  </div>
                                )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs px-2 py-1 shrink-0">
                                    <Globe2 className="h-3 w-3 mr-1" />
                                    PUBLIC
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                  <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                                </div>
                                {collection.tags && collection.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {collection.tags.slice(0, 3).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="border-gray-200 text-xs px-1.5 py-0.5"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                    {collection.tags.length > 3 && (
                                      <Badge variant="outline" className="border-gray-200 text-xs px-1.5 py-0.5">
                                        +{collection.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-gray-200 text-xs font-semibold text-[#141414] hover:bg-gray-50"
                                    onClick={() => openViewDialog(collection)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                                    onClick={() => {
                                      if (confirm("Remove this collection from bookmarks?")) {
                                        handleUnbookmarkCollection(collection.id)
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#036aff]" />
              Create New Collection
            </DialogTitle>
            <DialogDescription className="text-base">
              Give it a name, choose visibility, and add tags. Use a template or quick tags to get started faster.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-[#f8fafc] p-4 text-sm text-gray-700 flex items-start gap-3">
                <Info className="h-5 w-5 text-[#036aff] mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-[#141414]">Tips for a helpful collection</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Keep the title specific (course + goal).</li>
                    <li>Add 2-4 tags so you and teammates can find it quickly.</li>
                    <li>Public = shareable with classmates; Private = only you.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium mb-1 block">Name *</label>
                <Input
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g., Web Dev Final Study Pack"
                  className="border-gray-200 text-base h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium mb-1 block">Description</label>
                <Input
                  value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                  placeholder="What is inside? Who is it for?"
                  className="border-gray-200 text-base h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium mb-1 block">Visibility</label>
                <div className="flex gap-1 rounded-full bg-[#f5f5f5] p-1 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => setCollectionVisibility("PRIVATE")}
                    className={cn(
                      "flex-1 rounded-full px-4 py-2 flex items-center justify-center gap-1.5",
                      collectionVisibility === "PRIVATE"
                        ? "bg-white text-[#141414] shadow-sm"
                        : "text-gray-600"
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionVisibility("PUBLIC")}
                    className={cn(
                      "flex-1 rounded-full px-4 py-2 flex items-center justify-center gap-1.5",
                      collectionVisibility === "PUBLIC"
                        ? "bg-white text-[#141414] shadow-sm"
                        : "text-gray-600"
                    )}
                  >
                    <Globe2 className="h-4 w-4" />
                    Public
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium block">Tags</label>
                  <span className="text-xs text-gray-500">Add up to 6</span>
                </div>
                <div className="flex gap-2 mb-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add tag (course, exam, notes...)"
                    className="border-gray-200 text-base h-11"
                  />
                  <Button type="button" onClick={addTag} variant="outline" className="border-gray-200 px-4">
                    <Tag className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickTagPresets.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!collectionTags.includes(tag) && collectionTags.length < 6) {
                          setCollectionTags([...collectionTags, tag])
                        }
                      }}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#036aff] hover:text-[#036aff]"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                {collectionTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {collectionTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1.5 border-gray-200 text-sm px-3 py-1">
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#141414]">Templates</p>
                  <span className="text-xs text-gray-500">1-click fill</span>
                </div>
                <div className="space-y-2">
                  {quickTemplates.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => {
                        setCollectionName(tpl.name)
                        setCollectionDescription(tpl.description)
                        setCollectionVisibility(tpl.visibility)
                        setCollectionTags(tpl.tags)
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-[#036aff] hover:bg-[#036aff]/5 transition"
                    >
                      <p className="text-sm font-semibold text-[#141414]">{tpl.name}</p>
                      <p className="text-xs text-gray-500">{tpl.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tpl.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-gray-200 text-[11px] px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-[#f8fafc] space-y-3">
                <p className="text-sm font-semibold text-[#141414]">Live preview</p>
                <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-[#141414] truncate">
                      {collectionName.trim() || "Untitled collection"}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2.5 py-1",
                        collectionVisibility === "PUBLIC"
                          ? "border-green-200 text-green-700"
                          : "border-gray-200 text-gray-600"
                      )}
                    >
                      {collectionVisibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {collectionDescription.trim() || "Description preview will appear here."}
                  </p>
                  {collectionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {collectionTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-gray-200 text-xs px-2 py-0.5">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {collectionTags.length === 0 && (
                    <p className="text-xs text-gray-400">Add tags to improve search.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-3 sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
                  onClick={handleCreateCollection}
                  disabled={loading}
                >
                  Create Collection
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label className="text-base font-medium mb-2 block">Name *</label>
              <Input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="border-gray-200 text-base h-11"
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Description</label>
              <Input
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                className="border-gray-200 text-base h-11"
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Visibility</label>
              <div className="flex gap-1 rounded-full bg-[#f5f5f5] p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setCollectionVisibility("PRIVATE")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 flex items-center justify-center gap-1.5",
                    collectionVisibility === "PRIVATE"
                      ? "bg-white text-[#141414] shadow-sm"
                      : "text-gray-600"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionVisibility("PUBLIC")}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 flex items-center justify-center gap-1.5",
                    collectionVisibility === "PUBLIC"
                      ? "bg-white text-[#141414] shadow-sm"
                      : "text-gray-600"
                  )}
                >
                  <Globe2 className="h-4 w-4" />
                  Public
                </button>
              </div>
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag"
                  className="border-gray-200 text-base h-11"
                />
                <Button type="button" onClick={addTag} variant="outline" className="border-gray-200 px-4">
                  <Tag className="h-5 w-5" />
                </Button>
              </div>
              {collectionTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {collectionTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1.5 border-gray-200 text-sm px-3 py-1">
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="h-4 w-4" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between gap-3 sm:justify-between">
              <Button
                variant="ghost"
                className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
                onClick={handleUpdateCollection}
                disabled={loading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Add Item to Collection</DialogTitle>
                <DialogDescription className="text-base">
                  Add a resource, thread, comment, or external link to your collection.
                </DialogDescription>
              </div>
              <Button
                className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
                onClick={() => {
                  setIsAddItemDialogOpen(false)
                  setIsUploadDialogOpen(true)
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label className="text-base font-medium mb-2 block">Type *</label>
              <div className="flex gap-1 rounded-full bg-[#f5f5f5] p-1 text-sm font-semibold flex-wrap">
                {(["RESOURCE", "THREAD", "COMMENT", "EXTERNAL"] as CollectionItemType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setItemType(type)}
                    className={cn(
                      "flex-1 min-w-[calc(50%-0.125rem)] rounded-full px-4 py-2.5 flex items-center justify-center gap-2",
                      itemType === type
                        ? "bg-white text-[#141414] shadow-sm"
                        : "text-gray-600"
                    )}
                  >
                    {getItemTypeIcon(type)}
                    <span className="text-sm">{getItemTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>
            {itemType === "EXTERNAL" ? (
              <div>
                <label className="text-base font-medium mb-2 block">URL *</label>
                <Input
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="border-gray-200 text-base h-11"
                />
              </div>
            ) : itemType === "RESOURCE" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-base font-medium block">Select Resource *</label>
                  <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2.5 py-1">
                    <Bookmark className="h-3 w-3 inline mr-1" />
                    From Bookmarks
                  </Badge>
                </div>
                <Input
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  placeholder="Search bookmarked resources..."
                  className="border-gray-200 text-base h-11 mb-3"
                />
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {filteredBookmarkedResourcesForAdd.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      {bookmarkedResources.length === 0 
                        ? "No bookmarked resources. Bookmark some resources first."
                        : "No bookmarked resources match your search."}
                    </div>
                  ) : (
                    filteredBookmarkedResourcesForAdd.map((resource) => {
                      const isSaved = alreadySavedResourceIds.has(resource.id)
                      const isSelected = selectedResourceId === resource.id
                      return (
                        <button
                          key={resource.id}
                          type="button"
                          onClick={() => {
                            setSelectedResourceId(resource.id)
                            setResourceSearchQuery(resource.title)
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            isSelected
                              ? "border-[#036aff] bg-[#036aff]/5"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-[#141414] truncate">
                                  {resource.title}
                                </h4>
                                <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2 py-0">
                                  <Bookmark className="h-3 w-3 inline mr-1" />
                                  Bookmarked
                                </Badge>
                                {isSaved && (
                                  <Badge variant="outline" className="border-green-200 text-green-700 text-xs px-2 py-0">
                                    Saved
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-1 line-clamp-1">{resource.summary}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{resource.courseCode}</span>
                                <span>·</span>
                                <span>{resource.contributor}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-[#036aff] shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : itemType === "THREAD" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-base font-medium block">Select Thread *</label>
                  <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2.5 py-1">
                    <Bookmark className="h-3 w-3 inline mr-1" />
                    From Liked ({likedThreads.length})
                  </Badge>
                </div>
                <Input
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  placeholder="Search liked threads..."
                  className="border-gray-200 text-base h-11 mb-3"
                />
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {filteredLikedThreadsForAdd.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      {likedThreads.length === 0 
                        ? "No liked threads. Like some threads first."
                        : "No liked threads match your search."}
                    </div>
                  ) : (
                    filteredLikedThreadsForAdd.map((thread) => {
                      const isSelected = selectedThreadId === thread.id
                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => {
                            setSelectedThreadId(thread.id)
                            setResourceSearchQuery(thread.title)
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            isSelected
                              ? "border-[#036aff] bg-[#036aff]/5"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-[#141414] truncate">
                                  {thread.title}
                                </h4>
                                <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2 py-0">
                                  <Bookmark className="h-3 w-3 inline mr-1" />
                                  Liked
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mb-1 line-clamp-1">{thread.content}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{thread.author.name}</span>
                                <span>·</span>
                                <span>{thread.createdAt}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-[#036aff] shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : itemType === "COMMENT" ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-base font-medium block">Select Comment *</label>
                  <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2.5 py-1">
                    <Bookmark className="h-3 w-3 inline mr-1" />
                    From Liked ({likedComments.length})
                  </Badge>
                </div>
                <Input
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  placeholder="Search liked comments..."
                  className="border-gray-200 text-base h-11 mb-3"
                />
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {filteredLikedCommentsForAdd.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      {likedComments.length === 0 
                        ? "No liked comments. Like some comments first."
                        : "No liked comments match your search."}
                    </div>
                  ) : (
                    filteredLikedCommentsForAdd.map(({ comment, thread }) => {
                      const isSelected = selectedCommentId === comment.id
                      return (
                        <button
                          key={comment.id}
                          type="button"
                          onClick={() => {
                            setSelectedCommentId(comment.id)
                            setResourceSearchQuery(comment.text.substring(0, 30))
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            isSelected
                              ? "border-[#036aff] bg-[#036aff]/5"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs px-2 py-0">
                                  <Bookmark className="h-3 w-3 inline mr-1" />
                                  Liked
                                </Badge>
                              </div>
                              <p className="text-sm text-[#141414] mb-1 line-clamp-2">{comment.text}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{comment.author}</span>
                                <span>·</span>
                                <span>In: {thread.title}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-[#036aff] shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-base font-medium mb-2 block">Reference ID *</label>
                <Input
                  value={itemReferenceId}
                  onChange={(e) => setItemReferenceId(e.target.value)}
                  placeholder="Enter the ID of the item"
                  className="border-gray-200 text-base h-11"
                />
              </div>
            )}
            <div>
              <label className="text-base font-medium mb-2 block">Private Note</label>
              <textarea
                rows={4}
                value={itemPrivateNote}
                onChange={(e) => setItemPrivateNote(e.target.value)}
                placeholder="e.g., Only study Chapter 3 for the midterm"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
            </div>
            <div className="flex justify-between gap-3">
              <Button
                variant="ghost"
                className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
                onClick={() => setIsAddItemDialogOpen(false)}
              >
                Cancel
              </Button>
              {(itemType === "RESOURCE" && selectedResourceId) || 
               (itemType === "THREAD" && selectedThreadId) || 
               (itemType === "COMMENT" && selectedCommentId) || 
               (itemType === "EXTERNAL" && itemUrl.trim()) ? (
                <Button
                  className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
                  onClick={handleAddItem}
                  disabled={loading}
                >
                  Add Selected
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Upload Files or URLs to Collection</DialogTitle>
            <DialogDescription className="text-base">
              Upload files, images, or add URLs with descriptions to add to your collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label className="text-base font-medium mb-2 block">Title *</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter a title for this item"
                className="border-gray-200 text-base h-11"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">Description</label>
              <textarea
                rows={3}
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Add a description (optional)"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">Upload Files</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setUploadFiles((prev) => [...prev, ...files])
                  }}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </span>
                  <span className="text-xs text-gray-400">
                    Images, videos, documents, etc.
                  </span>
                </label>
              </div>
              {uploadFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFiles((prev) => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-base font-medium mb-2 block">Add URLs</label>
              <div className="flex gap-2">
                <Input
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="border-gray-200 text-base h-11"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && newUrlInput.trim()) {
                      setUploadUrls((prev) => [...prev, newUrlInput.trim()])
                      setNewUrlInput("")
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newUrlInput.trim()) {
                      setUploadUrls((prev) => [...prev, newUrlInput.trim()])
                      setNewUrlInput("")
                    }
                  }}
                  className="bg-[#036aff] text-white hover:bg-[#036aff]/90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {uploadUrls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 truncate">{url}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadUrls((prev) => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 sm:justify-between">
              <Button
                variant="ghost"
                className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
                onClick={() => {
                  setIsUploadDialogOpen(false)
                  resetUploadForm()
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
                onClick={handleUploadToCollection}
                disabled={loading || (!uploadTitle.trim() || (uploadFiles.length === 0 && uploadUrls.length === 0))}
              >
                {loading ? "Uploading..." : "Upload & Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Collection Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" showCloseButton={false}>
          <DialogHeader className="pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-2xl font-bold text-[#141414]">
                    {selectedCollection?.name}
                  </DialogTitle>
                  {selectedCollection && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-3 py-1 rounded-full",
                        selectedCollection.visibility === "PUBLIC"
                          ? "border-green-200 text-green-700 bg-green-50"
                          : "border-gray-200 text-gray-600 bg-gray-50"
                      )}
                    >
                      {selectedCollection.visibility === "PUBLIC" ? (
                        <Globe2 className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Lock className="h-4 w-4 mr-1.5" />
                      )}
                      {selectedCollection.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  )}
                  {selectedCollection && user && selectedCollection.owner_id === user.id && (
                    <Badge className="bg-[#036aff]/10 text-[#036aff] text-xs font-semibold px-3 py-1 rounded-full">
                      Owner: You
                    </Badge>
                  )}
                  {selectedCollection && user && selectedCollection.owner_id !== user.id && (
                    <>
                      {getBookmarkedCollectionIds().includes(selectedCollection.id) && (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-full">
                          <Bookmark className="h-3 w-3 mr-1 inline" />
                          Bookmarked
                        </Badge>
                      )}
                      {selectedCollection.owner && (
                        <button
                          onClick={() => navigate(`/profile/${selectedCollection.owner!.id}`)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#036aff] transition-colors px-3 py-1 rounded-full hover:bg-gray-50"
                        >
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {selectedCollection.owner.student_code || selectedCollection.owner.display_name || "Unknown"}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
                {selectedCollection?.description && (
                  <DialogDescription className="text-base text-gray-600 leading-relaxed">
                    {selectedCollection.description}
                  </DialogDescription>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Bookmark className="h-4 w-4" />
                    <span className="font-semibold">
                      {selectedCollection?.collection_items?.length || 0} items
                    </span>
                  </div>
                  {selectedCollection?.collection_items && selectedCollection.collection_items.length > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                        {(["RESOURCE", "THREAD", "COMMENT", "EXTERNAL"] as CollectionItemType[])
                          .map((type) => ({
                            type,
                            count: selectedCollection.collection_items!.filter((i) => i.type === type).length,
                          }))
                          .filter((entry) => entry.count > 0)
                          .map((entry) => (
                            <span key={entry.type} className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-2.5 py-1">
                              {getItemTypeIcon(entry.type)}
                              <span>
                                {entry.count} {getItemTypeLabel(entry.type).toLowerCase()}
                              </span>
                            </span>
                          ))}
                      </div>
                    </>
                  )}
                  {selectedCollection?.tags && selectedCollection.tags.length > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCollection.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-gray-200 text-xs px-2 py-0.5 capitalize"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {selectedCollection && user && selectedCollection.owner_id === user.id && (
                <Button
                  className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5 shrink-0"
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    openAddItemDialog(selectedCollection)
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selectedCollection?.collection_items && selectedCollection.collection_items.length > 0 ? (
              <div className="space-y-4">
                {selectedCollection.collection_items.map((item, index) => {
                  // Get thread/comment data if available
                  let threadData: FeedPost | null = null
                  let commentData: { comment: FeedComment; thread: FeedPost } | null = null
                  
                  if (item.type === "THREAD" && item.reference_id) {
                    threadData = likedThreads.find(t => t.id === item.reference_id) || feedPosts.find(t => t.id === item.reference_id) || null
                  } else if (item.type === "COMMENT" && item.reference_id) {
                    for (const thread of feedPosts) {
                      const comment = thread.comments.find(c => c.id === item.reference_id)
                      if (comment) {
                        commentData = { comment, thread }
                        break
                      }
                    }
                  }

                  return (
                    <Card
                      key={item.id}
                      className="group border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all"
                    >
                      <CardContent className="p-6">
                        {/* Header with icon, badge, and title */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-lg shrink-0",
                            item.type === "RESOURCE" ? "bg-orange-50" :
                            item.type === "THREAD" ? "bg-green-50" :
                            item.type === "COMMENT" ? "bg-purple-50" :
                            "bg-blue-50"
                          )}>
                            <div className={cn(
                              item.type === "RESOURCE" ? "text-orange-600" :
                              item.type === "THREAD" ? "text-green-600" :
                              item.type === "COMMENT" ? "text-purple-600" :
                              "text-blue-600"
                            )}>
                              {getItemTypeIcon(item.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2.5 py-1 font-semibold",
                                  item.type === "RESOURCE" ? "border-orange-200 text-orange-700 bg-orange-50" :
                                  item.type === "THREAD" ? "border-green-200 text-green-700 bg-green-50" :
                                  item.type === "COMMENT" ? "border-purple-200 text-purple-700 bg-purple-50" :
                                  "border-blue-200 text-blue-700 bg-blue-50"
                                )}
                              >
                                {getItemTypeLabel(item.type)}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                #{index + 1}
                              </span>
                            </div>
                            
                            {/* Resource Title */}
                            {item.type === "RESOURCE" && item.reference_id && resourceIndex[item.reference_id] && (
                              <h3 className="text-base font-semibold text-[#141414] line-clamp-2">
                                {resourceIndex[item.reference_id].title}
                              </h3>
                            )}
                            
                            {/* Thread Title */}
                            {item.type === "THREAD" && threadData && (
                              <h3 className="text-base font-semibold text-[#141414] line-clamp-2">
                                {threadData.title}
                              </h3>
                            )}
                            
                            {/* Comment Preview */}
                            {item.type === "COMMENT" && commentData && (
                              <div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {commentData.comment.text}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  From thread: {commentData.thread.title}
                                </p>
                              </div>
                            )}
                            
                            {/* External URL */}
                            {item.type === "EXTERNAL" && item.url && (
                              <div>
                                <p className="text-sm text-gray-500 line-clamp-1">
                                  {getExternalHost(item.url)}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          {selectedCollection && user && selectedCollection.owner_id === user.id && editingItemId !== item.id && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 border-gray-200 hover:border-[#036aff] hover:bg-[#036aff]/10 hover:text-[#036aff]"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="h-4 w-4 mr-1.5" />
                                Edit Note
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleRemoveItem(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Content Actions */}
                        <div className="mb-4">
                          {item.type === "RESOURCE" && item.reference_id && (
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-200 hover:bg-gray-50"
                              onClick={() => navigate(`/resource/${item.reference_id}`)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              <span className="font-medium">View Resource</span>
                            </Button>
                          )}
                          
                          {item.type === "THREAD" && threadData && (
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-200 hover:bg-gray-50"
                              onClick={() => navigate(`/feed/${threadData!.id}`)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              <span className="font-medium">View Thread</span>
                            </Button>
                          )}
                          
                          {item.type === "COMMENT" && commentData && (
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-200 hover:bg-gray-50"
                              onClick={() => navigate(`/feed/${commentData!.thread.id}`)}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              <span className="font-medium">View Thread</span>
                            </Button>
                          )}
                          
                          {item.type === "EXTERNAL" && item.url && (
                            <Button
                              variant="outline"
                              className="w-full justify-start border-gray-200 hover:bg-gray-50"
                              asChild
                            >
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="h-4 w-4 mr-2" />
                                <span className="font-medium">Open Link</span>
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Private Note Section */}
                        {editingItemId === item.id ? (
                          <div className="pt-4 border-t border-gray-200">
                            <label className="text-sm font-semibold text-[#141414] mb-2 block">
                              Private Note
                            </label>
                            <textarea
                              value={editingItemNote}
                              onChange={(e) => setEditingItemNote(e.target.value)}
                              rows={4}
                              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20 focus:border-[#036aff] mb-3"
                              placeholder="Add your private notes about this item..."
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-[#036aff] text-white hover:bg-[#036aff]/90 px-4"
                                onClick={handleSaveItemEdit}
                                disabled={loading}
                              >
                                Save Note
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 px-4"
                                onClick={handleCancelItemEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (item.private_note || (selectedCollection && user && selectedCollection.owner_id === user.id)) ? (
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-semibold text-[#141414]">
                                Private Note
                              </label>
                              {selectedCollection && user && selectedCollection.owner_id === user.id && !item.private_note && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-[#036aff] hover:text-[#036aff] hover:bg-[#036aff]/10 h-auto py-1"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Note
                                </Button>
                              )}
                            </div>
                            {item.private_note ? (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {item.private_note}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                No private note added yet.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-4">
                  <Bookmark className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#141414] mb-2">No items yet</h3>
                <p className="text-base text-gray-500 text-center max-w-sm mb-6">
                  This collection is empty. Start adding resources, threads, comments, or external links.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CollectionPage

