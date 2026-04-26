import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { emptyProfileInfo, type ProfileInfo, type SocialLink } from "@/data/profile"
import { useAuth } from "@/contexts/AuthContext"
import { getProfileById, updateProfile, followUser, unfollowUser, checkFollowStatus, createNotification, type BackendProfile } from "@/services/mainServices"
import { Facebook, Instagram, Linkedin, Github, User, Mail, Phone, Calendar, UserCircle, UserPlus, UserCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const getSocialIcon = (platform: string) => {
  switch (platform) {
    case "facebook":
      return <Facebook className="h-4 w-4" />
    case "instagram":
      return <Instagram className="h-4 w-4" />
    case "linkedin":
      return <Linkedin className="h-4 w-4" />
    case "github":
      return <Github className="h-4 w-4" />
    case "unicircle":
      return <UserCircle className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
  }
}

const formatDate = (dateString: string): string => {
  if (!dateString) return "None"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function ProfileOverview() {
  const { user, accessToken } = useAuth()
  const { id: profileIdParam } = useParams<{ id: string }>()
  const DEFAULT_AVATAR = "/UniCircle_logo-removebg.png"
  const [profile, setProfile] = useState<ProfileInfo>(emptyProfileInfo)
  const [loading, setLoading] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const viewingProfileId = profileIdParam || user?.id || ""
  const viewingSelf = !profileIdParam || profileIdParam === user?.id

  const [editDisplayName, setEditDisplayName] = useState("")
  const [editDob, setEditDob] = useState("")
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editFaculty, setEditFaculty] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editAcademicYear, setEditAcademicYear] = useState("")
  const [editAvatarUrl, setEditAvatarUrl] = useState("")
  const [editFacebook, setEditFacebook] = useState("")
  const [editInstagram, setEditInstagram] = useState("")
  const [editLinkedin, setEditLinkedin] = useState("")
  const [editGithub, setEditGithub] = useState("")
  const [saving, setSaving] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false)

  useEffect(() => {
    if (!viewingProfileId || !accessToken) return
    setLoading(true)
    getProfileById(viewingProfileId, accessToken)
      .then((backend: BackendProfile) => {
        let socialLinks: SocialLink[] = []
        if (Array.isArray(backend.social_links)) {
          socialLinks = backend.social_links
        } else if (backend.social_links && typeof backend.social_links === "object") {
          socialLinks = Object.entries(backend.social_links).map(([platform, url]) => ({
            platform,
            url: String(url),
          }))
        }

        setProfile({
          id: backend.id,
          studentId: backend.student?.student_code || backend.student_id || user?.studentId || "",
          displayName: backend.display_name || user?.name || "",
          dob: backend.dob || "",
          phoneNumber: backend.phone_number || "",
          faculty: backend.faculty || user?.facultyCode || "",
          bio: backend.bio || "",
          academicYear: backend.academic_year || user?.academicYear || "",
          avatarUrl: backend.avatar_url || user?.avatar || "",
          socialLinks,
          updatedAt: backend.updated_at || "",
          email: backend.student?.email || user?.email || "",
        })
      })
      .catch((err) => {
        console.error("Failed to load profile:", err)
        // Fallback to basic auth user info if profile API fails
        if (user && viewingSelf) {
          setProfile({
            ...emptyProfileInfo,
            id: user.id,
            studentId: user.studentId || "",
            displayName: user.name,
            academicYear: user.academicYear || "",
            faculty: user.facultyCode || "",
            email: user.email,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user, accessToken])

  useEffect(() => {
    if (user && !accessToken && viewingSelf) {
      setProfile({
        ...emptyProfileInfo,
        id: user.id,
        studentId: user.studentId,
        displayName: user.name,
        academicYear: user.academicYear || "",
        faculty: user.facultyCode || "",
        email: user.email,
      })
    }
  }, [user, accessToken])

  // Check follow status when viewing another user's profile
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!viewingProfileId || !user?.id || !accessToken || viewingProfileId === user.id) return
      try {
        const following = await checkFollowStatus(viewingProfileId, accessToken, user.id)
        setIsFollowing(following)
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    if (!viewingSelf && accessToken) {
      loadFollowStatus()
    }
  }, [viewingProfileId, user?.id, accessToken, viewingSelf])

  const initials = user?.initials || profile.displayName.charAt(0).toUpperCase() || "U"
  const avatarSrc = profile.avatarUrl || user?.avatar || DEFAULT_AVATAR
  const displayName = profile.displayName || user?.name || "None"
  const studentId = profile.studentId || user?.studentId || "None"
  const faculty = profile.faculty || "None"
  const academicYear = profile.academicYear || "None"
  const dob = profile.dob ? formatDate(profile.dob) : "None"
  const phoneNumber = profile.phoneNumber || "None"
  const email = profile.email || user?.email || "None"
  const bio = profile.bio || "None"

  const handleOpenEdit = () => {
    if (!viewingSelf) return
    setEditDisplayName(profile.displayName || user?.name || "")
    setEditDob(profile.dob || "")
    setEditPhoneNumber(profile.phoneNumber || "")
    setEditFaculty(profile.faculty || user?.facultyCode || "")
    setEditBio(profile.bio || "")
    setEditAcademicYear(profile.academicYear || user?.academicYear || "")
    setEditAvatarUrl(profile.avatarUrl || user?.avatar || "")

    const links = profile.socialLinks || []
    setEditFacebook(links.find((l) => l.platform === "facebook")?.url || "")
    setEditInstagram(links.find((l) => l.platform === "instagram")?.url || "")
    setEditLinkedin(links.find((l) => l.platform === "linkedin")?.url || "")
    setEditGithub(links.find((l) => l.platform === "github")?.url || "")

    setIsEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!user || !accessToken || !viewingSelf) {
      toast.error("You must be logged in to update your profile")
      return
    }

    try {
      setSaving(true)

      const socialLinks: Record<string, string> = {}
      if (editFacebook.trim()) socialLinks.facebook = editFacebook.trim()
      if (editInstagram.trim()) socialLinks.instagram = editInstagram.trim()
      if (editLinkedin.trim()) socialLinks.linkedin = editLinkedin.trim()
      if (editGithub.trim()) socialLinks.github = editGithub.trim()

      // Build payload only with fields actually filled in.
      const payload: any = {}
      if (editDisplayName.trim()) payload.display_name = editDisplayName.trim()
      if (editDob) payload.dob = editDob
      if (editPhoneNumber.trim()) payload.phone_number = editPhoneNumber.trim()
      if (editFaculty.trim()) payload.faculty = editFaculty.trim()
      if (editBio.trim()) payload.bio = editBio.trim()
      if (editAcademicYear.trim()) payload.academic_year = editAcademicYear.trim()
      if (editAvatarUrl.trim()) payload.avatar_url = editAvatarUrl.trim()
      if (Object.keys(socialLinks).length > 0) {
        payload.social_links = socialLinks
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Nothing to update – all fields are blank")
        return
      }

      const updated = await updateProfile(profile.id || user.id, payload, accessToken)

      const updatedSocialLinks: SocialLink[] = Array.isArray(updated.social_links)
        ? updated.social_links
        : updated.social_links && typeof updated.social_links === "object"
        ? Object.entries(updated.social_links).map(([platform, url]) => ({
            platform,
            url: String(url),
          }))
        : []

      setProfile({
        id: updated.id,
        studentId: updated.student_id || user.studentId || "",
        displayName: updated.display_name || user.name || "",
        dob: updated.dob || "",
        phoneNumber: updated.phone_number || "",
        faculty: updated.faculty || user.facultyCode || "",
        bio: updated.bio || "",
        academicYear: updated.academic_year || user.academicYear || "",
        avatarUrl: updated.avatar_url || user.avatar || "",
        socialLinks: updatedSocialLinks,
        updatedAt: updated.updated_at || "",
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
    if (!viewingProfileId || !user || !accessToken || viewingProfileId === user.id) return
    try {
      setFollowBusy(true)
      await followUser(viewingProfileId, accessToken, user.id)
      setIsFollowing(true)
      // Send follow notification
      await createNotification(accessToken, {
        recipient_id: viewingProfileId,
        sender_id: user.id,
        title: `${user.name || "Someone"} followed you`,
        type: "follow",
      })
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
    if (!viewingProfileId || !user || !accessToken) return
    try {
      setFollowBusy(true)
      await unfollowUser(viewingProfileId, accessToken, user.id)
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
      <Card className="border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-[#f5f5f5] text-[#141414] text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-[#141414]">
                      {loading ? "Loading profile..." : displayName}
                    </h1>
                    {faculty !== "None" && (
                      <Badge className="bg-[#036aff]/10 text-[#036aff] border-none text-sm font-semibold px-3 py-1">
                        {faculty}
                  </Badge>
                    )}
                  </div>
                  {accessToken && (
                    <div className="flex items-center gap-2">
                      {viewingSelf ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold text-[#141414] border-gray-200 hover:bg-[#f5f5f5]"
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
                            className={cn(
                              "text-xs font-semibold",
                              isFollowing
                                ? "border-gray-200 hover:bg-[#f5f5f5] text-[#141414]"
                                : "bg-[#036aff] text-white hover:bg-[#024eba]"
                            )}
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Unfollow {displayName}?</DialogTitle>
                                <DialogDescription>
                                  You will no longer see posts from this user in your feed.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowUnfollowDialog(false)}
                                  disabled={followBusy}
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
                <div className="flex flex-wrap items-center gap-3 text-base text-gray-600">
                  <span>Student ID: {studentId}</span>
                  <span>·</span>
                  <span>Academic year: {academicYear}</span>
                </div>
              </div>
              <p className="text-base text-gray-600 max-w-2xl leading-relaxed">
                {bio}
              </p>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            {/* Date of Birth */}
            <div className="flex items-start gap-3">
              <Calendar className="h-6 w-6 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Date of Birth
                </div>
                <div className="text-base font-semibold text-[#141414] mt-1">
                  {dob}
                </div>
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex items-start gap-3">
              <UserCircle className="h-6 w-6 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Academic Year
                </div>
                <div className="text-base font-semibold text-[#141414] mt-1">
                  {academicYear}
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Phone Number
                  </div>
                </div>
                <div className="text-base font-semibold text-[#141414] mt-1">
                  {phoneNumber || "None"}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail className="h-6 w-6 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </div>
                </div>
                <div className="text-base font-semibold text-[#141414] mt-1">
                  {email}
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          {profile.socialLinks.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Social Links
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.socialLinks.map((link) => {
                  const icon = getSocialIcon(link.platform)
                  const className = cn(
                    "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#141414] hover:bg-[#f5f5f5] transition-colors"
                  )

                  if (link.platform === "unicircle") {
                    return (
                      <Link key={link.platform} to={link.url} className={className}>
                        {icon}
                        {link.label}
                      </Link>
                    )
                  }

                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {icon}
                      {link.label}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit profile</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Update your basic information. Leave a field blank to keep it as &ldquo;None&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#141414]">Display name</label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Your name"
                className="border-gray-200 h-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#141414]">Date of birth</label>
                <Input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="border-gray-200 h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#141414]">Academic year</label>
                <Input
                  value={editAcademicYear}
                  onChange={(e) => setEditAcademicYear(e.target.value)}
                  placeholder="2023-2027"
                  className="border-gray-200 h-10 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#141414]">Phone number</label>
                <Input
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  placeholder="+84..."
                  className="border-gray-200 h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#141414]">Faculty</label>
                <Input
                  value={editFaculty}
                  onChange={(e) => setEditFaculty(e.target.value)}
                  placeholder="Information Technology"
                  className="border-gray-200 h-10 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#141414]">Bio</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell your classmates about your interests, courses, or study goals"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#036aff]/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#141414]">Avatar URL</label>
              <Input
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="border-gray-200 h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#141414]">Social links</label>
              <div className="space-y-2">
                <Input
                  value={editFacebook}
                  onChange={(e) => setEditFacebook(e.target.value)}
                  placeholder="Facebook URL"
                  className="border-gray-200 h-9 text-sm"
                />
                <Input
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  placeholder="Instagram URL"
                  className="border-gray-200 h-9 text-sm"
                />
                <Input
                  value={editLinkedin}
                  onChange={(e) => setEditLinkedin(e.target.value)}
                  placeholder="LinkedIn URL"
                  className="border-gray-200 h-9 text-sm"
                />
                <Input
                  value={editGithub}
                  onChange={(e) => setEditGithub(e.target.value)}
                  placeholder="GitHub URL"
                  className="border-gray-200 h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between gap-3 sm:justify-between">
            <Button
              variant="ghost"
              className="text-sm font-bold text-[#141414] hover:bg-[#f5f5f5]"
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

