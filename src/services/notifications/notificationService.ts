// Notifications service - matches /api/notifications/* routes
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"
const NOTIFICATIONS_BASE_URL = `${API_BASE_URL}/notifications`

export type NotificationType = 'follow' | 'post_like' | 'post_comment' | 'quickie_view' | 'quickie_react' | 'document_like' | 'mention'
export type TargetType = 'post' | 'comment' | 'quickie' | 'document'

export interface Notification {
  _id: string
  recipient_id: string
  sender_id: string
  type: NotificationType
  title: string
  body?: string
  target_id?: string
  target_type?: TargetType
  is_read: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateNotificationPayload {
  recipient_id: string
  type: NotificationType
  title: string
  body?: string
  target_id?: string
  target_type?: TargetType
}

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
})

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new CustomEvent('api:unauthorized', { 
        detail: { message: data.message || 'Session expired. Please log in again.' }
      }))
    }
    throw new Error(data.message || `HTTP ${response.status} - Request failed`)
  }
  return data as T
}

// Create notification
export async function createNotification(
  accessToken: string,
  payload: CreateNotificationPayload
): Promise<Notification> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<{ notification: Notification }>(res)
  return data.notification
}

// Get notifications for current user
export async function getNotifications(
  accessToken: string,
  options: { unreadOnly?: boolean; limit?: number; skip?: number } = {}
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const { unreadOnly, limit, skip } = options
  const params = new URLSearchParams()
  if (unreadOnly) params.append("unread", "true")
  if (limit) params.append("limit", limit.toString())
  if (skip) params.append("skip", skip.toString())

  const url = params.toString() ? `${NOTIFICATIONS_BASE_URL}?${params}` : NOTIFICATIONS_BASE_URL
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  })
  return handleResponse<{ notifications: Notification[]; unreadCount: number }>(res)
}

// Get unread count only
export async function getUnreadCount(accessToken: string): Promise<number> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/unread-count`, {
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ count: number }>(res)
  return data.count
}

// Get notification by ID
export async function getNotificationById(id: string, accessToken: string): Promise<Notification> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/${id}`, {
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ notification: Notification }>(res)
  return data.notification
}

// Mark notification as read
export async function markAsRead(id: string, accessToken: string): Promise<Notification> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ notification: Notification }>(res)
  return data.notification
}

// Mark all notifications as read
export async function markAllAsRead(accessToken: string): Promise<number> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/read-all`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  })
  const data = await handleResponse<{ modifiedCount: number }>(res)
  return data.modifiedCount
}

// Delete notification
export async function deleteNotification(id: string, accessToken: string): Promise<void> {
  const res = await fetch(`${NOTIFICATIONS_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  })
  await handleResponse(res)
}

// Helper to create follow notification
export async function sendFollowNotification(
  accessToken: string,
  followingId: string,
  followerName: string
): Promise<Notification> {
  return createNotification(accessToken, {
    recipient_id: followingId,
    type: "follow",
    title: `${followerName} started following you`,
  })
}

// Helper to create post like notification
export async function sendPostLikeNotification(
  accessToken: string,
  authorId: string,
  likerName: string,
  postId: string
): Promise<Notification> {
  return createNotification(accessToken, {
    recipient_id: authorId,
    type: "post_like",
    title: `${likerName} liked your post`,
    target_id: postId,
    target_type: "post",
  })
}

// Helper to create post comment notification
export async function sendPostCommentNotification(
  accessToken: string,
  authorId: string,
  commenterName: string,
  postId: string,
  commentPreview: string
): Promise<Notification> {
  return createNotification(accessToken, {
    recipient_id: authorId,
    type: "post_comment",
    title: `${commenterName} commented on your post`,
    body: commentPreview.slice(0, 100),
    target_id: postId,
    target_type: "post",
  })
}

// Helper to create quickie reaction notification
export async function sendQuickieReactionNotification(
  accessToken: string,
  authorId: string,
  reactorName: string,
  quickieId: string
): Promise<Notification> {
  return createNotification(accessToken, {
    recipient_id: authorId,
    type: "quickie_react",
    title: `${reactorName} reacted to your quickie`,
    target_id: quickieId,
    target_type: "quickie",
  })
}

// Helper to create document like notification
export async function sendDocumentLikeNotification(
  accessToken: string,
  authorId: string,
  likerName: string,
  documentId: string
): Promise<Notification> {
  return createNotification(accessToken, {
    recipient_id: authorId,
    type: "document_like",
    title: `${likerName} liked your document`,
    target_id: documentId,
    target_type: "document",
  })
}

// Legacy compatibility aliases for NotificationDropdown component
export const fetchNotifications = async (accessToken: string): Promise<Notification[]> => {
  const result = await getNotifications(accessToken, { limit: 50 })
  return result.notifications
}

// Compatibility delete with swapped parameter order (matches NotificationDropdown)
export const deleteNotificationByToken = async (accessToken: string, id: string): Promise<void> => {
  return deleteNotification(id, accessToken)
}
