import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import {
  fetchNotifications,
  deleteNotificationByToken,
  type Notification,
} from "@/services/mainServices"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

export function NotificationDropdown() {
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const loadNotifications = () => {
    if (!user || !accessToken) return
    fetchNotifications(accessToken)
      .then((notifs) => {
        setNotifications(notifs.sort((a, b) => {
          const aDate = new Date(a.createdAt || "").getTime() || 0
          const bDate = new Date(b.createdAt || "").getTime() || 0
          return bDate - aDate
        }))
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err)
        setNotifications([])
      })
  }

  useEffect(() => {
    if (!user || !accessToken) return
    loadNotifications()

    // no active listeners here for now; just load on mount/credential change
    return () => {}
  }, [user, accessToken])

  const renderNotificationTitle = (notification: Notification) => {
    const sender = notification.sender_id || 'Someone'
    switch (notification.type) {
      case 'post_comment':
        return `${sender} commented on your post`
      case 'follow':
        return `${sender} started following you`
      case 'mention':
        return `${sender} mentioned you`
      case 'post_like':
        return `${sender} liked your post`
      case 'quickie_react':
        return `${sender} reacted to your quickie`
      case 'document_like':
        return `${sender} liked your document`
      default:
        return notification.title || ''
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Build common links from notification reference
    if (!notification) return
    // If payload already contains a link, prefer it
    const anyNotif = notification as any
    if (anyNotif.link) return navigate(anyNotif.link)

    // Fallback link construction based on target_type
    if (notification.target_type === 'post' && notification.target_id) {
      return navigate(`/feed/${notification.target_id}`)
    }
    if (notification.target_type === 'quickie' && notification.target_id) {
      return navigate(`/quickies/${notification.target_id}`)
    }
    if (notification.target_type === 'document' && notification.target_id) {
      return navigate(`/documents/${notification.target_id}`)
    }
    if (notification.type === 'follow' && notification.sender_id) {
      return navigate(`/profile/${notification.sender_id}`)
    }
    // Default: go to notifications page
    navigate('/notifications')
  }

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    if (!user || !accessToken) return
    deleteNotificationByToken(accessToken, notificationId)
      .then(loadNotifications)
      .catch((err) => console.error("Failed to delete notification:", err))
  }

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'post_comment':
      case 'quickie_view':
        return <Bell className="h-4 w-4 text-gray-600" />
      case 'follow':
        return <svg className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zM3 21a9 9 0 0118 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-[#ffffff]" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#036aff] text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-[#141414]">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "px-4 py-3 hover:bg-[#f5f5f5] cursor-pointer transition-colors border-b border-gray-100 group",
                  !notification.is_read && "bg-blue-50/50"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {/* Render tailored message when title not provided */}
                        <p className="text-xs font-semibold text-[#141414]">{notification.title || renderNotificationTitle(notification)}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{notification.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{notification.createdAt ? formatTime(notification.createdAt) : ''}</p>
                      </div>
                      {/* Read state not supported in API; badge omitted */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, notification._id)}
                        className="h-6 w-6 p-0 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full text-xs text-gray-600 hover:text-[#141414]"
              onClick={() => navigate("/notifications")}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

