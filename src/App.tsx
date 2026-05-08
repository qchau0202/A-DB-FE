import './App.css'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from './components/Layout'
import { FeedPage } from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import ThreadDetailPage from './pages/ThreadDetailPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import ChatPage from './pages/ChatPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import CategoriesPage from './pages/CategoriesPage'
import UserCommunitiesPage from './pages/UserCommunitiesPage'
import { useAuth } from './contexts/AuthContext'

function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />
}

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed/:id" element={<ThreadDetailPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/document/:id" element={<DocumentDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/communities" element={<UserCommunitiesPage />} />
          <Route path="/categories/communities/:departmentId" element={<UserCommunitiesPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Route>
      </Route>
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
