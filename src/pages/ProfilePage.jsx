import { motion } from 'framer-motion'
import { useState } from 'react'
import { request } from '../auth/api'

export default function ProfilePage({ user, onUpdateUser, onBack }) {
  const [name, setName] = useState(user.name)
  const [about, setAbout] = useState(user.about || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const { user: updatedUser } = await request('/users/profile', { method: 'PUT', body: JSON.stringify({ name, about }) })
      onUpdateUser(updatedUser)
      onBack()
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <motion.section className="profile-page" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back">←</button>
        <h2>Profile</h2>
        <button className="icon-button" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
      </header>
      
      <div className="profile-content">
        <div className="avatar avatar--large">{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name.slice(0,2).toUpperCase()}</div>
        <label>Name
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
        </label>
        <label>About
          <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={160} rows={3} />
        </label>
        {error && <p className="error">{error}</p>}
      </div>
    </motion.section>
  )
}
