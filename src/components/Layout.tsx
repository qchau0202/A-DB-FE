import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export function Layout() {
  const location = useLocation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Map routes to sidebar items
  const getActiveItem = () => {
    const path = location.pathname
    if (path === "/" || path === "/home" || path === "/feed") return "home"
    if (path === "/explore") return "explore"
    if (path === "/categories") return "categories"
    return "home"
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#0d0d0d]">
      <Sidebar
        activeItem={getActiveItem()}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex-1 h-screen overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Outlet />
        </div>
      </div>
    </div>
  )
}