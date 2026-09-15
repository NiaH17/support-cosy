import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import HubPage from './pages/HubPage'
import TroubleshootingPage from './pages/TroubleshootingPage'
import InfoPage from './pages/InfoPage'
import SupportPage from './pages/SupportPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/connexion" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
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
      <Routes>
        <Route path="/connexion" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
