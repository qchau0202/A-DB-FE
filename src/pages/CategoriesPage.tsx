import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Hash, TrendingUp, Users, MessageSquare, Eye, ArrowRight, BookOpen, Code, X, RefreshCw, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getCategories, type TagCategory } from "@/services/categories/categoryService"
import { getPostsByTag } from "@/services/categories/categoryService"
import { getDocumentsByTag } from "@/services/categories/categoryService"
import { getSnippetsByTag } from "@/services/categories/categoryService"
import { toast } from "sonner"

const DEPARTMENTS = [
  { id: 1, name: "Backend" },
  { id: 2, name: "Frontend" },
  { id: 3, name: "DevOps" },
] as const

type ContentTab = "posts" | "documents" | "snippets" | "quickies"

interface ContentItem {
  _id: string
  title?: string
  name?: string
  caption?: string
  content?: string
  author_id: string
  created_at: string
  tags?: string[]
  type: string
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<"all" | "post" | "quickie" | "user" | "document" | "snippet">("all")
  const [selectedDepartment, setSelectedDepartment] = useState<"all" | number>("all")
  const [tags, setTags] = useState<TagCategory[]>([])
  const [trendingTags, setTrendingTags] = useState<TagCategory[]>([])
  const [postTags, setPostTags] = useState<TagCategory[]>([])
  const [quickieTags, setQuickieTags] = useState<TagCategory[]>([])
  const [documentTags, setDocumentTags] = useState<TagCategory[]>([])
  const [snippetTags, setSnippetTags] = useState<TagCategory[]>([])
  const [userCategories, setUserCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selected tag content viewer
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ContentTab>("posts")
  const [tagContent, setTagContent] = useState<ContentItem[]>([])
  const [tagContentLoading, setTagContentLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setTags(data.tags)
      setTrendingTags(data.trending)
      setPostTags(data.posts || [])
      setQuickieTags(data.quickies || [])
      setDocumentTags(data.documents || [])
      setSnippetTags(data.snippets || [])
      setUserCategories(data.users || [])
    } catch (error) {
      console.error("Failed to load categories:", error)
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredTags = tags.filter((tag) => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === "all" || tag.type === selectedType
    return matchesSearch && matchesType
  })

  const visibleUserCategories = userCategories
    .filter((community) => selectedDepartment === "all" || community.departmentId === selectedDepartment)
    .sort((a, b) => {
      if (a.departmentId === b.departmentId) {
        return a.name.localeCompare(b.name)
      }

      if (a.departmentId == null) return 1
      if (b.departmentId == null) return -1

      return a.departmentId - b.departmentId
    })

  // Load content for selected tag
  const loadTagContent = useCallback(async (tag: string, tab: ContentTab) => {
    setTagContentLoading(true)
    try {
      let content: ContentItem[] = []
      switch (tab) {
        case "posts":
          const postsRes = await getPostsByTag(tag)
          content = postsRes.posts.map((p: any) => ({ ...p, type: "post" }))
          break
        case "documents":
          const docsRes = await getDocumentsByTag(tag)
          content = docsRes.documents.map((d: any) => ({ ...d, type: "document" }))
          break
        case "snippets":
          const snippetsRes = await getSnippetsByTag(tag)
          content = snippetsRes.snippets.map((s: any) => ({ ...s, type: "snippet" }))
          break
        case "quickies":
          // Quickies don't have a direct API yet, show empty for now
          content = []
          break
      }
      setTagContent(content)
    } catch (error) {
      console.error("Failed to load tag content:", error)
      toast.error("Failed to load content")
    } finally {
      setTagContentLoading(false)
    }
  }, [])

  const handleTagClick = (tagName: string) => {
    setSelectedTag(tagName)
    loadTagContent(tagName, activeTab)
  }

  const closeTagViewer = () => {
    setSelectedTag(null)
    setTagContent([])
  }

  const switchTab = (tab: ContentTab) => {
    setActiveTab(tab)
    if (selectedTag) {
      loadTagContent(selectedTag, tab)
    }
  }

  const getTagIcon = (type: string) => {
    switch (type) {
      case "post":
        return <MessageSquare className="h-4 w-4" />
      case "quickie":
        return <Eye className="h-4 w-4" />
      case "user":
        return <Users className="h-4 w-4" />
      case "document":
        return <BookOpen className="h-4 w-4" />
      case "snippet":
        return <Code className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const getTagColor = (type: string) => {
    switch (type) {
      case "post":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      case "quickie":
        return "bg-blue-500/10 text-blue-200 border-blue-500/20"
      case "user":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      case "document":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      case "snippet":
        return "bg-blue-500/15 text-blue-200 border-blue-500/25"
      default:
        return "bg-blue-500/10 text-blue-200 border-blue-500/20"
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="max-w-full p-6">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                Categories
              </h1>
              <p className="text-gray-400">
                Explore {tags.length} topics, tags, and communities across the platform
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadCategories()
                toast.success("Categories refreshed")
              }}
              disabled={loading}
              className="border-[#1f3f7a] text-blue-200 hover:text-white hover:bg-[#036aff]/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-[#101827] rounded-xl p-4 border border-[#1f3f7a]">
              <div className="flex items-center gap-2 text-blue-300 mb-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Posts</span>
              </div>
              <p className="text-2xl font-bold text-white">{postTags.filter(t => t.type === 'post').reduce((sum, t) => sum + t.count, 0)}</p>
            </div>
            <div className="bg-[#101827] rounded-xl p-4 border border-[#1f3f7a]">
              <div className="flex items-center gap-2 text-blue-300 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm font-medium">Docs</span>
              </div>
              <p className="text-2xl font-bold text-white">{documentTags.filter(t => t.type === 'document').reduce((sum, t) => sum + t.count, 0)}</p>
            </div>
            <div className="bg-[#101827] rounded-xl p-4 border border-[#1f3f7a]">
              <div className="flex items-center gap-2 text-blue-300 mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Quickies</span>
              </div>
              <p className="text-2xl font-bold text-white">{quickieTags.filter(t => t.type === 'quickie').reduce((sum, t) => sum + t.count, 0)}</p>
            </div>
            <div className="bg-[#101827] rounded-xl p-4 border border-[#1f3f7a]">
              <div className="flex items-center gap-2 text-blue-300 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{userCategories.length}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => navigate("/categories/communities")}
              className="bg-[#036aff] hover:bg-[#0258d6] text-white shadow-lg shadow-[#036aff]/20"
            >
              <Users className="h-4 w-4 mr-2" />
              Open User Communities
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-sm text-gray-400">
              Browse Backend, Frontend, and DevOps profiles in the communities subpage.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search tags, topics, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-lg flex-wrap">
            {(["all", "post", "quickie", "document", "snippet", "user"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedType === type
                    ? "bg-[#036aff] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#036aff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Filtered Results - Shows when search or type filter is active */}
        {(searchQuery || selectedType !== "all") && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              {searchQuery ? `Search Results (${filteredTags.length})` : `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Tags (${filteredTags.length})`}
            </h2>
            {filteredTags.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTagClick(tag.name)
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getTagColor(
                      tag.type
                    )} hover:opacity-80 transition-opacity`}
                  >
                    {getTagIcon(tag.type)}
                    <span className="font-medium">{tag.name}</span>
                    <span className="opacity-60">{tag.count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No {selectedType !== "all" ? selectedType : ""} tags found</p>
            )}
          </div>
        )}

        {/* Trending Section */}
        {!searchQuery && selectedType === "all" && (
          <>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-[#036aff]" />
                <h2 className="text-lg font-semibold text-white">Trending Now</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {trendingTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTagClick(tag.name)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#036aff]/15 text-[#61a0ff] border border-[#1f3f7a] hover:bg-[#036aff]/25 transition-colors"
                  >
                    {getTagIcon(tag.type)}
                    <span className="font-medium">{tag.name}</span>
                    <span className="opacity-60">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Post Tags */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#61a0ff]" />
                  <h2 className="text-lg font-semibold text-white">Popular Post Tags</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("post")}
                  className="text-[#61a0ff] hover:text-white"
                >
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {postTags.filter(t => t.type === 'post').slice(0, 8).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTagClick(tag.name)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#036aff]/15 text-[#61a0ff] border border-[#1f3f7a] hover:bg-[#036aff]/25 transition-colors"
                  >
                    <Hash className="h-4 w-4" />
                    <span className="font-medium">{tag.name}</span>
                    <span className="opacity-60">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quickie Tags */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-[#61a0ff]" />
                  <h2 className="text-lg font-semibold text-white">Quickie Categories</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("quickie")}
                  className="text-[#61a0ff] hover:text-white"
                >
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {quickieTags.length > 0 ? (
                  quickieTags.filter(t => t.type === 'quickie').map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagClick(tag.name)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#036aff]/12 text-[#61a0ff] border border-[#1f3f7a] hover:bg-[#036aff]/22 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">{tag.name}</span>
                      <span className="opacity-60">{tag.count}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No quickie tags yet</p>
                )}
              </div>
            </div>

            {/* Document Tags */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#61a0ff]" />
                  <h2 className="text-lg font-semibold text-white">Document Categories</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("document")}
                  className="text-[#61a0ff] hover:text-white"
                >
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {documentTags.length > 0 ? (
                  documentTags.filter(t => t.type === 'document').map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagClick(tag.name)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#036aff]/15 text-[#61a0ff] border border-[#1f3f7a] hover:bg-[#036aff]/25 transition-colors"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">{tag.name}</span>
                      <span className="opacity-60">{tag.count}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No document tags yet</p>
                )}
              </div>
            </div>

            {/* Snippet Tags */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-[#61a0ff]" />
                  <h2 className="text-lg font-semibold text-white">Code Snippet Tags</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("snippet")}
                  className="text-[#61a0ff] hover:text-white"
                >
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {snippetTags.length > 0 ? (
                  snippetTags.filter(t => t.type === 'snippet').map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagClick(tag.name)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#036aff]/12 text-[#61a0ff] border border-[#1f3f7a] hover:bg-[#036aff]/22 transition-colors"
                    >
                      <Code className="h-4 w-4" />
                      <span className="font-medium">{tag.name}</span>
                      <span className="opacity-60">{tag.count}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No snippet tags yet</p>
                )}
              </div>
            </div>

            {/* User Categories */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#61a0ff]" />
                  <h2 className="text-lg font-semibold text-white">User Communities</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType("user")}
                  className="text-[#61a0ff] hover:text-white"
                >
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedDepartment("all")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedDepartment === "all"
                      ? "bg-[#036aff] text-white border-[#036aff]"
                      : "bg-[#101827] text-gray-300 border-[#1f3f7a] hover:text-white hover:border-[#036aff]"
                  }`}
                >
                  All Departments
                </button>
                {DEPARTMENTS.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => setSelectedDepartment(department.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      selectedDepartment === department.id
                        ? "bg-[#036aff] text-white border-[#036aff]"
                        : "bg-[#101827] text-gray-300 border-[#1f3f7a] hover:text-white hover:border-[#036aff]"
                    }`}
                  >
                    {department.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {visibleUserCategories.map((tag) => (
                  <button
                    key={`${tag.departmentId ?? tag.name}-${tag.name}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleTagClick(tag.name)
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#101827] border border-[#1f3f7a] hover:bg-[#0f1b31] transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#036aff]/15 flex items-center justify-center">
                      <Users className="h-6 w-6 text-[#61a0ff]" />
                    </div>
                    <span className="font-medium text-white">{tag.name}</span>
                    <span className="text-sm text-gray-400">{tag.count} members</span>
                  </button>
                ))}
              </div>
              {visibleUserCategories.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">No communities found for this department.</p>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#2a2a2a]">
          <p className="text-sm text-gray-500 text-center">
            Discover content by exploring tags and categories. Click on any tag to see related posts, quickies, and users.
          </p>
        </div>
      </div>

      {/* Tag Content Viewer Modal */}
      {selectedTag && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#036aff]/15 flex items-center justify-center">
                  <Hash className="h-6 w-6 text-[#61a0ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTag}</h2>
                  <p className="text-sm text-gray-400">
                    {tags.find(t => t.name === selectedTag)?.count || 0} items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeTagViewer}
                className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-[#2a2a2a] bg-[#0d0d0d]">
              {(["posts", "documents", "snippets", "quickies"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-[#036aff] text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                  }`}
                >
                  {tab === "posts" && <MessageSquare className="h-4 w-4" />}
                  {tab === "documents" && <BookOpen className="h-4 w-4" />}
                  {tab === "snippets" && <Code className="h-4 w-4" />}
                  {tab === "quickies" && <Eye className="h-4 w-4" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tagContentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[#036aff] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tagContent.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No {activeTab} found for this tag</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tagContent.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => {
                        if (item.type === "post") navigate(`/posts/${item._id}`)
                        if (item.type === "document") navigate(`/documents/${item._id}`)
                        if (item.type === "snippet") navigate(`/snippets/${item._id}`)
                      }}
                      className="p-4 rounded-xl bg-[#0d0d0d] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.type === "post" ? "bg-[#036aff]/15" :
                          item.type === "document" ? "bg-[#036aff]/12" :
                          item.type === "snippet" ? "bg-[#036aff]/10" :
                          "bg-[#036aff]/15"
                        }`}>
                          {item.type === "post" && <MessageSquare className="h-5 w-5 text-[#61a0ff]" />}
                          {item.type === "document" && <BookOpen className="h-5 w-5 text-[#61a0ff]" />}
                          {item.type === "snippet" && <Code className="h-5 w-5 text-[#61a0ff]" />}
                          {item.type === "quickie" && <Eye className="h-5 w-5 text-[#61a0ff]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {item.title || item.name || item.caption || "Untitled"}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                            {item.content?.substring(0, 150) || "No description"}
                            {item.content && item.content.length > 150 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            {item.tags?.map((t) => (
                              <span key={t} className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2a2a2a] bg-[#0d0d0d]">
              <button
                type="button"
                onClick={() => navigate(`/?tag=${encodeURIComponent(selectedTag)}`)}
                className="w-full py-3 bg-[#036aff] hover:bg-[#0258d6] text-white rounded-xl font-medium transition-colors"
              >
                View in Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
