import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Search, Users, MessageSquare, Briefcase, BookOpen, Cpu, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getProfilesByDepartment, type BackendProfile } from "@/services/profile/profileService"
import { toast } from "sonner"

const DEPARTMENTS = [
  { id: 1, name: "Backend", description: "Server-side, APIs, databases, and systems" },
  { id: 2, name: "Frontend", description: "UI, UX, design systems, and client apps" },
  { id: 3, name: "DevOps", description: "Infrastructure, CI/CD, cloud, and reliability" },
] as const

const DEPARTMENT_ICONS = {
  1: Briefcase,
  2: BookOpen,
  3: Cpu,
} as const

export default function UserCommunitiesPage() {
  const navigate = useNavigate()
  const { departmentId } = useParams<{ departmentId?: string }>()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(departmentId ? Number(departmentId) : null)
  const [profiles, setProfiles] = useState<BackendProfile[]>([])
  const [loading, setLoading] = useState(false)

  const activeDepartment = useMemo(
    () => DEPARTMENTS.find((department) => department.id === selectedDepartment) || null,
    [selectedDepartment],
  )

  useEffect(() => {
    if (departmentId) {
      const parsed = Number(departmentId)
      setSelectedDepartment(Number.isInteger(parsed) ? parsed : null)
    }
  }, [departmentId])

  useEffect(() => {
    const loadCommunity = async () => {
      if (!selectedDepartment) {
        setProfiles([])
        return
      }

      try {
        setLoading(true)
        const members = await getProfilesByDepartment(selectedDepartment)
        setProfiles(members)
      } catch (error) {
        console.error("Failed to load community members:", error)
        toast.error("Failed to load community members")
        setProfiles([])
      } finally {
        setLoading(false)
      }
    }

    loadCommunity()
  }, [selectedDepartment])

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery.trim()) {
      return true
    }

    const query = searchQuery.toLowerCase()
    return [profile.display_name, profile.username, profile.bio]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query))
  })

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="max-w-full p-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/categories")}
              className="mb-4 -ml-3 text-[#036aff]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              User Communities
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Open a community to browse the people in that department.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border bg-[#1a1a1a] p-5">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="pl-10 bg-[#1a1a1a] border-[#1f3f7a] text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                {DEPARTMENTS.map((department) => {
                  const Icon = DEPARTMENT_ICONS[department.id]
                  const isActive = selectedDepartment === department.id

                  return (
                    <button
                      key={department.id}
                      type="button"
                      onClick={() => setSelectedDepartment(department.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        isActive
                          ? "border-[#036aff] bg-[#036aff]/10"
                          : "bg-[#1a1a1a] border-[#1f3f7a] hover:border-[#2a5aa0]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#036aff]/15 text-[#61a0ff]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{department.name}</p>
                            <p className="text-xs text-gray-400">{department.description}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 ${isActive ? "text-[#61a0ff]" : "text-gray-500"}`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border bg-[#1a1a1a] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-blue-300/70">Community</p>
                  <h2 className="text-2xl font-semibold text-white">
                    {activeDepartment ? activeDepartment.name : "Select a department"}
                  </h2>
                </div>
                <div className="rounded-full bg-[#0d1422] border border-[#1f3f7a] px-4 py-2 text-sm text-gray-300">
                  {activeDepartment ? `${filteredProfiles.length} member${filteredProfiles.length === 1 ? "" : "s"}` : "Pick a community to view members"}
                </div>
              </div>

              {!activeDepartment && (
                <div className="mt-6 rounded-xl border border-dashed border-[#1f3f7a] bg-[#0d1422] p-8 text-center text-gray-400">
                  Choose Backend, Frontend, or DevOps to browse the profiles in that community.
                </div>
              )}

              {activeDepartment && loading && (
                <div className="mt-6 rounded-xl border border-[#1f3f7a] bg-[#0d1422] p-8 text-center text-gray-400">
                  Loading community members...
                </div>
              )}

              {activeDepartment && !loading && filteredProfiles.length === 0 && (
                <div className="mt-6 rounded-xl border border-[#1f3f7a] bg-[#0d1422] p-8 text-center text-gray-400">
                  No profiles found in this community.
                </div>
              )}

              {activeDepartment && filteredProfiles.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProfiles.map((profile) => {
                    const displayName = profile.display_name || profile.username || "Unknown"
                    const initials = displayName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => navigate(`/profile/${profile.user_id}`)}
                        className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#232323]"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-[#036aff]/20">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback className="bg-[#036aff] text-white">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-white truncate">{displayName}</h3>
                                <p className="text-sm text-gray-400">@{profile.username || "unknown"}</p>
                              </div>
                              <span className="rounded-full bg-[#036aff]/15 px-3 py-1 text-xs font-medium text-blue-300 border border-[#1f3f7a]">
                                View profile
                              </span>
                            </div>
                            {profile.bio && (
                              <p className="mt-3 text-sm text-gray-400 line-clamp-3">{profile.bio}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}