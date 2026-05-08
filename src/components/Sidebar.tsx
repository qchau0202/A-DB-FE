import { Link } from "react-router-dom"
import { Compass, ListChecks, PanelLeft, PanelLeftClose, User, LogOut, Hash } from "lucide-react"
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
  { id: "home", label: "Feed", icon: ListChecks, path: "/" },
  { id: "explore", label: "Explore", icon: Compass, path: "/explore" },
  { id: "categories", label: "Categories", icon: Hash, path: "/categories" },
]

export function Sidebar({ activeItem = "home", collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const DEFAULT_AVATAR = "/DevConnect_logo-removebg.png"

  return (
    <aside
      className={cn(
        "h-screen flex flex-col overflow-hidden border border-[#333333]",
        collapsed ? "w-20" : "w-70",
      )}
    >
      {/* Top: logo + toggle */}
      <div className="border-b border-[#333333] px-3 py-4">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img src="/dev_connect-logo.png" alt="Dev Connect" className="w-8 h-8 object-contain" />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold text-white">DevConnect</span>
                <span className="text-xs text-gray-400">Social developer platform</span>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#333333]"
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
                  : "text-white bg-transparent hover:bg-[#333333]",
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
      <div className="border-t border-[#333333] px-3 py-3 space-y-2">
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
              "flex-1 justify-start h-11 text-left font-normal hover:bg-[#333333]",
              collapsed ? "px-0 justify-center" : "gap-3 px-3",
            )}
          >
            <Link to="/profile">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || DEFAULT_AVATAR} alt={user?.name || "Avatar"} className="object-cover" />
                  <AvatarFallback className="bg-[#333333] text-[#ffffff] text-sm">
                    {user?.initials || "U"}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold text-[#ffffff] truncate">
                      {user?.name || "Profile"}
                    </span>
                    <span className="text-xs text-[#a0a0a0] flex items-center gap-1 truncate">
                      <User className="h-3 w-3" />
                      {user?.name || "Student"}
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
            "w-full justify-start h-11 text-left font-normal text-red-600 hover:bg-[#333333]",
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

