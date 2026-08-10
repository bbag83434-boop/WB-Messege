import { useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell'
import PWAExperience from '../pwa/PWAExperience'
import AuthScreen from '../auth/AuthScreen'
import { clearToken, request } from '../auth/api'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Connecting...')
  const [showRetryButton, setShowRetryButton] = useState(false)

  const verifySession = () => {
    setCheckingSession(true)
    setShowRetryButton(false)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoadingMessage('You are offline. Reconnecting when online...')
      setShowRetryButton(true)
      return
    }
    setLoadingMessage('Connecting...')
    
    const slowTimer = setTimeout(() => {
      setLoadingMessage('The server is taking longer than expected to wake up.')
    }, 2500)

    const retryBtnTimer = setTimeout(() => {
      setShowRetryButton(true)
    }, 6000)

    const maxTimeout = setTimeout(() => {
      setCheckingSession(false)
    }, 15000)

    request('/auth/me')
      .then(({ user: authenticatedUser }) => setUser(authenticatedUser))
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          clearToken()
          setUser(null)
        } else {
          setLoadingMessage('Connection timed out.')
          setShowRetryButton(true)
        }
      })
      .finally(() => {
        clearTimeout(slowTimer)
        clearTimeout(retryBtnTimer)
        clearTimeout(maxTimeout)
        if (!showRetryButton) setCheckingSession(false)
      })
  }

  useEffect(() => {
    verifySession()

    const onResume = () => {
      if (document.visibilityState === 'visible') {
        verifySession()
      }
    }

    const onOnline = () => {
      verifySession()
    }

    window.addEventListener('focus', onResume)
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('focus', onResume)
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  const logout = async () => {
    try { await request('/auth/logout', { method: 'POST' }) } catch { /* Local token still must be removed. */ }
    clearToken(); setUser(null)
  }

  return (
    <PWAExperience>
      {checkingSession ? (
        <div className="auth-check" role="status" aria-label="Loading My Messenger">
          <div className="auth-check__content">
            <div className="pwa-logo">
              <i /><i /><i />
            </div>
            <strong>My Messenger</strong>
            <div className="pwa-startup__pulse" />
            <span className="auth-check__text">{loadingMessage}</span>
            {showRetryButton && (
              <button className="auth-check__retry" onClick={verifySession}>
                Retry
              </button>
            )}
          </div>
        </div>
      ) : user ? (
        <AppShell user={user} onLogout={logout} />
      ) : (
        <AuthScreen onAuthenticated={setUser} />
      )}
    </PWAExperience>
  )
}

export default App
