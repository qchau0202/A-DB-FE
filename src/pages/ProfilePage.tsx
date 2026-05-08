import { useParams } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { ProfileOverview } from "@/components/profile/ProfileOverview"
import { ProfileStats } from "@/components/profile/ProfileStats"
import { ProfileActivityList } from "@/components/profile/ProfileActivityList"

const ProfilePage = () => {
  const { id } = useParams<{ id: string }>()
  const { user, accessToken } = useAuth()
  
  // If no id in URL, show current user's profile
  const profileUserId = id || user?.id || ""

  return (
    <div className="min-h-screen bg-[#0d0d0d] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <ProfileOverview />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(220px,0.35fr)]">
          <div className="space-y-4">
            <ProfileActivityList userId={profileUserId} />
          </div>
          <div className="space-y-4">
            <ProfileStats />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage