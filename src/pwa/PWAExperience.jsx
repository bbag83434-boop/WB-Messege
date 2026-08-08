import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const INSTALL_DISMISSED_KEY = 'my-messenger-install-dismissed'

function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function PWAExperience({ children }) {
  const [isLoading, setIsLoading] = useState(true)
  const [installEvent, setInstallEvent] = useState(null)
  const [updateServiceWorker, setUpdateServiceWorker] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const finishLoading = window.setTimeout(() => setIsLoading(false), 520)
    return () => window.clearTimeout(finishLoading)
  }, [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      if (!isInstalled() && !window.sessionStorage.getItem(INSTALL_DISMISSED_KEY)) setInstallEvent(event)
    }
    const onInstalled = () => setInstallEvent(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        setUpdateAvailable(true)
      },
    })
    setUpdateServiceWorker(() => updateSW)
  }, [])

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    setInstallEvent(null)
  }

  const dismissInstall = () => {
    window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    setInstallEvent(null)
  }

  const update = async () => {
    if (!updateServiceWorker) return
    setIsUpdating(true)
    await updateServiceWorker(true)
  }

  return (
    <>
      {children}
      <AnimatePresence>
        {isLoading && <StartupScreen />}
        {installEvent && <InstallPrompt onInstall={install} onDismiss={dismissInstall} />}
        {updateAvailable && <UpdatePrompt onUpdate={update} onDismiss={() => setUpdateAvailable(false)} isUpdating={isUpdating} />}
      </AnimatePresence>
    </>
  )
}

function StartupScreen() {
  return (
    <motion.div className="pwa-startup" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} aria-label="Loading My Messenger">
      <motion.div className="pwa-startup__brand" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.36 }}>
        <span className="pwa-logo" aria-hidden="true"><i /><i /><i /></span>
        <strong>My Messenger</strong>
        <span className="pwa-startup__pulse" aria-hidden="true" />
      </motion.div>
    </motion.div>
  )
}

function InstallPrompt({ onInstall, onDismiss }) {
  return <PromptCard title="Install My Messenger" copy="Install the app for a faster, app-like experience." primaryLabel="Install Now" onPrimary={onInstall} secondaryLabel="Not Now" onSecondary={onDismiss} />
}

function UpdatePrompt({ onUpdate, onDismiss, isUpdating }) {
  return <PromptCard title="New version available" copy="A new version of My Messenger is ready." primaryLabel={isUpdating ? 'Updating...' : 'Update Now'} onPrimary={onUpdate} secondaryLabel="Later" onSecondary={onDismiss} disabled={isUpdating} />
}

function PromptCard({ title, copy, primaryLabel, onPrimary, secondaryLabel, onSecondary, disabled }) {
  return (
    <motion.div className="pwa-prompt-wrap" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} transition={{ duration: 0.24 }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pwa-prompt">
        <span className="pwa-prompt__icon"><span className="pwa-logo"><i /><i /><i /></span></span>
        <div><h2>{title}</h2><p>{copy}</p></div>
        <div className="pwa-prompt__actions">
          <button type="button" className="pwa-prompt__secondary" onClick={onSecondary} disabled={disabled}>{secondaryLabel}</button>
          <button type="button" className="pwa-prompt__primary" onClick={onPrimary} disabled={disabled}>{primaryLabel}</button>
        </div>
      </div>
    </motion.div>
  )
}

export default PWAExperience
