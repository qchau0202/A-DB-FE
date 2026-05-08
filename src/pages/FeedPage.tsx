import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { FeedPostCard } from "@/components/feed/FeedPostCard"
import { QuickieStories } from "@/components/quickies/QuickieStories"
import { Clock, TrendingUp, Activity, Search, Plus, MessageSquare, Hash, Users, FileText, Eye, BookOpen, Code } from "lucide-react"
import { getLatestPosts, getPopularPosts, getActivePosts, getPostsByTags, type Post } from "@/services/posts/postService"
import { getCategories, type TagCategory } from "@/services/categories/categoryService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type FeedFilter = "newest" | "popular" | "active"

interface FeaturedTopic {
  id: string
  name: string
  count: number
}

export function FeedPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [popularTags, setPopularTags] = useState<TagCategory[]>([])
  const [trendingTags, setTrendingTags] = useState<TagCategory[]>([])
  const [allTags, setAllTags] = useState<TagCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showAllTags, setShowAllTags] = useState(false)

  // Static featured topics
  const featuredTopics: FeaturedTopic[] = [
    { id: "1", name: "t/frontend", count: 54 },
    { id: "2", name: "t/backend", count: 17 },
    { id: "3", name: "t/mobile", count: 5 },
    { id: "4", name: "t/devops", count: 4 },
    { id: "5", name: "t/security", count: 4 },
  ]

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true)
        const data = await getCategories()
        // Get top 10 trending tags
        setTrendingTags(data.trending || [])
        // Get top 8 popular tags by count
        setPopularTags(data.popular || [])
        setAllTags(data.tags || [])
      } catch (error) {
        console.error("Failed to load categories:", error)
        toast.error("Failed to load popular tags")
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      let posts
      
      // If a tag is selected, filter by that tag
      if (selectedTag) {
        posts = await getPostsByTags([selectedTag], 20, 0)
      } else {
        // Otherwise use the regular filter
        switch (activeFilter) {
          case "newest":
            posts = await getLatestPosts(20, 0)
            break
          case "popular":
            posts = await getPopularPosts(20, 0)
            break
          case "active":
            posts = await getActivePosts(20, 0)
            break
          default:
            posts = await getLatestPosts(20, 0)
        }
      }
      setPosts(posts)
    } catch (error) {
      console.error("Failed to load posts:", error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [activeFilter, selectedTag])

  const getFilterIcon = (filter: FeedFilter) => {
    switch (filter) {
      case "newest":
        return <Clock className="h-4 w-4" />
      case "popular":
        return <TrendingUp className="h-4 w-4" />
      case "active":
        return <Activity className="h-4 w-4" />
    }
  }

  const getFilterLabel = (filter: FeedFilter) => {
    switch (filter) {
      case "newest":
        return "Newest"
      case "popular":
        return "Popular"
      case "active":
        return "Active"
    }
  }

  const clearTagFilter = () => {
    setSelectedTag(null)
    // Remove tag from URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete("tag")
    setSearchParams(newParams)
  }

  const handleTagSelect = (tagName: string) => {
    setSelectedTag(tagName)
    // Update URL with tag
    const newParams = new URLSearchParams(searchParams)
    newParams.set("tag", tagName)
    setSearchParams(newParams)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="max-w-full p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Talks</h1>
          <p className="text-base text-gray-400">Discuss specific tech products and topics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Filters & Quickies */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg p-1">
                {(["newest", "popular", "active"] as FeedFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeFilter === filter
                        ? "bg-[#2a2a2a] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {getFilterIcon(filter)}
                    {getFilterLabel(filter)}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Quickies Stories */}
            <div className="bg-[#1a1a1a] rounded-xl p-4">
              <QuickieStories onQuickieCreated={loadPosts} />
            </div>

            {/* Tag Filter Indicator */}
            {selectedTag && (
              <div className="bg-[#ff6154]/10 border border-[#ff6154]/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-[#ff6154]" />
                  <span className="text-white text-sm">
                    Showing posts tagged with <span className="font-semibold text-[#ff6154]">{selectedTag}</span>
                  </span>
                </div>
                <button
                  onClick={clearTagFilter}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Feed Posts */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 bg-[#1a1a1a] rounded-xl">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] mb-3">
                    <Clock className="h-5 w-5 text-gray-400 animate-pulse" />
                  </div>
                  <p className="text-sm text-gray-500">Loading posts...</p>
                </div>
              ) : posts.length > 0 ? (
                posts.map((post) => <FeedPostCard key={post._id} post={post} />)
              ) : (
                <div className="text-center py-12 bg-[#1a1a1a] rounded-xl">
                  <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Be the first to start a discussion!
                  </p>
                  <Button
                    onClick={() => navigate("/create")}
                    className="bg-[#ff6154] hover:bg-[#e55a4e] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create A Post
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Create Talk Card */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Create a post?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Share your thoughts, ideas, and updates with the community.
              </p>
              <Button
                onClick={() => navigate("/create")}
                className="w-full bg-[#036aff] hover:bg-[#036aff]/80 text-white"
              >
                Create A Post
              </Button>
            </div>

            {/* Featured Topics */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Featured topics</h3>
              <div className="space-y-3">
                {featuredTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/topics/${topic.name}`)}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-white group-hover:text-[#ff6154] transition-colors">
                      {topic.name}
                    </span>
                    <span className="text-sm text-gray-500">{topic.count} talks</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Tags */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Trending tags</h3>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-[#ff6154] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trendingTags.slice(0, 8).map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagSelect(tag.name)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTag === tag.name
                          ? "bg-[#ff6154] text-white"
                          : "bg-[#ff6154]/20 text-[#ff6154] hover:bg-[#ff6154]/30"
                      }`}
                    >
                      {tag.type === "post" && <MessageSquare className="h-3 w-3" />}
                      {tag.type === "quickie" && <Eye className="h-3 w-3" />}
                      {tag.type === "user" && <Users className="h-3 w-3" />}
                      {tag.type === "document" && <BookOpen className="h-3 w-3" />}
                      {tag.type === "snippet" && <Code className="h-3 w-3" />}
                      <span>{tag.name}</span>
                      <span className="opacity-70">{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* All Tags - Expandable */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">All tags</h3>
                <button
                  type="button"
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="text-sm text-[#ff6154] hover:text-[#e55a4e] transition-colors"
                >
                  {showAllTags ? "Show less" : `View all (${allTags.length})`}
                </button>
              </div>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-[#ff6154] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className={`flex flex-wrap gap-2 ${showAllTags ? "" : "max-h-32 overflow-hidden"}`}>
                  {allTags.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagSelect(tag.name)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTag === tag.name
                          ? "bg-[#ff6154] text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                      }`}
                    >
                      {tag.type === "post" && <MessageSquare className="h-3 w-3" />}
                      {tag.type === "quickie" && <Eye className="h-3 w-3" />}
                      {tag.type === "user" && <Users className="h-3 w-3" />}
                      {tag.type === "document" && <BookOpen className="h-3 w-3" />}
                      {tag.type === "snippet" && <Code className="h-3 w-3" />}
                      <span>{tag.name}</span>
                      <span className="opacity-70">{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
              {!showAllTags && allTags.length > 8 && (
                <div className="mt-2 text-center">
                  <div className="h-8 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
                </div>
              )}
            </div>

            {/* Popular Tags */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Popular tags</h3>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTagSelect(tag.name)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTag === tag.name
                          ? "bg-[#ff6154] text-white"
                          : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                      }`}
                    >
                      {tag.type === "post" && <MessageSquare className="h-3 w-3" />}
                      {tag.type === "quickie" && <Eye className="h-3 w-3" />}
                      {tag.type === "user" && <Users className="h-3 w-3" />}
                      {tag.type === "document" && <BookOpen className="h-3 w-3" />}
                      {tag.type === "snippet" && <Code className="h-3 w-3" />}
                      <span>{tag.name}</span>
                      <span className="text-gray-500">{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Quick links</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/explore")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left"
                >
                  <Users className="h-4 w-4 text-[#ff6154]" />
                  <span className="text-sm text-gray-300">Explore People</span>
                </button>
                <button
                  onClick={() => navigate("/documents")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-[#00d4ff]" />
                  <span className="text-sm text-gray-300">Browse Documents</span>
                </button>
                <button
                  onClick={() => navigate("/categories")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left"
                >
                  <Hash className="h-4 w-4 text-[#ffcc00]" />
                  <span className="text-sm text-gray-300">Categories</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
