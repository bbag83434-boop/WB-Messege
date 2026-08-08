import { motion } from 'framer-motion'

function AppShell() {
  return (
    <main className="app-shell" aria-label="My Messenger application">
      <motion.div
        className="app-shell__stage"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
    </main>
  )
}

export default AppShell
