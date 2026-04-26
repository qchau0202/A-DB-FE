import { Link } from "react-router-dom"
import { BookOpen, FolderOpen, ListChecks, PanelLeft, PanelLeftClose, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationDropdown } from "./NotificationDropdown"

interface SidebarProps {
  activeItem?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const menuItems = [
  { id: "home", label: "Student Feed", icon: ListChecks, path: "/" },
  { id: "resource", label: "Resource", icon: FolderOpen, path: "/resource" },
  { id: "collections", label: "Collections", icon: BookOpen, path: "/collections" },
]

export function Sidebar({ activeItem = "home", collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const DEFAULT_AVATAR = "/DevConnect_logo-removebg.png"

  return (
    <aside
      className={cn(
        "h-screen border-r border-gray-200 bg-white flex flex-col overflow-hidden",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Top: logo + toggle */}
      <div className="border-b border-gray-100 px-3 py-4">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="/dev_connect-logo.png" alt="Uni Circle" className="w-8 h-8 object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-[#141414]">DevConnect</span>
                <span className="text-xs text-gray-400">Social developer platform</span>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-[#141414] hover:bg-[#f5f5f5]"
            onClick={onToggleCollapse}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Middle: navigation items */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              asChild
              className={cn(
                "w-full justify-start h-11 text-left font-normal",
                isActive
                  ? "bg-[#036aff] text-white hover:bg-[#036aff] hover:text-white"
                  : "text-[#141414] hover:bg-[#f5f5f5]",
                collapsed ? "px-3 justify-center" : "gap-3 px-3"
              )}
            >
              <Link to={item.path}>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {!collapsed && (
                    <span className="text-sm font-bold truncate">{item.label}</span>
                  )}
                </div>
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* Bottom: notifications + profile access */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-2">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "flex-col gap-3 justify-center" : "justify-between",
          )}
        >
          {/* Profile entry */}
          <Button
            variant="ghost"
            asChild
            className={cn(
              "flex-1 justify-start h-11 text-left font-normal hover:bg-[#f5f5f5]",
              collapsed ? "px-0 justify-center" : "gap-3 px-3",
            )}
          >
            <Link to="/profile">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || DEFAULT_AVATAR} alt={user?.name || "Avatar"} className="object-cover" />
                  <AvatarFallback className="bg-[#f5f5f5] text-[#141414] text-sm">
                    {user?.initials || "U"}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold text-[#141414] truncate">
                      {user?.name || "Profile"}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <User className="h-3 w-3" />
                      {user?.studentId || "Student"}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </Button>

          {/* Notification button sitting next to profile preview */}
          <div
            className={cn(
              "shrink-0",
              collapsed ? "" : "ml-1",
            )}
          >
            <NotificationDropdown />
          </div>
        </div>

        {/* Sign out button */}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full justify-start h-11 text-left font-normal text-red-600 hover:bg-red-50 hover:text-red-700",
            collapsed ? "px-0 justify-center" : "gap-3 px-3",
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && (
            <span className="text-sm font-semibold">Sign out</span>
          )}
        </Button>
      </div>
    </aside>
  )
}

