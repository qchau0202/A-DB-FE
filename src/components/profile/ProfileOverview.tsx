import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { emptyProfileInfo, type ProfileInfo } from "@/data/profile"
import { useAuth } from "@/contexts/AuthContext"
import { getProfileByUserId, updateProfile, followUser, unfollowUser, checkFollowStatus, type BackendProfile } from "@/services/mainServices"
import { Mail, UserCircle, UserPlus, UserCheck } from "lucide-react"
import { toast } from "sonner"


export function ProfileOverview() {
  const { user, accessToken } = useAuth()
  const { id: profileIdParam } = useParams<{ id: string }>()
  const DEFAULT_AVATAR = "/dev_connect-logo.png"
  const [profile, setProfile] = useState<ProfileInfo>(emptyProfileInfo)
  const [loading, setLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  // Use user_id (Supabase UUID) for profile lookups, not profile id
  const viewingUserId = profileIdParam || user?.id || ""
  const viewingSelf = !profileIdParam || profileIdParam === user?.id

  const [editUsername, setEditUsername] = useState("")
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editAvatarUrl, setEditAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)

  useEffect(() => {
    if (!viewingUserId) return
    setLoading(true)
    // Use getProfileByUserId with Supabase user_id (UUID)
    // For viewing other profiles, we can try without token (public profiles)
    // or with token if available
    const token = accessToken || undefined
    getProfileByUserId(viewingUserId, token)
      .then((backend: BackendProfile) => {
        setProfile({
          id: backend.id,
          userId: backend.user_id,
          username: backend.username || "",
          displayName: backend.display_name || backend.username || "User",
          bio: backend.bio || "",
          avatarUrl: backend.avatar_url || "",
          departmentId: backend.department_id,
          followerCount: backend.follower_count,
          following: backend.following,
          createdAt: backend.created_at,
          updatedAt: backend.updated_at,
          email: viewingSelf ? (user?.email || "") : "",
        })
      })
      .catch((err) => {
        console.error("Failed to load profile:", err)
        // Fallback to basic auth user info if profile API fails
        if (user && viewingSelf) {
          setProfile({
            ...emptyProfileInfo,
            id: user.id,
            userId: user.id,
            displayName: user.name,
            avatarUrl: user.avatar || "",
            email: user.email,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user, accessToken, viewingUserId, viewingSelf])

  useEffect(() => {
    if (user && !accessToken && viewingSelf) {
      setProfile({
        ...emptyProfileInfo,
        id: user.id,
        userId: user.id,
        displayName: user.name,
        avatarUrl: user.avatar || "",
        email: user.email,
      })
    }
  }, [user, accessToken, viewingSelf])

  // Check follow status when viewing another user's profile
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!viewingUserId || !user?.id || !accessToken || viewingUserId === user.id) return
      try {
        const following = await checkFollowStatus(viewingUserId, accessToken, user.id)
        setIsFollowing(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    if (!viewingSelf && accessToken) {
      loadFollowStatus()
    }
  }, [viewingUserId, user?.id, accessToken, viewingSelf])

  const initials = user?.initials || profile.displayName.charAt(0).toUpperCase() || "U"
  const avatarSrc = profile.avatarUrl || user?.avatar || DEFAULT_AVATAR
  const displayName = profile.displayName || user?.name || "None"
  const username = profile.username || "None"
  const email = profile.email || user?.email || "None"
  const bio = profile.bio || "None"
  const followerCount = profile.followerCount || 0
  const followingCount = profile.following?.length || 0

  const handleOpenEdit = () => {
    if (!viewingSelf) return
    setEditUsername(profile.username || "")
    setEditDisplayName(profile.displayName || user?.name || "")
    setEditBio(profile.bio || "")
    setEditAvatarUrl(profile.avatarUrl || user?.avatar || "")
    setIsEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!user || !accessToken || !viewingSelf) {
      toast.error("You must be logged in to update your profile")
      return
    }

    try {
      setSaving(true)

      // Build payload only with fields actually filled in.
      const payload: any = {}
      if (editUsername.trim()) payload.username = editUsername.trim()
      if (editDisplayName.trim()) payload.display_name = editDisplayName.trim()
      if (editBio.trim()) payload.bio = editBio.trim()
      if (editAvatarUrl.trim()) payload.avatar_url = editAvatarUrl.trim()

      if (Object.keys(payload).length === 0) {
        toast.info("Nothing to update – all fields are blank")
        return
      }

      const updated = await updateProfile(payload, accessToken)

      setProfile({
        id: updated.id,
        userId: updated.user_id,
        username: updated.username || "",
        displayName: updated.display_name || user.name || "",
        bio: updated.bio || "",
        avatarUrl: updated.avatar_url || user.avatar || "",
        departmentId: updated.department_id,
        followerCount: updated.follower_count,
        following: updated.following,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        email: user.email,
      })

      toast.success("Profile updated")
      setIsEditOpen(false)
    } catch (err) {
      console.error("Failed to update profile:", err)
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "Something went wrong",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFollow = async () => {
    if (!viewingUserId || !user || !accessToken || viewingUserId === user.id) return
    try {
      setFollowBusy(true)
      await followUser(viewingUserId, accessToken)
      setIsFollowing(true)
      toast.success("Followed user")
    } catch (error) {
      toast.error("Failed to follow user", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setFollowBusy(false)
    }
  }

  const handleUnfollowClick = () => {
    setShowUnfollowDialog(true)
  }

  const handleConfirmUnfollow = async () => {
    if (!viewingUserId || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(viewingUserId, accessToken)
      setIsFollowing(false)
      setShowUnfollowDialog(false)
      toast.success("Unfollowed user")
    } catch (error) {
      toast.error("Failed to unfollow user", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Profile Card */}
      <Card className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl">
        <CardContent className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-[#2a2a2a] text-white text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-white">
                      {loading ? "Loading profile..." : displayName}
                    </h1>
                                      </div>
                  {accessToken && (
                    <div className="flex items-center gap-2">
                      {viewingSelf ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold text-white border-[#2a2a2a] hover:bg-[#2a2a2a] bg-transparent"
                          onClick={handleOpenEdit}
                        >
                          Edit profile
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            onClick={isFollowing ? handleUnfollowClick : handleFollow}
                            disabled={followBusy}
                            className={`text-xs font-semibold ${
                              isFollowing
                                ? "border-[#2a2a2a] hover:bg-[#2a2a2a] text-white bg-transparent"
                                : "bg-[#036aff] text-white hover:bg-[#024eba]"
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                          <Dialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
                            <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                              <DialogHeader>
                                <DialogTitle className="text-white">Unfollow {displayName}?</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                  You will no longer see posts from this user in your feed.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowUnfollowDialog(false)}
                                  disabled={followBusy}
                                  className="border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="default"
                                  onClick={handleConfirmUnfollow}
                                  disabled={followBusy}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Unfollow
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span>@{username}</span>
                  <span>·</span>
                  <span>{followerCount} followers</span>
                  <span>·</span>
                  <span>{followingCount} following</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                {bio}
              </p>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#2a2a2a]">
            {/* Username */}
            <div className="flex items-start gap-3">
              <UserCircle className="h-6 w-6 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Username
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  @{username}
                </div>
              </div>
            </div>

            {/* Email - Only show for own profile */}
            {viewingSelf && (
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Email
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {email}
                  </div>
                </div>
              </div>
            )}

            {/* Followers */}
            <div className="flex items-start gap-3">
              <UserPlus className="h-6 w-6 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Followers
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  {followerCount}
                </div>
              </div>
            </div>

            {/* Following */}
            <div className="flex items-start gap-3">
              <UserCheck className="h-6 w-6 text-gray-500 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Following
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  {followingCount}
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1a1a1a] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-lg text-white">Edit profile</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Update your basic information. Leave a field blank to keep it as &ldquo;None&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Username</label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Your username"
                className="bg-[#252525] border-[#2a2a2a] text-white h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Display name</label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Your display name"
                className="bg-[#252525] border-[#2a2a2a] text-white h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Bio</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell your classmates about your interests, courses, or study goals"
                className="w-full rounded-lg bg-[#252525] border border-[#2a2a2a] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Avatar URL</label>
              <Input
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[#252525] border-[#2a2a2a] text-white h-10 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => setIsEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#036aff] text-white font-bold hover:bg-[#036aff]/90 text-sm px-5 py-2.5"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

