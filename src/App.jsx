import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import HubPage from './pages/HubPage'
import TroubleshootingPage from './pages/TroubleshootingPage'
import InfoPage from './pages/InfoPage'
import SupportPage from './pages/SupportPage'
import AdminPage from './pages/AdminPage'
import UserTicketsPage from './pages/UserTicketsPage'
import InstallRegisterPage from './pages/InstallRegisterPage'
import MyInstallsPage from './pages/MyInstallsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import GlobalNotifier from './components/GlobalNotifier'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/connexion" replace />
  return children
}

function AdminRoute({ session, children }) {
  if (!session) return <Navigate to="/connexion" replace />
  if (session.user?.app_metadata?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const hasAccess = s => !!s?.user?.app_metadata?.apps?.includes('support_cosy')

export default function App() {
  const [session, setSession] = useState(undefined)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    // Accounts without Support Cosy access are signed straight back out
    async function apply(next) {
      if (next && !hasAccess(next)) {
        // The token may predate the access list: refresh once to pick up the latest before refusing
        const { data } = await supabase.auth.refreshSession()
        if (data?.session && hasAccess(data.session)) { setSession(data.session); return }
        setDenied(true)
        supabase.auth.signOut()
        setSession(null)
      } else {
        setSession(next)
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => apply(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => apply(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-navy">
        <div className="w-8 h-8 rounded-full border-4 border-brand-pink border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      {session && <GlobalNotifier session={session} />}
      <Routes>
        <Route path="/connexion" element={session ? <Navigate to="/" replace /> : <LoginPage denied={denied} />} />
        <Route path="/" element={
          <ProtectedRoute session={session}><HubPage session={session} /></ProtectedRoute>
        } />
        <Route path="/depannage" element={
          <ProtectedRoute session={session}><TroubleshootingPage session={session} /></ProtectedRoute>
        } />
        <Route path="/informations" element={
          <ProtectedRoute session={session}><InfoPage session={session} /></ProtectedRoute>
        } />
        <Route path="/assistance" element={
          <ProtectedRoute session={session}><SupportPage session={session} /></ProtectedRoute>
        } />
        <Route path="/mes-demandes" element={
          <ProtectedRoute session={session}><UserTicketsPage session={session} /></ProtectedRoute>
        } />
        <Route path="/mot-de-passe" element={
          <ProtectedRoute session={session}><ChangePasswordPage /></ProtectedRoute>
        } />
        <Route path="/installations/nouvelle" element={
          <ProtectedRoute session={session}><InstallRegisterPage session={session} /></ProtectedRoute>
        } />
        <Route path="/installations" element={
          <ProtectedRoute session={session}><MyInstallsPage session={session} /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute session={session}><AdminPage session={session} /></AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
