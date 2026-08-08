import { useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell'
import PWAExperience from '../pwa/PWAExperience'
import AuthScreen from '../auth/AuthScreen'
import { clearToken, request } from '../auth/api'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    request('/auth/me').then(({ user: authenticatedUser }) => setUser(authenticatedUser)).catch(clearToken).finally(() => setCheckingSession(false))
  }, [])

  const logout = async () => {
    try { await request('/auth/logout', { method: 'POST' }) } catch { /* Local token still must be removed. */ }
    clearToken(); setUser(null)
  }

  return (
    <PWAExperience>
      {checkingSession ? <div className="auth-check" aria-label="লোড হচ্ছে" /> : user ? <AppShell user={user} onLogout={logout} /> : <AuthScreen onAuthenticated={setUser} />}
    </PWAExperience>
  )
}

export default App
