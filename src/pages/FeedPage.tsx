import { useEffect, useState } from "react"
import { FeedComposer } from "@/components/feed/FeedComposer"
import { FeedPostCard } from "@/components/feed/FeedPostCard"
import { Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import {
  getAllThreads,
  mapBackendThreadToFeedPost,
  type FeedPost,
} from "@/services/mainServices"

export function FeedPage() {
  const { accessToken } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  const loadThreads = async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await getAllThreads(accessToken, {
        status: 'open', // Only show open threads
      })
      const mappedPosts = response.threads.map(thread =>
        mapBackendThreadToFeedPost(thread)
      )
      setPosts(mappedPosts)
    } catch (error) {
      console.error("Failed to load threads:", error)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadThreads()
  }, [accessToken])

  const handleThreadCreated = () => {
    // Reload threads after creating a new one
    loadThreads()
  }

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-4 lg:px-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-[#141414]">Student Feed</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connect with your peers and share study resources
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#036aff]/10 to-purple-100/50 border border-[#036aff]/20">
            <Sparkles className="h-4 w-4 text-[#036aff]" />
            <span className="text-sm font-medium text-[#036aff]">Latest Updates</span>
          </div>
        </div>

        {/* Composer */}
        <FeedComposer onThreadCreated={handleThreadCreated} />

        {/* Feed Posts */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Sparkles className="h-8 w-8 text-gray-400 animate-pulse" />
              </div>
              <p className="text-sm text-gray-500">Loading threads...</p>
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => <FeedPostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Sparkles className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Be the first to share a question or start a discussion with your peers!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


